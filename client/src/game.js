import { Context } from './tools/context.js';
import { mspace } from './tools/mspace.js';
import { subgame } from './subgame.js';

const states = {
    verbs: async ctx => {
	const {external} = ctx;

	const [nrows, ncols] = external.board.dims();
	const makelayer = key => {
	    const layer = Context
		  .range(nrows*ncols)
		  .map(i => [Math.floor(i/ncols), i%ncols])
		  .map(pos => JSON.stringify(pos)).invert()
		  .map(_ => key);
	    return layer;
	};
	const board = {
	    units: makelayer(),
	    tiles: makelayer().map((_, p) => {
		const [row, col] = JSON.parse(p);
		const border = [0, nrows-1].includes(row) || [0, ncols-1].includes(col);
		return border ? undefined : 'tile';
	    }),
	};

	const players = external.players.get();
	const meta = new Context({actions: 3, turn: 0, selected: null});
	const state = {next: null, queue: []};
	
	const verbs = {
	    board: {
		dims: () => external.board.dims(),
		create: async () => {
		    return await external.board.create((row, col) => verbs.board.get('tiles', row, col));
		},
		swap: async (layer, p0, p1) => {
		    const [sp0, sp1] = [p0, p1].map(p => JSON.stringify(p));
		    [board[layer][sp0], board[layer][sp1]] = [board[layer][sp1], board[layer][sp0]];
		    await external.board.swap(layer, p0, p1);
		},
		jump: async (layer, p0, p1) => {
		    const [sp0, sp1] = [p0, p1].map(p => JSON.stringify(p));
		    [board[layer][sp0], board[layer][sp1]] = [board[layer][sp1], board[layer][sp0]];
		    await external.board.jump(layer, p0, p1);		    
		},
		cjump: async (layer, p0, p1) => {
		    const crack = verbs.board.get('tiles', ...p0) === 'tile-crack';
		    const move = p0[0] !== p1[0] || p0[1] !== p1[1];
		    if (crack && move) { verbs.board.replace('tiles', ...p0); }
		    await verbs.board.jump(layer, p0, p1);
		},
		replace: async (layer, row, col, key) => {
		    board[layer][JSON.stringify([row, col])] = key;
		    await external.board.replace(layer, row, col, key);
		},
		get: (layer, row, col) => board[layer][JSON.stringify([row, col])],
		crack: async () => {
		    await board.units
			.map(async (_, pos) => {
			    const [row, col] = JSON.parse(pos);
			    if (verbs.board.get('tiles', row, col) !== 'tile') { return; }
			    if (verbs.board.get('units', row, col) === undefined) { return; }
			    await verbs.board.replace('tiles', row, col, 'tile-crack');
			})
			.into(ctx => Promise.all(ctx.values()));
		},
		fall: async () => {
		    const fall = board.tiles
			  .map((_, pos) => JSON.parse(pos))
			  .filter(([row, col]) => !verbs.board.get('tiles', row, col))
			  .filter(([row, col]) => verbs.board.get('units', row, col));

		    const fallen = fall.map(([row, col]) => verbs.board.get('units', row, col));

		    await fall
			.map(async ([row, col]) => await verbs.board.replace('units', row, col))
			.into(ctx => Promise.all(ctx.values()));

		    return fallen;
		},
		find: (layer, filter) => {
		    return board[layer].filter(filter);
		},
	    },
	    meta: {
		select: (...row_col) => {
		    const [row, col] = row_col;
		    if (meta.selected) { external.board.replace('selects', ...meta.selected); }
		    meta.selected = [row, col];
		    external.board.replace('selects', row, col, 'select');
		},
		unselect: () => {
		    external.board.replace('selects', ...meta.selected);
		    meta.selected = null;
		},
		pass: () => {
		    meta.assign({turn: 1 - meta.turn, actions: 3});
		    verbs.meta.unselect();
		},
		selected: () => meta.selected,
		actions: () => meta.actions,
		act: () => meta.assign({actions: meta.actions - 1}),
		turn: () => meta.turn,
	    },
	    player: {
		choice: async ({mark={pos: []}, enable={}, options={}}) => {
		    const filter = mspace()
			  .funcs({
			      pos: p => p,
			      tiles: p => verbs.board.get('tiles', ...p),
			      units: p => verbs.board.get('units', ...p),
			  })
			  .dists({
			      pos: (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])),
			      tiles: (a, b) => 1*(a !== b),
			      units: (a, b) => 1*(a !== b),
			  })
			  .mark(mark)
			  .spread(enable);
		    return await players[meta.turn].choice(filter, options);
		},
	    },
	    state: {
		queue: (...states) => { state.queue.push(...states); return state.queue.shift(); },
		follow: () => state.queue.shift(),
		chain: (first, next) => { state.next = next; return first},
		next: () => { return state.next},
	    },
	};

	Object.assign(ctx, {verbs});
	await subgame(verbs);
    },
};
export const game = async external => await new Context({external}).onto(...Object.values(states));
