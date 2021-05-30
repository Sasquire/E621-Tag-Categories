const path = require('path');

// Converts the tags file (found at https://e621.net/db_export/)
// into a json file that is useable by the various views
const tags_to_json = require('./tags_to_json.js');

function main () {
	tags();
}

function tags () {
	tags_to_json(
		path.join('external', 'site_tags.csv'), // CSV input file
		path.join('source', 'views', 'shared', 'site_tags.json'), { // JSON output file
			// Could reduce the minimum later, but currently having a low
			// minimum makes the main page slow when viewing all tags.
			// The vast majority of "important" tags have over 1000 count
			// anyways.
			minimum_tag_count: 1000,

			// More tag types could be accepted, but this is what I thought
			// was the most important when creating this
			accepted_tag_types: [
				0, // general
				// 1, // artist
				// 2, // unused
				// 3, // copyright
				// 4, // character
				// 5, // species
				// 6, // invalid
				7, // meta
				8 // lore
			]
		}
	);
}

module.exports = main;
