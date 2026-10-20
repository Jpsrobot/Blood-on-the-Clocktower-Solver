# Experimental Outsiders: phase 10

This package continues from the branded **血濡れた時計台ヘルパー** build. It adds the ten previously missing Experimental Outsiders. Damsel (乙) was already implemented and is retained. These new roles are available in the custom script maker, not in the three built-in editions.

## Character registry

| Internal ID | Japanese UI label | Symbol | Support and input |
|---|---|---|---|
| `damsel` | 乙女 | 乙 | Existing Minion-only public guess win; new candidate finder in Minion/Demon modes (Demon cannot guess for victory) |
| `golem` | ゴーレム | 岩 | Single recorded nomination, observed kill with linked deletion; non-Demon kill is strong evidence, subject to drunkenness/registration exceptions |
| `hatter` | 帽子屋 | 帽 | Records confirmed Minion/Demon type-preserving character changes after death, during night or day |
| `heretic` | 異端者 | 異 | Reverses the winner when its ability is active, even while dead; relevant official impossible pairings rejected |
| `hermit` | 隠者 | 庵 | Optional -1 Outsider setup, documented compound-ability behavior, event proxies for a few abilities; full multi-Outsider effects **not** simulated |
| `ogre` | オーガ | 怪 | First-night choice changes Ogre alignment to the target's even when drunk/poisoned; never changes Ogre's character type to Minion |
| `plague_doctor` | 疫病医師 | 疫 | Confirmed death grants Storyteller a Minion *ability*, including abilities not on script; no additional Minion player is created |
| `politician` | 政治家 | 政 | Suspicious behavior is a weak clue; original alignment remains good until confirmed end-game Storyteller reward, which is saved separately |
| `puzzlemaster` | パズルマスター | 謎 | One fixed extra drunken player across the game, conditional drunkenness shortlist, once-only guess, correct Demon answer or false answer; self may be the drunk |
| `snitch` | 密告者 | 報 | Minions can record three actual not-in-play character bluffs (excluded from compatible candidate worlds) |
| `zealot` | 狂信者 | 熱 | Checks a known complete public vote tally: a healthy living Zealot must vote when at least five regular players remain alive |

**No symbol conflicts:** Ogre `怪` does not overlap Goblin `鬼`; Snitch `報` and Zealot `熱` were selected to avoid other catalog collisions. Every other role and Traveller retains its existing symbol.

## Recording and deduction rules

- `推理` exposes the **よそ者の能力と検証** panel with the Puzzlemaster shortlist and the recordable Golem nomination, Ogre night-one selection, Hatter changes, Plague Doctor grant, Politician suspicions and Storyteller rewards, and Puzzlemaster result. Hatter and Plague Doctor can be logged on night or day.
- Golem's recorded kill creates an associated death entry. Removing the ability record also removes the linked death entry.
- Minion and Demon modes show **乙女を探す** when Damsel is on the active script. The results are candidate-sample proportions, not certainties; a Demon does not gain the Damsel guess win.
- Snitch provides three Minion bluff selections. False or unattested claims do not become hard facts.
- All new snapshot fields are optional; earlier saved games remain readable without migrations. The saved game freezes the chosen custom-script role list.
- Internal IDs, JSON keys, solver tags and event kinds remain English; the player-facing UI remains Japanese.

## Modeling limitations to understand

1. **Hermit:** the complete simultaneous combination of *all* other scripted Outsider abilities is not tractable in the current bounded solver. Setup adjustment and certain explicit ability-result proxies work, but not arbitrary compounded Puzzlemaster drunkenness, Ogre conversions, Heretic inversions, and Storyteller-rulings all at once. Do **not** interpret the absence of such a sampled world as proof.
2. **Storyteller awards:** Politician victory participation and the exact Plague Doctor-granted ability need manual confirmation. Merely suspecting a Politician is not a forced evil alignment.
3. **Information reliability:** Puzzlemaster's own drunkenness or other drunken/poisoning sources can make results arbitrary. A dead Puzzlemaster cannot make a new guess. An incorrect sober guess produces a non-Demon answer.
4. **Sampling:** the Puzzlemaster helper, Damsel finder, and other displayed numbers are conditional shares of a bounded search—not calibrated real-world probabilities.
5. **Golem and Zealot:** incomplete nominations, unrecorded deaths or hidden/partial votes should not be converted into definitive deductions. Exotic registration or copied-ability exceptions can require Storyteller interpretation.
6. This update was tested with an offline React TSX type shim and engine tests, **not** a genuine Windows Vite build or a physical Android device.

## Tests

- Existing suite: **358/358** passing before this update.
- New and refined regressions: **19**.
- Total **377/377** engine regressions passed; strict engine TypeScript and offline full UI TSX structural check passed.
- A direct regression confirms that all **25 roles** pictured in the user's `DEVOUT THEISTS V6` script are available in the custom script maker.
- The `Atheist` is deliberately still excluded, as requested.
