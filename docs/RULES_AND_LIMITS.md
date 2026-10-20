# S&V support status — Townsfolk, Outsiders, and Demons

The supported S&V slice now includes the implemented Townsfolk/Outsiders, all four Demons, and all four Minion self modes: Evil Twin, Witch, Cerenovus, and Pit-Hag. The Minion modes include exact direct-action/history rules plus strategy helpers; strategy scores remain heuristic rather than mechanically true.

Barber remains intentionally conservative: a hidden Barber death creates an unresolved swap window rather than enumerating every possible hidden pair and character outcome. Artist question text is stored but not semantically parsed, so Vortox cannot mechanically determine whether an arbitrary free-text Artist answer is semantically false.

The impairment context supports Poisoner, persistent poison, Sweetheart/Philosopher drunkenness, No Dashii poison, Vigormortis poison, and Vortox's separate false-information rule for implemented mechanics.

---

# Rules coverage and limits

The engine is designed around standard Trouble Brewing and is intentionally explicit about where information is direct, conditional, reported, or merely strategic.

## Supported setup mechanics

- 5-15 ordinary players.
- Correct Townsfolk / Outsider / Minion / Demon counts.
- Baron `+2 Outsiders / -2 Townsfolk` setup modification.
- Fang Gu `+1 Outsider / -1 Townsfolk` setup modification.
- Vigormortis `-1 Outsider / +1 Townsfolk` setup modification when an Outsider can be removed.
- Unique actual characters.
- One starting Demon.
- Own shown Townsfolk may actually be the Drunk.
- Own exact Demon or Minion token is direct information.
- Standard 7+ evil-team player knowledge for Demon and Minion self modes.
- 5-6 player modes do not assume normal evil-team setup information.
- Demon Storyteller bluffs are out-of-play when directly known/explicitly shared.

## Supported information mechanics

Structured evaluation covers:

- Washerwoman.
- Librarian, including zero Outsiders.
- Investigator.
- Chef with circular adjacency and per-registration choices.
- Empath using historical living neighbours.
- Fortune Teller with one fixed red herring.
- Undertaker using the previous execution.
- Ravenkeeper after the source's night death.
- Spy/Recluse registration where relevant.
- Drunk information as arbitrary information from one fixed believed Townsfolk character.
- Poisoned information as potentially arbitrary, without assuming poison must make the result false.

## Supported public/event mechanics

- Virgin first-nomination behavior and linked execution.
- Slayer success/miss, including Recluse registration possibilities.
- Saint execution loss.
- Soldier immunity to a healthy ordinary Imp attack.
- Monk protection when the Monk is genuine, alive, and healthy.
- Dead votes and spent ghost votes.
- Ordinary Imp attacks, dead-target sinking, and self-kill starpass.
- Scarlet Woman succession using the living count before Demon death.
- Poison ending when a Poisoner ceases to be the Poisoner.

## Demon mode

Dedicated attack recording is supported for Imp, Fang Gu, Vigormortis, No Dashii, and Vortox. Shared Demon mode supports known Minion identities, optionally confirmed exact teammate characters, Storyteller bluffs, strategy-only team bluff plans, and direct nightly attack targets from N2 onward.

Exact supported differences include:

- **Imp:** starpass and Scarlet Woman succession.
- **Fang Gu:** setup modifier and once-per-game first-Outsider transfer.
- **Vigormortis:** setup modifier plus killed-Minion poison state. The killed Minion's character is preserved. Retained Witch, Cerenovus, Pit-Hag, and Evil Twin ability effects are executed while a living healthy Vigormortis keeps them active.
- **No Dashii:** dynamic nearest-Townsfolk poison on both sides, including dead Townsfolk for nearest-character determination.
- **Vortox:** supported Townsfolk information must be false and a no-execution day ends in evil victory at dusk.

A poisoned/drunk Demon loses these ability effects while impaired. Demon attack records remain direct evil-side knowledge and constrain observed night deaths.

## Minion mode

All four Trouble Brewing Minions have dedicated workflows.

### Shared team information

In 7+ players, the known Demon and known fellow-Minion player identities are hard direct information. Exact fellow-Minion characters are not assumed until explicitly confirmed. In 5-6 players, no starting team information is assumed.

Storyteller bluffs that the Demon explicitly shares are hard out-of-play constraints. Planned bluffs are never solver evidence.

### Poisoner

The user's recorded Poisoner target is treated as the actual selected target for that cycle while the user remains a valid living Poisoner. This direct target can create a green cycle marker.

### Spy

Entered Spy Grimoire details constrain healthy-Spy worlds. They are deliberately **not unconditional hard facts**: if the Spy is itself poisoned by a teammate Poisoner, the shown Grimoire/reminder information may be false and a mismatching world can remain legal.

The app does not infer evil-team setup knowledge merely from an entered Spy Grimoire. Team knowledge and ability information remain separate data sources.

### Scarlet Woman

A directly recorded takeover phase requires a legal transition in the candidate history. Successor Imp attacks begin on the next night rather than granting a second same-night Demon action.

### Baron

The user's own Baron token hard-locks Baron into setup and therefore applies Baron's Outsider-count modification.

## Claims, conversations, and evidence

- Ordinary role/type/category claims are not hard role assignments.
- An evil player may bluff a good role; a good player may cover-claim.
- Team bluff plans are private planning notes and never feed back into world weighting.
- Unknown conversations create possible information-flow paths but no automatic good/evil points.
- Repeated/relayed copies of the same underlying information are deduplicated for inference where the app can identify them.
- Personal manual reads do not feed back into the solver.

## Search model

The candidate-world engine is bounded/sampled. Reported shares describe the weighted candidates found by that run and are **not calibrated probabilities**. Low-diversity searches are prevented from producing strong confidence-style warning badges.

The optional weak-meta weighting is capped and cannot override an impossible mechanical world.

## Known limits

1. **Script coverage is incremental.** Trouble Brewing remains the deepest complete ruleset; the implemented S&V Townsfolk/Outsiders/Demons and the four S&V Minion self modes are modeled explicitly. Some hidden opponent Minion choices and many BMR edge cases remain conservative/partial. Travellers are not modeled.
2. Search is bounded rather than exhaustive. A legal world can be missed, particularly with sparse or heavily branched information.
3. Some registration/poison combinations have many Storyteller choices; the implementation models the important TB cases but is not a formal proof engine for every exotic sequence.
4. Free-text notes/ability claims are saved but not semantically parsed into mechanical facts.
5. Strategy recommendations and target shortlists are heuristics, not solved optimal play.
6. The app does not model every possible social-information transmission path; conversations are evidence of possible communication, not proof of content.
7. No production APK/service worker/offline-install package is included yet.
8. Physical Android behavior, browser storage longevity, and the user's exact npm/Vite production build must still be tested locally.
