# 保存と「続きから」の復旧修正

## Cause confirmed from the previous source

`src/App.tsx` always serialized optional role-specific arrays (including empty `boomdandyLog`, `widowReports`, `evilBehaviorReports`, `psychopathEvents` and `organGrinderVotes`) for every new game, including Trouble Brewing.

`src/storage.ts` previously rejected *any* presence of these arrays if the corresponding character was not on the selected script. Thus `saveSnapshot` could write a valid-looking JSON record that `loadSnapshot` rejected on the next launch. `savedGame` became `null`, which hid **続きから**. This was reproducible even with an otherwise empty game.

## Fixes

- Empty arrays are now accepted even when the role is absent; non-empty role-specific records still require the appropriate role on the frozen game script.
- The same empty-record exception applies to optional Lil' Monsta, Snitch, Organ Grinder and Wraith nested records.
- Auto-save is now synchronous on each state update instead of waiting for a 150-ms timer.
- Android/WebView backgrounding (`visibilitychange`) and page unload (`pagehide`) both flush the latest active-game snapshot.
- Every successful in-game save updates the in-memory resume reference.
- Before overwriting a valid current snapshot, the previous valid snapshot is copied to `clocktower.ja.snapshot.backup.v2`. If the primary record fails validation, load tries the backup.
- If an unreadable primary is found, the home screen presents **保存データを救出する** to export the *raw*, unchanged JSON for manual recovery. Neither validation nor reading deletes that record.
- Finishing a game clears both primary and backup after archiving it in game logs.

## Safety

This update keeps the same localStorage primary key (`clocktower.ja.snapshot.v2`), schema version, role identifiers, app ID, game event format and Japanese app branding.

**Do not uninstall the Android app or clear its storage before applying the update.** Merge the new source files, rebuild with `npm run build`, run `npx cap sync android`, and install the APK as an update under the same Android package ID/signing key. If the original raw record remains in WebView storage, the corrected validator should make it resumable again. If Android already deleted the record, code cannot recreate it.

The package contains React/Vite source, not the installed native Android project. Testing the installed app on a physical device remains necessary.

## Verification

- Engine TypeScript compilation passed.
- 386/386 regression tests passed (4 additional tests).
- 40 TS/TSX source files passed a syntax/emit check.
- Full offline TS/TSX type check with a test-only React declaration shim passed.
- Saved-game roundtrip is tested with simulated persistent browser storage and a corrupt-primary/valid-backup scenario.
