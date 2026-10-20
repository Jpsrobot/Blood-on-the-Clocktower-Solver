# Unified reported information entry

The player you tap is always the **speaker**.

`情報を記録` now covers both the old structured information report flow and the old generic ability-claim flow.

## Fields

1. **元の人** — the player whose ability/information is actually being described (person A).
2. **元の人の役職** — A's claimed/reported character.
3. **Role-specific information** — structured controls for Washerwoman, Librarian, Investigator, Chef, Empath, Fortune Teller, Undertaker, and Ravenkeeper.
4. For other roles, optional targets and a free-text `情報 / 内容` field are used.
5. **発言された時** and public/private audience are recorded separately from the ability/information timing.

If the speaker and `元の人` are the same player, saving the entry can still auto-create their exact role claim when none exists yet. If the speaker is relaying information about somebody else, the app does **not** silently convert that other player into an exact role claimant.

The underlying `abilityClaimLog` storage key remains unchanged for backward compatibility with existing saves, but the UI now calls these entries `情報記録`.

Free-text entries are valid records and are not treated as input errors. They are stored for history/evidence review, but are only mechanically interpreted when a dedicated role evaluator understands them.
