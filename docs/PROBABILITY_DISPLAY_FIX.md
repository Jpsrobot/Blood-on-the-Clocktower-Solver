# Minion and Demon probability display correction

Based on main `dc90bcb` (merged S&V corrective PR #2), branch
`fix/role-probabilities`. This is a display/data-flow fix; candidate generation,
role mechanics, score weighting, search limits and save schema versions are unchanged.

## Root causes

- `ReasoningUI.tsx` used a hard-coded presence list. Imp, most BMR Demons/Minions,
  and several S&V Minions/Demons were absent even when their probabilities existed.
- `PlayerShare` had no Minion field; no Minion marginal was accumulated or displayed.
- The Demon marginal required the player to be alive, although the UI describes
  character probability. A dead Fang Gu, for example, still has a Demon character.
- `presence` is sparse: a character never present in a valid sample has no entry.
  Passing this directly to the formatter displayed a dash instead of calculated 0%.
  Special Leviathan/Al-Hadikhia overrides also fabricated 0% before any sample.
- Worker callbacks only compared a message with their own captured request ID.
  Queued callbacks from a superseded worker could therefore update newer state.

## Definitions and behavior

All percentages use the existing normalized weights across the full accepted
sample, before the representative-world list is truncated. No `evil - demon`
calculation or suspicion-score substitute is used.

| Display | Data | Meaning |
| --- | --- | --- |
| 悪陣営 | `players[p].evil` | Current evil alignment in sampled histories |
| 手下 | `players[p].minion` | Current character has Minion type, alive or dead |
| デーモン | `players[p].demon` | Current character has Demon type, alive or dead |
| 酔い | `players[p].drunk` | Existing modeled drunkenness marginal, unchanged |
| 初期配役 | `presence[role]` | At least one instance of that character in the starting setup |
| 現在の役職 | `players[p].roles` | Player's current specific character distribution |

Initial-presence cards are generated from `getSnapshotScriptRoleIds(g)` and
`ROLES[id].type`, covering every script Minion and Demon. The existing Drunk card
is retained. Being on a script only makes a character eligible for display; it
does not add presence weight. Good Minions, good Demons and evil Townsfolk retain
independent alignment/character marginals. Demon shares across players may sum
above one (including Fang Gu's dead former Demon).

With a valid sample, an absent presence-map entry displays 0%. Without a valid
sample, values remain `—`; existing Japanese zero-world and worker-error messages
explain why. The 0-world internal accumulator is not interpreted as evidence.
The existing warning that these are bounded, weighted search-sample estimates,
not calibrated real-world probabilities, remains visible.

## Pipeline and compatibility

`App.tsx` memoizes the snapshot using script, information/action, death/revival,
alignment-related event and other game state dependencies. `applySnapshot`
restores these fields on resume. The enabled reasoning hook starts a new worker
on snapshot changes and on normal/deep reruns. `solver.worker.ts` posts the entire
`SearchResult`, so no new serialization whitelist is necessary. The hook now
ignores callbacks after cleanup or from superseded requests, clears results when
disabled, and retains no sample on failure. These existing App/worker/script paths
were inspected rather than rewritten.

New archived summaries retain `minion`. It is optional when reading older logs;
older snapshots/logs remain valid. Resuming a game recomputes shares from its
snapshot. Old archived Demon values are historical stored results, not migrated
or silently reinterpreted as freshly calculated current probabilities.

## Verification

- `node tests/run.cjs`: **432/432 passed** (417 existing + 15 new).
- `npm run build`: **passed**, real TypeScript project build and Vite bundle.
- `npm run test:branding`: **7/7 passed**.
- `npm run test:harness`: **1/1 passed**.
- Existing large-bundle warning remains.

The new suite renders actual React components to static HTML for TB, BMR, S&V
and an all-characters custom script, checks 0/100/missing results and all four
labels, verifies normalized unequal weights, exercises Pit-Hag/Snake Charmer/
Fang Gu histories and evil Townsfolk, tests save/resume and old/new archives,
executes the real worker handler, and exercises hook effects with controlled
Workers/timers across updates, deeper searches, stale callbacks and errors.

No browser click-through, visual viewport or physical Android test was performed.
Hook tests use a controlled hook harness, not a mounted React DOM. The prior
Chromium download issue remains. Existing incomplete role mechanics still limit
which histories the solver can model; this fix does not claim to complete them.
The pre-existing `drunk` marginal does not enumerate every possible source of
drunkenness; expanding that mechanic is outside this Minion/Demon correction.
