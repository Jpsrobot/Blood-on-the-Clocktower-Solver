# v2.1 Spy icon + Poisoner N1 patch

## Spy Grimoire icons
When the local player is the Spy, entering a starting role in **N1 グリモア — 初期役職** now updates that seat's large kanji on the main board immediately. The private Grimoire role takes display priority over that seat's public role claim while playing as Spy. This changes presentation only; public claims remain stored separately.

## Poisoner N1 Empath pressure
On N1, if Empath is on the selected script and the Poisoner knows the Demon seat, the two seats adjacent to the Demon receive a small target-priority bonus. This reflects the risk that an Empath beside the Demon could receive dangerous information.

The heuristic does not use hidden setup truth. It uses the selected script plus the current public candidate-world sample, so it cannot reveal whether an Empath is actually in play.
