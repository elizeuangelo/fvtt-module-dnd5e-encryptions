const lettersMap = {
	A: 'Y',
	B: 'P',
	C: 'L',
	D: 'T',
	E: 'A',
	F: 'V',
	G: 'K',
	H: 'R',
	I: 'E',
	J: 'Z',
	K: 'G',
	L: 'M',
	M: 'S',
	N: 'H',
	O: 'U',
	P: 'B',
	Q: 'X',
	R: 'N',
	S: 'C',
	T: 'D',
	U: 'I',
	V: 'J',
	W: 'F',
	X: 'Q',
	Y: 'O',
	Z: 'W',
	a: 'y',
	b: 'p',
	c: 'l',
	d: 't',
	e: 'a',
	f: 'v',
	g: 'k',
	h: 'r',
	i: 'e',
	j: 'z',
	k: 'g',
	l: 'm',
	m: 's',
	n: 'h',
	o: 'u',
	p: 'b',
	q: 'x',
	r: 'n',
	s: 'c',
	t: 'd',
	u: 'i',
	v: 'j',
	w: 'f',
	x: 'q',
	y: 'o',
	z: 'w',
};

function getKnownLetters() {
	const letters = [];
	game.users.players.forEach((user) => {
		const known = user.getFlag('dnd5e-encryptions', 'knownLetters');
		if (known) letters.push(...known);
	});
	return new Set(letters);
}

function encryptedGroups(text) {
	const knownLetters = getKnownLetters();
	let groups = '';
	let encrypted = null;
	for (let i = 0; i < text.length; i++) {
		const letter = text[i];
		if (knownLetters.has(letter.toUpperCase())) {
			if (encrypted === true) groups += '</span>';
			if (encrypted !== false) groups += '<span class="decrypted">';
			groups += letter;
			encrypted = false;
		} else {
			if (encrypted === false) groups += '</span>';
			if (encrypted !== true) groups += '<span>';
			groups += lettersMap[letter] || letter;
			encrypted = true;
		}
	}
	if (groups) groups += '</span>';
	return groups;
}

function activateListeners() {
	if (!game.user.isGM) return;
	document.body.addEventListener('click', (event) => {
		let parent = event.target.parentElement;
		if (!parent.classList.contains('encryption')) {
			parent = parent.parentElement;
			if (!parent.classList.contains('encryption')) return;
		}
		const oldState = parent.dataset.show;
		const newState = oldState === 'decrypted' ? 'players' : oldState === 'players' ? 'encrypted' : 'decrypted';
		parent.dataset.show = newState;
	});
}

function makeEncryption(text) {
	const b64 = btoa(text);
	if (game.user.isGM) {
		const encryptedText = text.replace(/./g, (letter) => lettersMap[letter] || letter);
		const element = $(`<a class="encryption gamemaster" data-show="decrypted" data-content="${b64}">
                    ■
                    <span class="decrypted">${text}</span>
                    <span class="encrypted">${encryptedText}</span>
                    <span class="players">${encryptedGroups(text)}</span>
                    ■
                </a>`)[0];
		return element;
	}
	const element = $(`<span class="encryption" data-content="${b64}">${encryptedGroups(text)}</span>`)[0];
	return element;
}

function registerEnricher() {
	const pattern = /@encrypt\[(?<text>[^\]]+)]/gi;
	const enricher = (match, _options) => {
		const text = match.groups.text;
		return makeEncryption(text);
	};
	CONFIG.TextEditor.enrichers.push({ pattern, enricher });
}

function processPrimer(item, options) {
	if (!options.consumeUsage || !item.getFlag('dnd5e-encryptions', 'letter')) return;
	let knownLetters = game.user.getFlag('dnd5e-encryptions', 'knownLetters') || '';
	const letter = item.getFlag('dnd5e-encryptions', 'letter');
	if (knownLetters.includes(letter)) {
		ui.notifications.error('You have already learned to decrypt this letter');
		return false;
	} else knownLetters += letter + letter.toLowerCase();
	game.user.setFlag('dnd5e-encryptions', 'knownLetters', knownLetters);
	ChatMessage.create({ content: `You have learned to decrypt the letter <b>${letter}</b>` });
}

function onUserUpdate(_user, changes) {
	if (!getProperty(changes, 'flags.dnd5e-encryptions')) return;
	const encriptions = document.querySelectorAll('.encryption');
	encriptions.forEach((element) => {
		const text = atob(element.dataset.content);
		element.innerHTML = makeEncryption(text).innerHTML;
	});
}

Hooks.once('setup', registerEnricher);
Hooks.once('ready', activateListeners);
Hooks.on('dnd5e.preItemUsageConsumption', processPrimer);
Hooks.on('updateUser', onUserUpdate);
