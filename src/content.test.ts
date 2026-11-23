import { describe, expect, it } from 'vitest';
import { content, getSite } from './content';

describe('content', () => {
    it('loads every site in sites.json in order', () => {
        expect(content.siteOrder).toEqual(['site1-warehouse', 'site2-safehouse']);
    });

    it('gives every site enough slots for its essential clues and at least one wave', () => {
        for (const id of content.siteOrder) {
            const site = getSite(id);
            const essential = site.clues.filter((c) => c.isEssential).length;
            expect(essential, id).toBeGreaterThan(0);
            expect(essential, id).toBeLessThanOrEqual(site.preservationSlots);
            expect(site.cleanupWaves.length, id).toBeGreaterThan(0);
        }
    });

    it('site2 is shorter and tighter than site1', () => {
        const s1 = getSite('site1-warehouse');
        const s2 = getSite('site2-safehouse');
        expect(s2.cleanupDurationSeconds).toBeLessThan(s1.cleanupDurationSeconds);
        expect(s2.preservationSlots).toBeLessThan(s1.preservationSlots);
        expect(new Set(s2.clues.map((c) => c.id)).size).toBe(s2.clues.length);
    });

    it('keeps every hotspot inside the play area (1024x768, below the top bar)', () => {
        for (const id of content.siteOrder) {
            for (const c of getSite(id).clues) {
                const { x, y, w, h } = c.hotspot;
                expect(x >= 0 && x + w <= 1024 && y >= 100 && y + h <= 690, `${id}/${c.id}`).toBe(true);
            }
        }
    });

    it('throws for unknown sites', () => {
        expect(() => getSite('nope')).toThrow(/unknown site/);
    });
});
