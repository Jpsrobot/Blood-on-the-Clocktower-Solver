# Character catalog and kanji collision audit — 2026-10-12

This patch builds on the Experimental Minions Phase 9 source update. It corrects display symbols and a custom-script catalog omission, without changing role identifiers, game rules, saved-game schemas, or ability mechanics.

## Duplicate kanji resolved

The earlier source had 11 symbols shared by distinct characters (10 between player roles and 1 between a player role and a Traveller). Every player character and Traveller now has a unique one-character display symbol.

| Character (internal ID) | Old symbol | New symbol | Former collision |
| --- | --- | --- | --- |
| Psychopath (`psychopath`) | 殺 | **凶** | Slayer |
| Al-Hadikhia (`al_hadikhia`) | 生 | **蘇** | Virgin |
| Summoner (`summoner`) | 召 | **喚** | Butler |
| Village Idiot (`village_idiot`) | 愚 | **村** | Fool |
| Riot (`riot`) | 暴 | **乱** | Goon |
| Engineer (`engineer`) | 工 | **技** | Tinker |
| Cannibal (`cannibal`) | 喰 | **貪** | Shabaloth |
| Boomdandy (`boomdandy`) | 爆 | **炸** | Po |
| Magician (`magician`) | 魔 | **幻** | Witch |
| Yaggababble (`yaggababble`) | 呪 | **詠** | Voudon (Traveller) |
| Deviant (`deviant`, Traveller) | 変 | **奇** | Mutant |

All older symbols, including Slayer's 殺, remain unchanged for the existing core roles. All four explicitly chosen Phase-1 experimental symbols 軽 / 錬 / ア / 記 remain unchanged.

One additional symbol hardcoded in the reasoning history display (`殺（サイコパス）`) now reads from `ROLES.psychopath.symbol` so it stays synchronized with the role catalog.

## Script-maker completeness bug fixed

All **10 Experimental Demons** existed in `src/roles.ts` but had been accidentally omitted from `ALL_CORE_ROLE_IDS` in `src/scripts.ts` and so were absent from the custom-script maker's normal selection grid:

`lord_of_typhon`, `kazali`, `legion`, `leviathan`, `lil_monsta`, `lleech`, `al_hadikhia`, `ojo`, `riot`, `yaggababble`.

They are now restored to the custom-script maker. They remain absent from the three official built-in scripts, as intended. Existing saved scripts and games are not rewritten; the internal role IDs have not changed.

## Validation

- The entire role catalog has **125 player characters** (all 125 appear exactly once in `ALL_CORE_ROLE_IDS`).
- The Traveller catalog contains **18 Travellers**, and all 18 appear in its public catalog list.
- Across these 143 characters there are **143 distinct one-character symbols**.
- The regression suite is **322 / 322 passed**, up from 320 tests. The two new tests enforce the completeness of the role list and uniqueness of every player character / Traveller symbol.
- TypeScript engine compilation passed.
- Full TS/TSX offline structural compilation passed with a test-only React type shim and relaxed `noImplicitAny` (the shim does not provide real React event types). This is **not** a real Vite / Windows / Android runtime build.

Historical release notes below this patch retain some previous-release symbols. Use the current `src/roles.ts`, `src/travellers.ts`, and the table above for the corrected present-day display symbols.
