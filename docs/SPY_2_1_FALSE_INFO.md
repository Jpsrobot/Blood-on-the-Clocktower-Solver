# v2.1 — Spy false-information strategy

The Spy advisor now tries to answer two questions together:

1. **What good role should I claim?**
2. **If that role gets information, what false information should I say?**

The recommendation is deliberately opponent-facing. Private evil knowledge is used only to define strategic objectives, never as evidence supplied to the opponent search.

## Metrics shown in the UI

- `成立配役` / `有効世界`: breadth of the role bluff.
- `味方デーモン席が善`: among supported opponent worlds, how often the real Demon seat is represented as good-aligned.
- `<player> がデーモン`: when a Saint/Goblin target is known, how often that dangerous seat is represented as a Demon.
- `この情報で残る世界`: how much of the represented opponent search survives the proposed fake information line.

All percentages are shares of the bounded candidate search, not real probabilities.

## Fake-information formats

- Washerwoman / Librarian / Investigator: two players + shown role.
- Chef / Empath: number.
- Fortune Teller: pair + YES/NO.
- Undertaker / Ravenkeeper / Grandmother: player + shown role.
- Chambermaid: pair + wake count.

The best information line is pinned separately from the overall role recommendation so a non-information role winning the main ranking does not hide the Spy's best fabricated information option.
