> **2026-10-12 更新注記:** この文書には旧版の表示漢字が含まれる場合があります。現在の漢字と重複解消の対応表は `CHARACTER_CATALOG_AUDIT.md` を参照してください。

# Experimental Townsfolk, phase 4 (2026-10-10)

This is a complete `src` update based on the previous 191-test release. Experimental Townsfolk can be selected only via the custom script maker; all three built-in scripts are unchanged. Atheist remains excluded. UI-visible labels are Japanese, while `RoleId`, tags, event kinds, solver internals and JSON fields remain in English.

## Newly supported roles

| RoleId | Japanese name | UI symbol | Behavior |
| --- | --- | --- | --- |
| `huntsman` | 猟師 | 狩 | `[+ Damsel]`; one-use night choice. If a healthy Huntsman selects the actual living Damsel, it becomes a Storyteller-selected out-of-play Townsfolk. This is a character change, not an alignment change. |
| `knight` | 騎士 | 騎 | N1 structured pair of players who are not the Demon. The solver checks truthful information or false information with Vortox; poisoned/drunk sources remain uncertain. |
| `lycanthrope` | 人狼 | 狼 | N2+ nightly living-player selection. Recorded good-target night death suppresses ordinary Demon kills when successful. Exactly one starting good player is the persistent `fauxPaw` and registers evil while a healthy Lycanthrope lives; this changes registration, not the player's actual team. |
| `magician` | 魔術師 | 魔 | Starting real Demon learns an extra supposed Minion (the Magician). Real Minions can record two shown Demon seats, one real Demon and one good Magician, without hard-locking either before confirmation. |
| `nightwatchman` | 夜警 | 夜 | One-use nightly choice recorded. Recipient learns the user is Nightwatchman; a recipient's public report is entered separately as ordinary evidence. |
| `noble` | 貴族 | 貴 | N1 three-player information where exactly one registers evil. Spy, Recluse, Lycanthrope's Faux Paw, poison/drunk and Vortox interactions are handled by information evaluation. |
| `pixie` | ピクシー | 妖 | N1 shown in-play Townsfolk character. When the original role's holder dies, an explicit Storyteller confirmation of madness lets the Pixie inherit the shown ability; the role and alignment do not change. |
| `damsel` *(supporting Outsider)* | 乙女 | 乙 | The Huntsman's setup dependency. All Minions collectively have one public Damsel guess; correct guess of an alive, healthy Damsel ends the game for evil. A Spy (and future Widow) jinx disables the Damsel ability if that character has ever been in play. |

## Screens

- Custom script maker: enabling Huntsman automatically includes Damsel; disabling Damsel disables Huntsman. Existing custom scripts and game snapshots are normalized to preserve the dependency. Damsel can be selected without Huntsman.
- Self information: Knight (2 players), Noble (3 players), and Pixie (one Townsfolk character) use Japanese forms with structured saving.
- Other players' reported information: same shared forms and chronological reports as previous information roles.
- Self actions: Huntsman one-shot night target + optional resulting Townsfolk; Nightwatchman one-shot target; Lycanthrope N2+ target with a recorded died/did-not-die outcome; Pixie Storyteller-confirmed inheritance.
- The self menu provides a separate public Damsel-guess entry, including the Minion player, guessed player, and whether the game ended. A recorded correct guess must match the candidate world's actual outcome.
- Demon mode: an additional Magician seat may appear among the starting shown Minions. Minion mode: two shown Demon candidates can remain unresolved, and optional later confirmation may identify the actual Demon.
- Role change, deaths and inferred information remain in historical candidate worlds; an action's outcome is not retroactively applied to earlier phases.

## Mechanical assumptions and limits

- **Damsel is included because Huntsman cannot function without it.** Damsel is an Outsider, not an eighth Townsfolk. The Huntsman's extra Outsider can replace an initial Townsfolk, using the existing setup count branch logic. The alternative in which Damsel is already one of the existing Outsiders remains legal.
- **Lycanthrope:** the one good Faux Paw choice is branched as hidden state and remains fixed across the same candidate history. Its evil registration propagates into alignment-detecting information; its underlying team is still good. If Lycanthrope is dead/impaired it stops applying. Lycanthrope night kills are recorded by the user as actions **and** as night death events. The app does not automatically create a death when a target is chosen.
- **Magician:** Minion/Demon candidate introductions model ordinary starting information. Rare interactions involving Poppy Grower, Marionette, Spy Grimoire removal, and other special jinxes are not fully automated here. The source of extra evil-team introduction is explicitly represented as a *good* Magician, never an actual Minion.
- **Huntsman:** the solver branches over all unused Townsfolk possibilities if the new character is unknown. When it is observed, choose the actual transformed character in the action form. Poison/drunk Huntsman can waste its one use; poisoned Damsel can still be transformed if Huntsman is healthy.
- **Pixie:** confirmation that the Pixie was sufficiently mad is Storyteller-dependent and must be entered manually; the solver does not infer madness from chat text. Other abilities can be represented using the existing self information/action menus where available; highly specialized inheritance interactions are not exhaustively simulated.
- **Nightwatchman:** the initial Nightwatchman-to-recipient introduction is recorded, but a recipient's knowledge is not treated as public truth simply because the Nightwatchman clicked a target. A poisoned Nightwatchman may give unreliable knowledge to the recipient.
- **Damsel:** public guessing is recorded during the day via the shared game timeline; the Minion team collectively gets one meaningful guess, not one per Minion. The Spy jinx is modeled. Widow is not yet a selectable RoleId but the jinx check is future-proofed.
- All story information and role guesses are compatible-world constraints, not certain role proofs or an exhaustive probability calculation.

## Verification

- Previous regression baseline: **191/191**.
- Full engine TypeScript compilation (`npx tsc -p tsconfig.engine.json --outDir .engine-test --pretty false`): passed.
- Current test suite: **210/210 passed** (19 additional regression cases, including the setup dependency, interaction triggers, save validation, evil-team ambiguity, one-use gating, Pixie ability inheritance, Damsel jinx, and Lycanthrope persistent evil registration).
- Offline TS/TSX structural check with a test-only React type shim: passed.
- A real `npm run build` in the user's existing installed Windows Vite/React environment and on-phone interaction testing remain to be performed by the user; this archive is not an APK.

## Installation

1. Back up the existing project `src` folder.
2. Extract this ZIP and replace the existing project `src` folder with the ZIP's full `src` folder.
3. Keep the existing project `package.json`, `node_modules`, Android wrapper, and other local configuration files.
4. Start with `npm run dev`, or run `npm run build`; use `node tests/run.cjs` to rerun the full engine suite after ensuring TypeScript is installed.

Official rule references: https://wiki.bloodontheclocktower.com/Huntsman ; https://wiki.bloodontheclocktower.com/Damsel ; https://wiki.bloodontheclocktower.com/Knight ; https://wiki.bloodontheclocktower.com/Lycanthrope ; https://wiki.bloodontheclocktower.com/Magician ; https://wiki.bloodontheclocktower.com/Nightwatchman ; https://wiki.bloodontheclocktower.com/Noble ; https://wiki.bloodontheclocktower.com/Pixie
