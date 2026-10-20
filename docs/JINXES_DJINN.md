# Current policy (2026-10-14)

**Only 29 actionable public jinx entries are shown** (15 currently modeled mechanical/setup exceptions + 14 victory pairings). The 61 unsupported/manual-only historical entries are hidden. Victory rules that require private Storyteller information have a confirmed-result recording form rather than invented automatic deductions. See `JINX_VICTORY_RULES.md` for the live implementation, limitations and testing.

The following section documents the **previous** 90-item display, retained only as release history. It is not the current user interface.

---

# Djinn / Jinx rule catalog — 2026-10-14

## Scope

- Official primary reference (current when audited): https://release.botc.app/resources/data/jinxes.json
- Secondary rules reference: https://wiki.bloodontheclocktower.com/Djinn
- Registered characters covered: 125 player characters, 18 Travellers. This catalog contains **90 relevant official Jinx pairings** (no pairs containing characters absent from the app, including Atheist).
- Jinxes are **script-level public rules**. A visible Jinx does not establish either role is in play. Script Maker and 推理 now use the same `src/jinxes.ts` data via `src/ui/JinxList.tsx`.
- All UI text is Japanese; internal identifiers and matching keys remain English.
- The only automatic *script additions* are still Choirboy => King and Huntsman => Damsel. Jinxes do not change the saved script membership.

## Automatic vs Storyteller-only effects

In the Jinx panel, `一部自動判定` means at least an applicable part of the mechanic is represented in the engine; it **does not** mean every possible use of the role combination is handled. `語り手確認` means that a Narrator/Storyteller decision, timing, replacement, or information effect requires user interpretation. **14** of the 90 rules are marked partially engine-backed; **76** are Storyteller/manual or unmodeled. Several manual-marked pairs have limited setup checking, without modeling their complete consequences.

Automated paths in this update or pre-existing:

- Riot/King and Leviathan/King: once any player is dead, King may receive information.
- Marionette/Huntsman: if believed role is Huntsman, a Damsel must actually have been added; legal Outsider counts and candidate sampling branch accordingly.
- Marionette/Balloonist: permits the belief-derived Outsider count modifier and checks the belief rather than merely the script.
- Marionette/Kazali: adjacency to the actual Demon is required in setup.
- Boffin/Drunk: forbidden ability. Boffin/Village Idiot: spare-token exception.
- Lleech/Slayer: the Lleech's poisoned host may be killed by Slayer's public shot.
- Summoner/Pukka: N2 Pukka permitted; if summoned then, there is no duplicate N3 summon. Self-Minion-mode input and import validation allow a recorded N2 Pukka.
- Legion/Preacher: selecting Legion does not suppress the Legion Demon ability.
- Spy/Damsel and Widow/Damsel: poisoned Damsel registration in candidate timelines.
- Al-Hadikhia/Princess: a successful Princess suppression prevents the following Demon kill.
- Recluse/Sage: Demon registration remains possible as a conditional interpretation.
- Alchemist/Marionette, Alchemist/Spy, Alchemist/Widow, Alchemist/Wraith, Alchemist/Organ Grinder: when the self Alchemist's copied ability is recorded, the named *real* Minion must be in play; copied Mastermind forbids a real Mastermind in the same setup. Their remaining special ability consequences require Storyteller adjudication.

## Intentional limits

- This is **not** a promise that 90 rules are fully simulated. Complex alternate victories, specific night abilities, literal Grimoire-token obscuring, and the subtleties of night death assignment remain manual unless a separate implemented event path is available.
- The user is not asked to assert a factual role from the mere presence of a Jinx. No new hard roles or new automatic named-character additions were introduced.
- Role IDs, token symbols, save format and three built-in scripts remain compatible.
- The official Jinx list evolves; this is a static, audited snapshot, not a live network-fed list. Future new characters or official changes require a registry audit.
- Tests exercise the engine and offline TSX structural compilation. Windows/Vite full build and physical Android interface were **not** run here.

## Source files

- `src/jinxes.ts`: official-relevant 90-pair data, Japanese summaries, lookup helpers and support flags.
- `src/ui/JinxList.tsx`: public jinx panel shared by Script Maker and 推理.
- `src/engine/mechanics.ts`: supported setup, event and information exceptions.
- `src/engine/search.ts`, `src/engine/specialDemons.ts`: hidden Marionette-belief setup sampling.
- `src/storage.ts`, `src/ui/MinionModeUI.tsx`: N2 Pukka recording/validation and user interface.
- `tests/engine.cjs`: the previous 325 tests plus additional jinx tests.
