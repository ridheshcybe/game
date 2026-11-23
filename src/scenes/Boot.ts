import { Scene } from 'phaser';
import { content } from '../content';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT, makeButton } from './ui';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    create() {
        const info = content.game;
        const cx = GAME_WIDTH / 2;
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.background).setOrigin(0);

        const title = this.add
            .text(cx, GAME_HEIGHT * 0.35, info.title, { fontFamily: FONT, fontSize: '72px', color: TEXT.normal })
            .setOrigin(0.5);
        this.add
            .text(cx, GAME_HEIGHT * 0.35 + 70, info.tagline, { fontFamily: FONT, fontSize: '22px', color: TEXT.dim })
            .setOrigin(0.5);
        makeButton(this, cx, GAME_HEIGHT * 0.62, 220, 64, info.startLabel, () => this.scene.start('MissionSelect'), {
            fontSize: 28
        });

        this.tweens.add({ targets: title, alpha: { from: 0, to: 1 }, y: { from: title.y - 20, to: title.y }, duration: 600 });
    }
}
