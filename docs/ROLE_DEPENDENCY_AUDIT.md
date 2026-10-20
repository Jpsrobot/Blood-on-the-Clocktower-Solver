# Character-to-character dependency audit - October 12, 2026

## Scope

Inspected the current 125-character role catalog, the 18 Traveller entries, the custom script editor, script save/load normalization, snapshot role-list normalization, ordinary and special-Demon setup samplers, setup validation, and the corresponding test suite. Focus: **roles that force specific other named roles into the script or starting setup**.

## Result: exactly two automatic named-character additions

| Trigger | Added character | Rule |
|---|---|---|
| `choirboy` | `king` | The Choirboy adds the King, if absent. |
| `huntsman` | `damsel` | The Huntsman adds the Damsel, if absent. |

The reverse is never automatic. The King can be in play without a Choirboy, and the Damsel can be in play without a Huntsman. These pairings are implemented in `src/scripts.ts` and represented in the custom-script editor at `src/App.tsx`. The setup validators/samplers enforce both requirements in normal and special-Demon games.

No other role in the catalog automatically inserts a **specific named character** into a custom script. This does not mean that other abilities lack setup modifiers: e.g., Baron adjusts Outsider counts, Lord of Typhon adds a Minion, and Bounty Hunter creates an evil Townsfolk. Those refer to **character categories**, not a mandatory named partner.

## Permanent regression coverage

Three tests were added to `tests/engine.cjs`:

1. Iterates all 125 player roles and asserts that `createCustomScript` adds **no other named role**, except the two pairs above.
2. Iterates all 125 player roles and tests normalized saved-game script-role lists via `getSnapshotScriptRoleIds`, also testing both pairings together.
3. Verifies that King-only and Damsel-only scripts are legal, including mechanically legal five-player setups without their partners.

Updated result: **325/325 regression tests passed**. Engine TypeScript compilation passed.

## Important distinction: official role interactions / jinxes

A *jinx* is not an automatic script-editor dependency. Official rules describe multiple character-specific interactions that should be modeled when relevant, for example:

- Marionette shown the Huntsman: a Damsel was added during setup, even though the actual character may be Marionette rather than Huntsman.
- Marionette shown the Balloonist: an Outsider may have been added at setup.
- Damsel / Spy and Damsel / Widow: the Damsel is poisoned while those characters are or have been in play.
- Alchemist interacting with specific Minion abilities, and Poppy Grower affecting Spy/Widow information, follow separate special rules.

**Known solver limitation:** the Marionette-believes-Huntsman conditional Damsel setup is not fully enforced in candidate worlds. The standard Huntsman/Damsel script pairing works, but the hidden-Marionette jinx is not guaranteed by the current solver. Other official Djinn jinxes may also require future role-specific work. Do not interpret this audit as certifying full rules/jinx coverage.

Official references:
- https://wiki.bloodontheclocktower.com/Choirboy
- https://wiki.bloodontheclocktower.com/Huntsman
- https://wiki.bloodontheclocktower.com/Marionette
- https://wiki.bloodontheclocktower.com/Djinn

## Code changes in this release

**No production game logic or Japanese UI was changed.** This package adds a dependency-audit report and three regression tests, so the working implementation is not put at risk by unnecessary logic changes. The app continues to require a native Vite/Android build and click-through test in the original development environment.
