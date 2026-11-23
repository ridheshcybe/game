# AFTER-ACTION

2D browser game. The player is a member of a secret cleanup crew. After a classified
operation they investigate the scene, build a timeline from clues, and choose which few
items to secretly preserve before the team destroys everything. They win by reconstructing
the truth accurately, preserving the right evidence, and not raising the team's suspicion.

Stack: Phaser 4, TypeScript, Vite, Vitest.

## Rules

1. **Keep it simple.** No libraries beyond Phaser, TypeScript, Vite (and Vitest for tests).
   Do not add dependencies.
2. **Content lives in JSON.** All game content (sites, clues, timeline events, endings, UI
   strings) lives in JSON files in `src/data/`. Never hardcode content in scenes or core code.
3. **Logic lives in `src/core/`.** Timeline checking, scoring, suspicion, timer and data
   validation are plain TypeScript modules with **no Phaser imports**, so they can be unit
   tested with Vitest. Put tests next to the module as `*.test.ts`.
4. **Scenes stay thin.** Phaser scenes in `src/scenes/` do rendering and input only. They read
   data from `src/data/`, call functions in `src/core/`, and draw the result.
5. **Placeholder art only.** Colored rectangles and text. No images, audio, fonts or other
   external assets.
6. **After every change**, run the type check and the build and fix all errors:
   ```bash
   npm run typecheck && npm run build
   ```
   Also run `npm test` when anything in `src/core/` or `src/data/` changed.

## Layout

```
index.html            entry page (mounts #game-container)
public/style.css      page styling
vite/                 Vite configs (dev / prod), as in the official Phaser template
src/main.ts           DOM entry, calls StartGame
src/game.ts           Phaser game config and scene list
src/scenes/           Phaser scenes (thin: render + input)
src/core/             pure game logic, no Phaser
src/data/             JSON game content
```

## Scripts

- `npm run dev` – dev server on http://localhost:8080
- `npm run build` – type check + production build to `dist/`
- `npm run typecheck` – `tsc --noEmit`
- `npm test` – Vitest (single run); `npm run test:watch` for watch mode

## Conventions

- JSON imported into scenes goes through a validating parser in `src/core/`
  (see `parseGameInfo` in `src/core/gameInfo.ts`) so bad data fails loudly.
- Register new scenes in `src/game.ts`.
