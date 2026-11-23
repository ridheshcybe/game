import { Scene } from 'phaser';
import { playSound } from '../audio';
import { content, getSite } from '../content';
import { campaignTotals, nextSiteId } from '../core/campaign';
import { findClue } from '../core/state';
import { formatText } from '../core/text';
import type { Ending, SiteResult } from '../core/types';
import { loadProgress } from '../save';
import { startSite } from './flow';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT, makeButton } from './ui';

const ENDING_COLORS: Record<Ending, string> = {
    exposed: TEXT.good,
    leaked: TEXT.gold,
    buried: TEXT.dim,
    caught: TEXT.warning
};

export class ResultsScene extends Scene {
    private result: SiteResult;

    constructor() {
        super('Results');
    }

    init(data: { result: SiteResult }) {
        this.result = data.result;
    }

    create() {
        const t = content.ui.results;
        const r = this.result;
        const site = getSite(r.siteId);
        const ending = content.endings.site[r.ending];
        const cx = GAME_WIDTH / 2;
        const left = 132;
        const names = (ids: string[]) =>
            ids.length === 0 ? t.none : ids.map((id) => findClue(site, id)?.name ?? id).join(', ');

        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.background).setOrigin(0);
        const title = this.add
            .text(cx, 80, ending.name, { fontFamily: FONT, fontSize: '56px', color: ENDING_COLORS[r.ending] })
            .setOrigin(0.5);
        this.add.text(cx, 134, site.title, { fontFamily: FONT, fontSize: '18px', color: TEXT.dim }).setOrigin(0.5);
        this.add.text(left, 170, ending.narrative, {
            fontFamily: FONT,
            fontSize: '18px',
            color: TEXT.normal,
            wordWrap: { width: GAME_WIDTH - left * 2 },
            lineSpacing: 6
        });

        const body = { fontFamily: FONT, fontSize: '18px', color: TEXT.normal, wordWrap: { width: GAME_WIDTH - left * 2 } };
        this.add.text(left, 310, formatText(t.accuracy, { percent: r.accuracy }), { ...body, fontSize: '22px' });
        this.add.text(left, 356, `${t.savedLabel} ${names(r.savedEssentialIds)}`, { ...body, color: TEXT.good });
        this.add.text(left, 410, `${t.lostLabel} ${names(r.lostEssentialIds)}`, { ...body, color: TEXT.warning });
        this.add.text(left, 470, formatText(t.suspicion, { gained: r.suspicionGained, final: r.finalSuspicion }), body);
        this.add.text(
            left,
            504,
            formatText(t.reputation, { sign: r.reputationGained >= 0 ? '+' : '', value: r.reputationGained }),
            body
        );
        const progress = loadProgress();
        const totals = campaignTotals(progress);
        this.add.text(
            left,
            550,
            formatText(content.ui.missionSelect.totals, { reputation: totals.reputation, suspicion: totals.totalSuspicion }),
            { ...body, color: TEXT.gold }
        );

        const next = nextSiteId(progress, content.siteOrder, r.siteId);
        makeButton(this, cx - 160, 670, 260, 52, t.restart, () => startSite(this, r.siteId), {
            color: COLORS.buttonMuted,
            hoverColor: COLORS.buttonMutedHover
        });
        makeButton(this, cx + 160, 670, 260, 52, next ? t.nextSite : t.campaignSummary, () =>
            next ? startSite(this, next) : this.scene.start('MissionSelect')
        );

        this.tweens.add({ targets: title, scale: { from: 1.4, to: 1 }, alpha: { from: 0, to: 1 }, duration: 450, ease: 'Back.Out' });
        playSound(r.ending === 'exposed' || r.ending === 'leaked' ? 'success' : 'burn');
    }
}
