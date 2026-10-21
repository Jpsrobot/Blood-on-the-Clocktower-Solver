Current Bugs:
The Bad Moon Rising, Sects and Violets, and experimentals roles are not properly implemented yet. 
The minion percentages are not properly implemented and in the 推理 menu, every character tagged "minion" should be there along with the percentage chance they are in  the game.
The demon percentages are not properly implemented and in the 推理 menu, every character tagged "demon" should be below the minions along with the percentage chance they are in the game. 
The 続ける button disappears and is not working as it should.

## 2026-10-21 — S&V audit, first corrective slice

- Fixed actual-character swapping for Philosopher using Snake Charmer, including
  historical information and Spy-advisor replay; alignment remains separate.
- Added six regressions, including save/reload, undo and No Dashii/Vortox transfers.
- Recorded all 25 role statuses, required timing, five Traveller boundaries and
  follow-up regression stages in `docs/SNV_AUDIT_2026-10.md`.
- Full S&V completion remains open; this is a focused correction.
