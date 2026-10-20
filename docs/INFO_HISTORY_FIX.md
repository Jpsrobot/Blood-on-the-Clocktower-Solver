# Information entry and history fix

## Why `内容未記録` appeared

The app previously had two different routes that could both be used for an information character:

- the structured information route; and
- the generic free-text ability-claim route.

Only the structured route stores the fields the solver needs. An Investigator entered through the generic route therefore had the role and night but no pair/shown-Minion payload, so history displayed `内容未記録` and the solver could not mechanically use the missing detail.

## New routing

Information roles are now handled only by `情報主張`:

- Washerwoman
- Librarian
- Investigator
- Chef
- Empath
- Fortune Teller
- Undertaker
- Ravenkeeper

`その他の能力主張` excludes those roles. If the selected player already exactly claims one of them, tapping the generic ability button redirects to `情報主張`.

Older generic entries cannot be reconstructed automatically because the missing pair/number/result was never stored. They are labeled as legacy/detail-missing entries and can be deleted inline, then re-entered correctly.

## Deleting records

Player claim/info histories now show `削除` directly on each row. Your own `自分の情報` and `自分の行動` screens show `過去の情報` / `過去の行動` with the same inline delete control.

Deletion still uses the linked-event deletion system, so deleting the root of an automatically-created group also removes dependent generated records (for example an auto-created exact role claim).
