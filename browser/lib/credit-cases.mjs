// F14's credit rows (D-236): the api's meter (app/features/ai/meter.py) against answers worked
// by hand. Metering, the estimate and its ceiling, holds, settlement, refunds, the minimum
// charge and rounding. The meter lives on the api only (the browser shows what it is told),
// so these rows run through one engine and are checked against the hand-worked figure.
//
// Credits are strings to four decimals, as stored. Prices are USD per 1M tokens; the regime
// is [retail per credit, margin]: $0.01 and 30 % is $0.0070 a credit.

const LITE = ["0.10", "0.40"]; // gemini-2.5-flash-lite, list 2026-10-02
const FLASH = ["0.30", "2.50"]; // gemini-2.5-flash, list 2026-10-02
const LEGACY = ["0.075", "0.30"]; // legacy's stale row for gemini-2.5-flash
const R30 = ["0.01", "0.30"];
const NANO = ["0.05", "0.40"]; // gpt-5-nano, list 2026-10-03 (D-252)
const G31_LITE = ["0.25", "1.50"]; // gemini-3.1-flash-lite, list 2026-10-03
const G35_LITE = ["0.30", "2.50"]; // gemini-3.5-flash-lite, list 2026-10-03
const G35_FLASH = ["1.50", "9.00"]; // gemini-3.5-flash, list 2026-10-03

export const CREDIT_CASES = [
  // --- Metering: (in × price_in + out × price_out) / 1e6 / 0.007, at least 0.01, 4 dp half up.
  // Auto-Name's median call on legacy (2,483 in, 124 out) on Flash-Lite:
  // (248.3 + 49.6) / 1e6 = $0.0002979 → / 0.007 = 0.042557 → 0.0426.
  { id: "credit-autoname-lite", kind: "price", tokensIn: 2483, tokensOut: 124, price: LITE, regime: R30, expect: { credits: "0.0426" } },
  // The same call on 2.5 Flash at today's price: (744.9 + 310) / 1e6 = $0.0010549 → 0.150700 → 0.1507.
  { id: "credit-autoname-flash", kind: "price", tokensIn: 2483, tokensOut: 124, price: FLASH, regime: R30, expect: { credits: "0.1507" } },
  // Extract Schedule's median (2,803 in, 4,241 out) on 2.5 Flash: (840.9 + 10,602.5) / 1e6 = $0.0114434 → 1.634771 → 1.6348.
  { id: "credit-schedule-flash", kind: "price", tokensIn: 2803, tokensOut: 4241, price: FLASH, regime: R30, expect: { credits: "1.6348" } },
  // Legacy's own figure for Auto-Name at its stale row: (186.225 + 37.2) / 1e6 = $0.000223425 → 0.031918 → 0.0319 (legacy's live median 0.032).
  { id: "credit-autoname-legacy-row", kind: "price", tokensIn: 2483, tokensOut: 124, price: LEGACY, regime: R30, expect: { credits: "0.0319" } },
  // The minimum: (10 + 4) / 1e6 = $0.000014 → 0.002 → 0.01.
  { id: "credit-minimum", kind: "price", tokensIn: 100, tokensOut: 10, price: LITE, regime: R30, expect: { credits: "0.0100" } },
  // Half up, not half even: 8,715 in at $0.01 = $0.00008715 → 0.01245 → 0.0125 (half even would say 0.0124).
  { id: "credit-round-half-up", kind: "price", tokensIn: 8715, tokensOut: 0, price: ["0.01", "0"], regime: R30, expect: { credits: "0.0125" } },
  // The provider's bill for the schedule call, to the cent of a cent: $0.0114434.
  { id: "credit-cost-usd", kind: "cost", tokensIn: 2803, tokensOut: 4241, price: FLASH, expect: { costUsd: "0.01144340" } },

  // --- The estimate and the ceiling (D-236 4, 6).
  // A 1400 × 900 title-block crop on Gemini: 3 × 2 tiles of 512 = 6 × 258 = 1,548, + 600 chars / 3 = 200 → 1,748 in.
  // ≈ (1,748 in, 150 out): (174.8 + 60) / 1e6 / 0.007 = 0.033543 → 0.0335.
  // At most (ceil(1,748 × 1.25) = 2,185 in, 300 out): (218.5 + 120) / 1e6 / 0.007 = 0.048357 → 0.0484.
  { id: "credit-estimate-titleblock", kind: "estimate", tool: "title_block", provider: "gemini", promptChars: 600, width: 1400, height: 900, typicalOut: null, price: LITE, regime: R30, expect: { tokensIn: 1748, estimate: "0.0335", ceiling: "0.0484" } },
  // A small crop is 258 tokens; Ask AI's cap is 1,500, its usual 400.
  // 258 + 900 / 3 = 558 in. ≈ (558, 400): (55.8 + 160) / 1e6 / 0.007 = 0.030829 → 0.0308. At most (698, 1,500): (69.8 + 600) / 1e6 / 0.007 = 0.095686 → 0.0957.
  { id: "credit-estimate-ask-small", kind: "estimate", tool: "ask", provider: "gemini", promptChars: 900, width: 300, height: 200, typicalOut: null, price: LITE, regime: R30, expect: { tokensIn: 558, estimate: "0.0308", ceiling: "0.0957" } },
  // The workspace's own median output replaces the table: 120 out. ≈ (1,748, 120): (174.8 + 48) / 1e6 / 0.007 = 0.031829 → 0.0318.
  { id: "credit-estimate-median", kind: "estimate", tool: "title_block", provider: "gemini", promptChars: 600, width: 1400, height: 900, typicalOut: 120, price: LITE, regime: R30, expect: { tokensIn: 1748, estimate: "0.0318", ceiling: "0.0484" } },

  // --- Holds and settlement (D-236 7): no overdraft, never below zero.
  // Hold 0.5, charge the actual 0.2 from included, release the rest.
  { id: "credit-hold-settle", kind: "wallet", start: ["10", "5", "0"], ops: [["hold", "0.5"], ["settle", "0.5", "0.2"]], expect: { included: "9.8000", purchased: "5.0000", held: "0.0000", charged: "0.2000", refused: null } },
  // Included runs out mid-charge: 0.1 from included, 0.2 from purchased.
  { id: "credit-spill-to-purchased", kind: "wallet", start: ["0.1", "5", "0"], ops: [["hold", "0.5"], ["settle", "0.5", "0.3"]], expect: { included: "0.0000", purchased: "4.8000", held: "0.0000", charged: "0.3000", refused: null } },
  // The pool cannot hold the ceiling (0.2 + 0 − 0.1 held = 0.1 < 0.2): refused, nothing moves.
  { id: "credit-refuse-pool", kind: "wallet", start: ["0.2", "0", "0.1"], ops: [["hold", "0.2"]], expect: { included: "0.2000", purchased: "0.0000", held: "0.1000", charged: "0.0000", refused: "pool" } },
  // The person's monthly limit has 0.3 left: a 0.5 ceiling is refused though the pool has plenty.
  { id: "credit-refuse-user-limit", kind: "wallet", start: ["100", "0", "0"], ops: [["hold", "0.5", { limitLeft: "0.3" }]], expect: { included: "100.0000", purchased: "0.0000", held: "0.0000", charged: "0.0000", refused: "user_limit" } },
  // Tier 3's trial cap has 0.04 left: the 0.0484 title-block ceiling is refused.
  { id: "credit-refuse-trial-cap", kind: "wallet", start: ["30", "0", "0"], ops: [["hold", "0.0484", { trialLeft: "0.04" }]], expect: { included: "30.0000", purchased: "0.0000", held: "0.0000", charged: "0.0000", refused: "trial_cap" } },
  // Refund: a failed or unusable answer releases the whole hold, charged 0.
  { id: "credit-refund-unusable", kind: "wallet", start: ["10", "0", "0"], ops: [["hold", "0.5"], ["release", "0.5"]], expect: { included: "10.0000", purchased: "0.0000", held: "0.0000", charged: "0.0000", refused: null } },
  // An input counted short: the actual 0.7 passes the 0.5 held; the charge stops at the 0.6 the wallet has.
  { id: "credit-actual-over-hold", kind: "wallet", start: ["0.6", "0", "0"], ops: [["hold", "0.5"], ["settle", "0.5", "0.7"]], expect: { included: "0.0000", purchased: "0.0000", held: "0.0000", charged: "0.6000", refused: null } },
  // Two calls at once: A holds 0.6 of 1; B's 0.5 no longer fits and is refused.
  { id: "credit-concurrent-refused", kind: "wallet", start: ["1", "0", "0"], ops: [["hold", "0.6"], ["hold", "0.5"]], expect: { included: "1.0000", purchased: "0.0000", held: "0.6000", charged: "0.0000", refused: "pool" } },
  // A charge never eats a colleague's hold: A (0.5) and B (0.4) hold 0.9 of 1. A settles at 0.8: only 0.6 is free → 0.6.
  // B then settles at 0.4 from the 0.4 left → 0. Charged 0.6 + 0.4.
  { id: "credit-colleague-hold-kept", kind: "wallet", start: ["1", "0", "0"], ops: [["hold", "0.5"], ["hold", "0.4"], ["settle", "0.5", "0.8"], ["settle", "0.4", "0.4"]], expect: { included: "0.0000", purchased: "0.0000", held: "0.0000", charged: "1.0000", refused: null } },
  // A period's refill on Professional: 2 seats × 100; the 3.2 left of the old allowance is gone, the 7 purchased stays.
  { id: "credit-refill", kind: "wallet", start: ["3.2", "7", "0"], ops: [["refill", 2]], expect: { included: "200.0000", purchased: "7.0000", held: "0.0000", charged: "0.0000", refused: null } },
  // On Essentials (0 credits a seat, D-281): 3 seats refill nothing; the purchased 7 stays.
  { id: "credit-refill-essentials", kind: "wallet", start: ["3.2", "7", "0"], ops: [["refill", 3, "0"]], expect: { included: "0.0000", purchased: "7.0000", held: "0.0000", charged: "0.0000", refused: null } },

  // --- A primary and a fallback (D-252 5): "≈" is the primary's, the hold the dearer ceiling,
  // a refusal free, the answer charged at the price of the model that gave it.
  // The founder's defaults on the 1400 × 900 title block: gpt-5-nano, then gemini-3.1-flash-lite.
  // nano's input: 44 × 29 = 1,276 patches × 2.46 = 3,138.96 → 3,139, + 200 = 3,339.
  // ≈ nano (3,339, 150): (166.95 + 60) / 1e6 / 0.007 = 0.032421 → 0.0324.
  // Ceilings: nano (4,174, 300): (208.7 + 120) / 1e6 / 0.007 = 0.046957 → 0.0470;
  // 3.1 Flash-Lite (2,185, 300): (546.25 + 450) / 1e6 / 0.007 = 0.142321 → 0.1423. Held: the higher, 0.1423.
  { id: "credit-chain-defaults", kind: "chain", tool: "title_block", promptChars: 600, width: 1400, height: 900, typicalOut: null, chain: [["openai", NANO], ["gemini", G31_LITE]], regime: R30, expect: { tokensIn: 3339, estimate: "0.0324", ceiling: "0.1423" } },
  // The dearer model first: ≈ 3.5 Flash (1,748, 150): (2,622 + 1,350) / 1e6 / 0.007 = 0.567429 → 0.5674;
  // its ceiling (2,185, 300): (3,277.5 + 2,700) / 1e6 / 0.007 = 0.853929 → 0.8539, above nano's 0.0470.
  { id: "credit-chain-dear-first", kind: "chain", tool: "title_block", promptChars: 600, width: 1400, height: 900, typicalOut: null, chain: [["gemini", G35_FLASH], ["openai", NANO]], regime: R30, expect: { tokensIn: 1748, estimate: "0.5674", ceiling: "0.8539" } },
  // Gemini refuses (no credit), nano answers Auto-Name's median (2,483 in, 124 out): the refusal 0,
  // the answer at nano's price: (124.15 + 49.6) / 1e6 / 0.007 = 0.024821 → 0.0248.
  { id: "credit-fallback-answers", kind: "attempts", attempts: [null, [2483, 124]], prices: [G31_LITE, NANO], regime: R30, expect: { charges: ["0.0000", "0.0248"], answered: 1 } },
  // The primary answers: the fallback is never tried. 3.1 Flash-Lite: (620.75 + 186) / 1e6 / 0.007 = 0.11525 → 0.1153 (half up).
  { id: "credit-primary-answers", kind: "attempts", attempts: [[2483, 124], [2483, 124]], prices: [G31_LITE, NANO], regime: R30, expect: { charges: ["0.1153"], answered: 0 } },
  // A schedule falls back from nano to 3.5 Flash-Lite and is charged at 3.5 Flash-Lite's price, not nano's:
  // (840.9 + 10,602.5) / 1e6 / 0.007 = 1.634771 → 1.6348 (nano's would be 0.2624).
  { id: "credit-fallback-own-price", kind: "attempts", attempts: [null, [2803, 4241]], prices: [NANO, G35_LITE], regime: R30, expect: { charges: ["0.0000", "1.6348"], answered: 1 } },
  // Both refuse: nothing charged, no answer.
  { id: "credit-both-refuse", kind: "attempts", attempts: [null, null], prices: [NANO, G31_LITE], regime: R30, expect: { charges: ["0.0000", "0.0000"], answered: null } },
  // The wallet: hold the chain's 0.1423, the fallback's 0.0248 charged, the rest released.
  { id: "credit-fallback-wallet", kind: "wallet", start: ["10", "0", "0"], ops: [["hold", "0.1423"], ["settle", "0.1423", "0.0248"]], expect: { included: "9.9752", purchased: "0.0000", held: "0.0000", charged: "0.0248", refused: null } },
];
