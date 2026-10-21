Current Bugs:
The Bad Moon Rising, Sects and Violets, and experimentals roles are not properly implemented yet. 
The 続ける button disappears and is not working as it should.

## 2026-10-21 — S&V audit, first corrective slice

- Fixed actual-character swapping for Philosopher using Snake Charmer, including
  historical information and Spy-advisor replay; alignment remains separate.
- Added six regressions, including save/reload, undo and No Dashii/Vortox transfers.
- Recorded all 25 role statuses, required timing, five Traveller boundaries and
  follow-up regression stages in `docs/SNV_AUDIT_2026-10.md`.
- Full S&V completion remains open; this is a focused correction.

## Minion and Demon percentage correction

- Dynamic active-script character listing, labeled initial-setup presence.
- Weighted current Minion-character share added; Demon-character share includes dead players.
- Japanese player metrics distinguish evil alignment, Minion, Demon and drunkenness.
- Valid sample zeroes display as 0%; missing samples remain unavailable.
- Stale worker callbacks are ignored; legacy saves remain supported.
- 432/432 regressions and production build pass. See `docs/PROBABILITY_DISPLAY_FIX.md`.
