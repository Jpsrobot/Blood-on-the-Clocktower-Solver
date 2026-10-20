# 2026-10-18 — Bad Moon Rising role timing and information audit

- Added `src/abilityTiming.ts` with separate night-information/night-action/day-action definitions for **all 25 Bad Moon Rising characters**. Ability claims, reported information, self recording, and script-maker badges share this metadata. Reject invalid BMR day/night phases in newly recorded events.
- Implemented structured first-night Grandmother **good player + character**, nightly Chambermaid **two players + wake count (0–2)**, and first-night Godfather **Outsider roster** information. Apply conservative solver checks to those observations.
- Added player-directed BMR self-action log forms (including Innkeeper, Sailor, Gambler, Courtier, Professor, Godfather, Assassin, the four Demons, and Moonchild), keeping existing Exorcist recording; passive roles receive explanatory guidance, not fake night choices.
- Corrected Godfather's starting Outsider modifier (**-1 or +1**), Moonchild's public death-day selection validation, Zombuul's no-prior-day-death action precondition, and several timing/default/duplicate-record issues.
- Preserved optional save fields and previous autosave/resume fix; no existing records are silently discarded.
- A role-by-role audit and remaining manual/approximate Storyteller effects are documented in `docs/BMR_TIMING_AND_ROLE_AUDIT.md`. This is not a claim that all 25 BMR ability effects are fully solver-automated.
- **407/407 engine regression tests** (+21 over 386); strict engine TypeScript and offline TSX type checks passed; branding tests retained. Windows Vite production build/Android device test still unverified.

# 2026-10-18 — Android resume / persistence fix

- Fixed `続きから` disappearing after an app restart: auto-saved empty special-role logs were incorrectly rejected by `validateSnapshot` in scripts without those roles (including Trouble Brewing).
- Changed the validator to allow empty optional logs while still rejecting populated events for absent roles.
- Removed the 150 ms autosave debounce, added WebView background/unload flushing and updated the in-memory resume state after successful saves.
- Added backup loading and raw-save export on recovery warnings; retained the original localStorage primary key and schema.
- Verification: 386/386 engine regression tests, strict engine TypeScript, offline full TS/TSX type check, ZIP integrity.
- See `docs/SAVE_AND_RESUME_FIX.md`.

# 2026-10-17 — Script-filtered death reasons

- Corrected the キル → 理由 menu so サイコパスの公開殺害 appears only in scripts with Psychopath.
- Kept Gnome/Gangster special causes linked to active, living Travellers; Mutant's special execution remains script-gated.
- Centralized menu filtering in `src/deathReasons.ts`; historical reason labels are unchanged.
- Added five regression tests. Engine **382 / 382**, branding **7 / 7**, and TypeScript/TSX syntax **41 / 41** passed.

# 2026-10-14 – Experimental Outsiders phase 10

- Added ten missing experimental Outsiders: Golem 岩, Hatter 帽, Heretic 異, Hermit 庵, Ogre 怪, Plague Doctor 疫, Politician 政, Puzzlemaster 謎, Snitch 報, Zealot 熱. Existing Damsel 乙 kept. 135 selectable ordinary characters, 18 Travellers; no symbol duplication.
- Added confirmed Outsider event recording in 推理; Hatter and Plague Doctor support night/day timestamps, Golem nominations create linked ability deaths, and Puzzlemaster supports guessing themselves and permanent drunkenness (including of themselves).
- Added evil-mode Damsel candidate finder and Minion-mode Snitch out-of-play bluff entries; new snapshot data optional and backward compatible.
- Updated world sampling for Ogre alignment, Puzzlemaster drunkenness, Hatter character changes, Heretic winner inversion, Plague Doctor Storyteller ability, Zealot forced votes, Politician weak suspicion, and Hermit Outsider count. Full Hermit compounded ability resolution remains a documented limitation.
- All 25 roles of DEVOUT THEISTS V6 available as a custom script.
- Regression suite: **377/377 passed**; engine TypeScript and offline UI TSX checks passed. Windows Vite/physical Android not tested.
- See `docs/EXPERIMENTAL_OUTSIDERS_PHASE10.md`.

---

# 2026-10-14 – App name and launcher icon

- Rename visible app title to `血濡れた時計台ヘルパー`.
- Add the user-provided icon (byte-identical master PNG), homepage branding, web/PWA favicon and manifest, and Android launcher/adaptive resources.
- Include an idempotent configuration installer for Vite, Capacitor, and Android resources.
- Preserve internal role IDs, stored data, engine logic and all previously implemented features.
- Verification: 358/358 engine tests; 7/7 branding tests; mocked Android project installer validated twice.

---

# ジンクス勝利条件アップデート（2026-10-14）

スクリプト管理と推理のジンクス一覧を整理しました。**画面に出るのはゲーム処理に関係する29組のみ**です（能力・配役・処理の変更15組、特殊勝利条件14組）。残りの解説のみ・未実装の組み合わせは画面に表示しません。公式データ90組の控えは開発側の資料としてのみ残しています。

勝敗例外：リヴァイアサン×市長（5日目に両方が生存し、処刑なしなら善勝利）、リヴァイアサン／ライオット×兵士（デーモン自身が指名・処刑したら善勝利）、錬金術師×召喚者（デーモン不在開始・召喚前に死亡なら悪勝利）などは推理に組み込みました。

ストーリーテラー確認が必要な例外：アルハディキア×策士の3人の選択結果、ライオット×市長による暴動終了、祖母の孫の処刑死、宿屋主人などの保護された対象の処刑は、**推理 → 特殊勝利の確認記録**から、確認済みの場合だけ入力します。スクリプトにあるだけでは自動発動しません。

追加で、リーチ×策士の処刑による宿主死亡を修正。策士生存中ならリーチは死なず、能力と宿主への毒を失います。正常な死亡では従来の処理を維持します。以前の役職・セーブデータをそのまま利用できます。

**検証：358 / 358 テスト成功**。エンジンTypeScriptとオフラインTSX型検査成功。実際のWindows Viteビルド／Android実機確認は未実施です。

**導入:** 既存の `src` をバックアップし、新ZIPの `src` に入れ替えてください。詳細は `docs/JINX_VICTORY_RULES.md` を参照してください。

---

# 2026-10-14 — Official Djinn/Jinx catalog and partial mechanical integration

- Added all **90** official current Jinx pairings applicable to registered roles. Script Maker and Reasoning now show public Japanese explanations from a single typed registry.
- The public list never proves hidden roles or changes the only two named-character auto-additions (Choirboy/King, Huntsman/Damsel).
- Implemented/verified King threshold with Riot and Leviathan; Marionette believable Huntsman/Balloonist setup modifiers, Damsel inclusion and legal world sampling; Boffin/Drunk and Boffin/Village Idiot; Lleech/Slayer; Summoner/Pukka on Night 2 without duplicate Night 3 summon; Alchemist copied-Minion existence restrictions; and maintained earlier Spy/Widow/Damsel and other interaction logic.
- Newly recorded N2 Pukka is accepted by import validation and self-Minion-mode UI; non-Pukka N2 summoning remains invalid.
- Jinx list explicitly labels partly engine-backed vs Storyteller/manual. Full 90-Jinx effect automation is **not claimed**; only 14 rules have partially engine-backed paths.
- Added **18** regression cases: **343/343 tests passed**, engine and offline TSX checks passed. No Vite/Android end-to-end verification.
- See `docs/JINXES_DJINN.md` and `docs/TEST_RESULTS.md`.

---

# 2026-10-12 - Named-role dependency audit

- Confirmed exactly two automatic named-character additions across 125 roles: Choirboy -> King and Huntsman -> Damsel.
- Confirmed King and Damsel remain independently selectable.
- Added 3 role-list normalization and independent-role regression tests, raising the total from 322 to 325 passing tests.
- Documented the separate Marionette-believes-Huntsman jinx, which still needs fuller world-model support.
- No production source behavior or Japanese UI was changed in this audit update.
- Details: `docs/ROLE_DEPENDENCY_AUDIT.md`.

---

# 2026-10-12 — Character symbol and custom-script catalog audit

- Fixed **11 duplicate single-character display symbols** across the 125 player-character and 18 Traveller records. Psychopath now uses **凶** rather than **殺** (which remains Slayer's symbol). See `docs/CHARACTER_CATALOG_AUDIT.md` for the full old/new table.
- Replaced a hardcoded Psychopath symbol in the reasoning/history UI with `ROLES.psychopath.symbol`.
- Reinstated all ten experimental Demons in `ALL_CORE_ROLE_IDS`; their omission had previously hidden them from the custom-script maker even though their definitions and solver support existed.
- Added catalog completeness and globally unique symbol regression tests: **322 / 322 passing**. Engine TypeScript and offline structural TSX checks passed.
- No gameplay mechanics, role IDs, saved-game formats, or the three built-in script role lists changed.

# 2026-10-12 - Experimental Minions phase 9

- Added Mezepheles (言), Organ Grinder (奏), Psychopath (凶), Summoner (喚), Widow (寡), Wizard (願), Wraith (幽), and Xaan (惨) to the custom script maker only, preserving all three official scripts and all earlier roles. Atheist is still excluded.
- World mechanics: Mezepheles's next-night conversion, a separate no-Demon initial Summoner setup with N3 Demon creation and Baron-compatible Outsider counts, Widow persistent poison, Xaan's Night/Day X poison determined by initial Outsider count, and public Psychopath death-source validation.
- 推理: optional suspicious behavior reports, reported Widow presence, secret Organ Grinder voting with unknown voters/tallies, Psychopath public kill and linked death, plus conservative Summoner/Xaan world-weighting signals. A missing D1 Psychopath claim is penalized only after the day has passed; it never excludes the role.
- Self-Minion mode: secret word, public kill, summon destination, poison target, voluntary Organ Grinder drunkenness, Wizard wish and Wraith observations.
- New fields are optional and import-validated. Backward compatible with earlier snapshots. English internal IDs and Japanese UI retained.
- **320/320 regression tests pass** (+19 over 301); strict engine TypeScript and offline full TSX structural checks pass. Windows Vite / real browser / Android not tested.
- Detailed implementation and limits: `docs/EXPERIMENTAL_MINIONS_PHASE9.md`.

# 2026-10-12 - Experimental Minions phase 8

- Added Boffin (博), Boomdandy (爆), Fearmonger (恐), Harpy (鳥), and Marionette (糸) exclusively to custom scripts. All existing roles and built-in scripts remain unchanged; Atheist remains excluded.
- Boffin: good-ability borrowing for Demon, correct poisoning immunity of the granted ability, conditional rather than hard Virgin/Slayer confirmation, and saved grant choice in evil modes.
- Boomdandy: modern execution/explosion rule (three initial survivors, 10-to-1 pointing), structured 推理 input, automatic linked deaths and group undo, including an execution that does not kill Boomdandy.
- Fearmonger: opt-in 推理 execution-risk control with Goblin/Boomdandy warnings, self-mode secret targets and target's-team-loses resolution for confirmed successful nomination/execution.
- Harpy: self-mode nightly madness pair, source-limited Harpy deaths and a victim-specific ability claim that does not create a false Harpy role claim.
- Marionette: initially adjacent evil Minion, player belief in an unused good character, Demon seat knowledge and solver sampling constraints; also repaired special Lord of Typhon/Kazali layout generation for adjacent Marionette seats.
- Backward-compatible optional snapshot fields, import validation and Japanese history display. Engine compilation and offline UI structural check passed; **301 / 301** regression tests passed (+25 over 276). Windows Vite and physical Android testing remain unverified.
- Details: `docs/EXPERIMENTAL_MINIONS_PHASE8.md`.

# 2026-10-11 - Experimental Demons phase 7

- Added Lil' Monsta (赤), Lleech (蛭), Al-Hadikhia (生), Ojo (眼), Riot (暴), Yaggababble (呪), exclusively to custom scripts; original scripts and previous role logic retained, Atheist still excluded.
- Lil' Monsta: extra underlying Minion ability and changing holder/Demon registration; bonus weights for extra Minion claimants and inconsistent Demon pings. Holder notes remain private in Demon mode.
- Lleech: fixed secretly poisoned N1 host, Demon immortality while healthy and host alive, simultaneous host/death end, poison-host conditional leaderboard.
- Al-Hadikhia and Riot: mutually exclusive confirmed-game checkboxes in 推理, compatible with the existing Leviathan public confirmation pattern. Snapshot save, restore, and validation updated.
- Ojo: selected-character Demon action, target-character existence rule, Spy-like early precision-death evidence.
- Riot: Day-3 Minion conversion; special nomination deaths and continuation for Riot-killed nominators; automatic 推理 popup and visually emphasized **separate** good/evil Riot-conditional figures, never presented as posterior fact.
- Yaggababble: no secret-phrase mechanics in app, only suspicious multikill-night indicator.
- Full engine/data tests **276/276 passed** (+18 from prior 258), engine TypeScript and offline full TSX structural checks passed; Windows Vite / Android not tested. Documentation: `docs/EXPERIMENTAL_DEMONS_PHASE7.md`.

# 2026-10-11 - Experimental Demons phase 6

- Added Lord of Typhon (卿), Kazali (傀), Legion (群), and Leviathan (巨) to custom scripts only; Atheist stays excluded and all previous roles remain intact.
- Lord of Typhon: one extra Minion, centered contiguous seating rule, varied Outsider setup, soft preference for surplus distinct Minion claimants, Demon-mode Minion-character seat predictions (nonbinding).
- Kazali: variable Outsider counts with ordinary Minion headcount, Demon-mode selected Minion seats/characters as confirmed knowledge.
- Legion: majority of actual evil Demon seats, repeated Legion tokens, zero actual Minions, Legion-as-Minion registration, Storyteller-selected night deaths and special voting. Added Legion-conditional ranked suspects and weak vote/information-sharing pattern heuristics; Legion ally records in Demon mode.
- Leviathan: new manually confirmed public announcement checkbox in 推理; 0% and no candidate worlds when unconfirmed, and only Leviathan Demon worlds when confirmed. No Demon night attack; count two good executions including execution survivors; Day-5 end condition.
- Added `NominationEvent.executed` for execution without death, optional snapshot `leviathanConfirmed`, Minion/Demon-mode fields and backward-compatible import validation.
- New solver modules `engine/demonVariants.ts` and `engine/specialDemons.ts`; expanded tests **258 / 258 passed**, +26 since phase 5. Engine compile and offline full TS/TSX structural check passed. Local installed-dependency Vite and physical Android tests not performed.
- Details, assumptions and known limitations: `docs/EXPERIMENTAL_DEMONS_PHASE6.md`.

# 2026-10-10 - Experimental Townsfolk phase 5

- Added Poppy Grower (芥), Preacher (説), Princess (姫), Shugenja (修), Steward (執), and Village Idiot (愚) to the custom script maker only, retaining all previous characters, the three original scripts, and the Atheist exclusion.
- Evil mode introduction tracking for Poppy Grower, with solver validation of blocked starting introductions and delayed evil-team reveal after death.
- Preacher nightly target history with persistent Minion suppression, immunity while Preacher is impaired/dead, and solver interactions with Poisoner, ongoing Minion abilities, Scarlet Woman succession, and Spy registration.
- Princess first-day self-nomination and execution confirmation, including executions where the target lives; block ordinary Demon kills the following night while allowing explicitly non-Demon deaths.
- First-night Shugenja circular-seat direction and Steward good-player information; nightly Village Idiot alignment reads, multiple real Village Idiots, and one stable drunk duplicate when extras are present.
- Updated Japanese self/other-player information forms, history displays, Demon/Minion interfaces, import validation, and solver evaluation.
- **232 / 232 regression tests passed** (+22 since phase 4). Engine TypeScript and full offline TypeScript/TSX structural checks passed; Windows Vite/Android remain untested.
- Details and known limitations: `docs/EXPERIMENTAL_ROLES_PHASE5.md`.

# 2026-10-10 - Experimental Townsfolk phase 4

- Added Huntsman (狩), Knight (騎), Lycanthrope (狼), Magician (魔), Nightwatchman (夜), Noble (貴), Pixie (妖) to the custom script maker only.
- Added supporting Outsider Damsel (乙) and its setup dependency, character transformation, and once-per-team public Minion guess ending.
- Knight/Noble/Pixie N1 structured information and validation; Pixie's confirmed madness-based ability inheritance.
- Lycanthrope N2+ targeted death with Demon-kill suppression and persistent good Faux Paw evil registration, without flipping true alignment.
- Magician's false evil-team introductions modeled for Demon and Minion screens and sampler with two possible Demon seats, no premature hard lock.
- Nightwatchman once-per-game recipient record. Japanese UI throughout; internal IDs and storage fields remain English.
- Engine compilation, offline full TSX structural check, and **210 / 210** regression tests passed. See `docs/EXPERIMENTAL_ROLES_PHASE4.md`.

# 2026-10-10 - Experimental Townsfolk phase 3

- Added custom-script-only Choirboy (唱), King (王), Engineer (工), Farmer (農), Fisherman (漁), General (将), and High Priestess (巫). Core scripts unchanged; Atheist excluded.
- Choirboy setup reserves King; candidate worlds enforce Demon-killed King triggers for Choirboy's player information.
- King learns only a currently living character after dead >= alive. Vortox does not bypass activation timing; healthy Spy registration works.
- Demon mode records King's initial player identity. Sampler treats that information as a hard lock, not a soft claim.
- Engineer records a once-per-game Demon or entire Minion character selection; preserved original alignments and beginning-of-game setup distribution. Solver enumerates permutations of the affected Minion roles.
- Farmer night death branches over living good recipients and tracks role changes, including repeated conversions. Recorded self Farmer transformation restricts candidate worlds.
- Fisherman's freeform advice, General's subjective lead, and High Priestess's suggested conversation target are recorded in shared structured information, without invented objective mechanical proofs.
- Updated App menus, third-party reported info entry, validation, game history, and reasoning display.
- Regression suite **191 / 191 passed**, engine compile and full offline TSX structural check passed.

# 2026-10-09 - Experimental Townsfolk phase 2

- Added Balloonist, Banshee, Bounty Hunter, and Cannibal to the custom script maker only.
- Atheist intentionally remains absent.
- Locked experimental display symbols to 軽 / 錬 / ア / 記 and added 気 / 叫 / 賞 / 喰.
- Balloonist setup now branches between normal Outsider count and +1 Outsider.
- Banshee Demon-kill activation now grants two nominations per day and double votes without spending the ghost vote.
- Bounty Hunter setup creates exactly one evil Townsfolk in each applicable candidate world.
- Cannibal tracks the most recent player who died by execution; good executees grant their ability and evil executees poison the Cannibal until a good executee replaces them.
- Cannibal-Monk protection is solver-integrated.
- Regression suite: 177 / 177 passed.

# 2026-10-09 - Experimental characters: Acrobat / Alchemist / Alsaahir / Amnesiac

- Added Acrobat, Alchemist, Alsaahir, and Amnesiac as normal RoleIds available in the custom script maker only.
- Kept all internal role IDs, RoleTags, action kinds, storage keys, and solver metadata in English; only rendered UI labels are Japanese.
- Acrobat records a nightly target and whether the Acrobat died; candidate worlds enforce death when a healthy Acrobat chooses a drunk/poisoned player, including the Drunk character registering as drunk.
- Alchemist records which Minion ability was granted. Setup-changing copied Minion abilities are applied to candidate setup counts; duplicate setup effects may stack with the real Minion.
- Alsaahir records one public Minion/Demon player-set guess per day and enforces the exact alternate win condition when healthy.
- Amnesiac adds a guided tag-search helper: it recommends an unused internal RoleTag that splits the remaining script Townsfolk as close to 50/50 as possible, records yes/no answers, narrows the candidates, and lets the user lock a final Townsfolk ability hypothesis.
- A locked Amnesiac information-role hypothesis may reuse the existing information form and solver information checks. Active/action-role automation is intentionally not proxied yet.
- Regression suite: 169 / 169 passed. Engine TypeScript and full offline TS/TSX structural checks passed.

# 2026-10-09 - 実験的旅人 + 全旅人メニュー

- カックルジャック、ノーム、ギャングスターを追加。
- ノーム/ギャングスターに `SPECIAL_DEATH_CAUSE` タグを追加。
- 死亡原因に「ノーム」「ギャングスター」を追加し、通常の「能力」死亡から分離。
- カックルジャックの日次保護対象とN2+役職変更を記録。通常席への変更は候補世界の現在役職にも反映。
- ノームの公開された同陣営の友人、友人への指名からの死亡を記録。
- ギャングスターの同意者/死亡対象/実死亡を1日1回で記録。
- 「旅人を追加」を版別optgroupから全18旅人の単一リストへ変更。
- 回帰テスト 163 / 163 通過。

# 2026-10-09 - BMR / S&V Travellers

- Added BMR Travellers: 見習い, 寮母, ブードゥー師, 判事, 司教.
- Added S&V Travellers: 肉屋, 骨拾い, 娼婦, バリスタ, 変人.
- Added historical Matron seating order and threaded it through adjacency-sensitive reasoning.
- Added Voudon voting restrictions and unlimited dead voting without consuming dead-vote tokens.
- Added Apprentice copied-ability/alignment recording.
- Added Judge execution override, Bishop Storyteller nominations, and Butcher extra nomination.
- Added Bone Collector temporary ability restoration, Harlot visits, Barista effects, and Deviant exile protection.
- Barista sober/healthy true-information handling overrides poison/drunkenness and Vortox false-information requirements during the effect window.
- Traveller picker is grouped by TB / BMR / S&V.
- Regression suite: 159 / 159 passed.

# 2026-10-09 - 旅人追放・死者票パッチ

- メインメニューに「旅人を追放」を追加。
- 追放された旅人は通常の死亡とは別の `exiled` 状態になり、盤面中央から外れ、能力を失う。
- 追放時に死者票を1票保持し、投票画面では「追放・死者票あり」として残る。
- その死者票を使用すると「追放・死者票使用済み」になり、以後投票不可。
- 追放された官僚/泥棒の投票修正能力が即座に停止することを回帰テストで確認。
- 既存セーブは `exiled` / `exiledWhen` がなくても引き続き読み込み可能。
- 回帰テスト 151 / 151 通過。エンジン TypeScript とフル TS/TSX 構造チェックも通過。

# 2026-10-09 - トラブル・ブルーイング旅人対応

- 官僚・物乞い・ガンスリンガー・スケープゴート・泥棒を通常役職とは別の旅人レイヤーとして追加。
- 旅人をメイン役職メニュー/スクリプト/セットアップ人数から除外したまま、指名・投票画面から追加/管理可能にした。
- 参加中の旅人を盤面中央へ表示。
- 官僚3票、泥棒マイナス票、官僚+泥棒の-3票、物乞い投票トークン、ガンスリンガー射殺、スケープゴート身代わりを記録可能にした。
- 指名記録に実票合計と各投票者の重みを保存し、後から旅人状態が変化しても過去の集計を固定。
- 上部の「推理」の隣に「善悪」を追加。通常プレイヤーは候補ワールド比率、旅人は行動ベース推定を表示。
- 旅人がFlowergirlの「デーモンが投票したか」に誤って数えられないことを回帰テストで確認。
- 回帰テスト 149 / 149 通過。エンジンTypeScriptとTS/TSX構造チェックも通過。

# 2026-10-08 - Outsider claim-behaviour weighting

- Added early/hidden Outsider claim tags.
- Baron and Fang Gu candidate weights now account for extra Outsider slots that force early-claim roles.
- Vigormortis count evidence now only applies when its reduction removes an otherwise-forced early-claim Outsider.
- Missing-claim evidence scales with exact-role claim coverage to avoid overreacting to incomplete logs.
- Added Fang Gu to the global count-modifier reasoning cards.
- Regression suite: 143 / 143 passed.
- Reproduction: 8-player TB with one expected Outsider and Saint as the only Outsider claim produced about 0.016% Baron share in a 12,000-attempt fixed-seed search.

# 2026-10-07 - UI完全日本語化

- BMR / S&V の表示役職名を日本語化。
- 組み込みスクリプト名を日本語表記へ変更。
- 町人 / アウトサイダー / 手下 / デーモンの区分表示を日本語化。
- YES / NO、ON / OFF、ST、Spy、Pit-Hag などの画面表示上の英語を日本語化。
- 手下戦略、候補盤面、履歴、警告、ブラフ提案、インポート失敗時の表示も日本語化。
- 生のワーカーエラー文を画面へ出さず、日本語の固定エラー文を表示。
- 内部ID・保存形式・役職IDは互換性維持のため変更なし。
- 回帰テスト 138 / 138 通過。エンジンTypeScriptとTS/TSX構造チェックも通過。

# 2026-10-04 - Sects & Violets Minion modes

- Added full self modes for Evil Twin, Witch, Cerenovus, and Pit-Hag.
- Evil Twin stores the real opposing good Twin + character as private direct information, enforces the Twin win/block conditions, and adds an opponent-view pressure advisor that never leaks the secret Twin fact into the town-facing search.
- Witch records one nightly curse, shows nomination-history context without auto-picking a target, and can resolve the curse as killed/survived after that player nominates. At 3 living players the Witch has no ability.
- Cerenovus records target + forced Townsfolk/Outsider character. Its advisor ranks target/role pairs primarily by how evil the target looks in the town-facing candidate set, then by useful claim collisions and story pressure.
- Pit-Hag keeps the existing exact character-change timeline and adds a planner using current weighted-world character presence, target value, Storyteller-bluff safety, and Demon-pivot risk/reward. Alignment remains unchanged by the character swap.
- Vigormortis-killed Witch, Cerenovus, and Pit-Hag can continue to use their abilities while a living healthy Vigormortis keeps those abilities active. Evil Twin's retained ability is also recognized for its execution win condition; the normal good-win block still requires both Twins alive.
- Witch and Cerenovus linked deaths/executions delete atomically with their source Minion action.
- Expanded regression suite to 138 / 138 tests.

# 2026-10-04 - Vigormortis Outsider-tag interaction patch

- Made `OUTSIDER_COUNT_MODIFIER` data-driven with `outsiderCountDelta`.
- Baron +2, Fang Gu +1, Vigormortis -1.
- Added a weak Vigormortis evidence signal when exact Outsider claims match the reduced setup count.
- Added Vigormortis to the global reasoning cards when present on the frozen script.
- No Minion mechanics changed.

# Sects & Violets — Demon implementation

## Scope

This update implements the Demon-side rules for **Fang Gu, Vigormortis, No Dashii, and Vortox** on top of the Townsfolk + Outsiders build. It does not implement Evil Twin, Witch, or Cerenovus, and does not expand Pit-Hag beyond its pre-existing direct self-action support.

## Fang Gu

- Setup: +1 Outsider, -1 Townsfolk.
- N2+ direct attack recording in Demon mode.
- The first healthy Fang Gu attack that successfully would kill an actual Outsider transfers Fang Gu to that player, makes that player evil, and kills the old Fang Gu instead.
- The once-per-game transfer state is preserved across the candidate history.
- If the Outsider does not die, the transfer does not occur.

## Vigormortis

- Setup: -1 Outsider, +1 Townsfolk when possible.
- N2+ direct attack recording.
- A Minion killed by Vigormortis remains its Minion character and records one of the two legal Storyteller poison directions.
- The closest Townsfolk on that chosen side is poisoned while Vigormortis remains alive and healthy; dead Townsfolk still count as the closest Townsfolk character.
- The killed Minion's retained *unique Minion ability* is represented as retained state but is not fully executed until that Minion's own mechanics are implemented.

## No Dashii

- N2+ direct attack recording.
- Dynamically poisons the closest Townsfolk clockwise and counterclockwise.
- Skips Outsiders, Minions, and Demons.
- Does not skip dead Townsfolk.
- Re-evaluates after supported character changes.
- Poison ends while No Dashii is drunk/poisoned or no longer has the character.

## Vortox

- N2+ direct attack recording.
- Implemented Townsfolk information is accepted only when the received result is mechanically false while Vortox is active.
- This Vortox rule takes precedence over that Townsfolk being drunk or poisoned.
- Savant requires both entered statements false under Vortox.
- If no player was executed that day, the candidate ends with the Vortox evil-win condition at dusk.
- Arbitrary free-text Artist questions cannot be semantically evaluated, so their truth value remains conservative.

## Poison-source bookkeeping

No Dashii/Vigormortis poison participates in ability correctness and Mathematician-style abnormal-result reasoning, but is not falsely recorded as a required Poisoner target.

## Verification

The full engine/data suite passes **125 / 125** tests, and the offline TS/TSX structural check passes.


## Vigormortis Outsider-tag interaction patch

- `OUTSIDER_COUNT_MODIFIER` is now data-driven via each role's `outsiderCountDelta`.
- Baron = +2, Fang Gu = +1, Vigormortis = -1.
- Negative deltas are clamped when the base setup has no Outsiders to remove.
- If Vigormortis is on the frozen script and recorded exact Outsider claims match the Vigormortis-reduced setup count, the evidence panel gives Vigormortis a weak heuristic point. Claims remain soft evidence; legal candidate worlds still use exact setup counts.

## 2026-10-09 官僚・泥棒の日次対象 / 能力発動ショートカット

- 官僚・泥棒の対象を夜ごとの記録として明示し、次の日へ進むと入力中の対象をリセット。
- 旅人画面を開いたときは、その夜に保存済みの対象だけを復元。前日の対象は復元しない。
- 通常プレイヤーの「能力発動」を能力選択画面へ変更。
- 処刑人は従来どおり「タップした人 = 能力使用者」。
- 活動中かつ生存中の官僚・泥棒は「タップした人 = 能力の対象」として同じ画面から選択可能。
- 同じ夜に官僚・泥棒の対象を選び直すと、その夜の記録を上書き。
