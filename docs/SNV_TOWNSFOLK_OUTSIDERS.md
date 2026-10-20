# Sects & Violets: remaining Townsfolk + Outsiders

This update extends the exact S&V implementation after Seamstress with the remaining Townsfolk and all four Outsiders:

- Philosopher
- Artist
- Juggler
- Sage
- Mutant
- Sweetheart
- Barber
- Klutz

S&V Minions and Demons remain outside this update's implementation cutoff.

## Philosopher

The self-role workflow can record the night and good character ability chosen. The player remains the Philosopher; only the ability changes. While a healthy living Philosopher has gained an in-play character's ability, the actual holder of that character is treated as drunk. If the Philosopher is dead, poisoned, or drunk, that induced drunkenness no longer applies.

A first-night information ability gained on a later night is recorded on the actual night it was gained rather than being backdated to N1. Existing role-specific forms are reused for gained abilities where supported.

External Philosopher claims remain social/report information rather than hard mechanical actions; the solver does not assume another player's claimed choice is truthful.

## Artist

The self and reported-information workflows record:

- day used;
- exact yes/no question text;
- YES / NO / unknown answer.

The question text is deliberately **not parsed into a logical expression**. It is preserved for the player, but the solver does not invent semantics for arbitrary natural-language Artist questions. The one-use self ability is guarded against a second accidental save.

## Juggler

The app records up to five exact player-character guesses from the public guessing day and the number learned the following night. Candidate histories compare each guess against the character at the time of the guesses, so later character changes do not rewrite old Juggler results.

Self entry is one-use and save/import validation requires the result night to immediately follow the recorded guessing day.

## Sage

Sage information records the two players shown after the Sage is killed by a Demon. A healthy direct Sage result requires the actual Demon to be one of those two players. Poison/drunkenness can still explain arbitrary information where mechanically legal.

## Mutant

Death/status input has an explicit Mutant madness-execution marker. Candidate histories only accept that marker when the player can actually have a healthy Mutant ability at that time. The app does not attempt to decide from free text whether ordinary conversation satisfies madness.

## Sweetheart

A healthy Sweetheart death creates persistent drunkenness on one player. Because the Storyteller secretly chooses that player, candidate histories branch over legal targets instead of pretending the app knows the target.

The shared impairment model now handles both poisoning and drunkenness so Sweetheart can affect information, registration, protection, and Mathematician interactions consistently.

## Barber

A healthy Barber death creates an unresolved Barber-swap window. Alignment remains separate from character and is never changed merely because of a Barber swap.

The exact pair and resulting characters are hidden from the good team, so this build **does not enumerate every possible hidden swap**. Instead, later character-dependent observations can remain possible through the unresolved swap. This is intentionally conservative: it avoids falsely ruling out legal worlds without multiplying every candidate by all possible pairs.

If future Minion/Demon work adds direct Demon-side Barber controls, those can provide exact swap history without changing this conservative good-team behavior.

## Klutz

After the Klutz dies, the self/report workflow records the living player chosen and whether the team immediately lost. A healthy Klutz choosing a currently evil-aligned player ends that candidate world with the Klutz loss condition. This uses actual alignment, not nominal character type, so character/alignment-changing interactions remain compatible.

## Verification

The engine/data regression suite passes **114 / 114** tests. A full offline TS/TSX structural compile also passes. The exact Windows `npm run build` and physical Android click-through still need to be run in the user's local project environment.
