# Bad Moon Rising 夜情報・夜行動修正（2026-10-18）

以前、夜しか行わない船乗り・宿屋の主人などの能力報告に「昼」が選択肢として出る問題がありました。今回、BMR 全25役職を**夜情報／夜行動／昼行動／受動能力**に分け、役職ごとに正しい入力時刻を提示し、保存時も確認します。

**祖母**の初夜情報（善陣営の人＋役職）、**侍女**の毎夜情報（生存者2人＋起きた人数）、**親分**の初夜のよそ者情報を専用フォームから記録できます。これらを推理の一部に反映します。さらに、親分のよそ者数 **-1/+1**、月の子の死亡当日の公開選択、ゾンブールの前日昼の死亡条件などを修正しました。死亡・復活・酔いなど、語り手判断に左右される結果は勝手に確定しません。

**検証：407/407件の回帰テスト合格。** 詳細な25役職別の確認表と制約は `docs/BMR_TIMING_AND_ROLE_AUDIT.md` に記載しています。以前のゲームと「続きから」の保存互換性を維持します。

アプリ更新時は、既存アプリをアンインストールしたり Android の保存データを削除したりしないでください。既存 `src` をバックアップし、この ZIP の `src` を入れ替えてください。PC側の `package.json` と Android プロジェクトはそのままにして、プロジェクトフォルダで以下を実行します。

```cmd
cd /d C:\Users\naoki\clocktower-solver
npm run build
npx cap sync android
npx cap run android
```

---

# 最新版: 「続きから」修正

以前のアプリをアンインストールしたり、アプリのストレージを消去したりしないでください。保存データがまだ残っていれば、今回の修正で再開できます。

既存の `clocktower-solver` プロジェクトにこの ZIP の `src`、`public`、`tools` を上書き・統合してください。元の `src` は先にバックアップしてください。Windows のコマンドプロンプトから次の順で実行します。

```cmd
cd /d C:\Users\naoki\clocktower-solver
npm run build
npx cap sync android
npx cap run android
```

自動インストールができない場合は、Android Studio で APK をビルドし、以前と同じ Android アプリ ID と署名で更新インストールしてください。

修正内容とバックアップの説明は `docs/SAVE_AND_RESUME_FIX.md` にあります。検証: **386/386 tests passed**。

---

# 死因メニュー修正（2026-10-17）

キル → 理由：サイコパスの公開殺害は、そのゲームのスクリプトにサイコパスがいる場合のみ表示されます。ノームとギャングスターは該当する旅人が生存・参加中の場合のみ表示されます。以前の死亡記録は保持されます。

検証：382/382 回帰テスト成功。詳細は `docs/SCRIPT_FILTERED_DEATH_REASONS.md` を参照してください。

# Experimental Outsiders phase 10 – 血濡れた時計台ヘルパー

**更新：** 未追加の実験的よそ者10役職（ゴーレム、帽子屋、異端者、隠者、オーガ、疫病医師、政治家、パズルマスター、密告者、狂信者）を追加しました。既存の乙女を含め、実験的よそ者11役職に対応します。表示用の漢字は全員重複なし。`DEVOUT THEISTS V6` の25役職すべてがスクリプト作成で選べます。

**ダウンロードしたZIPの入れ方：** 既存プロジェクトの `src/`, `public/`, `tools/`, `android_branding/` とドキュメントを統合してください。作業前に `src/` をバックアップしてください。Windows側の `package.json` / Capacitor / Androidプロジェクトは維持します。Androidに反映する場合はプロジェクト内で `npm run build` → `npx cap sync android` → `npx cap run android` を実行してください。USBデバッグの設定は既存のままで構いません。

**確認：377 / 377 テスト合格。** エンジンおよびオフラインUI型チェック合格。Windowsでの本番Vite/Android実機ビルドは未確認です。隠者の全能力重複など一部は手動・限定的対応です（詳しくは `docs/EXPERIMENTAL_OUTSIDERS_PHASE10.md`）。表示名 **血濡れた時計台ヘルパー** とカスタムアイコンは維持しています。

---

# アプリ名・アイコン更新：2026-10-14

アプリ名を **血濡れた時計台ヘルパー** に変更し、提供された時計と虫眼鏡の画像を Web/PWA と Android 用アイコンにしました。アプリのホーム画面の表記も変更しています。

**重要：今回は `src` だけでなく `public` もコピー**してください。Android アプリとして使う場合は ZIP に同梱の `tools/apply_branding.py` を既存プロジェクトのルートから実行すると、Android ランチャー用リソースと `app_name`、Capacitor 設定、`index.html` を更新できます。Android プロジェクトがない場合は、APK のアイコンはまだ変わりません。

詳しくは `docs/APP_NAME_AND_ICON.md` を参照してください。推理ロジック・セーブキーは変更していません。エンジン **358/358**、ブランディング **7/7** のテストが通過しました。

---

# ジンクス勝利条件アップデート（2026-10-14）

スクリプト管理と推理のジンクス一覧を整理しました。**画面に出るのはゲーム処理に関係する29組のみ**です（能力・配役・処理の変更15組、特殊勝利条件14組）。残りの解説のみ・未実装の組み合わせは画面に表示しません。公式データ90組の控えは開発側の資料としてのみ残しています。

勝敗例外：リヴァイアサン×市長（5日目に両方が生存し、処刑なしなら善勝利）、リヴァイアサン／ライオット×兵士（デーモン自身が指名・処刑したら善勝利）、錬金術師×召喚者（デーモン不在開始・召喚前に死亡なら悪勝利）などは推理に組み込みました。

ストーリーテラー確認が必要な例外：アルハディキア×策士の3人の選択結果、ライオット×市長による暴動終了、祖母の孫の処刑死、宿屋主人などの保護された対象の処刑は、**推理 → 特殊勝利の確認記録**から、確認済みの場合だけ入力します。スクリプトにあるだけでは自動発動しません。

追加で、リーチ×策士の処刑による宿主死亡を修正。策士生存中ならリーチは死なず、能力と宿主への毒を失います。正常な死亡では従来の処理を維持します。以前の役職・セーブデータをそのまま利用できます。

**検証：358 / 358 テスト成功**。エンジンTypeScriptとオフラインTSX型検査成功。実際のWindows Viteビルド／Android実機確認は未実施です。

**導入:** 既存の `src` をバックアップし、新ZIPの `src` に入れ替えてください。詳細は `docs/JINX_VICTORY_RULES.md` を参照してください。

---

# ジンクス（Djinn）対応更新：2026-10-14

公式ジンクス一覧から、現在のアプリの役職同士で成立する **90組** を追加しました。**スクリプト管理（役職編集）** と **推理** に、現在のスクリプトに該当する公開ルールを日本語で表示します。両方の役職が実際にいるという証拠にはしません。

**一部自動判定14組**、語り手による確認が必要なルール **76組**。自動判定でも例外の全パターンを完全に再現したとは限りません。詳細は `docs/JINXES_DJINN.md` を確認してください。王×ライオット／リヴァイアサン、マリオネット×猟師／気球乗り、リーチ×スレイヤー、召喚者×プッカ、錬金術師のいくつかの特殊配役などを補強しました。召喚者モードではプッカをN2に召喚する記録を付けられます。

**スクリプトへ自動追加される役職は以前と同じ2組だけ**です：聖歌隊→王、猟師→乙女。特別なジンクスがあることだけで参加役職を追加しません。日本語の画面表示・英語の内部ID・既存セーブデータとの互換性を維持します。

**インストール:** 現在の `src` をバックアップし、ZIPに含まれる `src` フォルダと置き換えてください。既存の `package.json`、`node_modules`、Android設定は残します。`npm run dev` または `npm run build` をローカルで実行してください。ZIPはAPKではありません。

**検証:** 343/343回帰テスト通過、厳格なエンジンTypeScriptコンパイルとオフラインTypeScript/TSX構造チェックに合格しました。Windowsの実ViteビルドやAndroid実機でのテストは未実施です。

---

# Named-role dependency check - October 12, 2026

This ZIP is the prior catalog-audit build plus three regression tests and a dependency-audit report. Production `src/` files are unchanged. Exactly two named-character additions are implemented: **Choirboy + King** and **Huntsman + Damsel**. The full report and the Marionette/Huntsman limitation are in `docs/ROLE_DEPENDENCY_AUDIT.md`. Current checks: **325/325 passed**.

---

# 役職の漢字重複修正・スクリプト一覧修正（2026-10-12）

前回の実験的手下 I組アップデートから、**11組の表示用漢字重複を解消**しました。サイコパスは **殺 → 凶** に変更しました。既存の役職ID・推理ロジック・保存データは変更していません。また、登録済みなのにスクリプト作成画面に出なかった **実験的デーモン10体** を全て選べるように修正しました。

詳細な変更表は `docs/CHARACTER_CATALOG_AUDIT.md` を確認してください。**テストは322 / 322件成功**。過去のバージョン説明に旧漢字が残る箇所はありますが、現在の表示は役職定義の最新版に従います。

**インストール:** 既存プロジェクトの `src` フォルダをバックアップしてから、このZIPに含まれる `src` に入れ替えてください。既存の `package.json`、`node_modules`、Android 設定はそのまま残します。これはAPKではなくソース更新です。実際のWindows ViteビルドとAndroid実機動作は未検証です。

---

# 実験的手下 I組アップデート

前回の **ボフィン / ブームダンディ / フィアモンガー / ハーピー / マリオネット** 更新を引き継ぎ、カスタムスクリプト専用の実験的手下8人を追加しました。**利用者向けの画面は日本語、内部識別子は英語**です。無神論者は引き続き未実装です。

- **メゼフェレス（言）** — 善のプレイヤーが悪陣営に変わった経緯と、自分の秘密の言葉の使用を記録。**推理**で「言動が悪寄りに変化した」という報告は弱い兆候として扱い、即座には確定しません。
- **オルガングラインダー（奏）** — **推理**で秘密投票・公開投票を日ごとに選択。秘密投票は「投票者不明」であって「0票」と解釈しません。自分を酔わせた夜も手下モードで記録可能です。
- **サイコパス（凶）** — 公開殺害と専用死亡理由、連動削除。初日終了までにサイコパスの名乗りや公開殺害がなければ、可能性を弱く下げるだけで候補は消しません。
- **召喚者（喚）** — **開始時デーモン0・町人+1** の特殊配役。3夜目に新しい悪のデーモンを生成。序盤にデーモン由来の死亡が見えない場合、召喚者の仮説を弱く上げます。
- **ウィドウ（寡）** — 初夜から続く毒の対象、死亡・能力停止による解除。**推理**で「ウィドウがいると通知された」という他者の話を記録すると、ウィドウ候補が少し上がります。
- **ウィザード（願）** — ストーリーテラーへの願い・条件・代償を自由記録。結果の内容を機械的に決めつけません。
- **レイス（幽）** — 夜に見た悪側の動きなどを手下モードでメモ。推測で見えていない役職を確定させません。
- **ザーン（惨）** — 初期アウトサイダーの人数 X を使い、夜X〜昼Xの終了まで町人全員を毒にする候補盤面を探索。**その時期に複数の情報異常が出るとザーンを弱く支持**します。X=0では発動しません。

**インストール:** 既存のWindows React/Viteアプリで `src` をバックアップし、ZIP内の `src` に置き換えてください。`package.json` や `node_modules`、Android関連の設定はそのままです。`npm run dev` または `npm run build` を実行します。**APKではなくソース一式**です。

**検証:** エンジン回帰テスト **320 / 320 通過**（前回301から19件追加）。TypeScriptエンジンコンパイルとオフライン全TSX構造チェックにも合格。Windowsでの実ビルド・Android実機での動作確認は未実施です。

**制約:** ウィザードの願いやレイスが見た情報など、ストーリーテラー依存の効果は手動解釈が必要です。詳細は `docs/EXPERIMENTAL_MINIONS_PHASE9.md` を参照してください。

---

# 実験的手下 H組アップデート

前回の **リル・モンスター / リーチ / アル・ハディキア / オジョ / ライオット / ヤガバブル** 更新版を維持し、新たに **5人の実験的手下** をカスタムスクリプト専用で追加しました。ユーザー向け画面は日本語、内部の役職ID・タグ・データ形式は英語です。無神論者は引き続き未追加です。

- **ボフィン（博）** — ゲームにいない善役職の能力をデーモンが使える世界を探索。成功したスレイヤー・処女の発動だけでは善・役職を確定しません。デーモン／ボフィン本人のモードで能力を記録できます。
- **ブームダンディ（爆）** — **推理**で「処刑成立 → 爆発直後の生存者3人 → 10→1の指差し結果」を記録。連動する死亡はまとめて追加・削除できます。処刑成立しても本人が生き残るケースにも対応。
- **フィアモンガー（恐）** — **推理 → フィアモンガー警戒** をオンにすると処刑推薦を慎重化し、ゴブリン・ブームダンディの処刑危険性と併せて注意します。手下モードでは夜の標的と実際の指名・処刑を記録できます。
- **ハーピー（鳥）** — 手下モードで狂気を与える2人を記録。プレイヤーの情報・能力主張画面に「ハーピーに選ばれた」という専用報告を追加。被害を主張した人がハーピー本人という役職主張にはなりません。
- **マリオネット（糸）** — 初期席でデーモンの隣にいる邪悪な手下で、善役職の自覚を持つ場合を探索します。デーモンモードで隣のマリオネットを直接記録できます。

**インストール:** ZIPの `src` フォルダを、既存のWindows React/Viteアプリの `src` と置き換えてください。元の `src` をバックアップし、`package.json`、`node_modules`、Android設定は残します。`npm run dev` または `npm run build` を実行してください。**APKではなくソース更新**です。

**検証:** エンジン回帰テスト **301 / 301 通過**（前回276から25追加）。厳格なエンジン TypeScript コンパイルおよびオフライン TSX 構造チェック通過。WindowsのVite実ビルドとAndroid実機動作はまだ未検証です。

**既知の制約:** ボフィンがコピーする全ての特殊能力・ストーリーテラー判断を完全に自動化しているわけではありません。ブームダンディの指差し集計、ハーピーの狂気判断も最終結果を手動入力します。詳細は `docs/EXPERIMENTAL_MINIONS_PHASE8.md` を参照してください。

---

# 実験的デーモン G組アップデート

前回の **タイフォン卿 / カザリ / レギオン / リヴァイアサン** 更新を維持し、カスタムスクリプト専用デーモン6体を追加しました。**役職と操作画面は日本語、内部識別子は英語**です。無神論者はまだ追加しません。

- **リル・モンスター（赤）** — 手下の増員・毎夜変化するデーモン認識を候補へ反映。手下主張の過剰・デーモン占いの変動は弱い加点で、確定ではありません。
- **リーチ（蛭）** — 初夜の宿主を毒にし、健康なリーチは宿主存命中に死亡できません。宿主が死ぬとリーチも死亡。推理には「リーチ想定：毒の宿主候補」を表示します。
- **アル・ハディキア（生）** — **推理 → アルハディキアゲーム** にチェックした場合のみ通常の推理に登場（自分がそうだと確認している場合を除く）。公開死亡と復活の処理を扱います。
- **オジョ（眼）** — デーモンモードではプレイヤーではなく「役職」を選択。序盤の継続情報役の狙い撃ちはスパイの手掛かりと併記します。
- **ライオット（暴）** — **推理 → ライオットゲーム** にチェック。3日目の手下→ライオット変化、連続指名死亡を記録でき、3日目の推理が自動表示されます。ライオット想定の善・悪指標は別欄で**視覚的に強調**します（確定確率ではありません）。
- **ヤガバブル（呪）** — 特別な入力フォームなし。一晩に多数のデーモンらしい死亡がある場合だけ、弱い兆候として表示します。

**インストール:** ZIPの `src` を、Windowsの既存React/Viteアプリの `src` に置き換えます。既存の `src` は必ずバックアップしてください。既存の `package.json` と `node_modules`、Android設定はそのまま残します。`npm run dev` か `npm run build` を実行してください。これは **APKではなくソース更新**です。

**検証:** 回帰テスト **276 / 276 通過**（前回258から18追加）、エンジン TypeScript とオフライン TSX 構造チェック通過。Windows Vite実ビルドとAndroid実機動作は未テストです。

**既知の制約:** リル・モンスターの仮想デーモン枠は近似です。アル・ハディキアの3人個別の生死選択を全自動で追う機能はまだありません。詳しくは `docs/EXPERIMENTAL_DEMONS_PHASE7.md` をお読みください。

---

# 実験的デーモン F組アップデート

前回の **ケシ栽培者 / 説教師 / 姫 / 修験者 / 執事 / 村の愚者** 更新版を土台に、カスタムスクリプト専用の4体のデーモンを追加した完全な `src` フォルダです。

- **タイフォン卿（卿）** — 通常より手下が1人多く、席が連続してタイフォン卿を挟む構成。通常の手下人数を超える手下主張は推理の弱い加点材料になります。タイフォン卿で遊ぶ場合は、手下の役職予想を席ごとに記録できます。
- **カザリ（傀）** — 手下の人数は通常どおり、誰をどの手下にしたかを記録。アウトサイダー人数は複数の可能性として探索します。
- **レギオン（群）** — 大多数がデーモンの特殊構成。投票・情報の少なさを弱い状況証拠として使用。レギオンの可能性を仮定した「疑う相手」の一覧を推理に追加しました。
- **リヴァイアサン（巨）** — スクリプトに含まれる場合のみ、**推理**の「公式に宣言された」チェックボックスで有効化。未チェック時の候補は必ず**0%**。善2人の処刑と5日目終了の特殊勝利条件にも対応しています。

処刑された本人が生存した場合は、指名・投票記録で **「処刑が成立したが本人は生存」** にチェックを入れてください。リヴァイアサンでは死ななくても処刑回数に含めます。

役職はすべて **カスタムスクリプト専用**。従来の役職と公式3版は維持され、無神論者も引き続き未追加です。**画面は日本語、内部タグ等は英語**のままです。

**インストール:** ZIP内の `src` フォルダで、既存のReact/Viteプロジェクトの `src` を丸ごと置き換えてください。事前にバックアップを取り、`package.json`、`node_modules`、Android設定は変更しません。Windows上で `npm run dev` または `npm run build` を実行します。これはAPKではありません。

**検証:** 回帰テスト **258 / 258 通過**（前回232から26件追加）。エンジンTypeScriptとオフラインTSX構造検証が通過。WindowsのViteビルドとAndroid実機テストは未実施です。

詳細・制約: `docs/EXPERIMENTAL_DEMONS_PHASE6.md`

---

# 実験的キャラクター E組アップデート

前回の **猟師 / 騎士 / 人狼 / 魔術師 / 夜警 / 貴族 / ピクシー** 更新版に、以下の6役を追加した `src` 一式です。

- **ケシ栽培者（芥）** — 悪陣営の初夜紹介を妨害。死亡後の紹介時点をデーモン・手下モードで記録可能。
- **説教師（説）** — 毎夜選択した手下の能力を抑制。毒・酔い・説教師の死亡後は解除。
- **姫（姫）** — 姫として最初の日、自分が指名し処刑が成立すると、次の夜にデーモンは殺害不可。処刑対象が死ななくても発動。
- **修験者（修）** — 初夜に最寄りの悪陣営が時計回り・反時計回りのどちらにいるかを記録。
- **執事（執）** — 初夜に善として登録される1人を知る。
- **村の愚者（愚）** — 毎夜1人の陣営を知る。追加の村の愚者を最大2人まで許容し、複数いる場合はそのうち1人が酔っている。

役職は全て **カスタムスクリプト専用**。既存の3つの公式版と過去の役職を保持し、**無神論者は引き続き除外**しています。ユーザー向け画面だけ日本語で表示し、プログラム内部の識別子は英語のままです。

**インストール:** ZIP内の `src` フォルダを既存のアプリプロジェクトの `src` に置き換えてください。**まず元の `src` をバックアップ**し、`node_modules` や `package.json`、Android設定などはそのまま残してください。Windowsのプロジェクトフォルダで `npm run build` または `npm run dev` を実行します。これは APK ではありません。

**検証:** 回帰テスト **232/232 通過**、エンジンTypeScriptとオフラインのTSX構造チェック通過。Windowsでの実ビルド・Android実機操作は未検証です。既知の制約と変更点は `docs/EXPERIMENTAL_ROLES_PHASE5.md` に記載。

---

# 実験的キャラクター D組アップデート

前回の **聖歌隊 / 王 / 技師 / 農夫 / 漁師 / 将軍 / 女教皇** 更新版に、新たに7役の実験的町人と、猟師に必要な追加のよそ者「乙女」を追加した `src` 一式です。

- 猟師 **狩** — 夜に1回、生存者を選択。乙女ならゲームにいない町人役職へ変更。
- 騎士 **騎** — 初夜に、デーモンではない2人の情報。
- 人狼 **狼** — 2夜目以降に生存者を選び、善陣営なら死亡させ、デーモンの殺害を抑止。善1人の悪登録も推理へ反映。
- 魔術師 **魔** — デーモンには追加の手下、手下には追加のデーモン候補として見える。魔術師自身は善陣営。
- 夜警 **夜** — 一度だけ夜に相手へ自分の役職を知らせる。
- 貴族 **貴** — 初夜に、ちょうど1人が悪として登録される3人を知る。
- ピクシー **妖** — 初夜の町人情報と、狂気を維持した後の能力継承を記録。
- 乙女 **乙** — 猟師の必須連動役職。手下の公開推理が正しければ悪勝利（有効な場合）。

全員 **カスタムスクリプトのみ**。**無神論者は引き続き除外**。UI表示のみ日本語、内部RoleId / RoleTag / JSON項目は英語のままです。

**インストール:** ZIP内の `src` フォルダで、既存プロジェクトの `src` フォルダを丸ごと置き換えてください。置き換え前にバックアップを取り、既存の `node_modules` とプロジェクト設定は残します。Windowsで `npm run dev` または `npm run build` を実行します。APKではありません。

**検証:** 回帰テスト **210 / 210 通過**、エンジン TypeScript とフル TSX オフライン構造チェック通過。実機/Windows Vite ビルドは未検証です。

詳細: `docs/EXPERIMENTAL_ROLES_PHASE4.md`

---

# 実験的キャラクター C組アップデート

前回の **気球乗り / バンシー / 賞金稼ぎ / カニバル** 更新版に、さらに7役を追加した `src` 一式です。

- 聖歌隊 **唱** — 王がデーモンに殺された場合、デーモンのプレイヤーを知る。聖歌隊のいる初期構成には王が必要。
- 王 **王** — 死者が生存者以上になってから、毎夜、生きているキャラクターを1つ知る。デーモンは開始時の王を知る。
- 技師 **工** — 夜に一度だけ、デーモンか手下たちの役職を選び変更できる。
- 農夫 **農** — 夜死亡すると、生きている善陣営の一人が農夫になる。
- 漁師 **漁** — 日中に一度だけストーリーテラーの助言を記録できる。
- 将軍 **将** — 毎夜、ストーリーテラーの戦況判断を記録できる。
- 女教皇 **巫** — 毎夜、話すべき相手として示されたプレイヤーを記録できる。

7役はカスタムスクリプトのみ。**無神論者は未実装**。UI表示は日本語、内部RoleId / RoleTag / JSON保存項目は英語のままです。

**インストール:** このZIP内の `src` フォルダを既存プロジェクトの `src` に置き換えてください。既存 `src` は念のためバックアップを取り、既存の `node_modules` や他のプロジェクト設定はそのまま残します。Windowsで `npm run dev` または `npm run build` を実行してください。

**検証:** 回帰テスト **191/191 通過**。エンジン TypeScript とフル TSX オフライン構造チェック通過。詳細: `docs/EXPERIMENTAL_ROLES_PHASE3.md`。

---

# 実験的キャラクター B組アップデート

このパッケージは直前の実験的キャラクターA組を土台に、スクリプトメーカー専用の **気球乗り / バンシー / 賞金稼ぎ / カニバル** を追加します。**無神論者は今回追加しません。**

- 実験的役職記号を **軽 / 錬 / ア / 記** に固定。
- 気球乗り: 通常構成と `+1 Outsider` 構成の両方を候補世界として扱います。
- バンシー: デーモンによる夜死亡後、1日2回指名 + 各投票2票 + 死者票非消費を実装。
- 賞金稼ぎ: 候補世界ごとに町人1人を悪陣営にし、善悪確率へ反映します。
- カニバル: 直近の処刑死プレイヤーの実能力を候補世界で取得し、悪executeeなら毒。Monk保護は直接接続済みです。
- UIのみ日本語。内部RoleId / RoleTag / storage key / solver metadataは英語です。

詳細: `docs/EXPERIMENTAL_ROLES_PHASE2.md`

検証: **177 / 177** 回帰テスト通過。エンジンTypeScriptとフルTS/TSX構造チェックも通過。

---

# 実験的キャラクター A組アップデート

このパッケージは直前の全旅人 + 実験的旅人ビルドを土台に、通常役職側の実験的キャラクター **軽業師 / 錬金術師 / アルサーヒル / 記憶喪失者** を追加した完全な `src` 更新です。

- 4役は **TB / BMR / S&V の組み込みスクリプトには追加されません**。
- スクリプトメーカーでは通常役職として選択できます。
- 表示UIは日本語、内部RoleId / RoleTag / event kind / storage key / solver metadataは英語のままです。
- 軽業師: N2+で対象を選び、その夜に対象が酔い・毒なら健康な軽業師の死亡を候補世界で検証します。
- 錬金術師: スクリプト上の手下能力を選択。`Baron` 等のセットアップ変更能力は実際の候補盤面の人数構成へ反映し、同じ能力が実在する場合も重複して適用できます。
- アルサーヒル: 1日1回、現在の全手下・全デーモンを公開予想し、完全一致なら善勝利として扱います。
- 記憶喪失者: スクリプト上の町人候補を、ほぼ半分に分ける内部タグ質問を順に提案し、回答から候補を絞って最終的な能力候補を選べます。

詳細: `docs/EXPERIMENTAL_ROLES_PHASE1.md`

検証: **169 / 169** 回帰テスト通過。エンジンTypeScriptとフルTS/TSX構造チェックも通過。

---

# 全旅人 + 実験的旅人アップデート

このパッケージは直前のBMR + S&V旅人ビルドを土台に、実験的旅人 **カックルジャック / ノーム / ギャングスター** を追加した完全な `src` 更新です。

- 旅人は合計 **18役**。
- 「旅人を追加」は版別制限をなくし、**全旅人**を常時選択できます。
- ノーム / ギャングスターは `SPECIAL_DEATH_CAUSE` タグを持ち、死亡原因もそれぞれ独立して保存します。
- カックルジャックの通常席プレイヤーへの役職変更は候補世界にも反映します。
- 既存の中央表示、投票、追放、死者票、善悪推定はそのまま維持します。
- 詳細: `docs/EXPERIMENTAL_TRAVELLERS.md`

検証: **163 / 163** 回帰テスト通過。エンジンTypeScriptとフルTS/TSX構造チェックも通過。

---

# BMR + S&V 旅人アップデート

このパッケージは直前の旅人追放/日別対象アップデートを土台に、BMRとS&Vの旅人10役を追加した完全な `src` 更新です。

- BMR: 見習い / 寮母 / ブードゥー師 / 判事 / 司教
- S&V: 肉屋 / 骨拾い / 娼婦 / バリスタ / 変人
- 既存TB旅人5役もそのまま維持され、合計15役の旅人を版別に選択できます。
- 旅人は通常RoleId・スクリプト人数・セットアップ人数には入りません。
- 中央表示、投票、追放、死者票、善悪推定は既存の旅人レイヤーを共有します。
- 詳細: `docs/BMR_SNV_TRAVELLERS.md`

検証: **159 / 159** 回帰テスト通過。エンジンTypeScriptとフルTS/TSX構造チェックも通過。

---

# トラブル・ブルーイング旅人アップデート

このパッケージは、直前の完全日本語UI + Outsider claim-behaviour buildの上に、トラブル・ブルーイングの旅人5役を追加します。

- 官僚 / 物乞い / ガンスリンガー / スケープゴート / 泥棒
- 旅人は通常役職・スクリプト・セットアップ人数に追加されません。
- 指名/投票画面の「旅人を追加・管理」から参加させます。
- 参加中は盤面中央に専用カードを表示します。
- 投票は官僚/泥棒の重み、物乞いトークンを含めた実票を保存します。
- 上部の「推理」の隣に「善悪」ボタンを追加しています。

詳細は `docs/TB_TRAVELLERS.md` を参照してください。

検証: **149 / 149** 回帰テスト通過、エンジンTypeScriptとオフラインTS/TSX構造チェック通過。

---

# 2026-10-08 - Outsider claim-behaviour weighting

- Added early/hidden Outsider claim tags.
- Baron and Fang Gu candidate weights now account for extra Outsider slots that force early-claim roles.
- Vigormortis count evidence now only applies when its reduction removes an otherwise-forced early-claim Outsider.
- Missing-claim evidence scales with exact-role claim coverage to avoid overreacting to incomplete logs.
- Added Fang Gu to the global count-modifier reasoning cards.
- Regression suite: 143 / 143 passed.
- Reproduction: 8-player TB with one expected Outsider and Saint as the only Outsider claim produced about 0.016% Baron share in a 12,000-attempt fixed-seed search.

# 日本語UI版

この更新では、アプリ上で表示される役職名、メニュー、説明、推理文、手下モード、警告、エラー表示を日本語化しています。内部IDと保存形式は既存データとの互換性維持のため変更していません。

# Clocktower: S&V Minion Modes Update

This package builds directly on the **Vigormortis Outsider-tag patch** and implements the remaining Sects & Violets Minion self modes: **Evil Twin, Witch, Cerenovus, and Pit-Hag**. The existing Townsfolk, Outsider, and Demon mechanics remain intact.

## What changed

- **Evil Twin:** record the real good Twin and their character as private direct information. Candidate histories enforce the Twin win condition and the good-win block while both Twins live. The strategy panel uses a separate town-facing projection to find the good Twin's weakest public information/credibility without leaking secret evil-team knowledge into that analysis.
- **Witch:** choose the curse manually each night. The UI shows nomination history as decision support rather than pretending to predict the table. If the cursed player nominates, record whether the curse killed them; linked death records are kept consistent automatically. The ability switches off at three living players.
- **Cerenovus:** choose a target and Townsfolk/Outsider character. Recommendation cards favor targets that already appear evil in town-facing candidate worlds, then add pressure for damaging claim changes/collisions. A madness-break execution can be recorded as a linked execution.
- **Pit-Hag:** the existing exact character-change engine is now paired with a planner. Recommendations estimate whether the new character is absent in current weighted worlds and value good-side crippling, evil upgrades, and Demon pivots while warning against removing the known sole Demon.
- **Vigormortis interaction:** a Minion killed by a healthy Vigormortis can continue using Witch/Cerenovus/Pit-Hag abilities. Evil Twin's retained execution-win ability is also recognized.

## Verification

The engine/data regression suite passes **138 / 138** tests. The engine TypeScript compile and the offline full TS/TSX structural check also pass. Run your normal `npm run build` after installing because this environment does not use your exact Windows React/Vite `node_modules` tree.

## Install

Replace the current project `src` folder with the `src` folder in this package, preserving your existing package files and `node_modules`, then run `npm run build` or `npm run dev` as usual.

# Clocktower: Vigormortis Outsider-tag Patch

This is a complete `src`-folder update built on **Clocktower_SNV_Demons_Update**.

## This patch

- Makes the existing `OUTSIDER_COUNT_MODIFIER` tag data-driven.
- Baron: Outsider +2 / Townsfolk -2.
- Fang Gu: Outsider +1 / Townsfolk -1.
- Vigormortis: Outsider -1 / Townsfolk +1 when an Outsider exists to remove.
- The reasoning overview now shows a Vigormortis tendency card when Vigormortis is on the frozen script.
- If exact Outsider claims match the Vigormortis-reduced setup count, Vigormortis receives a weak heuristic point. Claims are never treated as confirmed setup information.
- No S&V Minion mechanics were added or changed.

## Verification

- Engine/data regression tests: **127 / 127 passed**.
- Full offline TS/TSX structural check: **passed**.

## Install

Replace the existing project `src` folder with the `src` folder in this ZIP, then run `npm run build` in the existing project.


This package builds directly on the **Townsfolk + Outsiders** version and adds dedicated support for the four Sects & Violets Demons: **Fang Gu, Vigormortis, No Dashii, and Vortox**. The previously implemented S&V Townsfolk/Outsiders remain intact. **Evil Twin, Witch, Cerenovus, and Pit-Hag are not expanded in this batch.**

Implemented Demon behavior includes Fang Gu/Vigormortis setup modifiers, nightly attack recording, Fang Gu's first-Outsider transfer, No Dashii dynamic poisoning, Vigormortis killed-Minion poison state, Vortox false Townsfolk information, and Vortox's no-execution dusk win. See `docs/SNV_DEMONS.md`.

Verification for this package: **125 / 125 engine/data tests passed**, plus a full offline TS/TSX structural type check.

---

# Clocktower v2.1 — Spy False-Information Strategy Update

This is a complete **src-folder update** for the existing React + TypeScript + Vite project. It is not a standalone APK.

## v2.1 focus

The Spy advisor now ranks bluffs by three strategic goals: keep many opponent candidate worlds alive, make the real Demon seat look good in as many of those worlds as possible, and—when the Grimoire/public claims expose a Saint or Goblin—push worlds where that dangerous seat is the Demon.

Roles tagged `INFO_SOURCE` also receive an automatically generated false-information line. The UI pins the best line under `最優先の偽情報案`. See `docs/SPY_2_1_FALSE_INFO.md` and `docs/SPY_BLUFF_ADVISOR.md`.

Goblin (`鬼`) is now available to custom scripts as an experimental Minion.

## Install

1. Stop Vite with **Ctrl + C**.
2. Back up `C:\Users\naoki\clocktower-solver\src` somewhere outside the project.
3. Extract this ZIP and copy its entire `src` folder into `C:\Users\naoki\clocktower-solver`, replacing matching files. Copy the `engine` and `ui` subfolders too.
4. Keep the existing `package.json`, `package-lock.json`, `node_modules`, `index.html`, and Vite configuration. This update adds no new runtime package.

`App.css` in this package is the complete current stylesheet. **Replace the old stylesheet; do not append it.**

Run:

```bat
cd /d "%USERPROFILE%\clocktower-solver"
npm run dev
```

For a local compile/build check:

```bat
npm run build
```

The exact npm/Vite build could not be run in the delivery environment, but the source passed the offline checks listed in `docs/TEST_RESULTS.md`.

## Self-role modes

Tap your own circle and choose a role.

- **Townsfolk**: existing shown-role, structured information, and action workflow. A shown Townsfolk can still be analyzed as the Drunk where appropriate.
- **Minion**: dedicated Minion mode includes the existing Trouble Brewing tools plus the new Pit-Hag transformation recorder.
- **Demon**: dedicated attack mode for Imp, Fang Gu, Vigormortis, No Dashii, and Vortox, plus teammates, Storyteller bluffs, and bluff planning. Imp retains its starpass workflow.

Switching alignment/role asks before clearing role-specific information where necessary. Shared Minion team/bluff-planning information is preserved when switching between Minion characters, while character-specific action records are cleared after confirmation.

## Minion mode highlights

### Shared evil-team information

For 7+ players, record the Demon and other Minion players shown at setup. Their seats are direct information; exact fellow-Minion characters are only fixed after you explicitly record that they were confirmed later.

For 5-6 players, Minion mode does not assume normal starting evil-team information.

Known evil teammates are privately marked on the board:

- `魔` = known Demon
- `味` = known fellow Minion

### Shared Storyteller bluffs versus plans

A Storyteller bluff that the Demon explicitly shares with you is an out-of-play hard constraint for Possible Worlds. A planned bluff for yourself or a teammate is only a strategy note and **never feeds back into the solver**.

### Poisoner

Record one poison target per night from N1. Your own target selection is direct information, so candidate histories must use that target while you remain the Poisoner. The board shows a numbered green marker for the recorded cycle.

### Spy

Copy the N1 Grimoire, Fortune Teller red herring, and nightly visible Poisoner reminder target. Spy information is conditional rather than universally hard: if your Spy is itself poisoned, the Storyteller may show false information, and those candidate worlds remain possible.

Spy mode now also runs an **automatic bluff-world advisor**. It builds a counterfactual good-team view with your secret evil information removed, searches candidate worlds from that perspective, and ranks every good-role bluff by how many distinct/effective candidate assignments can still explain you as that role, as the Drunk who thinks they are that role, or as evil bluffing it. The top practical recommendation avoids known Grimoire collisions, existing opponent claims, and teammate bluff-plan collisions; a separate `世界数1位` badge shows the raw maximum-world option even if it has a collision risk.

The advisor is deliberately bounded/sample-based rather than exhaustive. It automatically recalculates while Spy mode is open and has a `深く再計算` control for a larger search. Choosing `このブラフを採用` writes the role into the existing team bluff plan, which is saved/logged but never fed back into the mechanical solver.


### Pit-Hag

From N2 onward, record the chosen player and the character you attempted to create. The engine checks whether that character is currently in play in each candidate history. Successful transformations change character but keep alignment. Creating a Demon makes that night use the Pit-Hag arbitrary-death rule instead of normal Imp kill-count validation.

### Scarlet Woman

Record the exact phase if you actually become the Imp. Possible Worlds then require a legal Demon transition at that phase. Successor Imp attacks begin on the following night, not a second time during the takeover night.

### Baron

The solver applies Baron's setup modification from your own direct Baron token. The UI shows the normal and Baron-modified setup counts plus currently recorded Outsider claims.

See `docs/MINION_MODE.md` for the full behavior and hard-vs-soft information boundary.

## Reasoning and Possible Worlds

The reasoning button at the top of the board opens analysis. The menu also has **候補盤面を確認** for a direct jump into candidate worlds.

The engine searches a bounded sample of legal assignments from the selected frozen script. Trouble Brewing has the deepest exact coverage; newer BMR/S&V mechanics are added character by character, with unsupported abilities kept conservative rather than guessed. Surface percentages are shares of the weighted candidates found, **not calibrated real-world probabilities**.

Important distinctions:

- your own token/setup/team information is much stronger than another player's claim;
- planned evil bluffs do not influence the search;
- structured information can be mechanically evaluated; free-text notes are not silently parsed;
- missing data is not automatically interpreted as “nothing happened”;
- poisoned/drunk information can remain false without forcing a player to be lying.

## Warning badges

| Badge | Meaning |
| --- | --- |
| Red `!` | Strong evil concentration in a sufficiently broad explored candidate set, with supporting information/public evidence |
| Orange `!` | Claim, information, or input inconsistency worth examining |
| Yellow `!` | Your saved manual read conflicts with public evidence/current candidate analysis |
| Blue `!` | Drunk is a significant explanation in explored candidates |
| Green number | Poisoning on that numbered cycle is required by many candidates **or directly recorded by your Poisoner/Spy view**; tap for the exact reason |
| Neutral dot | Conversation recorded; not an evil accusation |

A direct Poisoner marker is strong because it is your own action. A Spy-displayed poison marker is explicitly labeled conditional because a poisoned Spy can be shown false information.

## Game logs and saves

The current game autosaves to browser localStorage. The menu can save a mid-game archive entry; ending the game adds a finished Game Log entry. Archived raw game states can later be reloaded and re-analyzed with a newer solver.

JSON export/import is available for backups and moving games. Keep important exports outside browser storage. The archive is capped at 40 entries.

`夜を戻す` restores the complete checkpoint from before the previous night advance rather than merely decrementing the night number.

## Included docs

- `docs/MINION_MODE.md` - new Minion-mode behavior
- `docs/DEMON_MODE.md` - Imp/Demon workflow
- `docs/GAME_LOG_AND_REASONING.md` - archive and solver concepts
- `docs/RULES_AND_LIMITS.md` - current mechanical coverage and known limits
- `docs/IMPLEMENTATION_NOTES.md` - developer architecture notes
- `docs/TEST_RESULTS.md` - verification results

## Current major limits

This is still Trouble Brewing only. Travellers and other scripts are not modeled. Search is bounded rather than exhaustive, strategy suggestions are heuristic, and rare interactions may still need additional regression cases. There is no production APK/PWA package in this ZIP.

## Script Manager update

From the home screen open `スクリプト管理`.

`新規スクリプト` shows the 72 core roles as ON/OFF buttons. Press `保存`, type the script name, and it will appear both in Script Manager and in the game setup script selector.

Built-in scripts included:
- Trouble Brewing
- Bad Moon Rising
- Sects and Violets

Trouble Brewing has the full existing mechanical solver. BMR/S&V currently use generic candidate-world support for their unimplemented unique abilities; see `docs/SCRIPT_MANAGER.md`.
## Latest small patch: Bureaucrat / Thief daily recipient flow

- 官僚・泥棒の対象は日ごとにリセットされます。
- 通常プレイヤーの「能力発動」から、処刑人に加えて活動中の官僚・泥棒を選べます。
- 処刑人ではタップした人が使用者、官僚・泥棒ではタップした人が対象です。

## 2026-10-09 旅人追放パッチ

メインメニューの「旅人を追放」から参加中の旅人を追放できます。追放された旅人は能力を失い中央表示から外れますが、投票画面では死者票を1票保持します。
