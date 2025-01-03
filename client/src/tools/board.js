import { Context } from './context.js';

const steps = {
    0: ctx => {
	const {engine, x, y, nrows, ncols, step} = ctx;

	const layers = new Context();
	const configs = new Context();
	const create = (x, y, key) => engine.sprite(x, y, key).setDisplaySize(0.90*step, 0.9*step);

	ctx.configure = settings => { configs.assign(settings); return ctx; };
	ctx.create = settings => {
	    new Context(settings)
		.map((spritekey, layer) => engine
		     .grid(x, y, nrows, ncols, step)
		     .map(([x, y]) => create(x, y, spritekey)))
		.onto(grids => layers.assign(grids));
	    
	    return ctx;
	};
	ctx.fset = (layer, func) => {	    
	    layers[layer].forEach((sprite, pos) => {
		const [row, col] = JSON.parse(pos);
		ctx.replace(layer, row, col, func(row, col), false);
	    });
	    return ctx;
	};
	ctx.layer = layer => layers[layer];
	ctx.get = (layer, ...pos) => ctx.layer(layer)[JSON.stringify(pos)];
	ctx.replace = async (layer, row, col, key, animate=true) => {
	    const pos = JSON.stringify([row, col]);
	    const remove = layers[layer][JSON.stringify([row, col])];
	    const insert = create(remove.x, remove.y, key);
	    layers[layer][pos] = insert;
	    if (animate) { await configs[layer]?.replace?.(remove, insert); }
	    remove.destroy();
	};
	ctx.cycle = async (layer, steps, ...positions) => {
	    const spositions = positions.map(p => JSON.stringify(p));
	    const targets = layers[layer].narrow(...spositions);
	    const len = targets.keys().length;
	    const cycled = targets.map((target, _, i) =>
		targets.values()[(i + steps + Math.abs(steps)*len) % len]);
	    layers[layer].assign(cycled);		
	    await targets.map(async (target, _, i) => {
		const {x, y} = cycled.values()[i];
		await configs[layer]?.move?.(target, x, y);
		target.x = x; target.y = y;
	    }).into(ctx => Promise.all(ctx.values()));
	};
	ctx.swap = async (layer, ...positions) => await ctx.cycle(layer, 1, ...positions);
	ctx.destroy = () => layers.forEach(layer => layer.forEach(sprite => sprite.destroy()));
	ctx.hide = async (...layerkeys) => {
	    await layers
		.narrow(...layerkeys)
		.map(async (layer, key) => await layer
		     .map((_, spos) => JSON.parse(spos))
		     .map(async p => await ctx.replace(key, ...p))
		     .into(ctx => Promise.all(ctx.values())));
	};
    },
};

export const board = (engine, x, y, nrows, ncols, step) =>
new Context({engine, x, y, nrows, ncols, step}).onto(...Object.values(steps));
