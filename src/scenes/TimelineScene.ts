import { GameObjects, Input, Scene } from 'phaser';
import { playSound } from '../audio';
import { content } from '../content';
import { confidenceLevel } from '../core/scoring';
import {
    findClue,
    isCleanupOver,
    isDestroyed,
    isPreserved,
    isSiteOver,
    openPreservePanel,
    placeOnTimeline,
    preserveClue,
    removeFromTimeline,
    slotOf,
    slotsLeft,
    tick,
    unpreserveClue
} from '../core/state';
import { formatText } from '../core/text';
import type { Clue, Confidence, GameState, Rect } from '../core/types';
import { announceSuspicion, endSite } from './flow';
import {
    COLORS,
    FONT,
    GAME_HEIGHT,
    GAME_WIDTH,
    TEXT,
    TOP_BAR_HEIGHT,
    Toast,
    TopBar,
    makeButton,
    type Button
} from './ui';

const CARD = { w: 150, h: 42, gap: 12, fill: 0x3b4352, stroke: 0x9aa5b1, burnedFill: 0x262626 };
const TRAY: Rect = { x: 24, y: 140, w: GAME_WIDTH - 48, h: 150 };
const SLOTS_AREA: Rect = { x: 24, y: 312, w: GAME_WIDTH - 48, h: 370 };
const SLOT_GAP = 12;
const SLOT_HEADER = 36;
const BOTTOM_Y = GAME_HEIGHT - 40;

type Tab = 'timeline' | 'preserve';

interface Card {
    clue: Clue;
    container: GameObjects.Container;
    rect: GameObjects.Rectangle;
    label: GameObjects.Text;
}

const contains = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export class TimelineScene extends Scene {
    private state: GameState;
    private tab: Tab;
    private ending: boolean;
    private cards: Map<string, Card>;
    private slotZones: Rect[];

    private topBar: TopBar;
    private toast: Toast;
    private timelineLayer: GameObjects.Container;
    private preserveLayer: GameObjects.Container;
    private preserveRows: GameObjects.Container;
    private slotsLeftText: GameObjects.Text;
    private preserveMessage: GameObjects.Text;
    private confidenceText: GameObjects.Text;
    private tabs: Record<Tab, Button>;

    constructor() {
        super('Timeline');
    }

    init(data: { state: GameState }) {
        this.state = data.state;
        this.tab = 'timeline';
        this.ending = false;
        this.cards = new Map();
        this.slotZones = [];
    }

    create() {
        const t = content.ui.timeline;
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.background).setOrigin(0);
        this.topBar = new TopBar(this);

        const tabY = TOP_BAR_HEIGHT + 30;
        this.tabs = {
            timeline: makeButton(this, 120, tabY, 190, 38, t.tabTimeline, () => this.showTab('timeline'), { fontSize: 17 }),
            preserve: makeButton(this, 322, tabY, 190, 38, t.tabPreserve, () => this.showTab('preserve'), { fontSize: 17 })
        };

        this.buildTimelineLayer();
        this.buildPreserveLayer();

        makeButton(this, 130, BOTTOM_Y, 220, 48, t.back, () => this.scene.start('Investigation', { state: this.state }), {
            color: COLORS.buttonMuted,
            hoverColor: COLORS.buttonMutedHover
        });
        makeButton(this, GAME_WIDTH - 130, BOTTOM_Y, 220, 48, t.submit, () => this.submit(), { sound: null });
        this.confidenceText = this.add
            .text(GAME_WIDTH / 2, BOTTOM_Y, '', { fontFamily: FONT, fontSize: '20px', color: TEXT.normal })
            .setOrigin(0.5);

        this.toast = new Toast(this, 110);
        this.showTab('timeline', false);
        this.layoutCards(false);
        this.refresh();
    }

    update(_time: number, delta: number) {
        if (this.ending) return;
        const before = this.state;
        this.setState(tick(this.state, delta / 1000));
        if (this.ending) return;
        if (this.state.destroyedClueIds.length !== before.destroyedClueIds.length) {
            playSound('burn');
            this.rebuildPreserveRows();
        }
        this.refresh();
    }

    private setState(next: GameState) {
        const before = this.state;
        this.state = next;
        announceSuspicion(before, next, this.toast, this.topBar);
        if (isSiteOver(next) && !this.ending) {
            this.ending = true;
            endSite(this, next);
        }
    }

    private submit() {
        if (this.ending) return;
        this.ending = true;
        playSound('success');
        endSite(this, this.state);
    }

    // ---------- Timeline tab ----------

    private buildTimelineLayer() {
        const t = content.ui.timeline;
        const n = this.state.site.truthEvents.length;
        const colW = (SLOTS_AREA.w - (n - 1) * SLOT_GAP) / n;
        const parts: GameObjects.GameObject[] = [
            this.add.text(TRAY.x, TRAY.y - 22, t.trayLabel, { fontFamily: FONT, fontSize: '15px', color: TEXT.dim }),
            this.add.rectangle(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 0x1b1e22).setOrigin(0).setStrokeStyle(1, 0x3a3f46)
        ];
        for (let i = 0; i < n; i++) {
            const zone: Rect = { x: SLOTS_AREA.x + i * (colW + SLOT_GAP), y: SLOTS_AREA.y, w: colW, h: SLOTS_AREA.h };
            this.slotZones.push(zone);
            parts.push(
                this.add.rectangle(zone.x, zone.y, zone.w, zone.h, 0x1b1e22).setOrigin(0).setStrokeStyle(2, 0x4a5568),
                this.add.rectangle(zone.x, zone.y, zone.w, SLOT_HEADER, 0x2c323b).setOrigin(0),
                this.add
                    .text(zone.x + zone.w / 2, zone.y + SLOT_HEADER / 2, formatText(t.slotLabel, { n: i + 1 }), {
                        fontFamily: FONT,
                        fontSize: '20px',
                        color: TEXT.gold
                    })
                    .setOrigin(0.5)
            );
        }
        this.timelineLayer = this.add.container(0, 0, parts);

        // Cards live outside the layer so a dragged card can be raised above everything.
        for (const id of this.state.discoveredClueIds) {
            const clue = findClue(this.state.site, id);
            if (clue) this.cards.set(id, this.makeCard(clue, Math.min(CARD.w, colW - 12)));
        }
    }

    private makeCard(clue: Clue, w: number): Card {
        const rect = this.add.rectangle(0, 0, w, CARD.h, CARD.fill).setStrokeStyle(2, CARD.stroke);
        const label = this.add
            .text(0, 0, clue.name, {
                fontFamily: FONT,
                fontSize: '13px',
                color: TEXT.normal,
                align: 'center',
                wordWrap: { width: w - 10 }
            })
            .setOrigin(0.5);
        const container = this.add.container(TRAY.x, TRAY.y, [rect, label]).setSize(w, CARD.h).setDepth(5);
        container.setInteractive({ draggable: true, useHandCursor: true });

        container.on('dragstart', () => {
            container.setDepth(40);
            this.tweens.add({ targets: container, scale: 1.08, duration: 100 });
        });
        container.on('drag', (_p: Input.Pointer, x: number, y: number) => container.setPosition(x, y));
        container.on('dragend', (p: Input.Pointer) => this.dropCard(clue.id, p.x, p.y));
        return { clue, container, rect, label };
    }

    private dropCard(clueId: string, x: number, y: number) {
        const slot = this.slotZones.findIndex((z) => contains(z, x, y));
        if (slot >= 0) {
            this.setState(placeOnTimeline(this.state, clueId, slot).state);
        } else if (contains(TRAY, x, y)) {
            this.setState(removeFromTimeline(this.state, clueId));
        }
        playSound('click');
        this.layoutCards(true, clueId);
        this.refresh();
    }

    /** Puts every card where the state says it belongs: tray grid, or stacked in its slot. */
    private layoutCards(animate: boolean, droppedId?: string) {
        const perRow = Math.max(1, Math.floor((TRAY.w + CARD.gap) / (CARD.w + CARD.gap)));
        const inSlot = new Array<number>(this.slotZones.length).fill(0);
        let trayIndex = 0;

        for (const id of this.state.discoveredClueIds) {
            const card = this.cards.get(id);
            if (!card) continue;
            const slot = slotOf(this.state, id);
            let x: number;
            let y: number;
            if (slot === undefined) {
                const col = trayIndex % perRow;
                const row = Math.floor(trayIndex / perRow);
                trayIndex++;
                x = TRAY.x + 12 + CARD.w / 2 + col * (CARD.w + CARD.gap);
                y = TRAY.y + 12 + CARD.h / 2 + row * (CARD.h + 10);
            } else {
                const zone = this.slotZones[slot];
                x = zone.x + zone.w / 2;
                y = zone.y + SLOT_HEADER + 10 + CARD.h / 2 + inSlot[slot]++ * (CARD.h + 6);
            }
            const c = card.container;
            c.setDepth(5);
            this.tweens.killTweensOf(c);
            if (animate) {
                this.tweens.add({ targets: c, x, y, duration: 220, ease: 'Cubic.Out' });
                if (id === droppedId) {
                    this.tweens.add({ targets: c, scale: { from: 1.15, to: 1 }, duration: 300, ease: 'Back.Out' });
                } else {
                    c.setScale(1);
                }
            } else {
                c.setPosition(x, y).setScale(1);
            }
        }
    }

    // ---------- Preserve tab ----------

    private buildPreserveLayer() {
        const t = content.ui.timeline;
        const hint = this.add.text(GAME_WIDTH / 2, 140, t.preserveHint, {
            fontFamily: FONT,
            fontSize: '16px',
            color: TEXT.dim
        }).setOrigin(0.5);
        this.slotsLeftText = this.add
            .text(GAME_WIDTH / 2, 180, '', { fontFamily: FONT, fontSize: '28px', color: TEXT.gold })
            .setOrigin(0.5);
        this.preserveMessage = this.add
            .text(GAME_WIDTH / 2, 660, '', { fontFamily: FONT, fontSize: '17px', color: TEXT.warning })
            .setOrigin(0.5);
        this.preserveRows = this.add.container(0, 0);
        this.preserveLayer = this.add.container(0, 0, [hint, this.slotsLeftText, this.preserveMessage, this.preserveRows]);
        this.rebuildPreserveRows();
    }

    /** One row per discovered clue that has not burned. Rebuilt whenever that list changes. */
    private rebuildPreserveRows() {
        const t = content.ui.timeline;
        this.preserveRows.removeAll(true);
        const ids = this.state.discoveredClueIds.filter((id) => !isDestroyed(this.state, id));
        if (ids.length === 0) {
            this.preserveRows.add(
                this.add.text(GAME_WIDTH / 2, 300, t.emptyPreserve, { fontFamily: FONT, fontSize: '18px', color: TEXT.dim }).setOrigin(0.5)
            );
            return;
        }
        const cols = ids.length > 7 ? 2 : 1;
        const w = cols === 2 ? 470 : 720;
        const h = 46;
        const perCol = Math.ceil(ids.length / cols);
        ids.forEach((id, i) => {
            const clue = findClue(this.state.site, id);
            if (!clue) return;
            const kept = isPreserved(this.state, id);
            const col = Math.floor(i / perCol);
            const cx = cols === 2 ? GAME_WIDTH / 2 + (col === 0 ? -250 : 250) : GAME_WIDTH / 2;
            const y = 240 + (i % perCol) * (h + 8);
            const rect = this.add
                .rectangle(cx, y, w, h, kept ? 0x4a3d17 : 0x2c323b)
                .setStrokeStyle(2, kept ? COLORS.gold : 0x4a5568)
                .setInteractive({ useHandCursor: true });
            const name = this.add
                .text(cx - w / 2 + 16, y, clue.name, { fontFamily: FONT, fontSize: '18px', color: TEXT.normal })
                .setOrigin(0, 0.5);
            const status = this.add
                .text(cx + w / 2 - 16, y, kept ? t.preservedTag : t.preserveAction, {
                    fontFamily: FONT,
                    fontSize: '15px',
                    color: kept ? TEXT.gold : TEXT.dim
                })
                .setOrigin(1, 0.5);
            rect.on('pointerup', () => this.togglePreserve(id, rect));
            this.preserveRows.add([rect, name, status]);
        });
    }

    private togglePreserve(clueId: string, row: GameObjects.Rectangle) {
        const t = content.ui.timeline;
        const result = isPreserved(this.state, clueId)
            ? unpreserveClue(this.state, clueId)
            : preserveClue(this.state, clueId);
        if (result.ok) {
            const kept = isPreserved(result.state, clueId);
            this.setState(result.state);
            this.preserveMessage.setText('');
            playSound(kept ? 'success' : 'click');
        } else {
            playSound('warning');
            this.preserveMessage.setText(result.reason === 'slots-full' ? t.noSlots : t.cleanupOver);
            this.tweens.add({ targets: row, x: { from: row.x - 8, to: row.x }, duration: 200, ease: 'Bounce.Out' });
            return;
        }
        this.rebuildPreserveRows();
        this.refreshCards();
        this.refresh();
    }

    // ---------- Shared ----------

    private showTab(tab: Tab, counts = true) {
        const switching = tab !== this.tab;
        this.tab = tab;
        const onTimeline = tab === 'timeline';
        this.timelineLayer.setVisible(onTimeline);
        this.preserveLayer.setVisible(!onTimeline);
        for (const card of this.cards.values()) card.container.setVisible(onTimeline);
        this.tabs.timeline.rect.setStrokeStyle(onTimeline ? 3 : 0, COLORS.gold);
        this.tabs.preserve.rect.setStrokeStyle(onTimeline ? 0 : 3, COLORS.gold);
        if (!onTimeline && switching && counts) {
            this.setState(openPreservePanel(this.state));
            this.preserveMessage.setText('');
            this.rebuildPreserveRows();
        }
        this.refresh();
    }

    private refreshCards() {
        for (const card of this.cards.values()) {
            const id = card.clue.id;
            const burned = isDestroyed(this.state, id);
            card.rect.setFillStyle(burned ? CARD.burnedFill : CARD.fill);
            card.rect.setStrokeStyle(2, isPreserved(this.state, id) ? COLORS.gold : CARD.stroke);
            card.label.setColor(burned ? TEXT.dim : TEXT.normal);
        }
    }

    private refresh() {
        const t = content.ui.timeline;
        this.topBar.update(this.state);
        this.refreshCards();
        const level: Record<Confidence, string> = {
            low: t.confidenceLow,
            medium: t.confidenceMedium,
            high: t.confidenceHigh
        };
        const confidence = confidenceLevel(this.state);
        this.confidenceText.setText(formatText(t.confidenceLabel, { level: level[confidence] }));
        this.confidenceText.setColor(confidence === 'high' ? TEXT.good : confidence === 'medium' ? TEXT.gold : TEXT.warning);
        this.slotsLeftText.setText(
            isCleanupOver(this.state) ? t.cleanupOver : formatText(t.slotsLeft, { count: slotsLeft(this.state) })
        );
    }
}
