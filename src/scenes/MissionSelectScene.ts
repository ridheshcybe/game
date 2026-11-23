import { Scene } from 'phaser';
import { content, getSite } from '../content';
import { campaignTotals, evaluateCampaignEnding, isCampaignComplete, newCampaign } from '../core/campaign';
import { formatText } from '../core/text';
import { loadProgress, saveProgress } from '../save';
import { startSite } from './flow';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT, makeButton } from './ui';

export class MissionSelectScene extends Scene {
    constructor() {
        super('MissionSelect');
    }

    create() {
        const t = content.ui.missionSelect;
        const progress = loadProgress();
        const totals = campaignTotals(progress);
        const cx = GAME_WIDTH / 2;
        const rowW = 860;
        const rowH = 112;

        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.background).setOrigin(0);
        this.add.text(cx, 56, t.title, { fontFamily: FONT, fontSize: '40px', color: TEXT.normal }).setOrigin(0.5);
        this.add
            .text(cx, 104, formatText(t.totals, { reputation: totals.reputation, suspicion: totals.totalSuspicion }), {
                fontFamily: FONT,
                fontSize: '18px',
                color: TEXT.gold
            })
            .setOrigin(0.5);

        content.siteOrder.forEach((id, i) => {
            const site = getSite(id);
            const record = progress.records[id];
            const top = 140 + i * (rowH + 14);
            const left = cx - rowW / 2;
            const row = this.add
                .rectangle(cx, top + rowH / 2, rowW, rowH, 0x2c323b)
                .setStrokeStyle(2, record ? COLORS.gold : 0x4a5568)
                .setInteractive({ useHandCursor: true });
            this.add.text(left + 18, top + 14, `${i + 1}. ${site.title}`, { fontFamily: FONT, fontSize: '22px', color: TEXT.normal });
            this.add
                .text(
                    left + rowW - 18,
                    top + 16,
                    record
                        ? formatText(t.completed, { ending: content.endings.site[record.ending].name, accuracy: record.accuracy })
                        : t.notAttempted,
                    { fontFamily: FONT, fontSize: '15px', color: record ? TEXT.gold : TEXT.dim }
                )
                .setOrigin(1, 0);
            this.add.text(left + 18, top + 48, site.briefing, {
                fontFamily: FONT,
                fontSize: '14px',
                color: TEXT.dim,
                wordWrap: { width: rowW - 36 }
            });
            row.on('pointerover', () => row.setFillStyle(0x3a4250));
            row.on('pointerout', () => row.setFillStyle(0x2c323b));
            row.on('pointerup', () => startSite(this, id));
        });

        if (isCampaignComplete(progress, content.siteOrder)) {
            const ending = evaluateCampaignEnding(progress, content.endings);
            const top = 140 + content.siteOrder.length * (rowH + 14) + 10;
            this.add.rectangle(cx, top + 90, rowW, 180, COLORS.panel).setStrokeStyle(2, COLORS.gold);
            const name = this.add
                .text(cx, top + 30, formatText(t.campaignComplete, { name: ending.name }), {
                    fontFamily: FONT,
                    fontSize: '24px',
                    color: TEXT.gold
                })
                .setOrigin(0.5);
            this.add.text(cx - rowW / 2 + 20, top + 64, ending.narrative, {
                fontFamily: FONT,
                fontSize: '16px',
                color: TEXT.normal,
                wordWrap: { width: rowW - 40 },
                lineSpacing: 4
            });
            this.tweens.add({ targets: name, alpha: { from: 0, to: 1 }, scale: { from: 1.3, to: 1 }, duration: 500 });
        }

        makeButton(this, 140, GAME_HEIGHT - 40, 200, 46, t.back, () => this.scene.start('Boot'), {
            color: COLORS.buttonMuted,
            hoverColor: COLORS.buttonMutedHover
        });
        makeButton(this, GAME_WIDTH - 150, GAME_HEIGHT - 40, 240, 46, t.newCampaign, () => {
            saveProgress(newCampaign(progress.tutorialSeen));
            this.scene.restart();
        }, { color: 0x6b2a22, hoverColor: 0x8a3a2f });
    }
}
