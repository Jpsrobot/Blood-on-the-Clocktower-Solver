# Sects & Violets — exact support through Seamstress

This update deliberately stops at **Seamstress** in the Sects & Violets Townsfolk order.

## Exact roles in this slice

The following S&V Townsfolk now have structured input plus mechanical solver support:

1. Clockmaker
2. Dreamer
3. Snake Charmer
4. Mathematician
5. Flowergirl
6. Town Crier
7. Oracle
8. Savant
9. Seamstress

**Philosopher and every S&V character after Seamstress remain generic in this update.** Their presence on a script may participate in ordinary role/setup candidate generation, but this package does not add their unique mechanics.

## Snake Charmer

- Direct self action is available every night while the user is still the Snake Charmer.
- The target must be alive; choosing yourself is allowed.
- A healthy Snake Charmer choosing a living Demon must swap.
- The swap exchanges the Snake Charmer's and Demon's characters **and alignments**.
- The old Demon becomes the Snake Charmer and is tracked as permanently poisoned.
- The action records the Demon character received by the user.
- After a successful swap, the user's board token displays the received Demon character while preserving the original Snake Charmer token as the starting-role fact used by the candidate engine.
- Flowergirl/Town Crier checks of the previous day use historical character state, so an N2 Snake Charmer swap does not retroactively change who was the Demon/Minion on D1.

This update does **not** implement the unique night ability of the Demon character received after the swap. Those Demon mechanics are after the requested Seamstress cutoff.

## Mathematician

- Structured nightly numeric entry from N1 onward.
- A healthy Mathematician count is checked against **players whose abilities demonstrably worked abnormally**, not merely against players who were poisoned/drunk.
- The same player is counted at most once for a reading.
- The Mathematician does not count its own bad information.
- Current exact abnormal-event coverage includes:
  - poisoned/drunk information that is actually false/abnormal;
  - registration-caused information deviations already modeled by the solver;
  - poisoned Snake Charmer choosing a Demon but failing to swap;
  - poisoned Virgin/Slayer failures already represented by public trigger records;
  - poisoned Saint execution failing to end the game;
  - poisoned Soldier dying to a Demon attack;
  - a directly recorded self-Monk protection failing while the Monk is poisoned.
- Poisoning alone is not +1 if the affected ability still behaves normally.

This is intentionally conservative: later S&V characters are not guessed before their own mechanics are implemented.

## Town Crier

- Structured YES/NO entry from N2 onward.
- Checks whether a Minion nominated on the previous day.
- Uses historical role state for that day when character changes occur later.

## Oracle

- Structured numeric entry from N2 onward.
- Counts dead **evil-aligned players**, using the independent alignment track rather than nominal character type.

## Savant

Structured day information supports two statement templates:

- `There is a <role> in play.`
- `There is a <role> among these selected players.`

Each selected-player group is entered with ON/OFF player buttons. For a healthy Savant, the solver requires **exactly one** of the two saved statements to be true. Poison/drunk handling continues to use the existing impairment framework.

## Seamstress

- Structured one-time-style night information entry: select two other players and save `same alignment` / `different alignment`.
- The solver compares actual alignment, not character category.
- Both target seats receive the same visible link marker (`縫1=`, `縫1≠`, etc.), making the pair easy to identify on the main board.

## Persistence and analysis

The new Snake Charmer, Mathematician, and Savant records are validated during JSON import/load. Analysis/history views format Savant statements and Snake Charmer swaps explicitly. Candidate-world explanations also display Snake Charmer character/alignment swaps and the old Demon's permanent poison state.

## Verification

- Engine/data regression suite: **104 / 104 passed**.
- Full TS/TSX structural type check: **passed** with a local React declaration shim.
- No runtime dependency was added.
