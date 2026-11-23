// Plain TypeScript: no Phaser imports allowed in src/core/.

export interface GameInfo {
    title: string;
    tagline: string;
    startLabel: string;
    notBuiltMessage: string;
}

const REQUIRED_KEYS: (keyof GameInfo)[] = ['title', 'tagline', 'startLabel', 'notBuiltMessage'];

/** Validates raw JSON from src/data/game.json and returns it typed. Throws on bad data. */
export function parseGameInfo(raw: unknown): GameInfo {
    if (typeof raw !== 'object' || raw === null) {
        throw new Error('game info must be an object');
    }
    const record = raw as Record<string, unknown>;
    for (const key of REQUIRED_KEYS) {
        const value = record[key];
        if (typeof value !== 'string' || value.trim() === '') {
            throw new Error(`game info is missing a non-empty string "${key}"`);
        }
    }
    return {
        title: record.title as string,
        tagline: record.tagline as string,
        startLabel: record.startLabel as string,
        notBuiltMessage: record.notBuiltMessage as string
    };
}
