import { Context } from './context.js';

const steps = {
    init: ctx => {
	const ff = new Context(); // funcs
	const dd = new Context(); // dists
	const mm = new Context(); // marked

	ctx.funcs = dict => ff.remove(...ff.keys()).assign(dict).into(_ => ctx);
	ctx.dists = dict => dd.remove(...ff.keys()).assign(dict).into(_ => ctx);
	ctx.mark = dict => mm.remove(...mm.keys()).assign(dict).into(_ => ctx);
	ctx.raw = dict => x => mm
	    .map((yy, k) => Math.min(...yy.map(y => dd[k](y, ff[k](x)))))
	    .map((d, k) => dict[k]?.(d))
	    .into(ctx => ctx.values().every(u => u));
	ctx.spread = dict => (...x) => ctx.raw(dict)(x);
    },
};

export const mspace = () => new Context().onto(...Object.values(steps));
