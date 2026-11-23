// Plain TypeScript: no Phaser imports allowed in src/core/.
import type { CleanupWave, Clue, Rect, Site, TruthEvent } from './types';
import { arr, bool, int, num, obj, str } from './validate';

/** Validates a site loaded from src/data/*.json. Throws with a readable path on bad data. */
export function parseSite(value: unknown): Site {
    const raw = obj(value, 'site');
    const truthEvents: TruthEvent[] = arr(raw.truthEvents, 'site.truthEvents').map((e, i) => {
        const path = `site.truthEvents[${i}]`;
        const r = obj(e, path);
        return { id: str(r, 'id', path), text: str(r, 'text', path) };
    });
    if (truthEvents.length === 0) throw new Error('site.truthEvents must not be empty');

    const clues: Clue[] = arr(raw.clues, 'site.clues').map((c, i) => parseClue(c, `site.clues[${i}]`));
    const ids = new Set<string>();
    for (const clue of clues) {
        if (ids.has(clue.id)) throw new Error(`duplicate clue id "${clue.id}"`);
        ids.add(clue.id);
        if (clue.timeIndex >= truthEvents.length) {
            throw new Error(`clue "${clue.id}" timeIndex ${clue.timeIndex} has no truth event`);
        }
    }

    const cleanupDurationSeconds = num(raw, 'cleanupDurationSeconds', 'site');
    if (cleanupDurationSeconds <= 0) throw new Error('site.cleanupDurationSeconds must be > 0');

    const cleanupWaves: CleanupWave[] = arr(raw.cleanupWaves, 'site.cleanupWaves').map((w, i) => {
        const path = `site.cleanupWaves[${i}]`;
        const r = obj(w, path);
        const atSecond = num(r, 'atSecond', path);
        if (atSecond <= 0 || atSecond > cleanupDurationSeconds) {
            throw new Error(`${path}.atSecond must be within the cleanup duration`);
        }
        const clueIds = arr(r.clueIds, `${path}.clueIds`).map((id, j) => {
            if (typeof id !== 'string' || !ids.has(id)) {
                throw new Error(`${path}.clueIds[${j}] is not a clue id in this site`);
            }
            return id;
        });
        return { atSecond, clueIds };
    });
    for (let i = 1; i < cleanupWaves.length; i++) {
        if (cleanupWaves[i].atSecond <= cleanupWaves[i - 1].atSecond) {
            throw new Error('site.cleanupWaves must be sorted by atSecond, ascending');
        }
    }

    return {
        id: str(raw, 'id', 'site'),
        title: str(raw, 'title', 'site'),
        briefing: str(raw, 'briefing', 'site'),
        cleanupDurationSeconds,
        preservationSlots: int(raw, 'preservationSlots', 'site', 1),
        clues,
        truthEvents,
        cleanupWaves
    };
}

function parseClue(value: unknown, path: string): Clue {
    const r = obj(value, path);
    return {
        id: str(r, 'id', path),
        name: str(r, 'name', path),
        description: str(r, 'description', path),
        location: str(r, 'location', path),
        timeIndex: int(r, 'timeIndex', path, 0),
        personId: str(r, 'personId', path),
        isEssential: bool(r, 'isEssential', path),
        hotspot: parseRect(r.hotspot, `${path}.hotspot`)
    };
}

function parseRect(value: unknown, path: string): Rect {
    const r = obj(value, path);
    const rect = { x: num(r, 'x', path), y: num(r, 'y', path), w: num(r, 'w', path), h: num(r, 'h', path) };
    if (rect.w <= 0 || rect.h <= 0) throw new Error(`${path} must have positive w and h`);
    return rect;
}
