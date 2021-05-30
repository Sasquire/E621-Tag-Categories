const convert_external_values = require('./external/convert.js');

const browserify = require('browserify');
const path = require('path');
const fs = require('fs');

try {
	convert_external_values();
	console.log('Converted external data to be in the correct format');
} catch (e) {
	console.log('There was an error converting external values');
	console.log(e);
}

browserify()
	.add(path.join('.', 'source', 'compiler', 'webpack_entry.js'))
	.bundle()
	.pipe(fs.createWriteStream(path.join('.', 'source', 'views', 'shared', 'compiler.js')))
	.on('finish', () => console.log('Bundled compiler for web version'))
	.on('error', () => console.log('There was an error bundling compiler for web version'));
