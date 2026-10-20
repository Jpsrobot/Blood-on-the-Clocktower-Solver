# Game Over Result Selection

When **ゲーム終了** is selected from the in-game menu, the app now opens a result-selection screen instead of immediately returning home.

Choices:

- `デーモン勝利` -> stored internally as `evil`
- `町勝利` -> stored internally as `good`
- `特殊条件勝利` -> stored internally as `special`

The selected result is saved directly into the finished game-log entry. The Game Log editor uses the same three user-facing result labels, while `結果不明` remains available for older or manually saved entries.

Finishing a game also clears the active resume snapshot and night checkpoints. The finished game remains available through **ゲームログ**, so returning to the home screen no longer offers `ゲームを再開` for a game that was explicitly ended.
