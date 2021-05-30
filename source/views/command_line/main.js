const compiler = require('./../../compiler/compiler.js');
const site_tags = require('./../shared/site_tags.json');
const set_definition = require('./../shared/sets_source.json');

function get_unused_tags (sets, known) {
	const used_tags = new Set();

	Object.values(sets).forEach(value => {
		Array.from(value).forEach(e => used_tags.add(e));
	});

	return known
		.map(([name, count, type]) => ({
			name: name,
			count: count,
			type: type
		}))
		.sort((a, b) => a.count - b.count) // Sort ascending
		.filter(e => used_tags.has(e.name) === false);
}

const defined_tags = compiler.compile(set_definition).main;
const unused = get_unused_tags(defined_tags, site_tags);

for (const tag of unused) {
	console.log(`Missing ${tag.name} (${tag.count.toLocaleString()})`);
}
