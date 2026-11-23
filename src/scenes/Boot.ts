import { Scene } from 'phaser';
import gameData from '../data/game.json';
import { parseGameInfo } from '../core/gameInfo';

const COLORS = {
    title: '#e8e6e3',
    tagline: '#8a8f98',
    button: 0x2f6f4f,
    buttonHover: 0x3f8f66,
    buttonText: '#ffffff',
    status: '#c9a227'
};

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    create() {
        const info = parseGameInfo(gameData);
        const { width, height } = this.scale;
        const cx = width / 2;

        this.add.text(cx, height * 0.35, info.title, {
            fontFamily: 'monospace',
            fontSize: '72px',
            color: COLORS.title
        }).setOrigin(0.5);

        this.add.text(cx, height * 0.35 + 70, info.tagline, {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: COLORS.tagline
        }).setOrigin(0.5);

        const button = this.add.rectangle(cx, height * 0.62, 220, 64, COLORS.button)
            .setInteractive({ useHandCursor: true });
        this.add.text(cx, height * 0.62, info.startLabel, {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: COLORS.buttonText
        }).setOrigin(0.5);

        const status = this.add.text(cx, height * 0.62 + 70, '', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: COLORS.status
        }).setOrigin(0.5);

        button.on('pointerover', () => button.setFillStyle(COLORS.buttonHover));
        button.on('pointerout', () => button.setFillStyle(COLORS.button));
        button.on('pointerup', () => status.setText(info.notBuiltMessage));
    }
}
