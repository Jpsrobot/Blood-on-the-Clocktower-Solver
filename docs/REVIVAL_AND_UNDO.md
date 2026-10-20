# Revival and undo controls

## Revival

The status panel shows `復活` only when all of the following are true:

- the selected player is currently dead;
- the current script contains at least one role tagged `REVIVES`; and
- the game is on N2 or later.

Pressing `復活` records a revival at the current night (`N#`). The status timeline then treats the player as alive. A revived player can die again later.

The generic candidate-world timeline requires a living role with the `REVIVES` tag to explain the revival, but exact Professor/Shabaloth legality is intentionally left to their future role-specific evaluators.

## Undo

The fast-entry screens now use one bottom `取り消し` button instead of delete buttons on every history row. It removes the most recent record of the relevant kind and also removes linked auto-generated records through the existing event-group deletion logic.

Targeted deletion of older records remains available from the reasoning/history screen.
