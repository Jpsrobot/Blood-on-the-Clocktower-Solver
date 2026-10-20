# BMR Mastermind / Exorcist update

## Mastermind

Mastermind now has broad metadata for its game-ending behavior:

- `PASSIVE`
- `ON_DEMON_EXECUTION`
- `GAME_CONTINUATION`
- `ALTERNATE_WIN_CONDITION`

The evidence/advice layer now surfaces a Mastermind warning when:

1. a player died by execution on the previous day,
2. the following night is marked complete, and
3. that night has zero recorded deaths.

This is intentionally a conditional warning, not proof. If the executed player was the Demon and a healthy living Mastermind was active, the current day may be the Mastermind extra day. Nomination advice becomes conservative unless the proposed target is strongly evil in the sampled worlds.

The Mastermind presence card is now visible in the reasoning overview when Mastermind is on the selected script.

Important limitation: the current event model still represents most executions through `deathLog`. BMR can have successful executions where nobody dies (Devil's Advocate, Sailor/Fool/Tea Lady/Pacifist interactions). Full mechanical Mastermind resolution therefore still needs a first-class "execution occurred even though the player survived" event before it can be treated as a hard world constraint.

## Exorcist

Exorcist now has:

- `WAKES_OTHER_NIGHTS`
- `TARGETS_PLAYER`
- `PREVENTS_DEATH`

Direct self Exorcist actions can now be recorded under `自分の行動` from N2 onward.

The UI prevents choosing the same target as the previous Exorcist action.

If a night is explicitly marked complete and has zero deaths:

- a direct self Exorcist choice adds **2.0 evil suspicion points** to the chosen player;
- another player's recorded Exorcist claim adds **1.25 evil suspicion points** to the chosen player.

These are heuristic points only. Other explanations for a no-death night remain possible, and a Pukka can still cause a delayed death even when exorcised.

Repeated Exorcist claims choosing the same target on consecutive recorded uses are flagged as an input/claim inconsistency.

## Devil's Advocate

Devil's Advocate now has:

- `WAKES_FIRST_NIGHT`
- `WAKES_OTHER_NIGHTS`
- `TARGETS_PLAYER`
- `PREVENTS_EXECUTION_DEATH`

## Cumulative BMR tag pass

This build also folds in the BMR tag additions discussed after the earlier tag build, including:

- `CAUSES_OWN_DEATH`
- `ON_DEATH`
- `TARGETS_CHARACTER`
- `ALIGNMENT_CHANGING`
- `BYPASSES_DEATH_PREVENTION`

and applies them to the relevant BMR roles such as Grandmother, Gambler, Tinker, Moonchild, Courtier, Goon, Assassin and Zombuul.
