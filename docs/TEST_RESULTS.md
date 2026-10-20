# 2026-10-18 — Bad Moon Rising timing and role audit

- **407/407 regression tests passed** (386 previous + 21 new).
- Engine TypeScript compilation (`tsc -p tsconfig.engine.json --outDir .engine-test`): PASS.
- Offline React/TypeScript/TSX check with test-only declarations: PASS.
- Branding tests: PASS.
- Coverage: all 25 BMR role timing classifications; night-only form constraints for Sailor/Innkeeper/etc.; first-night Grandmother good-player/character info; Chambermaid wake 0–2 and nonwake/conditional range; Godfather first-night Outsider knowledge plus ±1 setup; 15 action-record specs; Courtier/Assassin/Professor once-only; Devils Advocate repeat-target restriction; Moonchild deceased public daytime choice; Zombuul after-day-death prohibition; duplicate report rejection; old save/reopen; existing script/role behavior retained.
- Full effects of Storyteller discretion, drunk/poison chains, protection/revival/death timing, and some other special BMR mechanics remain partly manual; see `docs/BMR_TIMING_AND_ROLE_AUDIT.md`.
- Windows npm/Vite production bundle and Android device: NOT tested in this environment.

---

# 2026-10-18 — Continue/resume persistence regression

- **386/386 regression tests passed** (previous baseline 382).
- Strict engine TypeScript compile passed.
- Full offline TS/TSX structural/type check passed with test-only React declarations.
- New tests: actual auto-saved empty records across different player counts; populated out-of-script records still rejected; WebView-style save/reopen with backup recovery; UI immediate and background-save lifecycle wiring.
- ZIP integrity checked.
- Windows `npm run build` and Android device runtime not executed in this environment.

---

# 2026-10-17 — Script-filtered death reasons

- Corrected the キル → 理由 menu so サイコパスの公開殺害 appears only in scripts with Psychopath.
- Kept Gnome/Gangster special causes linked to active, living Travellers; Mutant's special execution remains script-gated.
- Centralized menu filtering in `src/deathReasons.ts`; historical reason labels are unchanged.
- Added five regression tests. Engine **382 / 382**, branding **7 / 7**, and TypeScript/TSX syntax **41 / 41** passed.

# Experimental Outsiders phase 10 verification – 2026-10-14

- **377/377 regression tests passed.** Baseline was 358/358, with 19 additional/refined tests.
- `npx tsc -p tsconfig.engine.json --outDir .engine-test`: PASS.
- `npx tsc -p .offline-check/tsconfig.json --noEmit` (local React shim for structural UI TSX check): PASS.
- Role catalog and kanji uniqueness: PASS, 135 ordinary player characters + 18 Travellers.
- DEVOUT THEISTS V6 compatibility: 25/25 characters available in custom scripts.
- Tested: Puzzlemaster self-drunkenness/late-guess rejection/correct answer, Ogre, Golem, Zealot, Heretic and forbidden pair, Plague Doctor, Politician, Hatter night/day, Snitch bluffs, optional saved-event validation, Hermit setup counts.
- Tested: old game regression suite and import/save validation remain green.
- **Not tested:** actual `npm run build` in the user's Windows project or physical-device Android installation.

---

# Victory-focused Djinn update — October 14, 2026

- Existing baseline: 343 / 343.
- Revised release: **358 / 358** passing (**15 additional tests**).
- Engine TypeScript compile passed; offline TSX structural check passed; ZIP integrity check performed.
- Tests: filtered active registry and canonical pairing counts, auto/confirmed outcomes, Grandmother actual death, Soldier Demon-nomination, Leviathan/Mayor D5 ending, Riot/Mayor counts, Al-Hadikhia/Mastermind alternate endings, protected-player executions, malformed/legacy saved events, Alchemist/Summoner setup sampling/early loss/N3 creation, Lleech/Mastermind host execution and ability loss. Includes end-to-end timeline tests.
- Real Windows `npm run build` and Android device testing not performed.

---

# Official Jinx catalog and compatibility checks — 2026-10-14

- Baseline: **325 / 325** regression tests.
- Final suite: **343 / 343 passed** (18 new tests).
- Full strict engine TypeScript compilation: passed with `tsc -p tsconfig.engine.json`.
- Full offline TS/TSX structural type check using a temporary local React shim: passed. **Not a substitute for a real React/Vite build**.
- Focused tests: 90 distinct official-relevant jinxes, role IDs valid, script-level filtering and zero built-in-script jinxes, no auto-add dependency regression, King timing in Leviathan/Riot, Marionette's Damsel and Balloonist hidden Outsider cases, sampled setup reachability, Boffin gift restrictions, Damsel spy/widow exceptions, N2 Summoner/Pukka and late summon, Lleech host Slayer shot, Alchemist Spy/Marionette/Mastermind setup restrictions.
- No actual Windows React build or Android device test run here.

---

# Named-character dependency audit

- Baseline engine TypeScript compile: passed.
- Expanded regression suite: **325 / 325 passed** (three new catalog dependency tests).
- All 125 regular characters checked individually for unexpected added named characters.
- Standard and legacy script lists normalize only Choirboy -> King and Huntsman -> Damsel.
- King and Damsel remain independently selectable.
- Full UI Vite build and device run: not verified.

---

# 2026-10-12 character catalog audit — 322 / 322 passed

- Re-ran all 320 prior engine regression cases successfully.
- New case: every one of 125 registered player roles is selectable from the custom script maker, including all ten experimental Demons.
- New case: each of 125 player roles and 18 Traveller roles has one unique display symbol, with no overlaps between the two catalogs.
- Engine TypeScript compilation succeeded; full offline TypeScript/TSX structural check passed with the test-only React shim and relaxed `noImplicitAny`.
- This does not substitute for the real Vite build, Windows browser interaction, or Android device testing.

---

# Experimental Minions phase 9 verification (2026-10-12)

- Prior baseline: **301 / 301** tests passed.
- Current suite: **320 / 320** tests passed (**19 additional**).
- Strict engine TS compilation: `npx tsc -p tsconfig.engine.json --outDir .engine-test` — passed.
- Offline TSX structural compilation with a test-only React declaration shim — passed.
- Dedicated coverage: eight new role definitions and custom-only script membership; Summoner no-Demon counts and special sampling, Baron compatibility, Night 3 Demon creation and pre-N3 death; Mezepheles exact good-to-evil conversion and illegal target; Widow private poison and claim import; Xaan poison at N1 and N2 with initial 1/2 Outsiders and no trigger with 0; Psychopath confirmed public death, invalid actor, linked event, missing-D1-claim nonzero penalty; Mezepheles/Widow soft evidence; Organ Grinder hidden vote vs Flowergirl; early no-kill Summoner signal; Wizard/Wraith notes and backwards-compatible import.
- User's actual installed Windows `npm run build`, real React click-through and Android device testing have **not** been performed here.
- Archive integrity and source-file manifest checked when packaging. See `EXPERIMENTAL_MINIONS_PHASE9.md`.

---

# Experimental Minions phase 8 verification (2026-10-12)

- Previous baseline: **276 / 276**.
- Expanded suite: **301 / 301 passed** (**25 new cases**).
- Strict engine TypeScript compilation (`tsc -p tsconfig.engine.json --outDir .engine-test`): **passed**.
- Full offline TypeScript/TSX structural check with temporary test-only React declaration shim: **passed**.
- New cases verify five roles' symbols/catalog/script eligibility; Marionette initial adjacency, hidden evil alignment and fake tokens, Demon-known seat and sampled worlds; Boffin unused good grant, invalid in-play ability rejection, conditional public-confirmation evidence, Demon borrowed Virgin public trigger; Fearmonger execution-warning toggle, Goblin combination, successful selected-player nomination/execute loss; Boomdandy's three initial survivors, explosion-death replay, nonfatal execution, Demon survivor requirement and malformed save rejection; Harpy victim reports not becoming Harpy role claims, input validation and target-constrained attributed deaths; and backward compatibility of older saves.
- ZIP integrity and source manifest verified before delivery.
- This was not a full Windows/Vite build against installed React packages and did not include Android physical-device testing.
- Implementation and known limitations: `EXPERIMENTAL_MINIONS_PHASE8.md`.

---

# Experimental Demons phase 7 verification (2026-10-11)

- Baseline **258 / 258**; expanded engine/data suite **276 / 276 passing** (**18 additional tests**).
- Engine TypeScript: `npx tsc -p tsconfig.engine.json --outDir .engine-test` — passed.
- Full offline TS/TSX structural check with local test-only React types — passed (not a Windows Vite build).
- Tests include public Al-Hadikhia and Riot modes and conflicting-flag rejection; Riot D3 Minion conversion, conditional probabilities and nomination chain; Lil' Monsta underlying Minion, night-holder changes and heuristic; Lleech fixed poison host, immortality and simultaneous death; Ojo chosen character and precision kills; Yaggababble limited indicator.
- No installed React/Vite packages or Android emulator used here, so actual `npm run build` and phone use remain unverified.
- ZIP integrity checked before delivery. Detailed behavior and limits: `EXPERIMENTAL_DEMONS_PHASE7.md`.

---

# Experimental Demons phase 6 verification (2026-10-11)

- Baseline: phase 5 **232 / 232** passing.
- Expanded suite **258 / 258** passing (**26 newly added**).
- Engine TypeScript: `npx tsc -p tsconfig.engine.json --outDir .engine-test` — passed.
- Full offline TypeScript/TSX structural check with locally generated test-only React declaration shim — passed (not equivalent to Windows Vite build).
- New coverage includes: new roles in custom scripts, Lord of Typhon contiguous seat line and added Minion, surplus-Minions heuristic, Kazali flexible Outsider numbers/selected Minions, Legion majority-Demon sampler and unusual zero-vote heuristics, Legion conditional suspects and Minion registration, explicit Leviathan gating and no attacks, two executed good players (including execution without death), the fifth-day game ending, generated special-Demon worlds, persisted extra fields and import validation, and vote-record details.
- ZIP integrity verified when packaging. The user's actual Windows `npm run build`, full interactive UI click-through and physical Android install **were not** performed here.
- Source-level details: `EXPERIMENTAL_DEMONS_PHASE6.md`.

---

# Experimental Townsfolk phase 5 verification (2026-10-10)

- Previous phase: **210 / 210** regression cases passed.
- New phase: **232 / 232** cases passed (**22 additional**).
- Engine TypeScript compilation: `tsc -p tsconfig.engine.json --outDir .engine-test` — passed.
- Entire React TSX source: offline TypeScript structural check with **test-only** React declaration shim — passed.
- New cases cover all six role catalog entries, imported report validation, Steward good registration and Spy flexibility, Shugenja clockwise/counterclockwise and ties, 1–3 real Village Idiots and one persistent drunk among extra copies, Poppy Grower evil introduction and delayed reveal, Preacher suppressing Poisoner/Scarlet Woman/Spy abilities and lifting suppression after death, Princess first-day timing and no-Demon-kill effect, surviving an execution, and explicitly non-Demon night deaths.
- This update was packaged as a source ZIP; user's Windows `npm run build`, actual React/Vite runtime, and physical Android use were **not** executed here.
- Details: `EXPERIMENTAL_ROLES_PHASE5.md`.

---

# Experimental Townsfolk phase 4 verification (2026-10-10)

- Baseline: phase 3 **191 / 191** passed.
- Full current suite: **210 / 210** passed (**19 new tests**).
- Engine compile: `npx tsc -p tsconfig.engine.json --outDir .engine-test` — passed.
- Full offline TS/TSX structural type check with local test-only React declaration shim — passed.
- New coverage: phase-4 symbol/catalog isolation, Huntsman/Damsel setup and transformations, Knight/Noble Vortox and registration, Magician's ambiguous Demon/Minion introductions and sampling, Nightwatchman one-shot, Lycanthrope night kill and Demon kill suppression, Pixie inheritance and Storyteller confirmation, public Damsel guess with Spy jinx, persistent Faux Paw evil registration, repeated-action import rejection.
- Limits: user's Windows Vite build and physical Android interaction were not available here. Source ZIP, not APK.
- Details: `EXPERIMENTAL_ROLES_PHASE4.md`.

---

# Experimental Townsfolk phase 3 verification (2026-10-10)

- Baseline: previous phase 2 **177 / 177** passed.
- With 14 phase-3 test cases, current suite **191 / 191 passed**.
- `npx tsc -p tsconfig.engine.json --outDir .engine-test` — passed.
- Offline full TS/TSX structural type check using locally bundled test-only React type declarations — passed.
- No local installed React/Vite node_modules or physical Android device available for a native end-to-end build/click-through.
- Coverage includes the seven roles and symbol/selection rules, Choirboy+King setup and Demon-kill trigger, King's late threshold and Spy registration, Vortox gating, hard-lock sampling for the Demon's known King, Engineer one-use character changes, Farmer good-only cascade, ST-dependent info, and invalid import payload detection.
- See `EXPERIMENTAL_ROLES_PHASE3.md` for design limits and explicit assumptions.

---

# Experimental Townsfolk phase 2 verification

- Engine compile: `npx tsc -p tsconfig.engine.json --outDir .engine-test` — **passed**.
- Regression suite: `node tests/engine.cjs` — **177 / 177 passed**.
- Full offline TS/TSX structural compile using the local React declaration shim — **passed**.
- Focused coverage includes requested role symbols, Balloonist dual setup, Balloonist type progression/Vortox, Banshee Demon-kill vote behavior, Bounty Hunter evil-Townsfolk worlds and information sequence, and Cannibal inheriting an executed Monk's protection.
- This does not replace the user's exact Windows `npm run build` against installed React/Vite packages or a physical-device click-through.

---

# 2026-10-09 Experimental characters phase 1 verification

- Regression suite: **169 / 169 passed**.
- Engine compile: `npx tsc -p tsconfig.engine.json` — passed.
- Full offline TS/TSX structural compile using the test-only React declaration shim — passed.
- New regression coverage includes:
  - the four experimental characters are selectable in the custom script maker but absent from all built-in scripts;
  - healthy Acrobat death against the Drunk character;
  - poisoned Acrobat self-target survival;
  - Alchemist copied Baron setup counts and duplicate setup stacking;
  - healthy Alsaahir exact/inexact win logic;
  - Amnesiac tag-answer and final-role-hypothesis save validation.

---

# 最新検証: 実験的旅人アップデート

- エンジン/データ回帰テスト: **163 / 163 passed**
- `tsc -p tsconfig.engine.json`: passed
- フルTS/TSX構造チェック: passed

追加確認:
1. 全18旅人が通常RoleId外の旅人カタログとして保存可能。
2. カックルジャックのN2+役職変更が現在役職へ反映され、陣営は変化しない。
3. ノーム/ギャングスター死亡が独立した死亡原因として保存/検証される。
4. ノームの同陣営友人が旅人善悪推定へ反映される。

---

# 2026-10-09 BMR / S&V 旅人検証

- エンジン/データ回帰テスト: **159 / 159 passed**
- エンジン TypeScript コンパイル: **passed**
- フル TS/TSX オフライン構造チェック: **passed**
- 新規確認:
  - BMR/S&V旅人10役が通常RoleId/セットアップ人数へ混入しない
  - 寮母の席交換が履歴上の座席順へ反映される
  - ブードゥー師中は死亡旅人が死者票なしで繰り返し投票でき、他の生存旅人は投票できない
  - 見習いの取得能力から善悪陣営を確定できる
  - バリスタの酔い・毒なし＋真情報がVortoxより優先される
  - 骨拾いが死亡情報役の能力を夕暮れまで復帰させる
  - 変人判定、新Traveller action、判事/司教/肉屋の指名データが保存検証を通る

---

# 2026-10-09 旅人追放パッチ検証

- エンジン/データ回帰テスト: **151 / 151 passed**
- エンジン TypeScript コンパイル: **passed**
- フル TS/TSX オフライン構造チェック: **passed**
- 新規確認:
  - 追放された旅人は活動停止・死亡扱いになり、能力を失う
  - 追放された旅人は死者票を1票保持する
  - 死者票使用後は再投票できない
  - 追放された官僚の投票修正が即座に停止する
  - 追放状態を含む新規セーブと、追放フィールドのない旧セーブの両方を受理する

---
# 2026-10-09 官僚・泥棒 対象更新パッチ検証

- エンジン/データ回帰テスト: **150 / 150 passed**
- エンジン TypeScript コンパイル: **passed**
- フル TS/TSX オフライン構造チェック: **passed**
- 新規確認:
  - 官僚・泥棒の `N1` 対象が `D2` へ持ち越されない
  - `N2` で新しい対象を選ぶと `D2` だけに反映される
  - 前日の投票重みは履歴から再現可能
  - 「能力発動」画面で処刑人と活動中の官僚・泥棒を併記
  - 処刑人ではタップした人を使用者、官僚・泥棒ではタップした人を対象として扱う

---
# 2026-10-09 旅人アップデート検証

- エンジン/データ回帰テスト: **149 / 149 passed**
- エンジンTypeScriptコンパイル: **passed**
- フルTS/TSXオフライン構造チェック: **passed**
- 追加確認:
  - 旅人が通常セットアップ人数/RoleIdへ入らない
  - 官僚 + 泥棒 = -3票
  - 物乞いへの投票トークン譲渡で死亡者の死者票が消費される
  - スケープゴート身代わりが同陣営推定へ反映される
  - 旅人の確定陣営入力が行動推定より優先される
  - 旅人投票がFlowergirlのデーモン投票判定へ誤混入しない

---

# Outsider claim-behaviour verification

- Engine/data regression suite: **143 / 143 passed**.
- Full TS/TSX structural check with local React declarations: **passed**.
- Early-claim tags: Butler, Recluse, Drunk, Tinker.
- Hidden-claim tags: Saint, Lunatic, Mutant.
- Neutral Outsiders remain neutral instead of being assigned invented claim certainty.
- Count-modifier weighting is suppressed when exact-role claim coverage is low.
- Fixed-seed 8-player TB reproduction with Saint as the only Outsider claim: Baron share about **0.016%** at 12,000 attempts.

# 日本語UI検証

- 既知の画面表示用英語語句を静的監査し、残存なし。
- 全役職の表示名は日本語表記。
- 組み込みスクリプト名は日本語表記。
- エンジン回帰テスト: **138 / 138 合格**。
- エンジン TypeScript コンパイル: **合格**。
- React のテスト用宣言を用いた全 TS / TSX 構造チェック: **合格**。
- 内部コード識別子、役職ID、保存用 N/D フェーズ値は互換性のため英字のままです。これらはユーザー向け役職名・UI文言ではありません。

# S&V Minion-mode verification

**Current engine/data regression suite: 138 / 138 passed.**

New coverage includes:

1. Evil Twin direct setup information hard-locking the good Twin's character.
2. Evil Twin winning when the good Twin is executed.
3. The living Twin pair blocking the ordinary good Demon-death victory.
4. Witch curse/nominator death consistency while more than three players live.
5. Cerenovus madness execution requiring the matching healthy nightly action.
6. A Vigormortis-killed Pit-Hag retaining its transformation ability.
7. The opponent-view projection stripping secret Evil Twin/team information.
8. Cerenovus strategy prioritizing an already evil-looking town-facing target.
9. Pit-Hag strategy using current-world role presence when estimating whether a transformation can succeed.
10. Snapshot validation for Evil Twin, Witch, Cerenovus, and Pit-Hag records.
11. Atomic deletion of linked Witch deaths and Cerenovus madness executions.

The engine TypeScript compile passes. A full offline TS/TSX structural check using a local test-only React declaration shim also passes. The user's exact Windows `npm run build` against their installed React/Vite packages was not run here.

# Vigormortis Outsider-tag patch verification

- Engine/data regression suite: **127 / 127 passed**.
- Added regression coverage for data-driven `OUTSIDER_COUNT_MODIFIER` deltas and Vigormortis Outsider-count evidence.
- Full offline TS/TSX structural check: **passed** using a local declaration shim.
- The user's exact Windows `npm run build` and physical-phone click-through remain environment-specific checks.

# Current verification — S&V Demons

**125 / 125 engine/data regression tests passed.**

New coverage verifies:

1. Fang Gu and Vigormortis setup-count modifiers.
2. Fang Gu first-Outsider transfer, evil alignment change, and replacement death.
3. Rejection of an ordinary Outsider death when a healthy unused Fang Gu should transfer instead.
4. No Dashii nearest-Townsfolk poisoning, including skipping non-Townsfolk and *not* skipping dead Townsfolk.
5. Separation of No Dashii/Vigormortis poison from inferred Poisoner targets.
6. Vigormortis Minion death state and both legal Storyteller poison directions.
7. Vortox false-information enforcement, including precedence over Townsfolk drunkenness.
8. Vortox no-execution dusk loss.
9. Vortox Savant behavior (both statements false while Vortox is active).
10. Save/import validation for all four S&V Demon attack records.
11. Regression coverage for Snake Charmer-to-Vortox timing and ordinary non-Vortox Savant behavior.

A full offline TS/TSX structural compile also passed. The user's exact Windows `npm run build` and physical-phone click-through still need to be run locally.

---

# Current verification — S&V remaining Townsfolk + Outsiders

**114 / 114 engine/data regression tests passed.**

The new coverage includes Philosopher gained abilities and induced drunkenness, later-night first-night information, Artist recording, Juggler historical character checks, Sage Demon-kill information, Mutant madness execution, persistent Sweetheart drunkenness, conservative Barber swap windows, Klutz loss, and save/import validation for the new records.

A full offline TS/TSX structural compile also passed. This is not a substitute for the user's exact Windows `npm run build` against their installed React/Vite dependencies or a physical-device click-through.

---

# Latest verification — S&V exact support through Seamstress

- Engine/data regression suite: **104 / 104 passed**.
- Full offline TS/TSX structural type check: **passed** using a local React declaration shim.
- Added regression coverage for:
  1. the explicit S&V cutoff (Philosopher remains generic);
  2. healthy Snake Charmer mandatory Demon swap;
  3. character + alignment swap and permanent poison on the old Demon;
  4. Flowergirl historical-day correctness across an N2 Snake Charmer swap;
  5. healthy Savant exactly-one-true statement logic and selected-player statements;
  6. Mathematician counting a poisoned Soldier death and false poisoned information;
  7. save/import validation for Mathematician, Savant, and Snake Charmer.
- Existing Town Crier, Oracle, and Seamstress regression coverage still passes.
- No runtime dependency was added.

# Latest verification — S&V exact information phase 1

- Engine/data regression suite: **95 / 95 passed**.
- Full offline TS/TSX source check: **passed** using a local React declaration shim.
- New regression coverage verifies Clockmaker, Dreamer, Flowergirl, Town Crier, Oracle, Seamstress, and import validation for the new structured-information records.
- No new runtime package is required.

# Latest verification — v2.1 Spy strategy

- Engine/data regression suite: **87 / 87 passed**.
- Full offline TS/TSX source check: **passed** using a minimal local React declaration shim.
- New coverage verifies:
  1. Fortune Teller recognizes non-Imp Demon characters on larger/custom scripts.
  2. Goblin is present as an experimental Minion with execution-risk metadata.
  3. The Spy advisor identifies a Grimoire Saint as a framing target, tracks the known Demon seat, and produces a fake-information recommendation for an information bluff.
- No new runtime package is required.

# Latest verification - Unified information recording

- Engine/data regression suite: **84 / 84 passed** after the UI/storage compatibility changes.
- TS/TSX syntax transpile check: **passed**.
- The unified form preserves the existing `abilityClaimLog` schema, so older saves remain compatible.
- The user's exact Windows `npm run build` should still be run after copying the updated `src` folder.

# Current verification

**84 / 84 engine/data regression tests passed.**

The newest checks cover changed Empath reads with stable neighbours, suppression of the heuristic after a nearby death, and increased weighting for Drunk/poison explanations.

# Empath stable-neighbour heuristic verification

New regression coverage checks that:

1. A changed Empath read with the same two living neighbours creates the new impairment heuristic.
2. A nearby neighbour death suppresses that heuristic.
3. Candidate weighting prefers Drunk or required-poison explanations over an otherwise identical healthy Empath world.

# Current verification

## Sects & Violets Pit-Hag update

**80 / 80 engine/data regression tests passed.**

New checks cover:

1. Pit-Hag character-change metadata.
2. N2+ snapshot validation for direct Pit-Hag transformations.
3. Character changes preserving alignment.
4. Demon creation allowing arbitrary deaths for that night.

A full offline TS/TSX source check also passed using the existing test-only React declaration shim.

# Test and verification results

## Current Minion-mode build

The engine/data regression suite was run after the Minion-mode changes:

**72 / 72 tests passed.**

The suite includes the existing Trouble Brewing regression coverage plus Minion-mode and Spy bluff-advisor cases.

### New Minion-mode regression checks

1. Self Minion character, known Demon, fellow Minion identities/exact roles, and shared Storyteller bluffs correctly constrain candidate assignments.
2. The user's own Poisoner action fixes that night's poison target and produces a direct numbered green marker.
3. A Spy Grimoire mismatch remains possible only through an applicable self-poison explanation rather than being accepted unconditionally.
4. A healthy Spy's displayed Poisoner reminder matches the real poison target, while a poisoned Spy may be shown a different target; the conditional green display marker is produced.
5. A Scarlet Woman takeover can be recorded as a direct self Demon-succession phase and enforced by candidate history.
6. Snapshot validation rejects self as the known Demon and rejects non-Minion characters as exact fellow-Minion roles.
7. The Spy opponent projection strips secret evil knowledge, the user's existing self bluff, and self-only whispers, while keeping public information and normalizing hidden bluff labels.
8. The Spy bluff advisor returns only good-role bluff candidates, produces an opponent-view candidate set, and marks Grimoire-confirmed in-play roles as collision risks rather than recommended safe choices.

### Existing regression areas retained

Coverage also includes:

- seat ring/setup counts and Baron setup;
- living-neighbour history;
- Spy/Recluse registrations;
- Chef pair registration;
- Fortune Teller red herring/poison/Drunk behavior;
- unique roles and fixed Drunk believed character;
- one Poisoner target per cycle;
- Slayer/Virgin public events;
- Scarlet Woman and Imp succession;
- Saint/Soldier/Monk mechanics;
- explicit missing-versus-none death handling;
- ghost votes;
- claim timing and relay deduplication;
- evidence feedback-loop guards;
- linked-event deletion;
- import validation;
- sparse-sample warning/advice guards;
- Demon-mode hard knowledge, attacks, dead-target sinking, and self-kill succession.

## TypeScript / TSX check

A full offline source type check passed using TypeScript and a minimal test-only React declaration shim because the delivery workspace does not contain the user's installed `node_modules` tree.

**Result: passed with no reported TS/TSX errors.**

This catches source-level type issues but is not identical to compiling against the user's exact installed React/Vite package versions.

## What was not run here

- The user's exact `npm run build` against their Windows `node_modules`.
- The physical Redmi Note 11 Pro 5G.
- A complete browser click-through of every new Minion-mode control.
- Exhaustive enumeration of all legal Trouble Brewing worlds.

The existing code has no new runtime dependencies. After installing the source update, the user should run:

```bat
cd /d "%USERPROFILE%\clocktower-solver"
npm run dev
```

and optionally:

```bat
npm run build
```

A successful local Vite build plus a quick Minion-mode click-through is the final environment-specific verification.


### BMR Mastermind / Exorcist checks

- Direct self Exorcist choice on a completed zero-death night raises suspicion on the chosen player.
- Repeating the same Exorcist target is flagged as inconsistent.
- An execution followed by a completed zero-death night surfaces Mastermind risk.
- Imported/saved snapshots accept direct self Exorcist actions.

**Current result: 72 / 72 tests passed.**

## Game-over result selection regression

- Existing reasoning regression suite: **84/84 passed** after the game-over result changes.
- `tsc -p tsconfig.engine.json` passed, including the updated game-log outcome type and storage validation.
- `App.tsx`, `GameLogUI.tsx`, `storage.ts`, and `types.ts` were syntax-checked with the TypeScript compiler API.
