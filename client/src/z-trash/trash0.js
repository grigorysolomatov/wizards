const __HIDE0__ = async () => {
    await verbs.board.replace('units', 3, 4, 'wizard-blue');

    await verbs.board.swap('units', [3, 3], [3, 4]);
    await verbs.board.swap('units', [3, 3], [3, 4]);
    await verbs.board.swap('units', [3, 3], [3, 4]);
    await verbs.board.swap('units', [3, 3], [3, 4]);

    await verbs.board.jump('units', [3, 3], [3, 3]);
    await verbs.board.jump('units', [3, 4], [3, 4]);
    await verbs.board.jump('units', [3, 3], [3, 3]);
    await verbs.board.jump('units', [3, 4], [3, 4]);

    await verbs.board.jump('units', [3, 3], [3, 2]);
    await verbs.board.jump('units', [3, 4], [3, 5]);
    await verbs.board.jump('units', [3, 2], [3, 3]);
    await verbs.board.jump('units', [3, 5], [3, 4]);

    await verbs.board.replace('units', 3, 2, 'ghost-red');
    await verbs.board.replace('units', 3, 5, 'ghost-blue');
    await verbs.board.swap('units', [3, 2], [3, 1]);
    await verbs.board.swap('units', [3, 5], [3, 6]);
    await verbs.board.swap('units', [3, 1], [3, 2]);
    await verbs.board.swap('units', [3, 6], [3, 5]);
};
const __HIDE1__ = {
    main: async ctx => {
	const {verbs} = ctx;
	if (verbs.meta.actions() === 0) { return 'pass'; }
	if (!verbs.meta.selected()) { return 'select'; }
	if (verbs.meta.actions() === 3) { return 'step'; }
	return 'act';
    },
    pass: async ctx => {
	const {verbs} = ctx;
	verbs.meta.pass();
	return 'main';
    },
    select: async ctx => {
	const {verbs} = ctx;

	const [row, col] = await verbs.player.choice({
	    mark: {units: [
		['wizard-red', 'wizard-blue'][verbs.meta.turn()],
		['minotaur-red', 'minotaur-blue'][verbs.meta.turn()],
	    ]},
	    enable: {units: d => d === 0},
	});
	verbs.meta.select(row, col);

	// return await units(verbs);
	return 'main';
    },
    step: async ctx => {
	const {verbs} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d == 1, units: d => d === 0},
	    options: {cancel: 'cancel'},
	});
	
	if (choice === 'cancel') { verbs.meta.unselect(); return 'main'; }

	const p1 = choice;
	verbs.meta.select(...p1);
	verbs.board.replace('tiles', ...p0);
	await verbs.board.jump('units', p0, p1);

	verbs.meta.act();
	
	return 'main';
    },
    act: async ctx => {
	const {verbs} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d == 1, units: d => d === 0},
	    options: {destroy: 'destroy', jump: 'jump', move: 'move', minotaur: 'minotaur-spawn', pass: 'pass'},
	});
	
	if (typeof choice === 'string') { return choice; }
	
	const p1 = choice;
	verbs.meta.select(...p1);
	await verbs.board.jump('units', p0, p1);

	verbs.meta.act();
	
	return 'main';
    },
    destroy: async ctx => {
	const {verbs} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined], tiles: ['tile']},
	    enable: {pos: d => d <= 2, tiles: d => d === 0, units: d => d === 0},
	    options: {cancel: 'cancel'},
	});

	if (choice === 'cancel') { return 'main'; }

	const p1 = choice;

	verbs.board.replace('tiles', ...p1);
	
	return 'pass';
    },
    move: async ctx => {
	const {verbs} = ctx;

	const p0 = verbs.meta.selected();
	const choice0 = await verbs.player.choice({
	    mark: {pos: [p0], tiles: ['tile']},
	    enable: {pos: d => d <= 2, tiles: d => d === 0},
	    options: {cancel: 'cancel'},
	});

	if (choice0 === 'cancel') { return 'main'; }

	const p1 = choice0;
	const choice1 = await verbs.player.choice({
	    mark: {pos: [p1], tiles: [undefined]},
	    enable: {pos: d => d === 1, tiles: d => d === 0},
	    options: {cancel: 'cancel'},
	});

	if (choice1 === 'cancel') { return 'move'; }

	const p2 = choice1;
	verbs.board.swap('tiles', p1, p2);
	verbs.board.swap('units', p1, p2);
	
	return 'pass';
    },
    minotaur: async ctx => {
	const {verbs} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d <= 2, units: d => d === 0},
	    options: {cancel: 'cancel'},
	});	

	if (choice === 'cancel') { verbs.meta.unselect(); return 'main'; }

	const p1 = choice;
	verbs.board.replace('units', ...p1, ['minotaur-red', 'minotaur-blue'][verbs.meta.turn()]);
	
	return 'pass';
    },
    butt: async ctx => {
	const {verbs} = ctx;

	const p0 = verbs.meta.selected();
	const choice = await verbs.player.choice({
	    mark: {pos: [p0], units: [undefined]},
	    enable: {pos: d => d === 1, units: d => d === 0},
	    options: {cancel: 'cancel'},
	});
    },
};
