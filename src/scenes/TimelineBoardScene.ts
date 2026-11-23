import { Scene } from 'phaser';
import uiData from '../data/ui.json';
import { formatText } from '../core/text';
import type { GameState } from '../core/types';
import { parseUiText } from '../core/ui';
import type { InvestigationData } from './InvestigationScene';
import { FONT, makeButton } from './ui';

/** Placeholder until the timeline board is built. Keeps the game state and can go back. */
export class TimelineBoardScene extends Scene {
    private state: GameState;
    private text = parseUiText(uiData).timelineBoard;

    constructor() {
        super('TimelineBoard');
    }

    init(data: { state: GameState }) {
        this.state = data.state;
    }

    create() {
        const { width, height } = this.scale;
        const cx = width / 2;
        const t = this.text;
        this.add.text(cx, height * 0.3, t.title, { fontFamily: FONT, fontSize: '44px', color: '#e8e6e3' }).setOrigin(0.5);
        this.add.text(cx, height * 0.42, t.notBuilt, { fontFamily: FONT, fontSize: '20px', color: '#8a8f98' }).setOrigin(0.5);
        this.add
            .text(cx, height * 0.5, formatText(t.loggedCount, { count: this.state.discoveredClueIds.length }), {
                fontFamily: FONT,
                fontSize: '20px',
                color: '#8a8f98'
            })
            .setOrigin(0.5);
        makeButton(this, cx, height * 0.65, 240, 48, t.back, () => {
            const data: InvestigationData = { state: this.state };
            this.scene.start('Investigation', data);
        });
    }
}
