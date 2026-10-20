# Djinn victory conditions — implementation / limitations

Updated October 14, 2026. The user-facing interface remains Japanese, internal keys remain English.

## Visibility policy

- `OFFICIAL_JINXES`: 90 source entries retained for developer reference and future changes.
- `JINXES`: 29 entries actually relevant to model behavior or an alternate victory (15 mechanical/setup and 14 alternate victories). Only this active subset appears in Script Manager and 推理.
- 61 manual/inert/unimplemented entries are NOT displayed. An active pairing is public because both roles appear on the script; the app does not infer both are in play.
- Script automatic additions remain Choirboy -> King, Huntsman -> Damsel, only.

## Alternate victories now handled

| Pair | Ending | How confirmed |
|---|---|---|
| Alchemist / Summoner | A no-Demon start and 1 extra Townsfolk; Alchemist dies before creating a Demon -> evil win. | Solver from actual actions/deaths. N3 creation is sampled (unrecorded choice remains bounded). |
| Al-Hadikhia / Mastermind | Executed Al-Hadikhia with a living Mastermind: all three selected good players choose to live -> evil win; otherwise good win. | Explicit Storyteller-confirmed three-choice result in 推理. |
| Leviathan / Mayor | On Day 5 both characters alive and no execution -> good win. | Auto from Day 5 no-execution log and legal role worlds. |
| Riot / Mayor | Mayor ends riot: exactly one living Riot -> good win; otherwise evil win. | Explicit confirmed stop in 推理; number of living Riots checked against world. |
| Leviathan or Riot / Soldier | Demon nominates and executes Soldier -> good win. | Auto from nominator, execution and actual role in world. |
| Leviathan or Riot / Grandmother | Grandchild **dies** by execution -> evil win. | Storyteller-confirmed grandchild in 推理 plus an actual death-by-execution entry; a surviving executee is insufficient. |
| Leviathan or Riot / Monk, Exorcist, Innkeeper | The Demon nominates and executes the protected/chosen player -> good win. | Confirmed protection in 推理 plus recorded Demon nomination/execution. The solver may auto-detect *self* Monk or Exorcist from same-night actions, but other-player private targets require confirmation. |

## One additional mechanical exception

- Lleech / Mastermind: if the poisoned Lleech host dies by **execution** while Mastermind is alive, Lleech remains alive and loses immortality/poisoning ability. A host dying by other means still kills Lleech. This is a non-victory rule that directly changes whether the Demon survives, so it remains visible.

## Important boundaries

- Event records that say a Storyteller-verified condition occurred are not inferred from public claims. They restrict candidate worlds and, where confirmed, set a winning alignment.
- A confirmed victory must match actual character seats, recorded deaths, and required nominations, rather than only having both roles on the script.
- Good/evil winner is a model state, not a final verification of the game's real-world result without a confirmed event.
- Do not assume all former 90 jinxes are fully handled. Specifically, detailed Storyteller-dependent night choices and arbitrary outcomes not affecting modeled victory remain outside the displayed/implemented scope.
- Alchemist/Summoner Night 3 target is bounded by script and legal changes; no private Storyteller decision is invented as a fact. Overlapping multiple Summoner abilities and unusual character-transformation interactions may still be approximate.
- Use a verified Day 5 no-execution record for Leviathan/Mayor. Avoid marking no execution before the actual day finishes.
- Historic save files omitting `jinxVictoryLog` remain valid. New reports are optional, validated, saved/restored and can be deleted independently.

## Verification

- `npx tsc -p tsconfig.engine.json --outDir .engine-test` — passed.
- `node tests/engine.cjs` — **358 / 358** passed (baseline 343, 15 new).
- Offline TypeScript/TSX structural compilation with test-only React declarations — passed.
- Windows Vite build, browser click-through and Android device tests were not performed in this container environment.

References: https://release.botc.app/resources/data/jinxes.json and https://wiki.bloodontheclocktower.com/Djinn
