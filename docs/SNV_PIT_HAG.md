# Sects & Violets: Pit-Hag implementation

## UI

When the user's shown role is Pit-Hag, Minion Mode now includes a `変身` section.

The user records:

- night (`N2+`),
- chosen player,
- chosen character from the frozen current script,
- optional note.

The history is shown beneath the form. `取り消し` at the bottom removes the most recent Pit-Hag action.

## Candidate-world rules

For each recorded action, the engine checks the candidate history at that exact night.

1. The user must still be alive and currently be the Pit-Hag.
2. If the Pit-Hag is impaired by the currently modeled poison effect, the transformation can fail.
3. If the chosen character is already in play, nothing changes.
4. If the chosen character is not in play, the target's current character changes to that role.
5. The target's alignment is not changed.
6. Dead players may still have their character changed; death state is separate from character state.

## Demon creation

If the successful transformation creates a Demon, that night is added to `arbitraryDeathNights`. On such a night the solver does not apply ordinary Imp one-kill/target constraints to the recorded night deaths. This is necessary because Pit-Hag-created Demon nights may have Storyteller-selected deaths.

The world model can also retain more than one living Demon. Killing one Demon does not automatically end the candidate world while another Demon character remains alive.

## Deliberate limits

Pit-Hag remains marked `solverSupport: generic`, because this update does not yet branch over unknown Pit-Hag actions by another player, nor does it fully simulate the abilities of every character that can be created. The exact recorded self action is modeled; unsupported follow-on character mechanics stay conservative rather than being guessed.
