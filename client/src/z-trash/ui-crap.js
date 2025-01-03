import { Context } from './tools/context.js';

const steps = {
    setup: ctx => {
	const {engine, width, height, nrows, ncols} = ctx;

	ctx.step = 0.9*width/ncols;	
    },
    grid: ctx => {
	const {engine, width, height, nrows, ncols, step} = ctx;
	
	const layers = new Context();
	const configs = new Context();
	const create = (x, y, key) => engine.sprite(x, y, key).setDisplaySize(0.9*step, 0.9*step);
	ctx.grid = {
	    configure: settings => configs.assign(settings),
	    create: (layer, key) => {
		layers[layer] = engine
		    .grid(0.5*width, 0.5*height, nrows, ncols, step)
		    .map(([x, y]) => create(x, y, key));
		
		return layers[layer];
	    },
	    get: layer => layers[layer],
	    replace: async (layer, row, col, key) => {
		const pos = JSON.stringify([row, col]);
		const remove = layers[layer][JSON.stringify([row, col])];
		const insert = create(remove.x, remove.y, key);
		layers[layer][pos] = insert;		
		await configs[layer]?.replace?.(remove, insert);
		remove.destroy();
	    },
	    swap: async (layer, ...positions) => ctx.grid.cycle(layer, 1, ...positions),
	    cycle: async (layer, steps, ...positions) => {
		const spositions = positions.map(p => JSON.stringify(p));
		const targets = layers[layer].narrow(...spositions);
		const len = positions.length;
		const cycled = targets.map((target, _, i) =>
		    targets.values()[(i + steps + Math.abs(steps)*len) % len]);
		layers[layer].assign(cycled);		
		await targets.map(async (target, _, i) => {
		    const {x, y} = cycled.values()[i];
		    await configs[layer]?.move?.(target, x, y);
		    target.x = x; target.y = y;
		}).into(ctx => Promise.all(ctx.values()));
	    },
	};
    },
    click: ctx => {
	const {nrows, ncols} = ctx;
	ctx.create = {
	    tiles: async (layer, key) => {
		await ctx.grid
		    .create(layer, key)
		    .map(async (sprite, pos) => {
			const [r0, c0] = [Math.floor(0.5*(nrows-1)), Math.floor(0.5*(ncols-1))]
			const [r1, c1] = JSON.parse(pos);
			const dist = Math.abs(r1 - r0) + Math.abs(c1 - c0);
			await sprite.setAlpha(0).tween({
			    scale: {from: 0, to: sprite.scale},
			    alpha: 1,
			    delay: 100*dist,			    
			})
		    })
		    .into(ctx => Promise.all(ctx.values()));
	    },
	};
    },
};

export const UI = ctx => new Context(ctx).onto(...Object.values(steps));
