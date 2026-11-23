import { describe, expect, it } from 'vitest';
import endingsData from '../data/endings.json';
import {
    campaignTotals,
    evaluateCampaignEnding,
    isCampaignComplete,
    loadCampaign,
    markTutorialSeen,
    newCampaign,
    nextSiteId,
    recordSiteResult,
    serializeCampaign,
    startingSuspicionFor
} from './campaign';
import { parseEndings } from './endings';
import { makeTestRules } from './testSite';
import type { SiteResult } from './types';

const result = (siteId: string, patch: Partial<SiteResult> = {}): SiteResult => ({
    siteId,
    ending: 'exposed',
    accuracy: 80,
    savedEssentialIds: [],
    lostEssentialIds: [],
    finalSuspicion: 20,
    suspicionGained: 20,
    reputationGained: 7,
    ...patch
});

const order = ['s1', 's2', 's3'];

describe('campaign progress', () => {
    it('records results and totals them; replaying replaces the record', () => {
        let c = recordSiteResult(newCampaign(), result('s1'));
        c = recordSiteResult(c, result('s2', { suspicionGained: 40, reputationGained: -1 }));
        expect(campaignTotals(c)).toEqual({ reputation: 6, totalSuspicion: 60, completed: 2 });
        c = recordSiteResult(c, result('s2', { suspicionGained: 0, reputationGained: 2 }));
        expect(campaignTotals(c)).toEqual({ reputation: 9, totalSuspicion: 20, completed: 2 });
    });

    it('carries a capped share of the other sites\' suspicion into a site', () => {
        const rules = makeTestRules(); // factor 0.5, cap 40
        let c = recordSiteResult(newCampaign(), result('s1', { suspicionGained: 30 }));
        expect(startingSuspicionFor(c, 's2', rules)).toBe(15);
        expect(startingSuspicionFor(c, 's1', rules)).toBe(0); // replaying s1 ignores its own record
        c = recordSiteResult(c, result('s3', { suspicionGained: 90 }));
        expect(startingSuspicionFor(c, 's2', rules)).toBe(40);
    });

    it('finds the next unfinished site and detects completion', () => {
        let c = newCampaign();
        expect(nextSiteId(c, order)).toBe('s1');
        c = recordSiteResult(c, result('s1'));
        expect(nextSiteId(c, order, 's1')).toBe('s2');
        c = recordSiteResult(c, result('s3'));
        expect(nextSiteId(c, order, 's3')).toBe('s2');
        expect(isCampaignComplete(c, order)).toBe(false);
        c = recordSiteResult(c, result('s2'));
        expect(nextSiteId(c, order, 's2')).toBeNull();
        expect(isCampaignComplete(c, order)).toBe(true);
    });
});

describe('evaluateCampaignEnding', () => {
    const endings = parseEndings(endingsData);
    const campaign = (rep: number, sus: number) =>
        recordSiteResult(newCampaign(), result('s1', { reputationGained: rep, suspicionGained: sus }));

    it('picks the first matching ending in endings.json order', () => {
        expect(evaluateCampaignEnding(campaign(14, 50), endings).id).toBe('whistleblower');
        expect(evaluateCampaignEnding(campaign(14, 120), endings).id).toBe('marked');
        expect(evaluateCampaignEnding(campaign(2, 120), endings).id).toBe('under-watch');
        expect(evaluateCampaignEnding(campaign(2, 10), endings).id).toBe('the-cleaner');
    });
});

describe('save format', () => {
    it('round-trips', () => {
        const c = markTutorialSeen(recordSiteResult(newCampaign(), result('s1')));
        expect(loadCampaign(serializeCampaign(c))).toEqual(c);
    });

    it('falls back to a fresh campaign on bad input', () => {
        expect(loadCampaign(null)).toEqual(newCampaign());
        expect(loadCampaign('{not json')).toEqual(newCampaign());
        expect(loadCampaign('{"version":99,"records":{}}')).toEqual(newCampaign());
    });

    it('drops corrupt records but keeps good ones', () => {
        const text = JSON.stringify({
            version: 1,
            tutorialSeen: true,
            records: {
                ok: { ending: 'leaked', accuracy: 50, suspicionGained: 5, reputationGained: 3 },
                badEnding: { ending: 'won', accuracy: 50, suspicionGained: 5, reputationGained: 3 },
                badNumber: { ending: 'leaked', accuracy: 'x', suspicionGained: 5, reputationGained: 3 }
            }
        });
        const c = loadCampaign(text);
        expect(Object.keys(c.records)).toEqual(['ok']);
        expect(c.tutorialSeen).toBe(true);
    });
});
