// Plain TypeScript: no Phaser imports allowed in src/core/.
// Campaign progress across sites, and its save format. Storage itself lives outside core.
import { campaignEndingMatches, type CampaignEnding, type Endings } from './endings';
import { ENDINGS, type Ending, type Rules, type SiteResult } from './types';

export interface SiteRecord {
    ending: Ending;
    accuracy: number;
    suspicionGained: number;
    reputationGained: number;
}

export interface CampaignProgress {
    /** Latest result per site id. Replaying a site replaces its record. */
    records: Readonly<Record<string, SiteRecord>>;
    tutorialSeen: boolean;
}

export interface CampaignTotals {
    reputation: number;
    totalSuspicion: number;
    completed: number;
}

const SAVE_VERSION = 1;

export function newCampaign(tutorialSeen = false): CampaignProgress {
    return { records: {}, tutorialSeen };
}

export function markTutorialSeen(c: CampaignProgress): CampaignProgress {
    return c.tutorialSeen ? c : { ...c, tutorialSeen: true };
}

export function recordSiteResult(c: CampaignProgress, result: SiteResult): CampaignProgress {
    const record: SiteRecord = {
        ending: result.ending,
        accuracy: result.accuracy,
        suspicionGained: result.suspicionGained,
        reputationGained: result.reputationGained
    };
    return { ...c, records: { ...c.records, [result.siteId]: record } };
}

export function campaignTotals(c: CampaignProgress): CampaignTotals {
    const records = Object.values(c.records);
    return {
        reputation: records.reduce((sum, r) => sum + r.reputationGained, 0),
        totalSuspicion: records.reduce((sum, r) => sum + r.suspicionGained, 0),
        completed: records.length
    };
}

/** Suspicion a site starts with: a share of what the crew noticed on the other sites. */
export function startingSuspicionFor(c: CampaignProgress, siteId: string, rules: Rules): number {
    const others = Object.entries(c.records)
        .filter(([id]) => id !== siteId)
        .reduce((sum, [, r]) => sum + r.suspicionGained, 0);
    const s = rules.suspicion;
    return Math.min(s.maxCarriedSuspicion, Math.round(others * s.carryOverFactor));
}

export function isCampaignComplete(c: CampaignProgress, order: readonly string[]): boolean {
    return order.length > 0 && order.every((id) => id in c.records);
}

/**
 * The site to play after `currentId`: the next unfinished site after it in campaign order,
 * else the first unfinished one, else null (campaign complete).
 */
export function nextSiteId(c: CampaignProgress, order: readonly string[], currentId?: string): string | null {
    const start = currentId ? order.indexOf(currentId) + 1 : 0;
    const rotated = [...order.slice(start), ...order.slice(0, start)];
    return rotated.find((id) => !(id in c.records)) ?? null;
}

export function evaluateCampaignEnding(c: CampaignProgress, endings: Endings): CampaignEnding {
    const { reputation, totalSuspicion } = campaignTotals(c);
    // parseEndings guarantees the last ending matches anything.
    return endings.campaign.find((e) => campaignEndingMatches(e, reputation, totalSuspicion)) ??
        endings.campaign[endings.campaign.length - 1];
}

export function serializeCampaign(c: CampaignProgress): string {
    return JSON.stringify({ version: SAVE_VERSION, records: c.records, tutorialSeen: c.tutorialSeen });
}

/** Reads a saved campaign. Anything missing, corrupt or from another version gives a fresh one. */
export function loadCampaign(text: string | null): CampaignProgress {
    if (!text) return newCampaign();
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return newCampaign();
    }
    if (typeof raw !== 'object' || raw === null) return newCampaign();
    const data = raw as Record<string, unknown>;
    if (data.version !== SAVE_VERSION) return newCampaign();
    const tutorialSeen = data.tutorialSeen === true;
    const recordsRaw = data.records;
    if (typeof recordsRaw !== 'object' || recordsRaw === null) return newCampaign(tutorialSeen);

    const records: Record<string, SiteRecord> = {};
    for (const [id, r] of Object.entries(recordsRaw)) {
        if (typeof r !== 'object' || r === null) continue;
        const rec = r as Record<string, unknown>;
        const nums = [rec.accuracy, rec.suspicionGained, rec.reputationGained];
        if (!ENDINGS.includes(rec.ending as Ending)) continue;
        if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
        records[id] = {
            ending: rec.ending as Ending,
            accuracy: rec.accuracy as number,
            suspicionGained: rec.suspicionGained as number,
            reputationGained: rec.reputationGained as number
        };
    }
    return { records, tutorialSeen };
}
