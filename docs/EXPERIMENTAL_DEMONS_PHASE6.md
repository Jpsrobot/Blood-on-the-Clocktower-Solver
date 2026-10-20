# Experimental Demons — Phase 6 (2026-10-11)

## Scope and install

This update builds directly on the phase-5 Poppy Grower / Preacher / Princess / Shugenja / Steward / Village Idiot release. Replace the existing Vite project's `src` directory with the one in the ZIP, after backing it up; keep your existing `package.json`, `node_modules`, and Android configuration. This is source code, not an APK.

The four new Demons are available in **custom scripts only**. The original three editions, all earlier experimental roles, Traveller logic, and the exclusion of Atheist are preserved. Only user-facing UI strings are Japanese; internal RoleIds, data keys, event identifiers, and solver metadata remain English.

| RoleId | Japanese name | Board symbol | Core mechanic |
| --- | --- | --- | --- |
| `lord_of_typhon` | タイフォン卿 | 卿 | One extra Minion, Minions must sit in a continuous line with Lord in the middle, -? to +? Outsiders |
| `kazali` | カザリ | 傀 | Starting Minions/characters chosen by Kazali, variable Outsider count |
| `legion` | レギオン | 群 | Most players are evil Demons; voting and night deaths use Legion rules |
| `leviathan` | リヴァイアサン | 巨 | Publicly announced at game start, no Demon night attacks; two good executions or surviving past day 5 end game |

Rules references:
- https://wiki.bloodontheclocktower.com/Lord_of_Typhon
- https://wiki.bloodontheclocktower.com/Kazali
- https://wiki.bloodontheclocktower.com/Legion
- https://wiki.bloodontheclocktower.com/Leviathan

## How to record and analyze

### Lord of Typhon

- Setup adds **one** actual Minion over the normal player-count table. The remaining Outsiders can vary, with corresponding Townsfolk changes. Its fixed starting Minions occupy the seats immediately surrounding Lord, in a line with Lord at its center. Mechanical worlds failing this layout are rejected.
- **Relative heuristic weight increases** when multiple distinct players claim a Minion or claim to have used a Minion ability, especially when more are claiming than the ordinary Minion allowance. These *claims are not hard proof* and never force a Minion-count change in non-Lord worlds.
- If playing Lord of Typhon, the Japanese Demon-mode screen offers seat-by-seat **guesses of Minion characters** near you. Predictions are stored (`demonState.typhonPredictions`) but do not hard lock the sampler. Distinct from any actually **known** Minion character/seat entered above the plan.

### Kazali

- Minion count stays as in the ordinary setup table, but the Outsider count branches across all mechanically possible values given total players and available script roles.
- Actual starting Minions and characters selected by the player are entered as known Minions in Demon mode, preserved through save/export/import, and enforced in candidate assignments. No invented Outsider-count certainty.

### Legion

- Legion setup is a **majority of evil Demons**, with zero actual Minions and a smaller good team. Candidate assignments can contain repeated `legion` characters, unlike normal one-copy roles. Shared alignment/vote rules use actual Legion identities, including Legion registering as a Minion to information abilities where applicable.
- The vote rule is evaluated when **recorded voters are known**: an execution is not allowed if *all* voter seats belong to evil players. Missing voter detail is not treated as proof that evil-only voting occurred.
- Legion night deaths are Storyteller-selected, rather than a traditional player-selected Demon action. In Demon mode the user records known Legion allies and sees alliance-oriented advice instead of an attack selector.
- The solver returns `legionConditionalSeats`: each seat's share of Legion identity **given that the sampled world is a Legion game**, separately from the overall evil-team probabilities. The reasoning screen shows those seats as people to question, not guaranteed enemies.
- Odd tallies (a large voting bloc producing zero votes), repeated vote blocks, and noticeably missing reported information modestly adjust **relative sampling weights**, never hard proof. This is deliberately heuristic and is NOT a calibrated empirical probability or a replacement for reliable mechanical data. Other causes for odd votes must be considered.

### Leviathan

- When the active script contains Leviathan, the global **推理** overview shows `リヴァイアサンがゲーム開始時に公式に宣言された` as a checkbox. It is false by default. It is true automatically when the user personally sees their character as Leviathan, in which case it cannot be unticked.
- Without explicit confirmation, **Leviathan candidate worlds are excluded (0%)**. Checking it restricts the candidate Demon to Leviathan and saves as `leviathanConfirmed` with the current game snapshot; unchecking it restores other Demons.
- Leviathan has no normal Demon attack. The solver counts **good players executed** toward two-good-executions evil victory and recognizes completion of Day 5. If a player is executed but remains alive, use the special nomination checkbox `処刑が成立したが本人は生存`; this still counts as an execution. Don't also add the same event as a normal execution death, and don't mark such a day as a no-execution day.
- In a game after the fifth day, the solver can mark the Leviathan result as resolved without incorrectly demanding a night-6 Demon attack.

## Constraints, approximations and jinxes

- The engine is a **bounded sampler**, not an exhaustive mathematical proof or a frequency-calibrated Bayesian model. Percentages depend on script composition, observations, soft claim weights, sampling budget, and hypothesis filtering. For unusual setup scripts, rerun deep search if it finds few worlds.
- Storyteller-specific choices and Djinn jinxes not otherwise implemented in the existing rule engine are not inferred automatically. Some complex interactions between these new Demons and all prior role combinations may still need targeted tests. The King-with-Leviathan information threshold is handled when tested; other exceptional combinations need manual confirmation.
- Night death and vote inference only constrains worlds when the relevant events and voters are recorded. Unobserved or disputed actions should not be silently treated as confirmed.
- Legacy JSON games remain importable; the four new roles and optional `leviathanConfirmed`, `executed`, `legionAllies`, and `typhonPredictions` fields are validated when present.

## Validation

- Base: phase 5, **232 / 232** regression tests passing.
- Phase 6: **258 / 258** regression tests passing (**26** new cases).
- Engine TypeScript compile: passed with `npx tsc -p tsconfig.engine.json --outDir .engine-test`.
- Full offline TSX structural compile with local test-only React declaration shim: passed. This is **not** an installed-dependencies React/Vite build.
- ZIP integrity: verified at packaging time.
- The user's Windows Vite build and physical Android tests were **not** run in this environment.
