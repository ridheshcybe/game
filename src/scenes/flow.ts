// Moves between sites, results and the campaign. Thin glue: all rules live in src/core.
import { Scene } from 'phaser';
import { playSound } from '../audio';
import { content, getSite } from '../content';
import { recordSiteResult, startingSuspicionFor } from '../core/campaign';
import { buildSiteResult } from '../core/scoring';
import { createGameState, crewMessagesCrossed } from '../core/state';
import type { GameState } from '../core/types';
import { loadProgress, saveProgress } from '../save';
import type { Toast, TopBar } from './ui';

/** Starts a site from scratch: fresh state, carried-over suspicion from the campaign. */
export function startSite(scene: Scene, siteId: string): void {
    const state = createGameState(
        getSite(siteId),
        content.rules,
        startingSuspicionFor(loadProgress(), siteId, content.rules)
    );
    scene.scene.start('Investigation', { state });
}

/** Scores the site, records it in the campaign save and shows the results. */
export function endSite(scene: Scene, state: GameState): void {
    const result = buildSiteResult(state);
    saveProgress(recordSiteResult(loadProgress(), result));
    scene.scene.start('Results', { result });
}

/** Shows crew messages for suspicion thresholds crossed between two states. */
export function announceSuspicion(before: GameState, after: GameState, toast: Toast, bar: TopBar): void {
    if (after.suspicion > before.suspicion) bar.pulseMeter();
    const messages = crewMessagesCrossed(before.suspicion, after.suspicion, after.rules);
    if (messages.length > 0) {
        toast.show(messages.join('\n'));
        playSound('warning');
    }
}
