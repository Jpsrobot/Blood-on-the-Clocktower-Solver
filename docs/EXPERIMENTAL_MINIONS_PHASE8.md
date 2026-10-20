> **2026-10-12 更新注記:** この文書には旧版の表示漢字が含まれる場合があります。現在の漢字と重複解消の対応表は `CHARACTER_CATALOG_AUDIT.md` を参照してください。

# Experimental Minions — Phase 8 (2026-10-12)

This update extends the Phase 7 experimental-Demon build and adds **Boffin, Boomdandy, Fearmonger, Harpy, and Marionette**, exclusively to the **custom script maker**. The three official editions and existing experimental roles remain intact; Atheist remains excluded. UI text is Japanese, while RoleIds, tags, event kinds and storage fields remain in English.

## Roles and behavior

| RoleId | Japanese UI | Implementation |
| --- | --- | --- |
| `boffin` | ボフィン・博 | Makes the Demon a plausible source of a *not-in-play good ability*. Public Slayer and Virgin successes are no longer hard confirmation of a good character when Boffin is on the script. Candidate worlds grant a recorded or sampled unused good ability to the Demon, including public Virgin/Slayer trigger checks and supported good-character information. The borrowed ability is unaffected by the Demon's own poison/drunkenness; the Boffin's impairment/suppression/death can stop it. The Demon and Boffin self-modes allow the granted ability to be saved. |
| `boomdandy` | ブームダンディ・爆 | When executed, the current revised rule leaves **three survivors**, followed by a **10-to-1 point at a surviving player**; the plurality dies, a tie kills no extra player. In 推理, first record the actual nomination/execution, then record the three initial survivors and pointing result. A single explosion record creates linked ability-death records and may be removed with its linked deaths. An execution can trigger the explosion even when Boomdandy itself survives. The world evaluator checks whether the explosion and its survivors are mechanically compatible, including keeping a Demon among initial survivors. |
| `fearmonger` | フィアモンガー・恐 | 推理 contains an explicit **フィアモンガー警戒** checkbox. When enabled, nomination advice shifts to HOLD and displays the fear of losing if the Fearmonger personally nominates and executes the selected player; it also warns about Goblin and Boomdandy execution risks. This is *risk mitigation*, not proof of a Fearmonger or its target. When you play Fearmonger, you can record the chosen player by night. Recorded successful nominations/executions produce the corresponding team loss in the mechanical evaluator. |
| `harpy` | ハーピー・鳥 | Minion mode records the two nightly players: the affected person and the person they must be mad is evil. A player card offers a special **ハーピーに選ばれたという報告** entry, with target, phase, text and visibility. This creates an `abilityClaimLog` victim report with `affectedByHarpy: true`, *not* a Harpy role claim. Harpy-caused day deaths are checked against eligible Harpy actors and the recorded targets when the action is known. |
| `marionette` | マリオネット・糸 | Real evil Minion beside the Demon in the **initial seating ring**. Can believe that they have a not-in-play Townsfolk/Outsider token; the fake good ability has no effect. The candidate-world generator supports hidden role tokens without changing actual evil alignment, while Demon mode records the known adjacent Marionette seat as a direct lock. A false public cover claim does not become a mechanical claim of the player's true character. |

## UI and saved-game additions

- Snapshot fields: `fearmongerActive?: boolean`, `boomdandyLog?: BoomdandyEvent[]`.
- `BoomdandyEvent` includes `when`, `executedPlayer`, exactly three `survivors`, `pointedPlayer`, and `tied`; automatic death logs share a `sourceEventId` to allow grouped undo.
- Optional `DemonState.knownMarionette` and `DemonState.boffinGrantedAbility`, `MinionState.boffinGrantedAbility`.
- New Minion actions: Fearmonger nightly `choose`, Harpy nightly `madness_pair`.
- Harpy victim reports use `AbilityClaimEvent.affectedByHarpy`, and intentionally bypass creation of a Harpy role claim.
- Older snapshots missing all these optional fields remain valid. Malformed phase-8 structured data is rejected at import.

## Reasoning and modeling limitations

- A Boffin **possible on the script** prevents treating a public good-ability trigger as infallible proof. That does not mean Boffin is confirmed or that every good power/interaction is exhaustively simulated. The explicit grant is chosen among good roles from the active script and must not already be in the sampled setup; some active, copied, or post-setup role-change abilities remain approximate.
- Boomdandy's storyteller choice of three survivors and pointing tally must be entered. The UI records the *outcome*, not ten sequential physical gestures. Mass deaths recorded as one bundle are replayed as timeline events; custom death protection, exotic interactions and all jinxes are not exhaustively modeled.
- Fearmonger mode is deliberately **opt-in** in 推理. It decreases execution advice, not the underlying numeric alignment probabilities, and cannot infer the secret target from public behavior alone. Change announcements and persuasion still require human judgment.
- Harpy madness is voluntary behavior judged by the Storyteller. The app records the report, private selections when known, and explicitly attributed deaths but does not decide whether a player's statements satisfied the madness condition.
- Marionette false tokens are sampled among the script's good unused characters, and initial-Demon adjacency is enforced. Late character swaps, registration exceptions, and every special-script jinx are not exhaustive.
- All sampled percentages describe explored candidate worlds, **not guarantees**. Confirm what the Storyteller publicly established before applying hard deductions.

## Verification

- Baseline experimental-Demon Phase 7: **276 / 276 passed**.
- Phase 8: **301 / 301 passed** (**25 new tests**).
- Strict engine TypeScript compile: passed.
- Offline full TypeScript/TSX source structural check with **test-only React declaration shim**: passed. This is not a successful native Windows Vite build.
- ZIP integrity and included file manifest verified before delivery. Physical Android testing and an installed React/Vite build have **not** been performed in this environment.

## Install

Back up `src` in the existing Windows React/Vite Clocktower project. Replace it with this ZIP's `src`, keeping your existing `package.json`, `node_modules`, Android settings and project files. Run `npm run dev` or `npm run build` in that existing project. This ZIP contains source code, **not an APK**.
