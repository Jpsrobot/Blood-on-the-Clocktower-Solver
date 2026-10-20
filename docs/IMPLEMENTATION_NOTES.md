# S&V Minion-mode implementation notes

- Added `engine/minionStrategy.ts` for Cerenovus and Pit-Hag strategy ranking plus Evil Twin public-information pressure analysis.
- Generalized the evil-player opponent projection so Evil Twin/Cerenovus advice can run on a town-facing snapshot with private evil-team knowledge removed.
- Added direct Evil Twin setup state and Witch/Cerenovus Minion action variants to the shared snapshot schema and import validation.
- Candidate mechanics now execute Witch nomination deaths, Cerenovus madness executions, Evil Twin win/block conditions, and Vigormortis-retained Witch/Cerenovus/Pit-Hag/Evil Twin ability effects.
- Minion strategy data never feeds back into candidate-world truth. Bluff plans, target recommendations, and ranking scores remain advisory only.

# Implementation rundown

## Main modules

- `types.ts`: shared event/snapshot types used by UI, storage, archive, and solver.
- `roles.ts`: Trouble Brewing role metadata, tags, and the custom night-speed catalog.
- `storage.ts`: snapshot/archive validation, local save/load, JSON import/export, event IDs, linked deletion.
- `engine/game.ts`: seat ring, setup counts, historical ordering, state reconstruction, observation helpers.
- `engine/mechanics.ts`: candidate-history checking for supported Trouble Brewing mechanics.
- `engine/search.ts`: seeded, claim-guided bounded assignment/history exploration.
- `engine/evidence.ts`: good/evil/inconsistency evidence plus warning generation.
- `engine/advice.ts`: guarded nomination/conversation/action heuristics.
- `engine/solver.worker.ts` and `engine/useReasoning.ts`: off-UI-thread search/progress/cancellation.
- `ui/ReasoningUI.tsx`: warning drawers, overview, world viewer, audit, history, manual reads, guidance.
- `ui/ReportedInfoForm.tsx`: structured reports from other players.
- `ui/DemonModeUI.tsx`: Imp self workflow.
- `ui/MinionModeUI.tsx`: Poisoner/Spy/Scarlet Woman/Baron self workflow.
- `ui/GameLogUI.tsx`: archived-game browser/reload/export/review.
- `ui/text.ts`: Japanese labels/explanation templates.

## Minion data model

`GameSnapshot` now optionally carries `minionState` and `minionActionLog` for backward compatibility with saves created before Minion mode.

`MinionState` contains:

- `knownDemon`: directly known Demon seat and source;
- `knownMinions`: fellow Minion seats plus optional exact character learned later;
- `sharedStorytellerBluffs`: good characters explicitly shared by the Demon;
- `bluffPlans`: private strategy plan only;
- `spyInitialRoles`: Spy N1 Grimoire character display;
- `spyRedHerring`: Spy-visible Fortune Teller red herring;
- `becameDemonAt`: direct observation that the user became the Imp.

`MinionActionEvent` currently stores:

- Poisoner target by night;
- Spy nightly Grimoire entry / displayed Poisoner target.

If the Minion later becomes the Imp, subsequent attacks reuse `DemonActionEvent` rather than inventing a second attack format.

## Hard information versus planning data

The solver treats the user's own token and directly learned evil-team setup information as hard constraints. It also excludes Storyteller bluffs that the Demon explicitly shared.

It does **not** use `bluffPlans` as evidence. This separation is important: planning “I will claim Fortune Teller” must not make a real Fortune Teller more or less likely in the engine.

## Minion search constraints

The search sampler is guided to assignments containing hard-locked Minion roles so that known-team states do not waste most random attempts.

Candidate validation enforces:

- self has the chosen Minion character;
- the directly known Demon is the Imp;
- directly known fellow Minions have Minion characters;
- exact teammate Minion character if explicitly confirmed;
- shared Storyteller bluffs are out of play.

## Poisoner actions

A recorded own Poisoner target is a direct choice. During history evaluation, the actual poison choice for that night must match the record while the user is alive and still the Poisoner.

If the Minion has already become the Demon, later Poisoner action records are invalid. The user may still have taken the Minion action earlier in the transition cycle, so the UI permits Minion actions through that cycle and disallows subsequent ones.

## Spy information and poisoning

An early implementation mistakenly made entered Spy Grimoire roles unconditional setup locks. That was corrected.

A Spy can be selected by a teammate Poisoner. Therefore the evaluator now branches conceptually as follows:

- healthy self Spy: entered Grimoire characters/red herring/visible poison reminder must agree with the candidate history;
- self Spy is the true poisoned target: entered Spy information may be arbitrary and does not mechanically eliminate a mismatch.

The sampler still uses Spy-entered N1 roles as a strong search guide for efficiency, but deliberately explores poisoned-Spy alternatives. The Grimoire is not used to infer the separately recorded evil-team setup information.

## Succession

`becameDemonAt` is direct self-observation. Candidate histories must contain a legal Scarlet Woman takeover or starpass to self at that phase.

After transition, successor Imp attacks use `DemonActionEvent`. The UI only offers attack nights strictly later than the transition night; it does not grant a second Demon action in the same night.

## Reasoning and warnings

The engine still separates:

1. mechanical candidate-world search;
2. weighted plausibility/evidence;
3. player-facing warnings and guidance.

Direct Poisoner actions can produce green numbered poison markers. Spy-visible poison reminders can also produce a green marker, but the explanation explicitly notes the self-poison misinformation exception.

Claims, unknown conversations, failed public tests, or manual reads are not automatically converted into evil proof.

## Saving/logging

Minion state and action events are included in:

- active autosave;
- JSON export/import;
- full night checkpoints;
- archived Game Log snapshots;
- reasoning history display.

Storage validation rejects malformed team identities, invalid exact teammate roles, invalid shared bluffs, invalid Spy seats/roles, and malformed Minion actions.

## Delivery scope

The app remains a local React/TypeScript/Vite project. No APK or production PWA is included. Search is bounded, not exhaustive/calibrated, and strategy advice remains heuristic. Trouble Brewing is the only supported script in this build.
