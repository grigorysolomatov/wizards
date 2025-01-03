import { Context } from './context.js';
import { sleep } from './time.js';
import { tracker } from './tracker.js';
import { board } from './board.js';

const steps = {
    init: async ctx => {
	const {config} = ctx;
	const game = new Phaser.Game(config);

	const key = 'MainScene';
	const scene = await new Promise(res => {
	    const scene = new Phaser.Scene({key});
	    scene.create = () => res(scene);
	    game.scene.add(key, scene);
	    game.scene.start(key);
	});
	Object.assign(ctx, {game, scene});
    },
    load: ctx => {
	const {scene} = ctx;

	ctx.assets = async paths => {
	    Object.keys(paths).forEach(key => scene.load.image(key, paths[key]));
	    await new Promise(resolve => { scene.load.on('complete', resolve); scene.load.start(); });	    
	};
	ctx.fonts = async (...families) => {
	    await new Promise(resolve => WebFont.load({google: {families}, active: resolve}));
	};
    },
    entities: ctx => {
	const {scene, defaults, config} = ctx;
	
	ctx.tween = async config => {
	    await new Promise(res => scene.tweens.add({
		onComplete: res,
		...defaults.tween,
		...config,
	    }));
	};
	ctx.tune = entity => {
	    entity.event = (key, func=x=>x) => new Promise(res => entity.once(key, (...args) => res(func(...args))));
	    entity.tween = config => ctx.tween({...config, targets: entity});
	    return entity;
	};
	ctx.text = (x, y, str, settings={}) => {
	    const text = scene.add.text(x, y, str, {...defaults.text, ...settings});
	    return ctx.tune(text);
	};
	ctx.sprite = (x, y, key) => {
	    const sprite = scene.add.sprite(x, y, key);
	    return ctx.tune(sprite);
	};	
    },
    complex: ctx => {
	const {scene, defaults, config} = ctx;
	const {height} = config;

	ctx.menu = async (x, y, options) => {
	    const {step, tween, delay} = defaults.menu;
	    const [nrows, ncols] = [Object.keys(options).length, 1];
	    
	    const entries = ctx.grid(x, y, nrows, ncols, step)
		  .map(([x, y], _, i) => ctx.text(x, y, Object.values(options)[i]))
		  .rename((_, __, i) => Object.keys(options)[i])
		  .forEach(text => text.setOrigin(0.5).setAlpha(0).setInteractive())
		  .forEach((text, _, i) => text.tween({
		      y: {from: height, to: text.y},
		      alpha: {from: 0, to: 1},
		      delay: delay*i,
		  }));

	    const choice = await entries
		  .map((text, key) => text.event('pointerup', () => key))
		  .into(ctx => Promise.race(ctx.values()));

	    entries.forEach(text => text.tween({alpha: 0, onComplete: () => text.destroy()}));
	    return choice;
	};
    },
    grid: ctx => {
	ctx.grid = (x, y, nrows, ncols, stepX, stepY=stepX) => {
	    const RC_XY = Context.range(nrows*ncols)
		  .map(i => [Math.floor(i/ncols), i % ncols])
		  .rename((key, val) => JSON.stringify(val))
		  .map(([row, col]) => {
		      const pos = [
			  col*stepX - 0.5*(ncols-1)*stepX + x,
			  row*stepY - 0.5*(nrows-1)*stepY + y,
		      ];
		      return pos;
		  });
	    return RC_XY;
	};
	ctx.board = (x, y, nrows, ncols, step) => board(ctx, x, y, nrows, ncols, step);
    },
    online: async ctx => {
	ctx.connect = async () => {
	    localStorage.clear();
	    const socket = io();
	    const view = message => Array.isArray(message) ? '[' + message.join(', ') + ']' : message;
	    const server = {
		send: async (channel, message) => {
		    // console.log('client:', view(channel), view(message));
		    const response = await new Promise(res => socket.emit(channel, message, res));
		    // console.log('server:', view(response));
		    return response;
		},
		receive: async channel => {
		    // console.log('client:', 'receive', view(channel));
		    const [message, callback] = await new Promise(res => socket.once(
			channel,
			(message, callback) => res([message, callback]),
		    ));		
		    // console.log('server:', view(message));
		    return [message, callback];
		},
	    };
	    const id = localStorage.getItem('id') || uuidv4(); localStorage.setItem('id', id);
	    const response = await server.send('id', id);
	    return server;
	};
    },
};
export const getEngine = async ({config, defaults}) => await new Context({config, defaults})
    .onto(...Object.values(steps));
