# Sects & Violets audit — first corrective slice

Branch: `fix/snv-audit`, based on main `65d36c5` (merged baseline PR #1).
Audit date: 2026-10-21. This is **not complete S&V implementation or certification**.
The status below describes inspected paths, not every legal interaction. Older
`SNV_*.md` files describe successive historical cutoffs and test counts; this
checklist supersedes their broad “exact” claims for the current audit.

## Implemented correction

The official [Snake Charmer rules](https://wiki.bloodontheclocktower.com/Snake_Charmer)
explicitly cover a Philosopher using that ability: the former Demon becomes a
poisoned Philosopher. The engine incorrectly assigned `snake_charmer` instead.
It now swaps the actual characters, independently of the already separate
alignment swap. Permanent poisoning and removal of the self Philosopher's
acquired ability remain intact. Historical replay for information and the Spy
advisor uses the character immediately before the swap, rather than the ability
name. No save fields or schema version changed; replay derives the character
from existing initial roles and change events.

Three regressions reproduced the original defect before correction (411/414
passed): current identity, Juggler's historical read, and persisted action replay.
Additional coverage exercises Vortox/No Dashii transfers and invalid unacquired
or declined swaps. The save regression also removes the swap through the existing
undo helper and checks restoration of the original character and gained ability.

## All 25 characters: timing specification and current status

Rules authority: the individual linked Wiki pages (Summary, How to Run and
examples). “First” means first opportunity **with that character/ability**, not
unconditionally calendar N1. This is an audit specification; a complete shared
runtime specification and UI/import integration remain to be implemented.
“Partial” means the inspected normal path exists but the listed boundary is not
fully supported or verified. No row is certified complete in all custom scripts.

| Character | Required timing / usage | Inspected support and remaining limitation |
| --- | --- | --- |
| [Clockmaker](https://wiki.bloodontheclocktower.com/Clockmaker) | First-night information | Partial: distance constraint and later Philosopher acquisition exist; general creation/restoration timing is incomplete. |
| [Dreamer](https://wiki.bloodontheclocktower.com/Dreamer) | Every night: choose another non-Traveller; receive good/evil character pair | Partial: structured pair and registration checks exist; audit all UI/import target restrictions and acquired-ability lifecycles. |
| [Snake Charmer](https://wiki.bloodontheclocktower.com/Snake_Charmer) | Every night: choose living player, including self; conditional swap and permanent poison | **Fixed copied-ability character swap and historical replay.** Direct self actions exist; hidden non-self actions and all subsequently acquired Demon controls are not fully covered. |
| [Mathematician](https://wiki.bloodontheclocktower.com/Mathematician) | Every night: count players with abnormal abilities since dawn | Partial: supported abnormal events are counted, not all impaired players; incomplete event coverage and simultaneous-effect attribution prevent exact general counts. |
| [Flowergirl](https://wiki.bloodontheclocktower.com/Flowergirl) | N2+ information about prior day's Demon votes | Partial: prior-day character replay exists; phase-level history is insufficient for every within-day identity change. |
| [Town Crier](https://wiki.bloodontheclocktower.com/Town_Crier) | N2+ information about prior day's Minion nominations | Partial: previous-day replay exists; event-level identity and all Traveller-related nominations need further coverage. |
| [Oracle](https://wiki.bloodontheclocktower.com/Oracle) | N2+ information about dead evil players | Partial: alignment is separate from character; full dead-Traveller alignment/registration handling needs audit. |
| [Savant](https://wiki.bloodontheclocktower.com/Savant) | Optional daytime visit each day; two statements | Partial: structured role-presence/group templates, exactly one true normally and both false under Vortox; unrestricted statement semantics not modeled. |
| [Seamstress](https://wiki.bloodontheclocktower.com/Seamstress) | Once at night: two other players, including dead/Travellers | Partial: pair alignment and one-use self input exist; Traveller targets and renewed ability instances need coverage. |
| [Philosopher](https://wiki.bloodontheclocktower.com/Philosopher) | Once at night: gain good ability; ongoing matching-character drunkenness | **Fixed Snake Charmer interaction.** Self acquisition and selected first-night exceptions exist; non-self holders, multiple matching holders, full impairment and reset lifecycle remain partial. |
| [Artist](https://wiki.bloodontheclocktower.com/Artist) | Once by day: arbitrary yes/no question | Partial: question text preserved, no invented natural-language deduction; supported structured question predicates are missing. |
| [Juggler](https://wiki.bloodontheclocktower.com/Juggler) | First day as Juggler: 0–5 guesses; information next night | **Fixed historical copied Snake Charmer identity.** Structured guesses exist; creation-day/restoration and within-day identity ordering remain incomplete. |
| [Sage](https://wiki.bloodontheclocktower.com/Sage) | Conditional information when killed by Demon | Partial: direct death-trigger and pair checks exist; precise killer identity with multiple Demons and special jinx triggers need coverage. |
| [Mutant](https://wiki.bloodontheclocktower.com/Mutant) | Passive madness; discretionary execution | Partial: confirmed execution marker exists; no natural-language madness inference. Night execution and acquired abilities need full UI/import coverage. |
| [Sweetheart](https://wiki.bloodontheclocktower.com/Sweetheart) | On death: selected player's ongoing drunkenness | Partial: hidden seated targets branch and persist; Traveller targets, revival and all source-lifecycle combinations need coverage. |
| [Barber](https://wiki.bloodontheclocktower.com/Barber) | On death today/tonight: optional Demon-directed swap | Partial: unresolved swap window only. Exact legal pairs, character changes and ability resets are missing; conservative observation handling does not prove all legal worlds survive every downstream check. |
| [Klutz](https://wiki.bloodontheclocktower.com/Klutz) | On learning death: publicly select living player; conditional immediate loss | Partial: recorded choice uses actual alignment; Traveller targets and delayed death notification need coverage. |
| [Evil Twin](https://wiki.bloodontheclocktower.com/Evil_Twin) | Initial pairing information; persistent victory effects | Partial: direct self evil Twin pair and retained-minion paths exist; good Evil Twin, newly created Twins and re-pairing are incomplete. |
| [Witch](https://wiki.bloodontheclocktower.com/Witch) | Every night: curse; next-day nomination death; inactive at 3 alive | Partial: direct curses, linked death and retained ability exist; exact immediate threshold changes and nomination continuation need additional event-order tests. |
| [Cerenovus](https://wiki.bloodontheclocktower.com/Cerenovus) | Every night: player/character choice; next-day discretionary execution | Partial: direct actions and confirmed outcomes exist; Goblin jinx target allowance is missing from good-character-only validation. No automatic madness inference. |
| [Pit-Hag](https://wiki.bloodontheclocktower.com/Pit-Hag) | N2+: choose player/absent character; Demon creation allows arbitrary deaths | Partial: direct changes preserve alignment and mark arbitrary deaths; hidden choices, newly acquired ability scheduling, Twin reset and all jinx exceptions are incomplete. |
| [Fang Gu](https://wiki.bloodontheclocktower.com/Fang_Gu) | Setup +1 Outsider; N2+ attack; first successful Outsider kill jumps once globally | Partial: direct jump, actual alignment and global usage exist; multi-Demon creation, protection combinations and recreated instances need broader coverage. |
| [Vigormortis](https://wiki.bloodontheclocktower.com/Vigormortis) | Setup −1 Outsider; N2+ attack; ongoing killed-Minion retention/neighbor poison | Partial: dead Minions and nearest Townsfolk including dead are represented; multiple source ownership and every source-death/jinx/impairment combination are not certified. |
| [No Dashii](https://wiki.bloodontheclocktower.com/No_Dashii) | N2+ attack; ongoing nearest-Townsfolk poison both directions | Partial: dynamic neighbors include dead and react to supported role changes; interacting poison-source cycles and hidden changes remain limited. Copied Snake Charmer transfer covered here. |
| [Vortox](https://wiki.bloodontheclocktower.com/Vortox) | N2+ attack; ongoing false Townsfolk information; dusk execution condition | Partial: false-information precedence, Savant and explicitly recorded no-execution days exist; arbitrary Artist semantics and every execution/Traveller/created-ability path remain unverified. Copied Snake Charmer transfer covered here. |

## Traveller interaction audit

Existing `tests/suites/travellers.cjs` covers these concrete paths; this change
neither replaces the Traveller subsystem nor claims exhaustive integration.

| Traveller | Existing evidence | Remaining audit boundary |
| --- | --- | --- |
| [Barista](https://wiki.bloodontheclocktower.com/Barista) | Sober/healthy true information overrides Vortox regression | Double actions, renewing spent abilities and effect-source lifetime are not established by the record-validation test. |
| [Bone Collector](https://wiki.bloodontheclocktower.com/Bone_Collector) | Dead information ability restored through dusk regression | First-night/once ability resets and source death need full lifecycle coverage. |
| [Harlot](https://wiki.bloodontheclocktower.com/Harlot) | Consent, shown character and outcome records validate | Exact information/death constraints and unusual alignment interactions need end-to-end tests. |
| [Butcher](https://wiki.bloodontheclocktower.com/Butcher) | Extra nomination record validates | A first execution without death qualifies; exile does not. Full second nomination/vote/threshold/Witch ordering remains to verify. |
| [Deviant](https://wiki.bloodontheclocktower.com/Deviant) | Storyteller funny judgement records validate | Full exile survival and impairment integration remains to verify; never infer humour automatically. |

## Follow-up stages and regression gates

1. **Timing and Townsfolk lifecycle:** introduce one explicit 25-role timing model
   distinguishing information, action, usage, passive and conditional triggers.
   Share it between Japanese forms and import validation, with ability-acquisition
   phase rather than starting-role N1 shortcuts. Add per-role positive/negative
   phase and target tests, poison/drunk variants, creation/restoration and save/undo
   roundtrips. Add structured Artist predicates while retaining arbitrary text.
2. **Outsiders:** implement confirmed Barber swaps plus bounded hidden alternatives;
   test alignments, optional no-swap, first/once ability resets, Sweetheart lifetime,
   Klutz Traveller targets and discretionary Mutant outcomes. Verify legal hidden
   worlds remain possible instead of adding unjustified hard constraints.
3. **Minions:** model Twin pairs independent of nominal alignment and initial self
   role; cover re-pairing, Witch thresholds/event ordering, Cerenovus jinx targets,
   Pit-Hag acquisition and arbitrary deaths. Keep strategy advice separate from facts.
4. **Demons:** add source-specific poison/retention lifecycles, created multiple
   Demons, Fang Gu usage continuity and execution-without-death/Vortox tests.
5. **Cross-role integration:** test every critical interaction in the brief, all five
   Travellers, permitted TB/BMR/experimental combinations and official jinxes.
   Add historical per-event state where phase-only reconstruction is insufficient.

After each stage run `node tests/run.cjs`, `npm run test:branding`,
`npm run test:harness`, and `npm run build`; inspect the diff for Japanese text,
role symbols and version-2 save compatibility. Run browser tests for changed forms
with an available browser, and separately record Android device verification.
Passing bounded examples does not establish exhaustive solver completeness.

## Validation for this slice

- `node tests/run.cjs`: **417/417 passed** (411 baseline + 6 new).
- `npm run test:branding`: **7/7 passed**.
- `npm run test:harness`: **1/1 passed**, verifies failure exit status.
- `npm run build`: **passed**, includes real `tsc -b` and Vite production build.
- Existing large-bundle warning remains. Lint was not rerun; baseline is 69 errors
  and 4 warnings, recorded separately in `KNOWNBUGS.md`.

Browser and physical
Android behaviour were not tested. Chromium installation previously returned
invalid archives; engine and TypeScript/build checks do not require Chromium.
