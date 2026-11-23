import { describe, expect, it } from 'vitest';
import site1 from '../data/site1.json';
import { parseSite, parseSiteList } from './site';
import { makeTestSite } from './testSite';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe('parseSite', () => {
    it('accepts site1.json and it matches the brief', () => {
        const site = parseSite(site1);
        expect(site.clues).toHaveLength(10);
        expect(site.truthEvents).toHaveLength(5);
        expect(site.preservationSlots).toBe(3);
        expect(site.cleanupDurationSeconds).toBe(180);
        expect(site.cleanupWaves).toHaveLength(3);
        const essential = site.clues.filter((c) => c.isEssential);
        expect(essential.length).toBeGreaterThan(0);
        expect(essential.length).toBeLessThanOrEqual(site.preservationSlots);
    });

    it('accepts the test site', () => {
        expect(parseSite(makeTestSite()).id).toBe('test');
    });

    it('rejects a missing field with its path', () => {
        const bad = clone(site1) as Record<string, unknown>;
        delete bad.title;
        expect(() => parseSite(bad)).toThrow(/site\.title/);
    });

    it('rejects duplicate clue ids', () => {
        const bad = clone(site1);
        bad.clues[1].id = bad.clues[0].id;
        expect(() => parseSite(bad)).toThrow(/duplicate/);
    });

    it('rejects a timeIndex with no truth event', () => {
        const bad = clone(site1);
        bad.clues[0].timeIndex = 99;
        expect(() => parseSite(bad)).toThrow(/timeIndex/);
    });

    it('rejects waves with unknown clues, bad times or wrong order', () => {
        const unknown = clone(site1);
        unknown.cleanupWaves[0].clueIds.push('ghost');
        expect(() => parseSite(unknown)).toThrow(/clue id/);

        const late = clone(site1);
        late.cleanupWaves[2].atSecond = 999;
        expect(() => parseSite(late)).toThrow(/atSecond/);

        const unsorted = clone(site1);
        unsorted.cleanupWaves.reverse();
        expect(() => parseSite(unsorted)).toThrow(/sorted/);
    });

    it('rejects bad hotspots', () => {
        const bad = clone(site1);
        bad.clues[0].hotspot.w = 0;
        expect(() => parseSite(bad)).toThrow(/hotspot/);
    });
});

describe('parseSiteList', () => {
    it('accepts a list and rejects empty or duplicate lists', () => {
        expect(parseSiteList({ sites: [{ id: 'a', file: 'a.json' }] })).toHaveLength(1);
        expect(() => parseSiteList({ sites: [] })).toThrow(/empty/);
        expect(() => parseSiteList({ sites: [{ id: 'a', file: 'a.json' }, { id: 'a', file: 'b.json' }] })).toThrow(/duplicate/);
    });
});
