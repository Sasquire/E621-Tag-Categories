const fs = require('fs');
const csv_parser = require('csv-parser');

async function main (csv_path, json_path, settings) {
	if (fs.accessSync(csv_path) !== fs.constants.F_OK) {
		return;
	}

	const csv = await parse_csv(csv_path);
	const json = csv
		.map(e => ({
			id: parseInt(e.id, 10),
			name: e.name,
			category: parseInt(e.category, 10),
			post_count: parseInt(e.post_count, 10)
		}))
		.filter(e => e.post_count >= settings.minimum_tag_count)
		.filter(e => settings.accepted_tag_types.includes(e.category))
		.filter(e => e.name !== '\x0B') // Odd glitch. Waiting to hear from Kira
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(e => [e.name, e.post_count, e.category]);

	fs.writeFileSync(json_path, JSON.stringify(json));
}

async function parse_csv (file_name) {
	return new Promise((resolve, reject) => {
		const results = [];
		fs.createReadStream(file_name)
			.pipe(csv_parser())
			.on('data', data => results.push(data))
			.on('end', () => resolve(results));
	});
}

module.exports = main;
