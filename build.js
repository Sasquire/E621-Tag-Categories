const browserify = require('browserify');
const path = require('path');
const fs = require('fs');

// 
/* Quick command to auto-generate the popular-tags
TODO make this an actual script that runs automatically
1 is artist
3 is copyright
4 is character
5 is species
7 is meta

sqlite3 -json path_to_database "\
	select \
		name, \
		count_on_active_posts as count \
	from tags \
	where count >= 1000 \
		and category != 1 \
		and category != 3 \
		and category != 4 \
		and category != 5 \
		and category != 7 \
	order by count desc;" \
> ./app/popular_tags.json

*/

browserify()
	.add(path.join('.', 'source', 'webpack_entry.js'))
	.bundle()
	.pipe(fs.createWriteStream(path.join('.', 'app', 'compiler.js')))
	.on('finish', () => console.log('Bundled compiler for web version'))
	.on('error', () => console.log('There was an error bundling compiler for web version'));

// TODO have output from the compiled data end up somewhere
