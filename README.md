# lwc-component

Use this to create a lwc component

```bash
npx lwc-component
```

Then answer a few questions...

- `namespace` (skipped if there is only one found `src/modules/<ns>`)
  - Add an empty namespace folder to get this option.
- `component` name (the point of this script)
- `css` (Yn)
- `unit` Tests (yN)
- `wdio` Tests (yN)

Done, you now have a nice empty component!

> If a TypeScript `tsconfig.json` is found we will assume `.ts`.

## Features

- Default if only one namespace is found.
- Convert `foo-bar` to `fooBar`.
- Validate component name.
- Validate component already exists.