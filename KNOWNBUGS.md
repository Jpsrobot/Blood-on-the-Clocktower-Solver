# Known issues and verification status

This records the refactoring baseline and subsequent verified corrections.

## Reported in PROGRESS.md; needs behavior-level reproduction

- BMR, S&V and experimental role implementation is incomplete.
- Minion/Demon percentage data and listing corrected on `fix/role-probabilities`; see `docs/PROBABILITY_DISPLAY_FIX.md` for definitions, tests and remaining device-verification limits.
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

## S&V corrective audit (2026-10-21)

See [the 25-role status and timing checklist](docs/SNV_AUDIT_2026-10.md).
The Philosopher/Snake Charmer swap now gives the former Demon the actual
Philosopher character, including information/advisor history replay. Save data
format is unchanged. Six new regressions cover the correction and related paths.
This does not close the general S&V implementation issue: shared acquired-ability
timing, exact Barber swaps, Twin re-pairing, structured Artist deduction and
complete multi-source interactions remain outstanding. Existing role metadata
marked `full` should not be read as certification of every interaction.
