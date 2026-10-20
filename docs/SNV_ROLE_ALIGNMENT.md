# Sects & Violets: character and alignment are separate

## Symbols

- Chambermaid: `婢`
- Cerenovus: `脳`

## Data model

A candidate world now has two independent state tracks:

```ts
initial: Record<PlayerId, RoleId>
current: Record<PlayerId, RoleId>
initialAlignment: Record<PlayerId, "good" | "evil">
currentAlignment: Record<PlayerId, "good" | "evil">
```

`Role.type` remains the character's nominal category (Townsfolk / Outsider / Minion / Demon). It is **not** treated as the player's current team alignment once character-changing mechanics exist.

At normal setup, alignment is initialized from character type:

- Townsfolk / Outsider -> good
- Minion / Demon -> evil

After setup, the two tracks can diverge.

## Pit-Hag rule model

Pit-Hag changes the chosen player's **character**, not their alignment. The direct self Pit-Hag evaluator now updates only:

```ts
world.current[player] = newRole
```

and deliberately leave:

```ts
world.currentAlignment[player]
```

unchanged. This supports good Minions/Demons and evil Townsfolk/Outsiders.

By contrast, an ability that actually changes alignment (for example Goon, or other explicit alignment-changing mechanics) updates `currentAlignment` separately.

## Reasoning changes already made

- Chef and Empath use the alignment track for good/evil counts.
- The solver's `悪 %` uses current alignment, not role category.
- Good/evil representative worlds are selected from alignment.
- Candidate-world cards show character and alignment separately.
- Spy bluff support uses the alignment track.
- Archived representative worlds save both role and alignment state.

## Implemented Pit-Hag scope

- Self Pit-Hag actions can be entered from N2 onward.
- The selected character only replaces the target when that character is not currently in play in the candidate history.
- Alignment remains unchanged.
- Creating a Demon marks that night as arbitrary for deaths.
- The action is stored as the Pit-Hag player's direct choice; a failed choice caused by an already-in-play character remains possible.

Still not fully modeled: hidden opponent Pit-Hag choices that were never recorded, all S&V drunk/poison sources, and every newly-created character's exact ability timing.
