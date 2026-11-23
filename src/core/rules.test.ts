import { describe, expect, it } from 'vitest';
import rulesData from '../data/rules.json';
import endingsData from '../data/endings.json';
import { parseRules } from './rules';
import { campaignEndingMatches, parseEndings } from './endings';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe('parseRules', () => {
    it('accepts the shipped rules.json', () => {
        const rules = parseRules(rulesData);
        expect(rules.endings.caughtAtSuspicion).toBe(100);
        expect(rules.suspicion.crewMessages.map((m) => m.at)).toEqual([30, 60, 90]);
    });

    it('rejects missing or bad values', () => {
        const noLinger = clone(rulesData) as { suspicion: Record<string, unknown> };
        delete noLinger.suspicion.lingerSeconds;
        expect(() => parseRules(noLinger)).toThrow(/lingerSeconds/);

        const badConfidence = clone(rulesData);
        badConfidence.confidence.highFrom = 10;
        expect(() => parseRules(badConfidence)).toThrow(/highFrom/);

        const noEnding = clone(rulesData) as { reputation: { byEnding: Record<string, unknown> } };
        delete noEnding.reputation.byEnding.caught;
        expect(() => parseRules(noEnding)).toThrow(/caught/);
    });
});

describe('parseEndings', () => {
    it('accepts the shipped endings.json with all four site endings', () => {
        const endings = parseEndings(endingsData);
        expect(Object.keys(endings.site).sort()).toEqual(['buried', 'caught', 'exposed', 'leaked']);
        expect(endings.campaign.length).toBeGreaterThan(1);
    });

    it('requires a fallback campaign ending last', () => {
        const bad = clone(endingsData);
        bad.campaign.pop();
        expect(() => parseEndings(bad)).toThrow(/fallback/);
    });

    it('rejects a missing site ending', () => {
        const bad = clone(endingsData) as { site: Record<string, unknown> };
        delete bad.site.leaked;
        expect(() => parseEndings(bad)).toThrow(/leaked/);
    });
});

describe('campaignEndingMatches', () => {
    const e = { id: 'x', name: 'X', narrative: 'n', minReputation: 5, maxTotalSuspicion: 50 };
    it('needs every condition', () => {
        expect(campaignEndingMatches(e, 5, 50)).toBe(true);
        expect(campaignEndingMatches(e, 4, 0)).toBe(false);
        expect(campaignEndingMatches(e, 9, 51)).toBe(false);
        expect(campaignEndingMatches({ id: 'f', name: 'F', narrative: 'n' }, -99, 999)).toBe(true);
    });
});
