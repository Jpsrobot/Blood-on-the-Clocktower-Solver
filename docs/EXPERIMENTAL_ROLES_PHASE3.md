> **2026-10-12 更新注記:** この文書には旧版の表示漢字が含まれる場合があります。現在の漢字と重複解消の対応表は `CHARACTER_CATALOG_AUDIT.md` を参照してください。

# Experimental Townsfolk, phase 3 (2026-10-10)

Full `src` update based on the previous Balloonist/Banshee/Bounty Hunter/Cannibal build. Seven additional Townsfolk can be selected in user-authored custom scripts. The built-in Trouble Brewing, Bad Moon Rising and Sects & Violets scripts are not changed, and Atheist remains excluded.

## Roles and symbols

| Internal RoleId | Japanese UI | Kanji | Game / solver support |
| --- | --- | --- | --- |
| `choirboy` | 聖歌隊 | 唱 | `[+ the King]` setup link; learns the Demon player if a Demon kills the King while Choirboy is alive and healthy. Invalid early or incorrect direct information rejects that candidate world. |
| `king` | 王 | 王 | Demon knows the starting King's identity; when dead players equal or outnumber living players, a healthy living King receives one living **character**, not the player's identity. Spy registration is allowed. |
| `engineer` | 技師 | 工 | Once at night, choose the Demon character or all Minion characters from the active script. Character transformations are recorded and explored without changing team alignment or retroactive setup counts. |
| `farmer` | 農夫 | 農 | Each healthy Farmer night death changes a surviving good player into Farmer. Candidate worlds branch over Storyteller-selected eligible players; evil Townsfolk remain ineligible. Farmer transformations can cascade on subsequent nights. |
| `fisherman` | 漁師 | 漁 | One daytime advice result, stored as free-text information. No arbitrary-text semantics inferred. |
| `general` | 将軍 | 将 | Every-night recorded Storyteller assessment: good / evil / neither. The assessment is not a direct alignment proof. |
| `high_priestess` | 女教皇 | 巫 | Every-night player recommendation from the Storyteller, including dead players. No forced inference about that person's alignment. |

**Important:** All new user-facing menu text is Japanese. Internal role IDs, enums, tags, event kinds, metadata, and JSON storage fields remain in English.

## Screens and interactions

- Custom script editor turns on `king` automatically when `choirboy` is selected; turning off `king` also removes `choirboy`. Old custom-script snapshots with Choirboy but without King are normalized on read.
- In the self menu, use structured information recording for Choirboy, King, Fisherman, General, or High Priestess. Duplicate nightly info and Fisherman's second use are rejected.
- In the self action menu, Engineer can choose Demon or all Minion characters once. The candidates are restricted to the script. A transformed self player can register becoming Farmer upon a recorded Farmer night death.
- In Demon mode, the starting King's player may be entered as direct King knowledge. This becomes a hard solver lock and is included in assignment sampling.
- Other players' reported role information uses the same shared structured claim UI and chronological history as earlier releases.
- Engineer/Farmer character changes appear in world history and affect role assignments in later phases; prior observations are not retroactively rewritten.

## Implementation and assumptions

- A starting Choirboy requires a separate starting King, with both counting as Townsfolk. King can occur without Choirboy.
- A Choirboy's direct result requires a Demon-attributed night kill of King. King executing or dying to another cause does not trigger it. A recorded ordinary night death under a mechanically supported Demon is treated as a Demon attack unless another source is specified.
- King only receives information after the threshold is reached. Vortox can invert *contents*, not the wake-up condition; poisoned/drunk King information can be arbitrary **after** the threshold. A living healthy Spy can register as another living Townsfolk or Outsider character.
- Engineer changes existing players' characters. Their true teams are retained (including an evil Townsfolk); there is no retroactive Baron or other setup redistribution. The Storyteller's assignment of chosen Minion roles to the Minion players is represented by possible permutations.
- Farmer selection is not assumed to target self. If the user knows they themselves became Farmer, a direct transformation event locks that particular recipient. Deaths and transformation histories are preserved.
- General's assessment, Fisherman's advice, and High Priestess's conversational suggestion are subjective Storyteller information, not mechanical alignment/character proof. No automatic inference is applied to free-text advice.

## Conservative limits

- A King's **starting** identity can be locked in the Demon screen. If King is created or moved later by a role-changing ability, the solver can represent that character change, but the Demon UI does **not** yet give a separate time-stamped hard lock for later King identity announcements.
- Engineer's Minion-selection picker uses the ordinary player-count Minion total. Exotic scripts that add/remove Minion slots or use multiple Demons may need manual representation and do not receive exhaustive Engineer transform enumeration.
- Minion/Demon and Farmer transformations run in the existing simplified night-order model. Rare simultaneous poison / Engineer / Pit-Hag / Farmer interactions may need manual inspection rather than assuming exhaustive candidate histories.
- The Storyteller's intentions for General, Fisherman, and High Priestess cannot be deduced from the board. They are correctly recorded without treating subjective judgement as certainty.
- Test verification uses the bundled engine and a local React declaration shim for the TSX structural check. The user's actual Windows Vite/React `npm run build` and physical-phone click-through are not run in this environment.

## Verification

- Engine compile: `npx tsc -p tsconfig.engine.json --outDir .engine-test` — passed.
- Regression suite: `node tests/engine.cjs` — **191 / 191 passed** (177 pre-existing + 14 phase-3 additions).
- Full offline TS/TSX structural type check with a test-only React declaration shim — passed.
- New tests cover symbols/script scoping, Choirboy/King dependency, Demon King hard knowledge and sampling, King death threshold and Spy registration, Vortox threshold gating, Engineer Demon/Minion replacement and one-time use, chained Farmer conversion, subjective Storyteller information, and malformed payload rejection.
