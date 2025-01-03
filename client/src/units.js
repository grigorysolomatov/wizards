import { Context } from './tools/context.js';

const states = {
    init: async ctx => {
	const {verbs} = ctx;

	const [nrows, ncols] = verbs.board.dims();
	const [row, col] = [Math.floor((nrows-1)/2), Math.floor((ncols-1)/2)];

	await verbs.board.create();	

	await verbs.board.replace('units', row, col, 'statue');
	
	verbs.board.replace('units', row, 1, 'portal-red');
	await verbs.board.replace('units', row, ncols-2, 'portal-blue');

	// verbs.board.replace('tiles', row, 2, 'tile-crack');
	// verbs.board.replace('tiles', row, ncols-3, 'tile-crack');	
	
	return 'spawn';
    },
    physics: async ctx => {
	const {verbs} = ctx;
	
	const fallen = await verbs.board.fall();
	
	const end = fallen.values().some(u => u.includes('red') || u.includes('blue'));
	if (end) { return; }
	
	
	// const types = fallen.map(u => u.replace('-red', '').replace('-blue', ''));
	// if (types.values().includes('wizard')) { return; }

	return verbs.state.follow();
    },
    // -------------------------------------------------------------------------
    spawn: async ctx => {
	const {verbs, count=0} = ctx;

	if (count >= 6) {
	    delete ctx.count;
	    const [nrows, ncols] = verbs.board.dims();
	    verbs.board
		.find('units', unit => unit?.includes('portal'))
		.map((_, sp) => JSON.parse(sp))
		.forEach(p => verbs.board.replace('units', ...p));
	    await verbs.board.crack();
	    return 'select';
	} else { ctx.count = count + 1; }

	const color = ['red', 'blue'][verbs.meta.turn()];
	const units = ['portal'].map(unit => `${unit}-${color}`);
	const [row, col] = await verbs.player.choice({
	    mark: {units},
	    enable: {units: d => d === 0},
	});
	verbs.meta.select(row, col);

	ctx.unit = verbs.board.get('units', row, col)
	    .replace('-red', '').replace('-blue', '');

	return ctx.unit;
    },
    spass: async ctx => {
	const {verbs, unit} = ctx;
	
	verbs.meta.pass();
	
	return 'spawn';
    },
    pass: async ctx => {
	const {verbs, unit} = ctx;
	
	verbs.board.crack();
	verbs.meta.pass();
	
	return verbs.state.queue('physics', 'select');
    },
    select: async ctx => {
	const {verbs} = ctx;

	const color = ['red', 'blue'][verbs.meta.turn()];
	const units = ['wizard', 'minotaur', 'hooker', 'book', 'shooter']
	      .map(unit => `${unit}-${color}`);
	const [row, col] = await verbs.player.choice({
	    mark: {units},
	    enable: {units: d => d === 0},
	});
	verbs.meta.select(row, col);

	ctx.unit = verbs.board.get('units', row, col)
	    .replace('-red', '').replace('-blue', '');

	return ctx.unit;
    },
    // -------------------------------------------------------------------------
    wizard: async ctx => {
	const {verbs, unit} = ctx;

	if (verbs.meta.actions() === 3) { return 'start'; }
	if (verbs.meta.actions() === 0) { return 'pass'; }
	
	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d === 1, units: d => d === 0},
	    options: {
		'spawn-book': 'book-spawn',
		'spawn-portal': 'portal-spawn',		
		'pass': 'pass',
	    },
	});
	
	if (typeof choice === 'string') { return choice; }
	
	const p1 = choice;
	verbs.meta.select(...p1);	
	await verbs.board.cjump('units', p0, p1);

	verbs.meta.act();	
	
	return verbs.state.queue('physics', unit);
    },
    minotaur: async ctx => {
	const {verbs, unit} = ctx;

	if (verbs.meta.actions() === 3) { return 'start'; }
	if (verbs.meta.actions() === 0) { return 'pass'; }
	
	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d === 1, units: d => d === 0},
	    options: {push: 'push', 'jump': 'jump', pass: 'pass'},
	});
	
	if (typeof choice === 'string') { return choice; }
	
	const p1 = choice;
	verbs.meta.select(...p1);	
	await verbs.board.cjump('units', p0, p1);

	verbs.meta.act();	
	
	return verbs.state.queue('physics', unit);
    },
    hooker: async ctx => {
	const {verbs, unit} = ctx;

	if (verbs.meta.actions() === 3) { return 'start'; }
	if (verbs.meta.actions() === 0) { return 'pass'; }
	
	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d === 1, units: d => d === 0},
	    options: {pull: 'pull', 'jump': 'jump', pass: 'pass'},
	});
	
	if (typeof choice === 'string') { return choice; }
	
	const p1 = choice;
	verbs.meta.select(...p1);	
	await verbs.board.cjump('units', p0, p1);

	verbs.meta.act();	
	
	return verbs.state.queue('physics', unit);    },
    shooter: async ctx => {
	const {verbs, unit} = ctx;

	if (verbs.meta.actions() === 3) { return 'start'; }
	if (verbs.meta.actions() === 0) { return 'pass'; }
	
	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d === 1, units: d => d === 0},
	    options: {
		'destroy': 'destroy',
		'jump': 'jump',
		'shoot': 'shoot',
		'pass': 'pass',
	    },
	});
	
	if (typeof choice === 'string') { return choice; }
	
	const p1 = choice;
	verbs.meta.select(...p1);	
	await verbs.board.cjump('units', p0, p1);

	verbs.meta.act();	
	
	return verbs.state.queue('physics', unit);    },
    book: async ctx => {
	const {verbs, unit} = ctx;

	if (verbs.meta.actions() === 3) { return 'start'; }
	if (verbs.meta.actions() === 0) { return 'pass'; }
	
	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d === 1, units: d => d === 0},
	    options: {
		'move': 'move',
		'destroy': 'destroy',
		'pass': 'pass',
	    },
	});
	
	if (typeof choice === 'string') { return choice; }
	
	const p1 = choice;
	verbs.meta.select(...p1);	
	await verbs.board.cjump('units', p0, p1);

	verbs.meta.act();	
	
	return verbs.state.queue('physics', unit);    },
    portal: async ctx => {
	const {verbs, unit} = ctx;

	// if (verbs.meta.actions() === 3) { return 'start'; }
	if (verbs.meta.actions() === 0) { return 'pass'; }
	
	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => false},
	    options: {
		'spawn-minotaur': 'minotaur-spawn',
		'spawn-hooker': 'hooker-spawn',
		'spawn-shooter': 'shooter-spawn',
		// 'cancel': 'cancel',
	    },
	});
	
	if (choice === 'cancel') { verbs.meta.unselect(); return 'select'; }
	if (typeof choice === 'string') { return choice; }
	
	const p1 = choice;
	verbs.meta.select(...p1);	
	await verbs.board.cjump('units', p0, p1);

	verbs.meta.act();	
	
	return verbs.state.queue('physics', unit);    },
    // -------------------------------------------------------------------------    
    'start': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d === 1, units: d => d === 0},
	    options: {cancel: 'cancel'},
	});
	
	if (choice === 'cancel') { verbs.meta.unselect(); return 'select'; }

	const p1 = choice;
	verbs.meta.select(...p1);		
	await verbs.board.cjump('units', p0, p1);

	verbs.meta.act();	
	
	return verbs.state.queue('physics', unit);
    },
    'jump': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d == 2, units: d => d === 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return unit; }

	const p1 = choice;
	verbs.meta.select(...p1);
	await verbs.board.cjump('units', p0, p1);
	
	return 'pass';
    },
    'push': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d === 1, units: d => d > 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return unit; }

	const p1 = choice;
	const d = [p1[0] - p0[0], p1[1] - p0[1]];
	const p2 = [p1[0] + d[0], p1[1] + d[1]];
	const p3 = verbs.board.get('units', ...p2) ? p1 : p2;

	await verbs.board.cjump('units', p0, p0);
	await verbs.board.cjump('units', p1, p3);
	
	return 'pass';
    },
    'pull': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const pts = ({
	    get: () => [
		[-1, -1],
		[-1, 0],
		[-1, 1],
		[0, 1],
		[1, 1],
		[1, 0],
		[1, -1],
		[0, -1],
	    ].map(d => [p0[0] + 2*d[0], p0[1] + 2*d[1]]),
 	}).get();
	
	const choice = await verbs.player.choice({
	    mark: {pos: [...pts], units: [undefined]},
	    enable: {pos: d => d === 0, units: d => d > 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return unit; }

	const p1 = choice;
	const d = [p0[0] - p1[0], p0[1] - p1[1]];
	const p2 = [p1[0] + 0.5*d[0], p1[1] + 0.5*d[1]];
	const p3 = verbs.board.get('units', ...p2) ? p1 : p2;

	await verbs.board.cjump('units', p0, p0);
	await verbs.board.cjump('units', p1, p3);
	
	return 'pass';
    },
    'shoot': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const pts = ({
	    get: () => [
		[-1, -1],
		[-1, 0],
		[-1, 1],
		[0, 1],
		[1, 1],
		[1, 0],
		[1, -1],
		[0, -1],
	    ].map(d => [p0[0] + 2*d[0], p0[1] + 2*d[1]]),
 	}).get();
	
	const choice = await verbs.player.choice({
	    mark: {pos: [...pts], units: [undefined]},
	    enable: {pos: d => d === 0, units: d => d > 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return unit; }

	const p1 = choice;
	const d = [p1[0] - p0[0], p1[1] - p0[1]];
	const p2 = [p1[0] + 0.5*d[0], p1[1] + 0.5*d[1]];
	const p3 = verbs.board.get('units', ...p2) ? p1 : p2;

	await verbs.board.cjump('units', p0, p0);
	await verbs.board.cjump('units', p1, p3);
	
	return 'pass';
    },
    'destroy': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined], tiles: ['tile']},
	    enable: {pos: d => d <= 2, tiles: d => d === 0, units: d => d === 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return unit; }

	const p1 = choice;

	verbs.board.replace('tiles', ...p1);
	
	return 'pass';
    },
    'move': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const choice0 = await verbs.player.choice({
	    mark: {pos: [p0], tiles: [undefined]},
	    enable: {pos: d => d <= 2, tiles: d => d > 0},
	    options: {cancel: 'cancel'},
	});

	if (choice0 === 'cancel') { return unit; }

	const p1 = choice0;
	const choice1 = await verbs.player.choice({
	    mark: {pos: [p1], tiles: [undefined]},
	    enable: {pos: d => d === 1, tiles: d => d === 0},
	    options: {cancel: 'cancel'},
	});

	if (choice1 === 'cancel') { return 'move'; }

	const p2 = choice1;
	verbs.board.swap('units', p1, p2);
	await verbs.board.swap('tiles', p1, p2);
	
	return 'pass';
    },
    'spawn-minotaur': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined], tiles: [undefined]},
	    enable: {pos: d => d <= 999, units: d => d === 0, tiles: d => d > 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return unit; }

	const p1 = choice;
	verbs.board.replace('units', ...p1, ['minotaur-red', 'minotaur-blue'][verbs.meta.turn()]);
	
	return 'spass';
    },
    'spawn-hooker': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined], tiles: [undefined]},
	    enable: {pos: d => d <= 999, units: d => d === 0, tiles: d => d > 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return unit; }

	const p1 = choice;
	verbs.board.replace('units', ...p1, ['hooker-red', 'hooker-blue'][verbs.meta.turn()]);
	
	return 'spass';
    },
    'spawn-book': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined], tiles: [undefined]},
	    enable: {pos: d => d <= 999, units: d => d === 0, tiles: d => d > 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return unit; }

	const p1 = choice;
	verbs.board.replace('units', ...p1, ['book-red', 'book-blue'][verbs.meta.turn()]);
	
	return 'spass';
    },
    'spawn-portal': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined], tiles: [undefined]},
	    enable: {pos: d => d <= 999, units: d => d === 0, tiles: d => d > 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return unit; }

	const p1 = choice;
	verbs.board.replace('units', ...p1, ['portal-red', 'portal-blue'][verbs.meta.turn()]);
	
	return 'spass';
    },
    'spawn-shooter': async ctx => {
	const {verbs, unit} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined], tiles: [undefined]},
	    enable: {pos: d => d <= 999, units: d => d === 0, tiles: d => d > 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return unit; }

	const p1 = choice;
	verbs.board.replace('units', ...p1, ['shooter-red', 'shooter-blue'][verbs.meta.turn()]);
	
	return 'spass';
    },
};
export const units = async verbs => await new Context({verbs}).stateMachine(states);

const __HIDE__ = {
    fall: async ctx => {
	const {verbs, unit} = ctx;
	
	await verbs.board.fall();

	const pos = verbs.meta.selected();
	if (!verbs.board.get('units', ...pos)) { return; }
	
	return unit;
    },
};
