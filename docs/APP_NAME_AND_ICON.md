# アプリ名・アイコンの変更（2026-10-14）

**正式な表示名：血濡れた時計台ヘルパー**

ユーザー提供の正方形画像をアプリアイコンに使用しました。`src/assets/app-icon.png` はアップロードされた画像とバイト単位で同一です。アイコンの各解像度と Android アダプティブアイコンのみ、OS の仕様に合わせて縮小・余白追加しています。

## 変更点

- `src/App.tsx`：ホーム画面の旧見出し「時計盤」を正式なアプリ名へ変更。ホーム画面にアイコンを表示。
- `src/App.css`：長い日本語名が狭い画面でも表示できるよう調整。
- `src/main.tsx` と `src/branding.ts`：ブラウザーのタイトル・タブアイコン・ホーム画面追加用メタ情報を設定。
- `public/manifest.webmanifest`：PWA の日本語名・アイコン・表示モードを定義。
- `public/`：favicon、Apple touch、192px・512px・maskable 画像。
- `android_branding/res/`：Android 用 launcher PNG と adaptive icon XML を用意（mdpi〜xxxhdpi）。
- `tools/apply_branding.py`：既存の `index.html`、`capacitor.config.ts/js/json`、Android リソースを安全に更新。

**内部の英語 RoleId・タグ・イベント・セーブキー・ゲーム状態・推理ロジックは変えません。**

## 導入（Windows / React + Vite）

1. 既存の `src` と `public` をバックアップします。
2. 本 ZIP の `src`・`public`・`tools`・`android_branding` を既存プロジェクト直下へコピーして、既存フォルダーに**統合**します（`package.json`、`node_modules`、元からある別の `public` ファイルは削除しないでください）。
3. プロジェクト直下で PowerShell を開き、次を実行します：

```powershell
py .\tools\apply_branding.py .
npm run build
```

`py` が使えない場合は `python .\tools\apply_branding.py .` を使えます。

スクリプトは既存の `index.html` の `<title>`・favicon・manifest、既存の Capacitor 設定の `appName` を更新します。各ファイルがない場合は、その項目を飛ばします。ブラウザーのタイトルは `src/main.tsx` からも設定しています。

## Android アプリの場合

既存プロジェクト内に `android/app/src/main/res` が存在する場合、上記スクリプトは OS 用アイコンを各密度にコピーし、`android/app/src/main/res/values/strings.xml` の `app_name` と `title_activity_main` を更新します。`AndroidManifest.xml` が固定のラベルを持つ場合は `@string/app_name` を参照するように変更します。

- Capacitor を使っている場合、必要に応じて `npx cap sync android` を実行し、Android Studio から **APK を再ビルド・再インストール**します。
- `android/` がない場合、**Android のホーム画面アイコンはまだ変更されません**。今回の ZIP には Android リソースを含めましたが、実際の Android プロジェクトへの適用が必要です。
- Android のランチャーが古いアイコンをキャッシュしている場合は、アプリを再インストールしてください（保存済みゲームを必要なら先にエクスポートしてください）。
- PWA としてインストールしている場合は、ブラウザーのキャッシュを更新し、必要ならホーム画面アイコンを再追加してください。

## 検証

- ゲームエンジンの回帰テスト：**358/358 合格**。
- アプリ名・アイコン検証：**7/7 合格**。
- Android 設定反映スクリプト：モックの既存プロジェクトに対して2回実行し、重複なし・他の文字列と設定維持を確認。
- ソースアイコン：960×960 PNG、元画像と同一ファイル。
- APK と実機のビルドは未実施（既存の Android プロジェクトと開発環境が提供されていないため）。
