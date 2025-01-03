import { Context } from './tools/context.js';
import { online } from './online.js';

const root = {
    0: async ctx => {
	const {engine, width, height} = ctx;
	const choice = await engine.menu(0.5*width, 0.5*height, {play: 'Play', learn: 'Learn'});
	return choice;
    },
    play: {
	0: async ctx => {
	    const {engine, width, height} = ctx;
	    const choice = await engine.menu(0.5*width, 0.5*height, {online: 'Online', local: 'Local'});
	    return choice;
	},
	online: {0: async ctx => { await online(ctx.narrow('engine', 'width', 'height')); return '..'; }},
	local: {0: () => '..'},
    },
    learn: {0: () => '..'},
};
export const menu = async ctx => await ctx.treeMachine(root);
