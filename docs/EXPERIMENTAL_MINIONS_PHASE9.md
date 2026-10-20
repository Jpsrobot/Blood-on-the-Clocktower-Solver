> **2026-10-12 更新注記:** この文書には旧版の表示漢字が含まれる場合があります。現在の漢字と重複解消の対応表は `CHARACTER_CATALOG_AUDIT.md` を参照してください。

# Experimental Minions — Phase 9 (2026-10-12)

This update adds **Mezepheles, Organ Grinder, Psychopath, Summoner, Widow, Wizard, Wraith, and Xaan** to the existing Japanese Blood on the Clocktower solver. They appear only in **custom scripts**, with Atheist still omitted. RoleIds, RoleTags, event kinds, JSON keys and other internal metadata remain English; all user-facing controls are Japanese.

## New characters

| Internal RoleId | Japanese display | Symbol | Implementation |
|---|---|---|---|
| `mezepheles` | メゼフェレス | 言 | A self Minion record for first secret-word utterance and an observed target becoming evil at the next night. Good-to-evil behavior-change reports in 推理 are weak evidence for Mezepheles, *not proof*. The solver tracks actual alignment separately from role identity and other registration exceptions. One use only. |
| `organ_grinder` | オルガングラインダー | 奏 | 推理 has a per-day secret/normal voting record. Secret voting leaves voter identities and vote totals unknown, not zero. A Flowergirl report based on those unknowable votes must not eliminate either yes/no explanation. Minion mode records the nights Organ Grinder chose to become drunk. |
| `psychopath` | サイコパス | 凶 | Daytime public kill events and an explicit `psychopath` death reason, automatically linked to allow one-operation undo. Verified kills require a valid active Psychopath in the candidate world. A missing public Day 1 claim reduces but never excludes Psychopath scenarios **after Day 1 has passed**. |
| `summoner` | 召喚者 | 喚 | A distinct start-of-game candidate setup with **zero Demon players** and one extra Townsfolk, maintaining normal Minion count and other compatible setup modifiers such as Baron. A healthy live Summoner creates an evil Demon on N3, with self-mode exact character and seat choices. A Summoner death before N3 is a good win. Quiet early nights weakly support Summoner. |
| `widow` | ウィドウ | 寡 | Hidden or recorded N1 poison target, continuing while an active Widow is alive and unimpaired. In 推理 a player's claim to have been notified of Widow in play weakly increases Widow candidate weight. This does not hard-confirm a Widow. |
| `wizard` | ウィザード | 願 | Private wish, granted/rejected outcome, cost and observations as free-text records. The solver deliberately does **not** infer unseen Storyteller effects. |
| `wraith` | レイス | 幽 | Private notes from observing evil players at night. No automatic mechanical deductions invented from a hidden nighttime observation. |
| `xaan` | ザーン | 惨 | The initial Outsider count is an explicit setup variable `X`. On N_X through D_X, all Townsfolk are poisoned if an active healthy Xaan is present; X=0 never triggers. Several poisoned information records in that cycle raise Xaan's relative weight, while later sober information stays valid. |

## User interface and persistence

- 推理 now contains Japanese report controls for Widow notification, Mezepheles-like behavior changes, unknown/normal Organ Grinder voting by day, and Psychopath's public daytime kill. Summoner, Xaan, Wizard and Wraith show appropriately qualified explanations instead of spurious hard confirmations.
- Self Minion-mode panels support the appropriate recorded ability or notes for all eight roles.
- Psychopath deaths use the new `DeathReasonId` `psychopath`. Linked public-kill and death entries are removed together; other death and execution reasons remain unaffected.
- New optional snapshot arrays are `widowReports`, `evilBehaviorReports`, `psychopathEvents`, `organGrinderVotes`. New optional `MinionState` properties are `summonedDemon`, `organGrinderDrunkNights`, `widowPoisonedPlayer`, `wizardWish`, and `wraithNotes`. New `MinionActionEvent` variants are `mezepheles/secret_word` and `psychopath/public_kill`.
- All new imports receive type, seat, phase, unique-ID, and active-script checks. Old saved games without these optional fields are still valid.

## Mechanical vs. behavioral inference

**Hard constraints:** Summoner cannot have a starting Demon, creates one on N3, and has a special loss condition; Mezepheles's explicitly recorded successful conversion changes alignment on the timeline; a verified Psychopath death needs a valid actor; Xaan's cycle-X poison can explain otherwise impossible good-character information; Widow's persistent poison can explain information while the Widow remains active. These operate inside each sampled candidate world.

**Soft indicators:** Public talk about Widow, changed behavior, hidden voting, quiet early nights, a missing Day 1 Psychopath claim, and several Xaan-compatible impaired reports alter search weights without ruling out alternative explanations. The UI distinguishes observations and suspicions from confirmed character/alignments.

**Manual Storyteller-dependent information:** Wizard wishes, Wraith sightings, Organ Grinder nighttime drunkenness, the exact initial Widow target, Psychopath failed kill protections, and unobserved Mezepheles word utterances cannot be fully reconstructed. They are recorded when known, without inventing hidden facts.

**Additional limitations:** Summoner Night 3 sampling explores a capped subset of plausible unrecorded Demon seats/characters for performance. As with existing complex scripts, rare interactions with exotic jinxes, Traveller effects, Lil' Monsta and Pit-Hag may need further work. The sampler represents sampled candidate histories, not mathematical posterior probabilities.

## Verification

- Baseline prior release: **301/301** tests passing.
- Current phase: **320/320** tests passing (**19 added**).
- Strict engine TypeScript compilation: passed.
- Full offline TS/TSX structural compilation with a **test-only** React declaration shim: passed.
- Source ZIP integrity and manifest: checked when packaging.
- Running actual Windows Vite `npm run build`, click-testing in a browser, and physical Android testing are still **not** done in this environment.

## Install

Back up the `src` folder in your existing Windows React + TypeScript + Vite Clocktower project. Replace that folder with the archive's `src` folder. Keep `package.json`, `node_modules`, Android project files and other configuration unchanged; run `npm run dev` or `npm run build` in the existing project. This archive is a source update, not an APK.
