# Regression tests

Run from the repository root with the lockfile dependencies installed:

```sh
npm ci
npm test
npm run test:harness
npm run test:branding
npm run build
```

`npm test` compiles current TypeScript sources using `tsconfig.engine.json` and
runs `engine.cjs`. The runner explicitly loads suites in their original order.
`fixtures.cjs` holds shared imports and fresh game constructors; `harness.cjs`
collects results, continues after failures and sets a failing exit status.
`test:harness` verifies failure propagation in an isolated child process.

The original 407 assertions are retained in 22 suites. Four additional tests
roundtrip JSON snapshots in `saves/`, covering legacy missing optional fields,
Japanese names, BMR Grandmother information, S&V and custom scripts. These are
synthetic fixtures validated against commit `0b7cdda`, not recovered user saves.
The engine report is written to `tests/results.json`.

## Browser regression gate

```sh
npx playwright install chromium
npm run test:ui
```

The browser script starts and stops its own Vite server on port 4179, launches
headless Chromium with a 393x851 viewport, and uses real localStorage and app
workers. `BOTC_TEST_PORT` can override the port. `BOTC_CHROMIUM_PATH` can point to
an already installed compatible Chromium executable.

It checks Japanese branding, nine-player setup, editing a Japanese name, full
snapshot undo after advancing a night, pagehide/reload/resume, all four saved-game
fixtures, and corrupt-primary/valid-backup recovery. It fails on runtime page
exceptions. It does not certify physical Android backgrounding or all role UI
flows. More interaction scenarios are required before extracting their panels.

The old `ui-results.json` and `demo-results.json` are historical reports, not
results produced by this new script. The new browser script has not yet passed
in the refactoring environment: Chromium downloads returned invalid archives.

Some engine tests inspect source text. Preserve their intent when relocating UI
code, and add behavioral browser checks before replacing those assertions.

## Refactoring gates

After each extraction: run all engine tests, the harness check, branding, build,
and relevant browser flows. Compare lint against the recorded existing baseline
(69 errors, 4 warnings); do not silently disable rules or fix unrelated behavior.
Maintain original Japanese strings, role identifiers/symbols and iteration order,
save keys/schema, event linkage and solver ordering. Bug fixes are separate work.
