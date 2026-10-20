# Vote order, Drunk shares, and script architecture

## Drunk shares
The candidate search already tracked a `drunk` share for every player. This update exposes that value in the compact player summary and nomination card, alongside Evil and Demon. The value is the weighted share of sampled candidate worlds in which that seat is the Drunk; it is not a calibrated real-world probability.

## Vote order
The app uses `seats(playerCount)` as the clockwise circular seating order:

`self -> 1L -> 2L -> ... -> top-left -> top-right -> ... -> 2R -> 1R -> self`

For a nomination, the vote UI rotates that ring so the first displayed voter is the seat immediately clockwise from the nominee and the nominee is last. The saved `voters` array is stored in this physical count order regardless of the order in which buttons were tapped.

## Current script/playset architecture
The current build is still Trouble Brewing specific. `GameSnapshot.playset` stores the script id, currently `trouble_brewing`. In `App.tsx`, that id selects `TROUBLE_BREWING_ROLE_IDS`. Those role ids drive role pickers, tags, own-role menus, and bluff options.

`roles.ts` contains the metadata for every implemented role: type, symbol, tags, and night speed. The search/mechanics layer contains explicit Trouble Brewing logic for setup counts and character abilities. Therefore changing the `playset` string alone does not make an arbitrary custom script work.

A future generic script system should introduce a `ScriptDefinition` (id, name, list of role ids, optional Travellers/Fabled), use that list everywhere the UI currently consumes `currentScriptRoleIds`, and then distinguish between: (1) roles whose mechanics are implemented and can be reasoned about fully, and (2) unknown/homebrew roles that can be displayed but need an explicit mechanics definition before the world solver can validate them.
