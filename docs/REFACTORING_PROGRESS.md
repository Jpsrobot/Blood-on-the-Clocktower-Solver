# Modular refactoring progress

Base: `0b7cddabe505200c464b94844ad89a8d1276a0c3` (main).

## Completed preparation and test organization

- Installed the existing lockfile dependencies without upgrading production dependencies.
- Production build passes; existing bundle-size warning remains.
- Original engine suite passes 407/407 when TypeScript 6 is given explicit
  `rootDir: src` and `ignoreDeprecations: "6.0"`. Added those two test-only
  configuration settings so the normal runner works.
- Branding passes 7/7.
- Existing lint baseline: 69 errors and 4 warnings. No lint fixes included.
- Split the 235 KB engine test file into 22 suites, shared fixtures, and a small
  result harness. Compared parsed original test statements against relocated
  statements: all 407 test bodies and their order match, apart from relative paths and one trailing space.
- Added four synthetic saved-game JSON fixtures and roundtrip tests: 411/411 pass.
- Verified failure propagation with a deliberately failing child-process test.
- Added pinned Playwright as a test-only dependency and a repeatable browser
  regression script. Its JavaScript syntax check passes, but Chromium installation
  failed with invalid downloaded archives, so browser behavior is not yet verified.
- Application, Android and public asset files are unchanged.

## Gate before application extraction

Run `npx playwright install chromium` and `npm run test:ui` in an environment with
a working Chromium download (or set `BOTC_CHROMIUM_PATH`). Resolve harness failures
against the unchanged app before treating this as a baseline. Do not infer that
the historical UI report validates the new harness.

## Remaining approved stages

1. Extract simple screens/display helpers, keeping state ownership unchanged.
2. Split player/self/Traveller forms and Minion/Reasoning panels with per-flow tests.
3. Extract persistence behind the existing storage API, preserving schema v2,
   optional records, primary/backup keys, checkpoints and linked-event deletion.
4. Extract lifecycle hooks, preserving synchronous save and resume/undo/archive behavior.
5. Separate catalog/type definitions with compatibility exports and stable ordering.
6. Split mechanics from pure registration/setup helpers toward action/death handlers;
   keep timeline orchestration intact until fixed-seed comparison tests protect it.

Each stage requires the regression gates described in `tests/README.md`. Keep
rule corrections, percentage changes and expanded role support separate from moves.
