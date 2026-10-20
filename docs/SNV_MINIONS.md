# Sects & Violets — Minion modes

## Evil Twin

The Evil Twin mode records the real opposing good Twin and their character as secret direct information. Possible Worlds enforce that character. The candidate timeline also models the special Twin win/block rules.

The sabotage panel is intentionally separated from secret knowledge: it creates a town-facing projection with the user's true Minion role, team knowledge, private actions, and Twin fact removed, then evaluates the good Twin's public credibility from that projection. This avoids circular advice such as "town should suspect them because the app secretly knows they are the good Twin."

## Witch

The Witch remains a player-choice tool rather than an automated nomination predictor. The UI surfaces nomination count/recency and lets the user choose the curse manually. A resolved curse can create a linked ability death after the target nominates. At three living players the ability is inactive.

## Cerenovus

The Cerenovus advisor evaluates target/forced-character pairs. Its strongest signal is the target's town-facing evil share, matching the strategy goal of pushing players who already fit evil worlds into more awkward claims. It then adds pressure for role collisions, implausible timing, Outsider framing, and forced story changes. The user still chooses the action.

## Pit-Hag

Pit-Hag keeps exact character-change mechanics and adds a planner. The planner uses weighted **current** character presence, so it respects previous transformations instead of looking only at starting roles. It distinguishes:

- good-side crippling changes;
- evil-team upgrades;
- Demon pivots;
- characters likely to be absent and therefore legal transformations.

Known Storyteller bluffs receive an absence/safety bonus. Changing the known sole Demon to a non-Demon is heavily discouraged because it can immediately remove the last Demon. Demon creation still uses the existing arbitrary-death-night rule.

## Vigormortis interactions

When Vigormortis kills one of these Minions, the killed Minion keeps the relevant ability while a living healthy Vigormortis remains active. The evaluator therefore does not use the ordinary `dead = cannot act` shortcut for retained Witch, Cerenovus, or Pit-Hag actions, and it recognizes retained Evil Twin execution-win behavior.

## Strategy boundary

The advisor scores are not facts and never modify world weights. They are planning surfaces layered on top of the mechanical solver. In particular:

- Witch nomination history is context, not a prediction.
- Cerenovus evil-share ranking is based on the town-facing bounded candidate set, not a calibrated probability.
- Evil Twin pressure suggestions cannot see the secret Twin fact.
- Pit-Hag success percentages are estimates from the currently sampled weighted worlds and can miss legal states in a bounded search.
