# Script Manager / data-driven script architecture

## Main-menu flow

Home -> `スクリプト管理`

- `新規スクリプト`
  - Every character from the three core editions is shown as an ON/OFF button.
  - Buttons are grouped by Townsfolk / Outsider / Minion / Demon.
  - `保存` asks for the script name.
- Trouble Brewing
- Bad Moon Rising
- Sects and Violets
- Saved custom scripts
  - Tap to edit.
  - Delete from the list.

Built-in scripts can be opened to inspect their character lists but are read-only.

## What “script-dependent” now means

A game snapshot freezes both the script name and the exact role IDs selected at game start. The rest of the app reads that role list instead of reading every role known by `roles.ts`.

The selected script now controls:

- role-claim choices;
- self-role choices;
- manual-read role choices;
- structured Trouble Brewing information role targets;
- Minion/Demon bluff-role lists;
- Spy Grimoire role choices;
- Spy automatic bluff-advisor candidates;
- candidate-world Townsfolk / Outsider / Minion / Demon pools;
- Drunk and Lunatic hidden-role reminders when those characters exist on the script;
- saved games and archived game logs.

A custom script is copied into the game snapshot at game start. Editing or deleting the saved custom-script definition later does not silently change an in-progress or archived game.

## Core character catalog

The catalog now contains all 72 non-Traveller player characters from the three original editions:

- Trouble Brewing: 22
- Bad Moon Rising: 25
- Sects & Violets: 25

Trouble Brewing characters retain their existing full solver rules.

Bad Moon Rising and Sects & Violets characters default to `solverSupport: "generic"` until a role-specific evaluator is implemented. The current S&V build has exact/full support for the implemented Townsfolk/Outsider slice and all four S&V Demons; Evil Twin, Witch, Cerenovus, and the unexpanded portions of Pit-Hag remain conservative/generic. Generic characters can still participate in script selection, claims, setup/world generation, alignment/type reasoning, evil-team planning, and candidate assignments without importing the wrong edition's mechanics.

This is deliberately permissive: an unsupported character should widen possibilities rather than cause the engine to falsely rule out a world because it applied the wrong edition's rules.

## Solver behavior on mixed scripts

The candidate generator now chooses all setup roles from the current script only.

- Minion slots use only Minions on the script.
- Outsider slots use only Outsiders on the script.
- Townsfolk slots use only Townsfolk on the script.
- The Demon slot uses only Demons on the script.
- Baron still modifies setup if Baron is actually selected into the world.
- Drunk only appears as a hidden Townsfolk explanation if Drunk is on the script.
- Lunatic can now appear as a hidden Demon explanation when Lunatic is on the script.
- Imp-specific kill/starpass/Scarlet Woman mechanics are only applied to worlds whose Demon is actually the Imp.
- Fang Gu, Vigormortis, No Dashii, and Vortox use their S&V-specific supported mechanics. Other unsupported non-Imp Demons use a generic permissive fallback.

## Persistence

Custom scripts are stored separately in local storage under `clocktower.customScripts.v1`.

Game snapshots still use schema version 2 for backward compatibility, with two optional additions:

- `scriptName`
- `scriptRoleIds`

Old Trouble Brewing saves without these fields still load as Trouble Brewing.
