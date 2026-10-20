# Experimental characters phase 1

## Scope

This update adds four experimental characters as ordinary `RoleId` values:

- `acrobat` — 軽業師
- `alchemist` — 錬金術師
- `alsaahir` — アルサーヒル
- `amnesiac` — 記憶喪失者

They are intentionally absent from `BUILT_IN_SCRIPTS`. They are included in `ALL_CORE_ROLE_IDS`, so the custom script maker can select them.

Internal IDs, `RoleTag` strings, event kinds, storage keys, and solver metadata remain English. Japanese is used only for rendered user-facing text.

## Acrobat

- N2+ self-action records one target and whether the Acrobat died.
- Candidate worlds require a healthy Acrobat to die when the chosen player is drunk or poisoned that night.
- The actual `drunk` character counts as drunk for this check.
- A drunk/poisoned Acrobat does not have to die from its own ability.
- A recorded Acrobat death is stored as an ability death linked to the self-action.

## Alchemist

- The self panel lets the user choose a Minion character that is on the frozen custom script.
- The chosen character is stored as the Alchemist's Minion ability; the Alchemist remains a good Townsfolk.
- Setup-changing Minion abilities use the existing `OUTSIDER_COUNT_MODIFIER` metadata. For example, an Alchemist with Baron changes Outsider count by +2.
- A copied setup ability is an additional ability and may stack with the same real Minion ability in play.

Current boundary: choosing a non-setup Minion ability records the granted ability exactly, but this phase does not proxy every Minion-specific action UI or evil-team private-information mode through the Alchemist. This avoids falsely granting Demon/Minion knowledge to a good Alchemist.

## Alsaahir

- One public guess can be recorded per day.
- Minion and Demon player sets are entered separately.
- Candidate worlds compare the guess against the players' current characters at that day, so character changes are respected.
- If a healthy Alsaahir's guess is exact, the game must be recorded as a good Alsaahir win.
- A poisoned/drunk Alsaahir may fail with an otherwise exact guess.
- Travellers are outside the normal seated-role solver and are not included in the Minion/Demon sets.

## Amnesiac custom tag helper

This app intentionally implements the user's guided tag-discovery workflow rather than trying to parse arbitrary Storyteller ability prose.

1. Start with every Townsfolk on the current custom script except Amnesiac itself.
2. For each unused supported `RoleTag`, split the current candidates into roles that have/do not have the tag.
3. Recommend the tag with the smallest split-size difference, i.e. as close to 50/50 as possible.
4. Record the Storyteller answer as matching / not matching.
5. Filter candidates and repeat.
6. The user may lock any remaining Townsfolk as the current ability hypothesis.

The tag strings remain English internally. The question and tag descriptions are rendered in Japanese.

If the locked hypothesis is an information role, the existing self-information form can be reused and the solver recognizes that information as coming from the Amnesiac ability. Active-action role automation is deliberately not proxied in this phase; locking Slayer, Monk, etc. is a hypothesis, not permission to run the original character's dedicated action machinery automatically.
