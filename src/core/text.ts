// Plain TypeScript: no Phaser imports allowed in src/core/.

/** Replaces {name} placeholders with values. Unknown placeholders are left as they are. */
export function formatText(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in values ? String(values[key]) : match
    );
}

/** Seconds as m:ss, rounding up so the display only reads 0:00 when time is really up. */
export function formatTime(seconds: number): string {
    const total = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
