# Sects & Violets Demon mode update

The Demon panel now supports direct N2+ attack recording for **Fang Gu, Vigormortis, No Dashii, and Vortox** in addition to Imp. Team knowledge, Storyteller bluffs, and bluff plans use the same existing Demon-mode state.

- **Fang Gu:** setup uses +1 Outsider / -1 Townsfolk. The first healthy Fang Gu attack that would kill an actual Outsider instead makes that Outsider an evil Fang Gu and kills the old Fang Gu. This transfer can occur only once per candidate history.
- **Vigormortis:** setup uses -1 Outsider / +1 Townsfolk when an Outsider is available to remove. A Minion killed by Vigormortis stays its Minion character and contributes one Storyteller-chosen poison direction to the nearest Townsfolk. The poison ends if Vigormortis loses its ability. The killed Minion's exact retained unique ability will become mechanically active as those S&V Minion abilities are implemented.
- **No Dashii:** the nearest Townsfolk in each direction is poisoned. Non-Townsfolk are skipped; dead Townsfolk are not skipped. Character changes can move the poison targets.
- **Vortox:** supported Townsfolk ability information must be false, including when the Townsfolk is drunk or poisoned. A day with no execution ends in evil victory at dusk while Vortox is active. Free-text Artist questions are stored but their semantic truth cannot be automatically parsed.

Self-targeting is only labeled as a starpass for Imp. For the other supported Demons, a healthy self-target normally means the Demon dies.

---

# Demon mode (Trouble Brewing)

This build adds the first evil-side self mode: **Imp / Demon mode**. Minion self mode is intentionally still separate work.

## What you enter

### Evil team
- In games with 7+ players, register the **players** shown to you as Minions during Demon info.
- Demon info does not reveal the Minion characters. Leave their exact role as **未確認** until a teammate tells you.
- If a teammate later tells you their actual Minion character, you may record it. An exact teammate role is treated as direct evil-team knowledge and becomes a hard candidate-world constraint.
- In 5-6 player standard games, starting Demon info is absent. You can add a teammate later only after you have identified them.

### Storyteller bluffs
- In games with 7+ players, record up to three good characters shown as not in play.
- These are hard world constraints: the solver will not place those actual characters in the starting setup.
- In 5-6 player standard games, the Demon starts with no bluffs, so this section is disabled.

### Team bluff plan
- Assign a planned good-character claim to yourself and each known Minion.
- This is a strategy note only. It does **not** force the solver to believe the bluff or remove that role from the game.

### Bluff board
Every good character is shown with useful collision information:
- `ST安全`: Storyteller-confirmed not in play; mechanically safe as a role claim.
- `相手主張`: a non-teammate currently claims the role.
- `味方使用`: a known evil teammate is planning that bluff.
- `未主張 / 不明`: nobody currently claims it, but it is not guaranteed to be out of play.

A Storyteller bluff can also show an opponent claim at the same time. That is especially useful: you know the opponent cannot literally be that character, although they may be the Drunk or may be intentionally covering.

## Imp attack log

From N2 onward you can record one selected target per night. The target may be:
- a living opponent,
- a known Minion,
- yourself,
- or an already-dead player.

The app does not automatically manufacture a death when you record the target. It compares the target with the public death record so Mayor redirection, protection, Soldier survival, poison, and sunk kills can remain distinguishable.

The attack panel shows a contextual warning for self-targets, dead targets, allies, Soldier claims, Ravenkeeper claims, and Mayor claims.

## Solver effects

When your shown role is Imp:
- `self = Imp` is a hard setup fact.
- known evil-team players are hard-locked to **some Minion**;
- an optional exact teammate Minion role hard-locks that character too;
- Storyteller bluffs are excluded from actual starting good roles;
- logged attacks constrain the observed night history;
- a recorded attack on a different player than the observed victim can survive only through the modeled Mayor-redirection route;
- completed no-death nights with a recorded target need a modeled explanation such as a dead target, poisoned Demon, Soldier, Monk protection, or other supported TB interaction;
- self-targeting is evaluated as Imp starpass, with eligible Scarlet Woman succession taking priority when its condition is satisfied.

## Target suggestions

The panel shows a small list of possible attack targets using current role claims and candidate-world output. Continuous/high-survival-value information claims rise; Soldier/Ravenkeeper and roles that want Demon attacks fall. This is a convenience heuristic, not an optimal-play solver.

## Privacy/UI note

Known Minions get a small `味` marker on your local board while you are in Demon mode. It is private app state, not a public game claim.
