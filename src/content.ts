// Loads and validates every JSON file in src/data/ once. No Phaser here.
// New sites are picked up automatically: add the file and list it in sites.json.
import endingsData from './data/endings.json';
import gameData from './data/game.json';
import rulesData from './data/rules.json';
import sitesData from './data/sites.json';
import uiData from './data/ui.json';
import { parseEndings } from './core/endings';
import { parseGameInfo } from './core/gameInfo';
import { parseRules } from './core/rules';
import { parseSite, parseSiteList } from './core/site';
import type { Site } from './core/types';
import { parseUiText } from './core/ui';

const dataFiles = import.meta.glob<unknown>('./data/*.json', { eager: true, import: 'default' });

function loadSites(): Map<string, Site> {
    const sites = new Map<string, Site>();
    for (const entry of parseSiteList(sitesData)) {
        const raw = dataFiles[`./data/${entry.file}`];
        if (raw === undefined) throw new Error(`sites.json: file src/data/${entry.file} not found`);
        const site = parseSite(raw);
        if (site.id !== entry.id) {
            throw new Error(`sites.json: ${entry.file} has id "${site.id}", expected "${entry.id}"`);
        }
        sites.set(site.id, site);
    }
    return sites;
}

const sites = loadSites();

export const content = {
    game: parseGameInfo(gameData),
    ui: parseUiText(uiData),
    rules: parseRules(rulesData),
    endings: parseEndings(endingsData),
    /** Site ids in campaign order. */
    siteOrder: [...sites.keys()],
    sites
} as const;

export function getSite(id: string): Site {
    const site = sites.get(id);
    if (!site) throw new Error(`unknown site "${id}"`);
    return site;
}
