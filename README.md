# AFTER-ACTION

A 2D browser game about a secret cleanup crew. After a classified operation you inspect the
scene, rebuild the timeline from clues, and secretly keep a few items before the crew burns
everything, without letting the crew notice.

Built with Phaser 4, TypeScript and Vite. Tests use Vitest. All art is placeholder rectangles
and text, and all sound is synthesized with the Web Audio API.

## Run it

```bash
npm install
npm run dev        # http://localhost:8080
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type check, then production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest, single run) |
| `npm run test:watch` | Unit tests in watch mode |

`dist/` is a static site; serve it from any web server. The game scales to any window size
and works with mouse or touch. Progress is saved in the browser's `localStorage`.

## How to play

1. **Assignments**: pick a site. Each site starts with some suspicion carried over from the others.
2. **Investigation**: tap spots to inspect them, then **Log clue**. Cleanup waves burn parts of
   the scene; a warning appears 10 seconds before each one.
3. **Timeline Board**: drag logged clues into numbered slots, one slot per event, in the order
   things happened. Several clues can share a slot. The **Confidence** meter only says Low,
   Medium or High.
4. **Preserve** tab: tap items to slip them into your bag (limited slots). Preserved items survive the waves.
5. **Submit report**, or let the timer run out. The site ends **Exposed**, **Leaked**, **Buried**
   or **Caught**.

The crew grows suspicious if you keep one clue open for too long, grab more than one key piece
of evidence early, or keep checking your bag. At 100 suspicion you are caught.

## Add a new site (JSON only)

1. Copy `src/data/site2.json` to `src/data/site3.json` and edit it (format below).
2. Add it to `src/data/sites.json`, in the position it should appear in the campaign:
   ```json
   { "id": "site3-yourplace", "file": "site3.json" }
   ```
   The `id` must match the `id` inside the site file.
3. Run `npm test`. The content tests check that the file parses, that the ids match, that
   essential clues fit in the slots, and that every hotspot is on screen.

No code changes are needed. The Mission Select screen comfortably fits about three sites.

## Data format reference

All content lives in `src/data/`. Every file is validated on load; mistakes throw an error
naming the exact field (for example `site.clues[3].hotspot must have positive w and h`).

### Site file (`site1.json`, `site2.json`, ...)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique. Must match the entry in `sites.json`. |
| `title` | string | Shown on Mission Select, in the scene and on results. |
| `briefing` | string | Shown on Mission Select. |
| `cleanupDurationSeconds` | number > 0 | The countdown. The site ends when it reaches 0. |
| `preservationSlots` | integer >= 1 | How many items the player can keep. |
| `truthEvents` | array | What really happened, in order. The timeline has one slot per event. |
| `clues` | array | See below. |
| `cleanupWaves` | array | Sorted by `atSecond`. See below. |

**Truth event**: `{ "id": string, "text": string }`

**Clue**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique within the site. |
| `name` | string | Short label on the hotspot and card. |
| `description` | string | Shown in the inspection panel. |
| `location` | string | Shown in the inspection panel. |
| `timeIndex` | integer | Index into `truthEvents` (0 = first): when this really happened. |
| `personId` | string | Who the clue is about. |
| `isEssential` | boolean | True if it exposes the truth. All essentials must fit in `preservationSlots`. |
| `hotspot` | `{ x, y, w, h }` | Pixels on the 1024x768 screen. Keep `y >= 100` and `y + h <= 690` (top bar, bottom button). |

**Cleanup wave**: `{ "atSecond": number, "clueIds": string[] }`. Seconds after the start (at
most the duration). Every listed clue not preserved by then is destroyed.

### `sites.json`

`{ "sites": [ { "id": string, "file": string } ] }`: the campaign, in order.

### `endings.json`

- `site.exposed | leaked | buried | caught`: `{ "name", "narrative" }`, shown on the results screen.
- `campaign`: a list of `{ "id", "name", "narrative" }` with optional conditions
  `minReputation`, `maxReputation`, `minTotalSuspicion`, `maxTotalSuspicion`. The first entry
  whose conditions all hold wins. The last entry must have no conditions (the fallback).

How a site ending is chosen:
1. **Caught**: suspicion reached `rules.endings.caughtAtSuspicion`.
2. **Exposed**: every essential clue preserved, and timeline accuracy >= `rules.endings.exposedMinScore`.
3. **Leaked**: at least one essential clue preserved.
4. **Buried**: no essential evidence survived.

Timeline accuracy is the percentage of clue pairs whose slots are in the same order as their
true events. Unplaced clues count as wrong.

### `rules.json` (tuning)

| Field | Meaning |
| --- | --- |
| `waveWarningSeconds` | How early the wave warning appears. |
| `endings.caughtAtSuspicion`, `endings.exposedMinScore` | See endings above. |
| `confidence.mediumFrom`, `confidence.highFrom` | Accuracy cutoffs for the Confidence meter. |
| `suspicion.lingerSeconds`, `lingerAmount` | Each full `lingerSeconds` with one clue open adds `lingerAmount`. |
| `suspicion.earlyPreserveFraction`, `earlyEssentialAmount` | Preserving an essential clue before this fraction of the timer, while already holding one, adds `earlyEssentialAmount`. |
| `suspicion.freePreservePanelOpens`, `preservePanelAmount` | Opening the Preserve tab more times than this adds `preservePanelAmount` each time. |
| `suspicion.crewMessages` | `[{ "at", "text" }]`: a crew line shown when suspicion crosses `at`. |
| `suspicion.carryOverFactor`, `maxCarriedSuspicion` | A site starts with this share of the other sites' suspicion, capped. |
| `reputation.byEnding` | Reputation per site ending. |
| `reputation.accuracyBonusPer` | +1 reputation per this many accuracy points (not when caught). |

### `ui.json` and `game.json`

Every on-screen string, grouped by screen. `{name}` placeholders are filled in by the game.

## Project layout

See [CLAUDE.md](CLAUDE.md) for the project rules and a file-by-file map.
