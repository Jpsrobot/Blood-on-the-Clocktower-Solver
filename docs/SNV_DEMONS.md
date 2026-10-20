# Sects & Violets — Demon implementation

## Scope

This document describes the Demon-side rules for **Fang Gu, Vigormortis, No Dashii, and Vortox**. A later Minion-mode update adds Evil Twin, Witch, Cerenovus, and expanded Pit-Hag strategy support on top of these Demon mechanics.

## Fang Gu

- Setup: +1 Outsider, -1 Townsfolk.
- N2+ direct attack recording in Demon mode.
- The first healthy Fang Gu attack that successfully would kill an actual Outsider transfers Fang Gu to that player, makes that player evil, and kills the old Fang Gu instead.
- The once-per-game transfer state is preserved across the candidate history.
- If the Outsider does not die, the transfer does not occur.

## Vigormortis

- Setup: -1 Outsider, +1 Townsfolk when possible.
- N2+ direct attack recording.
- A Minion killed by Vigormortis remains its Minion character and records one of the two legal Storyteller poison directions.
- The closest Townsfolk on that chosen side is poisoned while Vigormortis remains alive and healthy; dead Townsfolk still count as the closest Townsfolk character.
- Retained **Witch, Cerenovus, Pit-Hag, and Evil Twin** abilities are now executed while a living healthy Vigormortis keeps the killed Minion's ability active.

## No Dashii

- N2+ direct attack recording.
- Dynamically poisons the closest Townsfolk clockwise and counterclockwise.
- Skips Outsiders, Minions, and Demons.
- Does not skip dead Townsfolk.
- Re-evaluates after supported character changes.
- Poison ends while No Dashii is drunk/poisoned or no longer has the character.

## Vortox

- N2+ direct attack recording.
- Implemented Townsfolk information is accepted only when the received result is mechanically false while Vortox is active.
- This Vortox rule takes precedence over that Townsfolk being drunk or poisoned.
- Savant requires both entered statements false under Vortox.
- If no player was executed that day, the candidate ends with the Vortox evil-win condition at dusk.
- Arbitrary free-text Artist questions cannot be semantically evaluated, so their truth value remains conservative.

## Poison-source bookkeeping

No Dashii/Vigormortis poison participates in ability correctness and Mathematician-style abnormal-result reasoning, but is not falsely recorded as a required Poisoner target.

## Verification

The full engine/data suite passes **125 / 125** tests, and the offline TS/TSX structural check passes.


## Vigormortis Outsider-tag interaction patch

- `OUTSIDER_COUNT_MODIFIER` is now data-driven via each role's `outsiderCountDelta`.
- Baron = +2, Fang Gu = +1, Vigormortis = -1.
- Negative deltas are clamped when the base setup has no Outsiders to remove.
- If Vigormortis is on the frozen script and recorded exact Outsider claims match the Vigormortis-reduced setup count, the evidence panel gives Vigormortis a weak heuristic point. Claims remain soft evidence; legal candidate worlds still use exact setup counts.
