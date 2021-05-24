const compile = require('./../source/compiler.js').compile;
const assert = require('assert');
// https://github.com/mochajs/mocha/issues/956#issuecomment-139654285
const describe = require('mocha').describe;
const it = require('mocha').it;

describe('Basic Parsing', function () {
	it('Can compile a file_dictionary', function () {
		assert.deepStrictEqual(compile({
			first: `
				<tags> = {tag1 tag2 tag3}
				export <tags>
			`,
			second: `
				import <tags> from first
				<not_tags> = {gat1 gat2 gat3}
				export <not_tags>
			`
		}), {
			main: {},
			first: {
				tags: new Set(['tag1', 'tag2', 'tag3'])
			},
			second: {
				not_tags: new Set(['gat1', 'gat2', 'gat3'])
			}
		});
	});

	it('Can import files in the right direction', function () {
		assert.deepStrictEqual(compile({
			a_first: `
				import <b_first_tags> from b_second
				<a_first_tags> = {tag1a tag2a tag3a}
				export <a_first_tags>
			`,
			b_second: `
				import <c_first_tags> from c_third
				<b_first_tags> = {tag1b tag2b tag3b}
				export <b_first_tags>
			`,
			c_third: `
				<c_first_tags> = {tag1c tag2c tag3c}
				export <c_first_tags>
			`
		}), {
			main: {},
			a_first: {
				a_first_tags: new Set(['tag1a', 'tag2a', 'tag3a'])
			},
			b_second: {
				b_first_tags: new Set(['tag1b', 'tag2b', 'tag3b'])
			},
			c_third: {
				c_first_tags: new Set(['tag1c', 'tag2c', 'tag3c'])
			}
		});
	});
});
