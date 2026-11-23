// Plain TypeScript: no Phaser imports allowed in src/core/.
import { strings } from './validate';

const KEYS = ['title', 'tagline', 'startLabel'] as const;

export type GameInfo = Record<(typeof KEYS)[number], string>;

/** Validates raw JSON from src/data/game.json and returns it typed. Throws on bad data. */
export function parseGameInfo(raw: unknown): GameInfo {
    return strings(raw, KEYS, 'game');
}
