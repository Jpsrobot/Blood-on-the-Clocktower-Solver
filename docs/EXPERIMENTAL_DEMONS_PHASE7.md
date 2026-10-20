> **2026-10-12 更新注記:** この文書には旧版の表示漢字が含まれる場合があります。現在の漢字と重複解消の対応表は `CHARACTER_CATALOG_AUDIT.md` を参照してください。

# Experimental Demons - Phase 7 (2026-10-11)

This version extends the Phase 6 Demon release. The game is a React + TypeScript/Vite source project, not an APK. All six characters are included **only in custom scripts**; no original-edition script has been changed. UI labels are Japanese, internal IDs / types / event fields are English. Atheist remains excluded.

## Roles and UI

| Internal RoleId | UI / symbol | Data / mechanic |
| --- | --- | --- |
| `lil_monsta` | リル・モンスター / 赤 | Lil' Monsta uses a *virtual Demon seat* to represent its physical Minion holder. The holder can move on later nights, changing who registers as the Demon; its underlying extra Minion ability is retained. Extra distinct Minion claims and changing Demon-detection reports grant modest heuristic weight, not mechanical confirmation. Evil self-mode offers a nightly babysitter **notes** list; notes are not a public solver lock. |
| `lleech` | リーチ / 蛭 | The N1 secret host is fixed for the game, remains poisoned, and is tracked across candidate worlds. Healthy Lleech cannot die while the host is alive; when host dies, Lleech dies too. An entered actual self-selected host is a hard lock. 推理 ranks candidate poisoned host seats **conditional on Lleech worlds**. Nonlethal executions increase Lleech weight slightly but are not proof. |
| `al_hadikhia` | アル・ハディキア / 生 | Explicit **「アルハディキアゲーム」** check in 推理. Unchecked: no Al-Hadikhia sample worlds (unless it is the user's observed self role). Checked: searches only Al-Hadikhia Demon worlds. The mechanical evaluator admits up to 3 Demon night deaths and public recorded revivals. |
| `ojo` | オジョ / 眼 | Demon mode records the **chosen character** rather than a target player. If the character is present and there is a Demon night death, it must be that character; if absent, the victim can be Storyteller-selected. Early undisclosed high-value/continuing information deaths get a weak Ojo clue, alongside the existing Spy information-leak heuristic. |
| `riot` | ライオット / 暴 | Explicit 「ライオットゲーム」 check in 推理. On D3 Minions become Riot; D3 nomination deaths and chain nominations can be entered, including a newly Riot-killed nominator. On entering game cycle 3 with Riot confirmed, the app automatically opens 推理 once. The separate Riot-only conditional good/evil display raises the *visual contrast* with a 2.5-power transform and labels both sides distinctly. These emphasized figures are **not calibrated probabilities** or proof of alignment. |
| `yaggababble` | ヤガバブル / 呪 | Role may be used in custom scripts, but **no secret phrase or utterance counter** is implemented. Two or more likely Demon night deaths supply only a mild heuristic in 推理. The solver keeps Yaggababble as generic, so no invented exact phrase-count mechanics are enforced. |

## Modeling details and limitations

- Lil' Monsta has no personal character token; this codebase historically needs one Demon marker per candidate world. The engine therefore uses one *proxy* `lil_monsta` role/seat and a separately stored underlying Minion role. It models extra Minion ability and movable Demon registration, but **is not a complete token-level representation** of every custom-script jinx, self-Minion interface, or arbitrary Storyteller-death interaction. This is intentionally documented rather than claiming a complete model.
- Lleech health/poison behavior and host identity can be inferred from entered events; protection, unusual death sources, other Demon transformations and imperfect information still leave alternative explanations. Host rankings are conditional on the sampled Lleech worlds, not unconditional poisoned probabilities.
- Al-Hadikhia has its announced-game gate, nightly death count, and public revival validation. **A fully structured three-person individual live/die ballot** and exhaustive all-live resolution are not yet modeled; enter observed deaths/revivals using the existing game event forms.
- Riot's D3 nominated deaths are entered alongside nominations when the game is confirmed. This does not automate the real Storyteller's private decisions or guarantee a conclusive world search from a partial nomination chain. The visual “radicalized” percentages are presentation-only conditional scores, not a substitute for the unmodified posterior/sample values.
- Ojo targeting a **character** is a hard mechanical restriction only when the Demon and action are directly known. Early private role-targeted deaths are *heuristics*, not actual knowledge of who Ojo targeted; Spy can explain them too.
- Yaggababble deliberately receives no gameplay tracker, phrase input, or hard count-based win logic, as requested.
- There is no guarantee that sampling explored all candidate setups. Unmodeled jinxes/role interactions and Storyteller discretion must still be judged by the player.

## Changes affecting saved games

- Optional backward-compatible snapshot flags: `alHadikhiaConfirmed`, `riotConfirmed`; mutually exclusive with `leviathanConfirmed` (one public Demon-game confirmation at a time).
- Optional Demon state: `lleechHost`, `lilMonstaBabysitters` (self-mode only).
- Demon attack action role may be `lleech` or `ojo`, and Ojo uses `targetRole`.
- No breaking changes to core non-experimental script IDs, game-log schema or role claim format.

## Verification

- Previous Phase 6: **258 / 258** engine/data regression cases.
- Phase 7: **276 / 276** cases passing, including 18 new cases for catalogue, announced-game gating, Riot day-three transformation and conditional seat weights, Lil' Monsta Minion ability/holder movement and heuristic, Lleech poisoned host/protection/death sequence, Ojo character selection and early-precision evidence, Yaggababble's limited clue, conflicting public announcements, and Riot nomination chains.
- `npx tsc -p tsconfig.engine.json --outDir .engine-test` passed.
- Offline complete TS/TSX structural/type check with a local **test-only** React declaration shim passed. React/Vite were not installed in this artifact environment, so this is **not** a successful native Vite build.
- Full ZIP integrity checked. Actual Windows `npm run build`, device installation, user experience interactions and performance on a phone were not tested here.
