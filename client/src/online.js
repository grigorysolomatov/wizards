import { Context } from './tools/context.js';
import { sleep } from './tools/time.js';
import { game } from './game.js';

const steps = {
    connect: async ctx => {
	const {engine, width, height} = ctx;
	
	const msg = engine.text(0.5*width, 0.5*height, 'Finding Opponent').setOrigin(0.5);
	msg.tween({alpha: {from: 0, to: 1}});
	msg.tween({
	    scale: {from: msg.scale, to: 0.8*msg.scale},
	    yoyo: true,
	    repeat: -1,
	});

	const server = await engine.connect();
	const res = await server.send('unplay', 'all');
	await server.send('play', 'random');
	msg.tween({alpha: 0, onComplete: () => msg.destroy()});

	const myNum = Math.random();
	await server.send('dialogue', ['send', 'turndecide', myNum]);
	const theirNum = await server.send('dialogue', ['receive', 'turndecide']);
	const myIdx = 1*(myNum < theirNum);
	
	Object.assign(ctx, {myIdx, server});
    },
    verbs: ctx => {
	ctx.verbs = {};
    },
    board: ctx => {
	const {engine, width, height, verbs} = ctx;

	const [nrows, ncols] = [11, 11];
	const [x, y] = [0.5*width, 0.5*height];
	const step = width/ncols;
	const board = engine.board(x, y, nrows, ncols, step);

	verbs.board = {
	    dims: () => [nrows, ncols],
	    create: async func => {
		board
		    .configure({
			tiles: {
			    replace: async (remove, insert) => {
				remove.tween({alpha: 0, scale: 1.2*remove.scale});
				await insert
				    .setDepth(0)
				    .tween({
					alpha: {from: 0, to: 1},
					scale: {from: 1.2*insert.scale, to: insert.scale},
				    });
			    },
			    move: async (sprite, x, y) => {
				await sprite.tween({x, y});
			    },
			},
			clicks: {
			    replace: async (remove, insert) => {
				remove.tween({alpha: 0});
				await insert
				    .setDepth(100)
				    .tween({scale: {from: 1.5*insert.scale, to: insert.scale}});
			    },
			},
			selects: {
			    replace: async (remove, insert) => {
				remove.tween({alpha: 0});
				await insert
				    .setDepth(100)
				    .tween({scale: {from: 1.5*insert.scale, to: insert.scale}});
			    },
			},
			units: {
			    replace: async (remove, insert) => {
				remove.tween({alpha: 0, scale: 1.2*remove.scale});				
				await insert
				    .setDepth(200 + remove.y)
				    .setOrigin(0.5, 0.9)
				    .setScale(1.2*insert.scale)
				    .tween({scale: {from: 0, to: insert.scale}});
				insert.tween({
				    scaleY: {from: insert.scaleY, to: 1.05*insert.scaleY},
				    yoyo: true,
				    repeat: -1,
				    ease: 'Sine.easeInOut',
				    duration: 1000,
				    delay: Math.random()*1000,
				});
			    },
			    move: async (sprite, x, y) => {
				await sprite.tween({
				    x, y,
				    onUpdate: (tween, target) => target.setDepth(200 + target.y),
				});
			    },
			},
		    })
		    .create({tiles: undefined, clicks: undefined, selects: undefined, units: undefined})
		    .fset('tiles', func);
		
		await board.layer('tiles')
		    .map(async (sprite, pos) => {
			const [r0, c0] = [Math.floor(0.5*(nrows-1)), Math.floor(0.5*(ncols-1))]
			const [r1, c1] = JSON.parse(pos);
			const dist = Math.abs(r1 - r0) + Math.abs(c1 - c0);
			await sprite.setAlpha(0).tween({
			    scale: {from: 0, to: sprite.scale},
			    angle: {from: -90, to: 0},
			    alpha: 1,
			    delay: 100*dist,			    
			})
		    })
		    .into(ctx => Promise.all(ctx.values()));
	    },
	    replace: async (layer, row, col, key) => {
		await board.replace(layer, row, col, key);
	    },
	    cycle: async (layer, steps, ...positions) => {
		await board.cycle(layer, steps, ...positions);
	    },
	    swap: async (layer, ...positions) => {
		await board.swap(layer, ...positions);
	    },
	    jump: async (layer, p0, p1) => {
		const sprite = board.layer(layer)[JSON.stringify(p0)];    
		const {originX, originY} = sprite;
		const sign = Math.floor(Math.random()*2)*2 - 1;
		const scale = sprite.scale;
		sprite.tween({
		    t: {from: 0, to: 1},
		    yoyo: true,
		    duration: 0.5*engine.defaults.tween.duration,
		    onUpdate: (tween, target) => {
			const t = target.t;			   
			sprite
			    .setOrigin(originX, originY + t)
			    .setAngle(sign*10*t)
			    .setScale(scale*(1 + 0.3*t));
		    },
		});
		await board.swap(layer, p0, p1);
	    },
	};
	Object.assign(ctx, {board})
    },
    options: ctx => {
	return;
	const {engine, width, height, verbs} = ctx;

	verbs.options = {
	    choose: async options => {
		const step = width/ncols;
		const [nrows, ncols] = [1, Object.keys(options).length];
		const blah = engine
		      .board(x, y, nrows, ncols, step)
		      .configure({
			  options: {
			      replace: async (remove, insert) => {
				  remove.tween({alpha: 0, scale: 1.2*remove.scale});
				  await insert
				      .setDepth(0)
				      .tween({
					  alpha: {from: 0, to: 1},
					  scale: {from: 1.2*insert.scale, to: insert.scale},
				      });
			      },
			  },
		      })
		      .create({options: 'tile'});
	    },
	};
    },
    players: ctx => {
	const {engine, verbs, board, height, width, server, myIdx} = ctx;

	let buttons = null; // Options
	
	const local = {
	    tile: async (filter=()=>false) => {
		const all = board
		      .layer('clicks')
		      .map((_, pos) => JSON.parse(pos));
		const [row, col] = await all
		      .forEach(([row, col]) => board.replace('clicks', row, col, undefined))
		      .filter(([row, col]) => filter(row, col))
		      .forEach(([row, col]) => board.replace('clicks', row, col, 'click'))
		      .map(async ([row, col]) => board
			   .get('clicks', row, col)
			   .setInteractive()
			   .event('pointerup', () => [row, col]))
		      .into(ctx => Promise.race(ctx.values()));
		all.forEach(([row, col]) => board.replace('clicks', row, col, undefined));
				
		return [row, col];
	    },
	    option: async (options={}) => {
		buttons?.onto(async buttons => {
		    await buttons.hide('options');
		    buttons.destroy();
		});
		
		const [nrows, ncols] = verbs.board.dims();
		const step = width/ncols;
		const [nr, nc] = [1, Object.keys(options).length];
		const [x, y] = [0.5*width, board.get('tiles', nrows-1, ncols-1).y + 1*step];
		buttons = engine
		    .board(x, y, nr, nc, step)
		    .configure({
			options: {
			    replace: async (remove, insert) => {
				remove.tween({alpha: 0, scale: 1.2*remove.scale});
				await insert
				    .setDepth(0)
				    .tween({
					alpha: {from: 0, to: 1},
					scale: {from: 1.2*insert.scale, to: insert.scale},
				    });
			    },
			},
		    })
		    .create({options: undefined});
		const nav = buttons
		      .layer('options')
		      .map((_, __, i) => Object.values(options)[i])
		      .invert().map(p => JSON.parse(p));
		const choice = await nav
		      .forEach((p, k) => buttons.replace('options', ...p, k))
		      .map(([row, col]) => buttons.get('options', row, col).setInteractive())
		      .map(async (button, k, i) => await button.event('pointerup', () => Object.keys(options)[i]))
		      .into(ctx => Promise.race(ctx.values()));
		
		return choice;
	    },
	    choice: async (filter, options) => {
		const choice = await Promise.race([local.tile(filter), local.option(options)]);
		local.tile(); local.option();
		await server.send('dialogue', ['send', 'choice', choice]);
		return choice;
	    },
	};
	const remote = {
	    choice: async () => await server.send('dialogue', ['receive', 'choice'])
	};
	
	verbs.players = {
	    get: () => myIdx===0 ? [local, remote] : [remote, local],
	    // click: async filter => await local.click(filter),
	};
    },
    play: async ctx => {
	const {verbs} = ctx;

	await game(verbs);	
	await sleep(1e+10);
    },
};

export const online = async ctx => await ctx.onto(...Object.values(steps));
