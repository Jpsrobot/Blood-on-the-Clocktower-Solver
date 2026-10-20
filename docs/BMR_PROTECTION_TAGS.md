# BMR protection tag split

The app now distinguishes two broad protection categories:

- `PREVENTS_DEATH`: the role can broadly stop a death or suppress the normal source of a death. Current examples are Monk, Soldier, Sailor, Exorcist, Innkeeper, Tea Lady, Fool, and Zombuul.
- `PREVENTS_EXECUTION_DEATH`: the execution still happens, but the role can specifically make the executed player survive it. Current examples are Sailor, Tea Lady, Fool, Pacifist, and Devil's Advocate.

This distinction matters for BMR because **executed** and **died** are separate facts. A future first-class execution event should therefore record both:

```text
executed: yes
died: yes/no
```

When an execution occurs without death, generic reasoning should consider both general `PREVENTS_DEATH` effects and execution-specific `PREVENTS_EXECUTION_DEATH` effects, then let the exact character evaluator decide whether each explanation is legal.


Sailor, Tea Lady, and Fool intentionally have **both** tags: their abilities can prevent death generally, and that protection can also make an executed player survive. Pacifist and Devil's Advocate use only the execution-specific tag because their relevant protection is tied to execution.
