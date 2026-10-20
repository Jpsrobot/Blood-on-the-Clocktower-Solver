# Empath stable-neighbour impairment heuristic

When consecutive Empath numbers change, the solver now checks whether the Empath had the same two living neighbours for both reads and whether either neighbour died between those reads.

If the number changed with the same two living neighbours and no nearby death, the pattern is treated as evidence for impairment rather than as an ordinary healthy Empath change.

Search weighting now prefers, in order:

- the Empath actually being the Drunk;
- a candidate history that already requires that Empath to be poisoned on one of the relevant nights;
- a smaller generic boost for worlds containing a character tagged `POISON_DRUNK_ABILITY`;
- a very small allowance for worlds containing `ALIGNMENT_CHANGING`, because a neighbour changing alignment can also alter a healthy Empath result on mixed scripts.

This is a heuristic only. It does not create an inconsistency warning and it does not hard-confirm Drunk or poison.

Direct self information receives a stronger boost than another player's reported Empath claim.
