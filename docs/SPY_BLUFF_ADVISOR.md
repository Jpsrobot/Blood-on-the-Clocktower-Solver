# Spy bluff-world advisor — v2.1

## Goal

The Spy advisor now optimizes more than the raw number of opponent-side candidate worlds.

It uses a counterfactual **opponent view** that removes the user's private evil knowledge, then ranks bluff lines using three objectives:

1. keep a broad set of opponent candidate worlds alive;
2. increase the surviving worlds where the Spy's **real Demon seat is good-aligned** from the opponent solver's perspective;
3. if the Spy Grimoire (or, secondarily, public claims) identifies a **Saint** or **Goblin** seat, increase worlds where that seat is the Demon character.

These are search heuristics, not calibrated probabilities.

## Opponent-view projection

Removed as secret:

- self true role;
- known Demon/Minion team information;
- shared Storyteller bluffs known only to evil;
- Spy Grimoire/red-herring information;
- Poisoner/Demon private action logs;
- private manual reads;
- the Spy's current planned bluff.

Kept:

- deaths, revivals, nominations, votes and public mechanical events;
- completed-night/no-execution facts;
- public claims/reports;
- private claims/reports that at least one non-known-evil recipient could know.

## Strategic score

The raw `世界数1位` is still calculated from effective supported world diversity.

The `推奨` order instead uses a weighted strategic score:

- world coverage;
- Demon-seat cover;
- Saint/Goblin framing when such a target is known.

Practical collisions still make a candidate ineligible for the main recommendation when the Grimoire shows the role in play, an opponent already claims it, or an ally already plans to use it.

## Automatic false-information layer

Good roles tagged `INFO_SOURCE` get a generated false-information line whenever the role has enough public game state to make such a report plausible.

Current generators cover every good `INFO_SOURCE` role presently tagged in the catalog:

- Washerwoman;
- Librarian;
- Investigator;
- Chef;
- Empath;
- Fortune Teller;
- Undertaker (after an execution exists);
- Ravenkeeper (after the Spy has actually died at night);
- Grandmother;
- Chambermaid.

For each possible report, the advisor measures how many opponent worlds remain compatible with the *content* of the information and then applies the same Demon-cover / Saint-Goblin framing objectives.

Examples include choosing a Chef number, Empath number, FT pair/result, Investigator pair+Minion, Washerwoman pair+Townsfolk, Undertaker result, or Chambermaid pair+count.

The UI pins the best information line in a top `最優先の偽情報案` box so it is visible even when the overall best bluff role is a non-information role.

## Saint / Goblin framing target

Private Spy Grimoire knowledge has priority for choosing framing targets. If the Grimoire shows a Saint or Goblin, that seat is used as the preferred dangerous execution target without leaking that private fact into the opponent search itself.

If no private target is known, a public Saint/Goblin role claim may be used as a weaker strategic target.

Goblin is now available in the custom-script role catalog as an experimental Minion (`鬼`). Its exact execution-win mechanic is not yet mechanically simulated by the general solver; the Spy advisor currently uses it only as a framing objective.

## Current limits

- The false-info scorer is a bounded search heuristic, not exhaustive game theory.
- Chambermaid uses current wake tags to estimate who woke from their own ability. Conditional/role-specific wake edge cases will improve as exact BMR mechanics are added.
- Grandmother uses current good-registration and role-registration logic; its full death linkage is separate from this bluff-line scorer.
- S&V roles only receive automatic fake-information lines once they are tagged `INFO_SOURCE` and have a report-shape evaluator.
- The advisor recommends information text but does not automatically write it into the public information log; the player chooses whether to use it.
