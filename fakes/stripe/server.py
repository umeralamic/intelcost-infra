"""A fake Stripe for the bench (F16 Block B, D-278), so Checkout and the webhook can be driven
without an account.

It serves the three calls the api makes, shaped like Stripe's, on Stripe's paths:

    POST /v1/customers                  a customer, `cus_...`
    POST /v1/checkout/sessions          a session, `cs_...`, its `url` this fake's own page
    POST /v1/billing_portal/sessions    a portal session, `bps_...`, its `url` this fake's portal:
                                        change seats, cancel at period end, switch plan, each
                                        sent as customer.subscription.updated
    GET  /v1/subscriptions/<id>         the subscription, period dates on its items only (the
                                        newer API's shape, so the api's Q14 path is the one used)

and plays Stripe's side of the webhook: every event it sends is signed with the bench's signing
secret (`Stripe-Signature: t=..,v1=HMAC-SHA256(secret, "t.payload")`) and POSTed to the api.

A person can pay on the hosted page (`GET /checkout/<id>`: Pay or Cancel, then back to the
session's success or cancel URL). A script drives it through the control routes, which are this
fake's own and not Stripe's:

    GET  /_fake/sessions/<id>                       the session as created (lines, address
                                                    collection, every form field received)
    POST /_fake/sessions/<id>/complete              pay: subscription made, checkout.session.completed
    POST /_fake/subscriptions/<id>/payment_failed   past_due, invoice.payment_failed
    POST /_fake/subscriptions/<id>/paid             active, invoice.paid
    POST /_fake/subscriptions/<id>/cancel           cancel_at_period_end, customer.subscription.updated
    POST /_fake/subscriptions/<id>/delete           canceled, customer.subscription.deleted
                                                    (each of these four takes ?signature=bad)
    POST /_fake/events/<id>/resend[?signature=bad]  the same event again (same id), freshly signed,
                                                    or with a signature that does not verify
    GET  /_fake/events                              every event sent, with the api's answer

Each control route answers with the event id and the api's status and body. State is in memory: a
restart forgets everything, which is what a bench wants.

Environment: STRIPE_FAKE_WEBHOOK_SECRET (the api's STRIPE_WEBHOOK_SECRET), STRIPE_FAKE_WEBHOOK_URL
(the api's /api/stripe/webhook), STRIPE_FAKE_PUBLIC_URL (this fake as a browser reaches it).
"""

import hashlib
import hmac
import html
import json
import os
import re
import secrets
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qsl, urlparse

SECRET = os.environ.get("STRIPE_FAKE_WEBHOOK_SECRET", "whsec_bench_fake")
WEBHOOK_URL = os.environ.get("STRIPE_FAKE_WEBHOOK_URL", "http://api:8000/api/stripe/webhook")
PUBLIC_URL = os.environ.get("STRIPE_FAKE_PUBLIC_URL", "http://localhost:12111")
MONTH = 30 * 24 * 3600
YEAR = 365 * 24 * 3600

customers: dict[str, dict[str, Any]] = {}
portals: dict[str, dict[str, Any]] = {}
sessions: dict[str, dict[str, Any]] = {}
subscriptions: dict[str, dict[str, Any]] = {}
events: dict[str, dict[str, Any]] = {}
sent: list[dict[str, Any]] = []


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(12)}"


def unflatten(pairs: list[tuple[str, str]]) -> dict[str, Any]:
    """Stripe's form encoding back into objects: `a[b][0][c]=v`. Lists become dicts keyed by
    index, then lists."""
    root: dict[str, Any] = {}
    for key, value in pairs:
        parts = re.findall(r"[^\[\]]+", key)
        node = root
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value

    def listify(node: Any) -> Any:
        if isinstance(node, dict):
            node = {k: listify(v) for k, v in node.items()}
            if node and all(k.isdigit() for k in node):
                return [node[k] for k in sorted(node, key=int)]
        return node

    return listify(root)


def sign(payload: bytes, *, bad: bool = False) -> str:
    stamp = int(time.time())
    key = (SECRET + "x" if bad else SECRET).encode()
    digest = hmac.new(key, f"{stamp}.".encode() + payload, hashlib.sha256).hexdigest()
    return f"t={stamp},v1={digest}"


def deliver(event: dict[str, Any], *, bad: bool = False) -> tuple[int, Any]:
    payload = json.dumps(event).encode()
    request = urllib.request.Request(
        WEBHOOK_URL,
        data=payload,
        headers={"Content-Type": "application/json", "Stripe-Signature": sign(payload, bad=bad)},
        method="POST",
    )
    body: Any = None
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    except OSError:
        status, raw = 0, b""
    try:
        body = json.loads(raw) if raw else None
    except ValueError:
        body = raw.decode(errors="replace")
    sent.append({"event": event["id"], "type": event["type"], "status": status, "body": body, "bad": bad})
    return status, body


def emit(kind: str, obj: dict[str, Any], *, bad: bool = False) -> dict[str, Any]:
    event = {
        "id": new_id("evt"),
        "object": "event",
        "type": kind,
        "created": int(time.time()),
        "data": {"object": json.loads(json.dumps(obj))},
    }
    events[event["id"]] = event
    status, body = deliver(event, bad=bad)
    return {"event": event["id"], "type": kind, "webhook_status": status, "webhook_body": body}


def invoice_for(sub: dict[str, Any], status: str) -> dict[str, Any]:
    return {
        "id": new_id("in"),
        "object": "invoice",
        "status": status,
        "customer": sub["customer"],
        # Both places Stripe has put it, older and newer API versions.
        "subscription": sub["id"],
        "parent": {"subscription_details": {"subscription": sub["id"]}},
    }


def complete(session: dict[str, Any]) -> dict[str, Any]:
    if session.get("subscription"):
        return {"error": "already completed", "subscription": session["subscription"]}
    now = int(time.time())
    customer = session.get("customer") or new_id("cus")
    items = []
    for line in session.get("line_items") or []:
        annual = "annual" in str(line.get("price"))
        items.append(
            {
                "id": new_id("si"),
                "object": "subscription_item",
                "price": {
                    "id": line.get("price"),
                    "recurring": {"interval": "year" if annual else "month"},
                },
                "quantity": int(line.get("quantity") or 1),
                "current_period_start": now,
                "current_period_end": now + (YEAR if annual else MONTH),
            }
        )
    sub = {
        "id": new_id("sub"),
        "object": "subscription",
        "customer": customer,
        "status": "active",
        "metadata": (session.get("subscription_data") or {}).get("metadata") or {},
        "cancel_at_period_end": False,
        "canceled_at": None,
        "items": {"object": "list", "data": items},
    }
    subscriptions[sub["id"]] = sub
    session.update(status="complete", payment_status="paid", subscription=sub["id"])
    session["customer"] = customer
    result = emit("checkout.session.completed", session)
    return {**result, "subscription": sub["id"]}


def portal_subscription(portal: dict[str, Any]) -> dict[str, Any] | None:
    """The customer's live subscription, as the real portal shows it."""
    for sub in subscriptions.values():
        if sub["customer"] == portal["customer"] and sub["status"] != "canceled":
            return sub
    return None


def set_seats(sub: dict[str, Any], seats: int) -> None:
    """The base line once and the seat line for the rest, as Checkout made them; a plan with no
    seat line (a per-unit price) takes the count on its one line."""
    items = sub["items"]["data"]
    base = items[0]
    seat = next((i for i in items[1:] if "_seat_" in str(i["price"]["id"])), None)
    if seat is None and "price_bench_" in str(base["price"]["id"]) and seats > 1:
        seat = json.loads(json.dumps(base))
        seat.update(id=new_id("si"))
        seat["price"]["id"] = str(base["price"]["id"]).replace("price_bench_", "price_bench_seat_")
        items.append(seat)
    if seat is None:
        base["quantity"] = seats
    else:
        base["quantity"] = 1
        seat["quantity"] = seats - 1
        sub["items"]["data"] = [i for i in items if i is base or i is seat or i["quantity"] > 0]
    sub["metadata"]["seats"] = str(seats)


def switch_plan(sub: dict[str, Any], plan: str) -> None:
    other = "essentials" if plan == "professional" else "professional"
    for item in sub["items"]["data"]:
        item["price"]["id"] = str(item["price"]["id"]).replace(other, plan)
    sub["metadata"]["plan"] = plan


def portal_page(portal: dict[str, Any]) -> bytes:
    sub = portal_subscription(portal)
    if sub is None:
        body = "<p>No active subscription.</p>"
    else:
        seats = sum(int(i["quantity"]) for i in sub["items"]["data"])
        plan = html.escape(str(sub["metadata"].get("plan")))
        base = f"/portal/{portal['id']}"
        body = (
            f"<p data-plan>{plan}</p><p data-seats>{seats} seats</p>"
            f"<p data-cancel>{'Cancels at period end' if sub['cancel_at_period_end'] else 'Renews'}</p>"
            f"<form method=post action='{base}/seats'><label>Seats "
            f"<input name=seats type=number min=1 value={seats}></label> <button>Update seats</button></form>"
            f"<form method=post action='{base}/cancel'><button>Cancel at period end</button></form>"
            f"<form method=post action='{base}/plan'><select name=plan>"
            "<option value=essentials>Essentials</option><option value=professional>Professional</option>"
            "</select> <button>Switch plan</button></form>"
        )
    page = (
        "<!doctype html><meta charset=utf-8><title>Bench billing portal</title>"
        "<body style='font-family:sans-serif;max-width:32rem;margin:3rem auto'>"
        f"<h1>Bench billing portal (Stripe fake)</h1>{body}"
        f"<p><a href='{html.escape(portal['return_url'])}'>Return to IntelCost</a></p>"
    )
    return page.encode()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:  # quieter than the default
        print(f"stripe-fake {self.command} {self.path} {args[1] if len(args) > 1 else ''}")

    def _send(self, status: int, body: Any, content_type: str = "application/json") -> None:
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _redirect(self, url: str) -> None:
        self.send_response(303)
        self.send_header("Location", url)
        self.end_headers()

    def _form(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode() if length else ""
        pairs = parse_qsl(raw, keep_blank_values=True)
        return {"fields": unflatten(pairs), "pairs": pairs}

    def _authorized(self) -> bool:
        if (self.headers.get("Authorization") or "").startswith("Bearer sk_"):
            return True
        self._send(401, {"error": {"type": "invalid_request_error", "message": "No API key."}})
        return False

    def _missing(self, what: str) -> None:
        self._send(404, {"error": {"type": "invalid_request_error", "message": f"No such {what}."}})

    def do_GET(self) -> None:  # noqa: N802  (the stdlib names it)
        path = urlparse(self.path).path
        if m := re.fullmatch(r"/v1/subscriptions/([\w]+)", path):
            if not self._authorized():
                return
            sub = subscriptions.get(m[1])
            self._send(200, sub) if sub else self._missing("subscription")
        elif m := re.fullmatch(r"/_fake/sessions/([\w]+)", path):
            session = sessions.get(m[1])
            self._send(200, session) if session else self._missing("session")
        elif path == "/_fake/events":
            self._send(200, sent)
        elif m := re.fullmatch(r"/portal/([\w]+)", path):
            portal = portals.get(m[1])
            if portal:
                self._send(200, portal_page(portal), "text/html; charset=utf-8")
            else:
                self._missing("portal session")
        elif m := re.fullmatch(r"/checkout/([\w]+)", path):
            session = sessions.get(m[1])
            if not session:
                return self._missing("session")
            lines = "".join(
                f"<li>{html.escape(str(line.get('price')))} × {html.escape(str(line.get('quantity')))}</li>"
                for line in session.get("line_items") or []
            )
            page = (
                "<!doctype html><meta charset=utf-8><title>Bench Checkout</title>"
                "<body style='font-family:sans-serif;max-width:32rem;margin:3rem auto'>"
                "<h1>Bench Checkout (Stripe fake)</h1>"
                f"<ul>{lines}</ul>"
                f"<form method=post action='/checkout/{session['id']}/pay'>"
                "<button>Pay</button></form>"
                f"<p><a href='{html.escape(session.get('cancel_url') or '/')}'>Cancel</a></p>"
            )
            self._send(200, page.encode(), "text/html; charset=utf-8")
        elif path == "/health":
            self._send(200, {"ok": True})
        else:
            self._missing("route")

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path, query = parsed.path, dict(parse_qsl(parsed.query))
        form = self._form()
        fields = form["fields"]
        if path == "/v1/customers":
            if not self._authorized():
                return
            customer = {"id": new_id("cus"), "object": "customer", **fields}
            customers[customer["id"]] = customer
            self._send(200, customer)
        elif path == "/v1/billing_portal/sessions":
            if not self._authorized():
                return
            portal_id = new_id("bps")
            portal = {
                "id": portal_id,
                "object": "billing_portal.session",
                "customer": fields.get("customer"),
                "return_url": fields.get("return_url") or "/",
                "configuration": fields.get("configuration"),
                "url": f"{PUBLIC_URL}/portal/{portal_id}",
            }
            portals[portal_id] = portal
            self._send(200, portal)
        elif m := re.fullmatch(r"/portal/([\w]+)/(seats|cancel|plan)", path):
            portal = portals.get(m[1])
            sub = portal_subscription(portal) if portal else None
            if not portal or not sub:
                return self._missing("subscription")
            if m[2] == "seats":
                set_seats(sub, max(1, int(fields.get("seats") or 1)))
            elif m[2] == "cancel":
                sub["cancel_at_period_end"] = True
            else:
                switch_plan(sub, str(fields.get("plan")))
            emit("customer.subscription.updated", sub)
            self._redirect(f"/portal/{portal['id']}")
        elif path == "/v1/checkout/sessions":
            if not self._authorized():
                return
            session_id = new_id("cs")
            session = {
                "id": session_id,
                "object": "checkout.session",
                "status": "open",
                "payment_status": "unpaid",
                "url": f"{PUBLIC_URL}/checkout/{session_id}",
                "subscription": None,
                **fields,
                "received": form["pairs"],
            }
            session["line_items"] = fields.get("line_items") or []
            sessions[session_id] = session
            self._send(200, session)
        elif m := re.fullmatch(r"/checkout/([\w]+)/pay", path):
            session = sessions.get(m[1])
            if not session:
                return self._missing("session")
            complete(session)
            self._redirect(session.get("success_url") or "/")
        elif m := re.fullmatch(r"/_fake/sessions/([\w]+)/complete", path):
            session = sessions.get(m[1])
            self._send(200, complete(session)) if session else self._missing("session")
        elif m := re.fullmatch(r"/_fake/subscriptions/([\w]+)/(\w+)", path):
            sub = subscriptions.get(m[1])
            if not sub:
                return self._missing("subscription")
            action, bad = m[2], query.get("signature") == "bad"
            if action == "payment_failed":
                sub["status"] = "past_due"
                self._send(200, emit("invoice.payment_failed", invoice_for(sub, "open"), bad=bad))
            elif action == "paid":
                sub["status"] = "active"
                self._send(200, emit("invoice.paid", invoice_for(sub, "paid"), bad=bad))
            elif action == "cancel":
                sub["cancel_at_period_end"] = True
                self._send(200, emit("customer.subscription.updated", sub, bad=bad))
            elif action == "delete":
                sub.update(status="canceled", canceled_at=int(time.time()))
                self._send(200, emit("customer.subscription.deleted", sub, bad=bad))
            else:
                self._missing("action")
        elif m := re.fullmatch(r"/_fake/events/([\w]+)/resend", path):
            event = events.get(m[1])
            if not event:
                return self._missing("event")
            status, body = deliver(event, bad=query.get("signature") == "bad")
            self._send(200, {"event": event["id"], "webhook_status": status, "webhook_body": body})
        else:
            self._missing("route")


if __name__ == "__main__":
    print(f"stripe-fake on :12111, webhooks to {WEBHOOK_URL}")
    ThreadingHTTPServer(("0.0.0.0", 12111), Handler).serve_forever()
