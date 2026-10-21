# Known issues and verification status

This records the refactoring baseline; it does not declare reported bugs fixed.

## Reported in PROGRESS.md; needs behavior-level reproduction

- BMR, S&V and experimental role implementation is incomplete.
- Minion/Demon percentages and their listing in the reasoning menu need review.
- The continue button has been reported missing or unreliable.

Later documentation describes save/resume and BMR timing fixes. The current
engine regressions pass, including empty optional role records, corrupt-primary
backup recovery and Grandmother save/reopen. That does not prove every UI/device
path works. Reconcile individual reports against actual reproduction before
closing them; preserve current behavior during module extraction.

## Documented limitations

`docs/BMR_TIMING_AND_ROLE_AUDIT.md` describes partial simulation of conditional
waking, Storyteller choices, poison/protection and several Demon effects. Keep
those limitations visible; passing regression tests is not full rules certification.

## Tooling baseline

- Lint: 69 existing errors, 4 warnings. Production build succeeds.
- Original engine test configuration failed under TypeScript 6 (TS5107 and TS5011).
  The refactoring branch supplies explicit rootDir and the deprecation setting;
  current engine tests pass 411/411.
- New browser harness is awaiting its first complete run: the environment's
  Chromium download returned invalid ZIP archives. Physical Android lifecycle
  testing remains outstanding.
