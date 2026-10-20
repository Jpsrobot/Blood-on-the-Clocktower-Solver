# Self menu merge and current script architecture

## Self menu change

The self button is now a single hub. The old `自分の会話・指名・状態` intermediate menu is removed.

The self hub directly exposes:

- `自分の役職` — the token/actual-role input used by the solver.
- `自分の情報` — direct information actually received by the user.
- `自分の行動` — direct character actions such as Monk/Slayer.
- `自分の役職主張` — what the user is socially claiming to other players.
- `自分の情報主張` — structured information the user publicly/privately reports.
- `自分の能力主張` — generic ability claim entry.
- `指名`, `会話`, `状態・死亡`.
- Demon/Minion mode when applicable.

The player-name editor is not shown for `self`. Other seats keep their optional name field.

After a self claim/report/action form is saved or backed out of, the UI returns to the self hub instead of dropping the user into the generic player menu.

## Script system as of this build

The application does not yet have a generic script registry or JSON script importer.

`App.tsx` stores a string `playset`. The setup screen currently offers only `trouble_brewing`.

`currentScriptRoleIds` is currently selected with a hard-coded check:

```ts
playset === "trouble_brewing" ? TROUBLE_BREWING_ROLE_IDS : []
```

`TROUBLE_BREWING_ROLE_IDS` is currently defined as every key in `ROLES`:

```ts
export const TROUBLE_BREWING_ROLE_IDS: RoleId[] = Object.keys(ROLES) as RoleId[];
```

Today this works because `ROLES` only contains Trouble Brewing characters. It should be refactored before adding another script, because adding future roles to `ROLES` would otherwise accidentally add them to Trouble Brewing too.

`ROLES` provides display and generalized metadata such as role type, tags and night speed. The UI uses the current script role list to populate role pickers, claim choices, self-role choices and evil-mode bluff choices.

The solver is more tightly tied to Trouble Brewing than the UI. Files under `src/engine/` contain explicit logic for characters such as Chef, Empath, Fortune Teller, Drunk, Recluse, Spy, Poisoner, Baron, Scarlet Woman and Imp. Therefore adding a role ID to a script does not automatically teach the solver that character's mechanics.

Snapshot validation also currently requires:

```ts
playset === "trouble_brewing"
```

So imported/saved games are presently Trouble Brewing only.

## Recommended next script refactor

Before adding another official or custom script, introduce an explicit script registry, for example:

```ts
type ScriptDefinition = {
  id: string;
  name: string;
  roles: RoleId[];
};

export const SCRIPTS = {
  trouble_brewing: {
    id: "trouble_brewing",
    name: "Trouble Brewing",
    roles: [/* explicit TB role ids */],
  },
};
```

Then separate "role is allowed on this script" from "solver knows this role's mechanics". This will let the app display/import a future script even if some characters are not solver-aware yet, while clearly marking unsupported mechanics instead of silently reasoning about them incorrectly.
