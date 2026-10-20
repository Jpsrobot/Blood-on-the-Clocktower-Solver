# Bad Moon Rising tag groundwork

This pass expands the generic role metadata so BMR mechanics can be implemented without making the script itself special-case logic.

## Renamed effect tags

- `POISONING` -> `POISON_DRUNK_ABILITY`
  - Means the character's ability can create a poisoned or drunk state.
  - BMR assignments in this pass: Sailor, Innkeeper, Courtier, Minstrel, Goon, Pukka. Poisoner retains the concept under the new name.
- `PROTECTIVE` -> `PREVENTS_DEATH`
  - Means the character can broadly prevent a player from dying or suppress the normal source of a death.
  - Current assignments: Monk, Soldier, Sailor, Exorcist, Innkeeper, Tea Lady, Fool, Zombuul.
- `PREVENTS_EXECUTION_DEATH`
  - Means an execution still occurs, but this character's ability can specifically cause the executed player not to die.
  - Current assignments: Sailor, Tea Lady, Fool, Pacifist, and Devil's Advocate.
  - When explaining an execution with no death, the generic reasoning layer should consider **both** `PREVENTS_DEATH` and `PREVENTS_EXECUTION_DEATH`; the second tag exists to distinguish execution-specific protection from general death prevention.
- `KILLING` -> `KILLS`
  - Means the character ability can directly cause player death.
  - Existing examples remain Slayer and Imp. BMR additions: Gossip, Moonchild, Godfather, Assassin, Zombuul, Pukka, Shabaloth, Po.

## New tag

- `REVIVES`
  - Means the character can return a dead player to life.
  - Professor and Shabaloth.

## Demon kill capacity

`Role` now has optional `maxKillsPerNight`. It is deliberately named as a maximum rather than just `killCount`, because the BMR Demons do not all kill that many every night.

- Imp: 1
- Zombuul: 1
- Pukka: 1
- Shabaloth: 2
- Po: 3

This field is useful for generic death-pattern filtering and UI, but does **not** replace character mechanics. In particular:

- Po normally chooses one player, but can charge by choosing nobody and then choose three the following night.
- Pukka chooses one player to poison and the death is delayed.
- Zombuul only gets its kill under its own conditional timing.
- Shabaloth can choose two players and may later regurgitate a previously killed player.

The solver should therefore use `maxKillsPerNight` only as a broad capacity constraint. Exact timing/eligibility belongs in each character's mechanic evaluator.

## Roles touched in this pass

### Prevents death
Monk, Soldier, Sailor, Exorcist, Innkeeper, Tea Lady, Fool, Zombuul.

### Prevents execution death
Sailor, Tea Lady, Fool, Pacifist, Devil's Advocate.

### Poison / drunk ability
Poisoner, Sailor, Innkeeper, Courtier, Minstrel, Goon, Pukka.

### Revives
Professor, Shabaloth.

### Kills
Slayer, Imp, Grandmother, Gambler, Gossip, Tinker, Moonchild, Godfather, Assassin, Zombuul, Pukka, Shabaloth, Po.

Most BMR characters are still `solverSupport: "generic"`; these tags are metadata groundwork, not a claim that their full mechanics are already simulated.
