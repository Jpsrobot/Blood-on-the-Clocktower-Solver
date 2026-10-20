# Sects & Violets Minion modes

The Minion workflow now supports the four S&V Minions in addition to the existing Trouble Brewing modes.

## Evil Twin

Record the opposing good Twin and the character the Storyteller showed you. This is private direct information and hard-locks that player's starting character in candidate worlds. If the healthy Evil Twin ability is active and the good Twin is executed, evil wins. Good cannot win from ordinary Demon death while both Twins are alive and the Evil Twin ability is active.

The strategy panel deliberately uses an **opponent-view projection** with the secret Twin/team facts stripped out. It shows how evil the Twin looks to town and highlights weak or poorly supported structured information the Twin has publicly given. A convenience button can reserve the Twin's character as your own same-role bluff, but bluff plans remain strategy notes and never alter solver truth.

## Witch

Choose the curse manually each night. The app does **not** auto-predict the nominator; it displays each player's nomination count and most recent nomination as human decision support. After the cursed player nominates, resolve the record as `curse killed` or `survived`. A healthy active Witch with more than three living players must agree with that outcome in candidate histories. At three living players the Witch ability is inactive.

## Cerenovus

Choose any player and a Townsfolk or Outsider character for madness. The advisor runs a town-facing search and primarily favors targets with high evil share, then looks for useful forced-role collisions or disruptive story changes. The recommendation is strategic only; the actual target remains manual.

If the Storyteller executes that player for breaking madness, record it from the Cerenovus history. The execution is linked to its nightly madness action so undo/deletion remains atomic.

## Pit-Hag

Choose a player and a character from N2 onward. A healthy Pit-Hag changes the target only if that character is not already in play; the target's alignment does not change. Creating a Demon opens the normal arbitrary-death window for that night.

The planner estimates character absence from **current weighted worlds**, not just the starting setup. It then ranks good-side disruption, evil-side upgrades, Storyteller-bluff-safe characters, and Demon pivots. It heavily penalizes changing the known sole Demon into a non-Demon because that can immediately hand good the game.

## Vigormortis-retained Minion abilities

A Witch, Cerenovus, or Pit-Hag killed by Vigormortis may continue taking its Minion actions while a living healthy Vigormortis keeps the retained ability active. Evil Twin's retained execution-win ability is also recognized. If Vigormortis loses its ability or ceases to be the active Demon, those retained abilities stop applying.

These controls are still separate from public role claims. Your own token, setup information, and chosen Minion actions are direct observations; ordinary claims and strategy suggestions remain soft/public information.

# Minion mode

Minion mode is the self-role workflow for Trouble Brewing's four Minions: Poisoner, Spy, Scarlet Woman, and Baron.

It is deliberately separate from ordinary claims. Your own Minion token, the evil-team information you were shown, and actions you personally took are direct observations. Public claims made by other players remain claims and are not promoted to facts.

## Shared evil-team setup

When the game has at least 7 players, Minion mode lets you record the Demon player and the other Minion players shown to you at setup. The player identities are hard constraints for Possible Worlds, but the other Minions' exact characters are not assumed until you explicitly record that a teammate later told you their character.

In a 5- or 6-player game, the mode does not assume starting evil-team information. A Demon or teammate can still be added later once you learn them.

The board privately marks the Demon with `魔` and known fellow Minions with `味` while you are using Minion mode.

## Storyteller bluffs and team bluff plans

A Minion is not assumed to receive the Demon's three Storyteller bluffs automatically. If the Demon shares a bluff with you, record it under the shared-bluff section. A recorded shared Storyteller bluff is treated as a hard out-of-play good character by the candidate-world search.

Team bluff plans are different. You can assign a planned good-role claim to yourself, the Demon, or another known Minion, but those plans are strategy notes only. They never alter candidate-world probability/weighting or mechanically exclude a world.

The bluff board can therefore distinguish:

- shared Storyteller-safe roles;
- roles the Spy's entered Grimoire currently shows as absent;
- roles the Spy's entered Grimoire shows in play;
- roles an opponent is already claiming;
- roles reserved for an evil teammate;
- unclaimed/unknown roles.

`Spy表示不在` is a planning aid, not an unconditional mechanical guarantee, because a poisoned Spy can receive false information.

## Poisoner

Poisoner mode records one chosen target for each night from N1 onward. The target may be any player, including yourself, a teammate, or a dead player. Re-entering the same night asks before replacing the old record.

Because the selection is your own direct action, Possible Worlds require the actual Poisoner target on that cycle to match the recorded target while you are still the living Poisoner. The board also shows a numbered green poison marker for that direct record.

The UI gives lightweight target hints and a shortlist based on current claims/sample information. These are strategy heuristics, not optimal-play guarantees and do not alter the solver.

## Spy

Spy mode provides an N1 Grimoire editor. You can copy the exact characters you saw for each player and the Fortune Teller red herring. It also provides a nightly Grimoire log for the Poisoner's visible reminder target plus optional notes.

The solver handles an important exception: a Spy can itself be poisoned by a Poisoner teammate. Therefore:

- if the Spy is healthy, entered Grimoire character information and the displayed Poisoner target constrain the candidate history;
- if the Spy is the actual Poisoner target, the Grimoire may be arbitrary misinformation, so a mismatch does not automatically eliminate that world.

This is why Spy information is intentionally separate from the harder evil-team setup knowledge.

## Scarlet Woman

Scarlet Woman mode shows current living-player count and the current sampled share of worlds where you are the Demon. If you actually become the Imp, record the exact N/D phase under the Demon-succession control.

That direct observation filters Possible Worlds to histories in which the Scarlet Woman really became the Imp at that phase. Once the transition is recorded, successor-Imp attack entry becomes available beginning on the following night. The UI does not give the new Imp an extra attack during the same night as the takeover.

## Baron

Baron mode displays the normal setup counts alongside the Baron-modified counts and lists currently recorded Outsider claimers. Since your own Baron token is direct information, candidate setups use Baron's `+2 Outsiders / -2 Townsfolk` setup modification.

There is no nightly Baron action to record.

## Becoming the Demon

Every Minion mode includes a direct `became Demon` observation. This is for an actual Scarlet Woman takeover or Imp starpass that you personally experienced, not a guess.

After the recorded takeover, Minion-specific actions stop after that cycle and successor Imp attacks are logged using the existing Demon-action format. The first ordinary attack is the following night.

## Solver boundary

Hard Minion-mode information:

- your exact Minion token;
- a Demon player you directly know;
- fellow Minion player identities you directly know;
- exact fellow-Minion characters only after you explicitly confirm them;
- Storyteller bluffs explicitly shared by the real Demon;
- your own Poisoner target selections;
- a healthy Spy's entered Grimoire observations;
- your direct observation that you became the Imp.

Not hard solver information:

- team bluff plans;
- target suggestions;
- ordinary opponent claims;
- `Spy表示不在` when the Spy may be poisoned;
- notes/free text that the engine does not structurally understand.


## Spy automatic bluff-world advisor

When the user's self role is Spy, Minion mode automatically starts a separate opponent-view search. This is intentionally different from the ordinary Possible Worlds search, which knows the user's true evil role and secret team information.

The projection removes:

- the user's true Spy token;
- known Demon/fellow-Minion identities and exact roles;
- Storyteller bluffs known only to evil;
- Spy Grimoire/red-herring/reminder-token data;
- Poisoner/Demon private target logs;
- self Townsfolk info/action history left over from role switching;
- manual reads and the user's current self bluff.

Public mechanical events remain. Public claims remain. A private claim/report remains only if at least one recipient is not a directly known evil teammate, approximating what a fully cooperating good team could eventually pool. A claim the evil player marked internally as `bluff` is normalized to an ordinary claim in this projection because the good team does not know that label.

A single bounded opponent-view search is then used to rank every Townsfolk/Outsider bluff. A world supports a candidate bluff when the projected self is:

1. actually that role;
2. the Drunk and could believe they are that Townsfolk role; or
3. evil, so the role claim can be a bluff.

The advisor aggregates by **distinct starting assignment** so multiple Fortune Teller red-herring/history branches do not artificially multiply one setup. It reports both raw supported assignment count and an effective-world diversity count based on the search weights.

The practical `推奨` chooses the highest-diversity candidate that does not currently collide with:

- a role shown as actually in play in the entered Spy Grimoire;
- an opponent's current claim visible to the good-team projection; or
- a teammate's existing bluff plan.

The raw candidate with the largest world count is separately labeled `世界数1位`, even if one of those collision warnings applies. Shared Storyteller bluffs and complete-Grimoire absent roles are marked as useful safety information, but do not secretly rewrite the world-count metric.

This is a counterfactual search heuristic, not an exhaustive game-theory solution. The normal run is intentionally bounded for phone responsiveness; `深く再計算` increases attempts/time and returned representative worlds.
