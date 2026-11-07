# Release notes for testers

What a tester sees change, newest first. Each entry names its decisions in `DECISIONS.md`.

## Disposal, haul trucks and clearing (2026-11-07)

- **Saved estimates: tipping becomes Disposal.** A saved estimate's tipping (dump) fees become their own
  "Disposal" cost kind on the line's next Calculate, and the line's total may change then (D-1029, D-1035).
  Disposal is untaxed unless it is ticked in the Bid Summary's tax ticks; it has its own report and export column.
- **Dump sites.** A company keeps its dump sites (materials taken, fee by the load, LCY, ton, free or paying us,
  distance); each disposal line takes the lowest total of fee and trucking and shows the runner-up. With no site, the
  library's fallback fee is used and a large line is flagged "Check dump fee" until a site is chosen or the fee
  confirmed (D-1035, D-1043).
- **Haul trucks on a cycle.** Trucks off site are counted from a load, dump, dump-queue and travel cycle over the
  haul distance, a setting of its own apart from the mob distance; "Haul distance not set" flags a line without one.
  The Equipment settings show the truck's payload, speeds, dump time and the new dump queue / scale time (D-1035,
  D-1043).
- **Cut to export.** Cut that leaves the site is priced as excavate-and-load straight into the haul trucks, with the
  loader paced to its trucks (D-1037).
- **Clearing.** Medium and heavy clearing run heavier crews and machines than light; the clearing debris haul-off is
  loaded by a wheel loader, so the loader is costed (D-1039, D-1043).
- **Small quantities.** A small line whose work a machine already on the project can do is priced on that machine's
  own hours with no rental minimum or mob, marked "By machines on site" (D-1040).
