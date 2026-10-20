# Game logs and reasoning engine

## Game log archive

The app now keeps a separate multi-game archive in browser localStorage.

Each archived game stores:
- the complete `GameSnapshot` (claims, structured reports, nominations, votes, talks, deaths, self info/actions, reads, completeness flags, names and status),
- whether the archive was a mid-game snapshot or an ended game,
- an editable result (`unknown`, Good win, Evil win),
- an editable review note,
- a compact copy of the solver summary that existed when the archive was created,
- up to eight representative top worlds from the saved solver result.

The raw snapshot is the important part. When an old game is loaded later, the current solver can re-run it from scratch, so future engine improvements can be tested against old games instead of being limited to the reasoning version that existed when the game was played.

The archive is capped at 40 local entries to reduce the chance of exhausting localStorage. Use **全ログを書き出す** periodically if the archive matters. The exported file is deliberately data-oriented so a later cross-game analysis tool can read it.

**Menu routes**
- `現在のゲームをログに保存`: save a mid-game archival copy.
- `ゲーム終了`: save the active snapshot and automatically add a finished archive entry.
- `ゲームログ`: browse archives, record winner and notes, export/delete, reload a game, or reload it directly into Possible Worlds.
- Home also has `ゲームログ` so old games can be reviewed without resuming the latest active save.

## Possible Worlds shortcut

`メニュー -> 候補盤面を確認` opens the reasoning sheet directly on the candidate-world tab.

That tab now also has normal and deeper search buttons plus the current search counts. The worlds shown are representative high-weight candidates from the bounded search, not a proof that every omitted world is impossible.

## Reasoning architecture

The engine intentionally has two mostly separate layers:

1. **Mechanical candidate worlds** answer: "Can this setup/history explain the entered observations under the modeled Trouble Brewing rules?"
2. **Evidence summaries** answer: "What useful warnings, corroborations, inconsistencies and weak meta patterns are visible in the recorded data?"

Keeping those separate prevents a suspicion point from automatically becoming a game rule.

### 1. Generate legal starting assignments

The sampler first builds standard 5-15 player Trouble Brewing setups.

- Player-count setup numbers are enforced.
- Baron, when sampled, shifts two Townsfolk slots into Outsider slots.
- Roles are unique.
- The Demon is the Imp in the starting assignment.
- A successful public Virgin/Slayer event can hard-lock that acting player's role.
- Your shown Townsfolk token can instead represent the Drunk; the shown Townsfolk then cannot simultaneously exist as another actual character in that setup.

Normal claims do **not** hard-lock roles. They only guide the search so plausible claim-matching assignments are explored more often. Legal good-player bluff worlds retain non-zero search weight.

### 2. Add hidden per-world choices

For every sampled setup, the evaluator branches over hidden state that matters to the observations:

- Fortune Teller red herring (when a Fortune Teller exists),
- the Drunk's fixed believed Townsfolk role,
- Poisoner target/no-target choices by cycle,
- Demon succession when a modeled trigger occurs.

The Drunk's believed role is fixed within a world; it is not allowed to become a different Townsfolk every time the player reports information.

### 3. Replay the recorded timeline

The evaluator then walks N1/D1/N2/D2 in order.

Recorded deaths, nominations, public ability triggers and structured information are checked in historical order. The `completedNights` and `noExecutionDays` flags matter because an empty input list means "unknown/incomplete" unless the user explicitly says the phase is complete.

Important modeled constraints include:
- one Poisoner choice per cycle,
- Soldier immunity to an ordinary healthy Imp attack,
- known self-Monk protection,
- Virgin first-nomination behavior,
- Slayer success/failure possibilities,
- Saint execution ending the game when healthy,
- Scarlet Woman takeover at the modeled threshold,
- Imp self-kill succession to a living Minion,
- Demon death / two-alive / Mayor terminal checks,
- no continued information from dead information roles except the modeled death-trigger case.

### 4. Evaluate information

Every structured information observation is classified per surviving world as one of:

- `works`: ordinary correct information,
- `registration`: explained by Spy/Recluse registration,
- `poison`: the source must be poisoned for the world to work,
- `drunk`: the source is the Drunk believing that information role,
- `bluff`: the speaker is another role presenting that ability,
- `lie`: a reported result must be false/corrected for the world to survive,
- `missing`: the related event has not been fully recorded yet.

Direct self information is treated more strictly than somebody else's report. A directly observed result that cannot exist in the candidate history rejects that branch unless Drunk/poison/registration explains it. A reported result may survive as a lie or bluff, but gets a weighting penalty.

Role-specific checks currently include:
- Washerwoman/Librarian/Investigator pair-role information,
- Librarian "no Outsiders",
- Chef evil-adjacency range with per-pair Spy/Recluse registration,
- Empath living neighbours at that historical moment,
- Fortune Teller pair result, fixed red herring and Recluse registration,
- Undertaker against the previous execution,
- Ravenkeeper against a corresponding night death.

### 5. Weight compatible worlds

Surviving worlds are not counted equally. The current score is a heuristic log weight, not a probability model.

Examples:
- matching an exact role claim gets a sizeable positive weight,
- a Drunk matching the Townsfolk role they believe gets a positive weight,
- matching broad tag/type claims gets a smaller weight,
- a normally working reported info result gets a small positive weight,
- requiring a lie is strongly penalized,
- treating an ability report as a cover/bluff is mildly penalized,
- requiring a specific poison target has a small complexity penalty.

The optional meta toggle can add a very small amount of weight from broad patterns such as outsider-count pressure or precision-kill/Spy patterns. Those display/evidence points are deliberately capped so they cannot dominate mechanics.

### 6. Aggregate the sample

After evaluating the sampled worlds, their normalized weights produce exploratory shares for:

- each player's Evil share,
- current Demon share,
- Drunk share,
- role distribution,
- required Poison target by cycle,
- script-role presence,
- the explanation category for each information result.

`effectiveWorlds` measures how concentrated the total weight is. A search can contain many raw candidates while effectively depending on only a handful of heavily weighted ones.

The UI therefore suppresses strong automatic sample warnings unless there are at least 80 unique assignments and 20 effective worlds.

### 7. Separate evidence/warning layer

The evidence pass does not simply repeat the world percentages. It tracks interpretable facts/patterns such as:

- changed claims,
- a broad category claim later conflicting with an exact claim,
- duplicate exact-role claims,
- successful public Virgin/Slayer events,
- failed Virgin tests as an inconsistency worth explaining but not automatic Evil evidence,
- malformed/conflicting structured information,
- corroboration versus a possible shared information source,
- excess Outsider claims as weak Baron evidence,
- hidden early high-survival-value deaths as weak Spy evidence.

Ordinary talking and voting do **not** add Evil points by themselves. A conversation is mainly an information-provenance edge. Repeated copies of the same underlying report are deduplicated instead of becoming multiple independent confirmations.

### 8. Warning thresholds

When the sample is sufficiently broad:
- red: Evil share >= 0.80, provided there is some mechanical information/public-event support,
- blue: Drunk share >= 0.25,
- green cycle number: that player is required as the Poison target in >= 0.60 of the weighted sample for that cycle,
- orange: explicit input/claim inconsistency,
- yellow: a saved personal read conflicts with a public confirmation or strongly with the current candidate distribution.

The percentages shown are shares of the weighted candidates found by this bounded search. They are not calibrated real-world probabilities.

### 9. Action suggestions

Nomination/action guidance is deliberately conservative.

- If the sample is too small, the default is HOLD.
- Saint/Virgin/Mayor/final-three risks can override a tempting target and force HOLD.
- A current Demon concentration can create support-leaning guidance.
- Very low Evil/Demon concentration can create defend-leaning guidance.
- Monk targets prioritize valuable claimed good roles discounted by Evil share.
- Fortune Teller target pairs attempt to split the representative worlds roughly evenly, so the next YES/NO result is informative.

These are heuristic comparison tools, not optimal-play guarantees.

## Known boundaries

The candidate search is sampled and beam-limited, not exhaustive. Claims guide sampling. Several rare registration/succession interactions are intentionally outside the current model. Free-text notes are stored but are not interpreted as logic. Traveller and non-Trouble-Brewing scripts remain future work.
