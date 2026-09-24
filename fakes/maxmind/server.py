"""A fake MaxMind Insights, so the bench can drive geo without a paid key.

CLAUDE.md: the bench has "fakes for every external service". This is that, for the
one external call the signup gate makes (F2-S5).

It answers `GET /geoip/v2.1/insights/<ip>` with a body shaped like the real one, and
what it claims is set per-run by environment:

    FAKE_COUNTRY=US FAKE_VPN=1     an anonymised address that claims a Tier 1 country
    FAKE_COUNTRY=NG FAKE_VPN=0     an ordinary address in a country absent from the
                                   tier table, so Tier 3 for the geographic reason
    FAKE_STATUS=503                the provider having a bad day, for the fail-open path
    FAKE_BODY=garbage              a 200 that is not the shape we expect

Only the fields `app/features/auth/tier.py` actually reads are filled. This is a
stand-in for one call, not an emulation of MaxMind.
"""

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

COUNTRY = os.environ.get("FAKE_COUNTRY", "US")
VPN = os.environ.get("FAKE_VPN", "0") == "1"
STATUS = int(os.environ.get("FAKE_STATUS", "200"))
BODY_MODE = os.environ.get("FAKE_BODY", "insights")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802  (the stdlib names it)
        if not self.path.startswith("/geoip/v2.1/insights/"):
            self.send_error(404)
            return

        if STATUS != 200:
            self.send_response(STATUS)
            self.end_headers()
            self.wfile.write(b'{"code":"SERVER_ERROR"}')
            return

        if BODY_MODE == "garbage":
            payload: object = ["not", "an", "object"]
        else:
            payload = {
                "country": {"iso_code": COUNTRY},
                "traits": {
                    "is_anonymous": VPN,
                    "is_anonymous_vpn": VPN,
                    "is_public_proxy": False,
                    "is_hosting_provider": False,
                    "is_tor_exit_node": False,
                },
            }

        raw = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"fake-maxmind {fmt % args}", flush=True)


if __name__ == "__main__":
    print(
        f"fake-maxmind up: country={COUNTRY} vpn={VPN} status={STATUS} body={BODY_MODE}",
        flush=True,
    )
    HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
