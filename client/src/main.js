import { Context } from './tools/context.js';
import { getEngine } from './tools/engine.js';
import { assets } from './assets.js';
import { menu } from './menu.js';

const steps = {
    setup: async ctx => {
	let [width, height] = [window.innerWidth, window.innerHeight];
	if (true || width > height) { width = height/1.6; }

	const config = {
	    width, height,
	    backgroundColor: '#000000',
	    type: Phaser.WEBGL,
	};
	const defaults = {
	    tween: {
		duration: 500,
		ease: 'Cubic.easeOut',
	    },
	    text: {
		fontFamily: '"Modak", system-ui',
		fontSize: '32px',
		fill: '#ff8800',
	    },
	    menu: {
		step: 50,
		delay: 100,
	    },
	};
	const engine = await getEngine({config, defaults});
	await engine.fonts('Modak');
	await engine.assets(assets);

	const background = engine.sprite(0.5*width, 0.5*height, 'background');
	background
	    .setDisplaySize(width, background.height*width/background.width)
	    .setTint(0x333333)
	    .tween({alpha: {from: 0, to: 1}});

	Object.assign(ctx, {engine, width, height});
    },
    menu: async ctx => await menu(ctx),
};
export const main = async () => await new Context().onto(...Object.values(steps));
