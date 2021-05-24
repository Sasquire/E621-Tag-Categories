const fs = require('fs');
const compiler = require('./source/compiler.js');

function get_known_tags () {
	const known = {};

	fs.readFileSync('./tags_with_count.ssv', 'utf8')
		.split('\n')
		.filter(e => e)
		.map(e => e.split(' '))
		.forEach(e => (known[e[0]] = parseInt(e[1], 10)));

	return known;
}

function get_unused_tags (sets, known) {
	const used_tags = new Set();

	Object.values(sets).forEach(value => {
		Array.from(value).forEach(e => used_tags.add(e));
	});

	return Object.entries(known)
		.map(([name, value]) => ({
			name: name,
			count: value
		}))
		.sort((a, b) => a.count - b.count) // Sort ascending
		.filter(e => used_tags.has(e.name) === false);
}

const set_definition = JSON.parse(fs.readFileSync('./sets_source.json', 'utf8'));
const defined_tags = compiler.compile(set_definition).main;
const unused = get_unused_tags(defined_tags, get_known_tags());

for (const tag of unused) {
	console.log(`Missing ${tag.name} (${tag.count})`);
}

// console.log(defined_tags);
