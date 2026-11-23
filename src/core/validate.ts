// Plain TypeScript: no Phaser imports allowed in src/core/.
// Small helpers for checking raw JSON. Each throws with a path to the bad value.

export type Raw = Record<string, unknown>;

export function obj(value: unknown, path: string): Raw {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`${path} must be an object`);
    }
    return value as Raw;
}

export function arr(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
    return value;
}

export function str(raw: Raw, key: string, path: string): string {
    const value = raw[key];
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${path}.${key} must be a non-empty string`);
    }
    return value;
}

export function num(raw: Raw, key: string, path: string): number {
    const value = raw[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`${path}.${key} must be a number`);
    }
    return value;
}

export function int(raw: Raw, key: string, path: string, min: number): number {
    const value = num(raw, key, path);
    if (!Number.isInteger(value) || value < min) {
        throw new Error(`${path}.${key} must be an integer >= ${min}`);
    }
    return value;
}

export function bool(raw: Raw, key: string, path: string): boolean {
    const value = raw[key];
    if (typeof value !== 'boolean') throw new Error(`${path}.${key} must be true or false`);
    return value;
}

/** Checks that every key in `keys` is a non-empty string and returns just those keys. */
export function strings<K extends string>(value: unknown, keys: readonly K[], path: string): Record<K, string> {
    const raw = obj(value, path);
    const out = {} as Record<K, string>;
    for (const key of keys) out[key] = str(raw, key, path);
    return out;
}
