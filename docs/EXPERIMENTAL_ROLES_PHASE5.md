> **2026-10-12 更新注記:** この文書には旧版の表示漢字が含まれる場合があります。現在の漢字と重複解消の対応表は `CHARACTER_CATALOG_AUDIT.md` を参照してください。

# Experimental Townsfolk phase 5 — implementation guide (2026-10-10)

This update builds upon **phase 4 (210 regression tests)** and adds six Experimental Townsfolk. They appear **only in custom scripts**, not Trouble Brewing, Bad Moon Rising, or Sects & Violets. `atheist` is still absent. All user-facing interface text is Japanese; all code identities, role IDs, event kinds, role tags, JSON storage fields, and solver enums remain in English.

| Internal role ID | UI name | Symbol | Supported behavior |
| --- | --- | --- | --- |
| `poppy_grower` | ケシ栽培者 | 芥 | Keeps the Demon and Minions from receiving their starting introductions. Demon/Minion mode can record that introduction was blocked and optionally the later night when the team was introduced after the healthy Grower died. The solver reconciles the recorded reveal night against the death timeline. |
| `preacher` | 説教師 | 説 | Each night, choose a seated player (including a dead player). A chosen Minion loses their ability while a living healthy Preacher has the ability; the effect persists across nights and lifts if the Preacher dies or becomes drunk/poisoned. Solver checks Poisoner targeting, Witch/Cerenovus/Pit-Hag actions, Evil Twin, Scarlet Woman succession, and Spy's flexible registration. |
| `princess` | 姫 | 姫 | On the first day as Princess, if they nominated the person actually executed, the Demon cannot kill the following night. The target need not die from execution. The action record requires the matching self nomination; the user confirms that the execution actually occurred. Night deaths explicitly sourced from non-Demons remain possible. Storyteller-dependent deaths should be entered with their source when known. |
| `shugenja` | 修験者 | 修 | First-night clockwise/anticlockwise direction of the nearest registered evil player in the **circular seating order**, with either direction valid for equidistant nearest evil players. Spy/Recluse registration and misinformation are evaluated conservatively. |
| `steward` | 執事 | 執 | First-night player who registers good, including possible healthy Spy registration. Stored as structured player information and checked by the solver. |
| `village_idiot` | 村の愚者 | 愚 | Nightly chosen-player alignment, plus an exception to role uniqueness: one, two, or three original Village Idiots may exist. When at least two are added at setup, the Storyteller chooses exactly one drunk Village Idiot, fixed for that candidate world; when there is only one, they are sober unless another effect impairs them. |

## UI integration

- Custom script maker shows the six new characters; built-in editions stay read-only and unchanged.
- Self menu lets the player save nightly Preacher targets, first-day Princess execution confirmation, Steward first-night player, Shugenja direction, and nightly Village Idiot target/alignment.
- Shared reported-information form includes Steward, Shugenja, and Village Idiot, making it possible to record other players' reported information without requiring the player to be that role.
- Evil modes add an optional **ケシ栽培者による悪陣営の紹介状況** section. A user can record a blocked initial introduction and the later night the evil team learned one another. The app does not pretend to know the evil team merely because Poppy Grower is on the script.
- Reasoning history, undo, snapshot save/import, and JSON schema validation accept the new event types.

## Implementation and interpretation notes

1. Poppy Grower death only triggers its standard evil-team reveal when it was healthy at death. Optional Storyteller variant rules for revealing the team upon drunkenness/poisoning are **not** assumed. A blocked introduction is not inferred solely because the script contains Poppy Grower; it is explicitly recorded.
2. Preacher records **the user's own choice**, not the secret choice of an unobserved Preacher. The Minion receives the Storyteller's notification in the physical game; this app does not yet include a dedicated inbound "I was preached" event in evil mode. Rare experimental Minion jinxes beyond the existing implemented Minion rules may still require manual interpretation.
3. Princess suppression applies to **Demon-caused kills**, not all deaths. A user-confirmed execution with no death is supported. The action is modeled when explicitly recorded; unreported private abilities are not treated as verified facts. Later character creation is checked against recorded role changes, but the current self-role UI may need manual updating to record a role acquired midgame.
4. The current first-night reported-information screens assume the standard starting setup for Steward and Shugenja. A role created mid-game may require a manually entered narrative note rather than a newly inferred first-night constraint.
5. Village Idiot duplicates are a deliberate, sole exception to setup role uniqueness. Its drunk player is one consistent hidden choice per candidate history, not a different player every time someone reports a result. Other causes of impairment may still override readings independently. Sampling is approximate, not an exhaustive search of all candidate worlds.
6. Poppy Grower / Spy Grimoire-jinx interactions and combinations with future unsupported experimental abilities are not comprehensively simulated. Continue to record exceptional Storyteller rulings manually where needed.

## Verification

- Baseline (phase 4): **210 / 210** regression tests passing.
- Current (phase 5): **232 / 232** regression tests passing, +22 tests.
- TypeScript engine check passes using `tsc -p tsconfig.engine.json --outDir .engine-test`.
- Full offline TypeScript/TSX structural check passes with a local *test-only* React declaration shim (not part of delivered `src`).
- ZIP file integrity verified after packaging.
- User's actual Windows `npm run build`, browser click-through, and physical Android installation **not tested** in this environment.

### Running the app

Unzip this update and **replace the existing project's `src` folder** (after backing up the old one). Keep the existing project's `package.json`, `node_modules`, Vite config, and platform/Android project setup. From that project directory, run `npm run build` or `npm run dev`. This ZIP contains source code, tests, and notes; it is **not** an APK or complete standalone Node project.

### Official reference

- https://wiki.bloodontheclocktower.com/Poppy_Grower
- https://wiki.bloodontheclocktower.com/Preacher
- https://wiki.bloodontheclocktower.com/Princess
- https://wiki.bloodontheclocktower.com/Shugenja
- https://wiki.bloodontheclocktower.com/Steward
- https://wiki.bloodontheclocktower.com/Village_Idiot
