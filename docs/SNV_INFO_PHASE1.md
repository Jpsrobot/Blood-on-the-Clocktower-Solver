# Sects & Violets information phase 1

This pass implements the first exact S&V information block rather than treating these roles as generic script entries.

## Exact structured roles added

- Clockmaker (`時`): N1 number; candidate worlds check the shortest circular distance between a Demon character and a Minion character.
- Dreamer (`夢`): nightly target + one good-character token + one evil-character token; one shown character must be the target's current character.
- Flowergirl (`花`): N2+ YES/NO; checks whether a Demon voted on the previous day.
- Town Crier (`告`): N2+ YES/NO; checks whether a Minion nominated on the previous day.
- Oracle (`神`): N2+ number; counts dead evil-aligned players, using actual alignment rather than printed character type.
- Seamstress (`縫`): once-per-game nightly pair + same/different alignment result; uses actual alignment independently of character.

All six work in both `自分の情報` and the unified `情報を記録` flow.

## Board relationship marker

Seamstress pairs get matching board markers such as `縫1=` or `縫1≠` on both selected seats so the relationship can be read from the main board without reopening history.

## Current limits

- Vortox mandatory-false-information handling is intentionally not part of this phase yet.
- Snake Charmer / Fang Gu / Barber / Pit-Hag historical role changes are not yet replayed into Flowergirl/Town Crier's previous-day character identity. This will be addressed with the S&V state-change pass.
- The remaining S&V roles stay generic until their dedicated pass.
