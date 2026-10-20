# Death-reason menu: script-aware filtering

The player status > キル > 理由 menu now reads the exact frozen script of the active game, rather than showing every special death cause from the full catalog.

- General reasons remain available regardless of script: ストーリーテラー, 処刑, 夜死亡, 能力, その他.
- サイコパスの公開殺害 appears only when `psychopath` belongs to the active game's `scriptRoleIds` (including on custom scripts). Trouble Brewing, Bad Moon Rising and Sects & Violets do not include it.
- ノーム and ギャングスター remain visible only if a matching living, active Traveller is currently in the game; Travellers aren't script characters.
- The 突然変異者の狂気違反による処刑 option was already correctly restricted to scripts containing `mutant`; this behavior is preserved.
- Existing death records, including archived/saved games with their recorded reason, remain readable even when that cause is hidden from a new menu.
- This is a menu visibility correction, not a rule change to the engine or archived events.

## Code

- `src/deathReasons.ts` centralizes the complete death-reason catalog and `availableDeathReasons` filtering.
- `src/App.tsx` uses `availableDeathReasons(currentScriptRoleIds, getActiveTravellers())` in the death-reason picker.
- `tsconfig.engine.json` includes the new helper in engine test compilation.
- Five new tests assert script filtering, Traveller conditions, history label preservation, and UI wiring.

## Validation

- Regression suite: **382 / 382 passed** (377 previous + 5 new).
- Engine TypeScript check: passed.
- Source TS/TSX syntax validation: 41 / 41 files passed.
- Branding checks: 7 / 7 passed.
- The ZIP integrity test passed; a local Windows Vite/Android build has not been performed here.

## Install over the existing Android project

Back up the current `src` folder, merge this package into `C:\Users\naoki\clocktower-solver`, and from that project directory run:

```cmd
npm run build
npx cap sync android
npx cap run android
```

Android APK update should preserve saved data as long as package ID and signing certificate remain unchanged. Export important games first as an extra precaution.
