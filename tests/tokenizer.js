const tokenize = require('./../source/tokenizer.js').tokenize;
const describe = require('mocha').describe;
const it = require('mocha').it;
const assert = require('assert');

describe('Tokenizer', function () {
	it('Properly tokenize-es 1', function () {
		const result = tokenize(`
			<tags> = {
				tag1
				tag2
				tag3
			}
			export <tags>
		`);
		const expected = '< tags > = { tag1 tag2 tag3 } export < tags >'.split(' ');
		assert.deepStrictEqual(result, expected);
	});

	it('Properly tokenize-es 2', function () {
		const result = tokenize(`
			<tags> = {
				tag1
				tag2
				tag3
			}
			<not_tags> = {
				tag_b1
				tag_b2
				tag_b3
			}
			export <tags>
		`);
		const expected = '< tags > = { tag1 tag2 tag3 } < not_tags > = { tag_b1 tag_b2 tag_b3 } export < tags >'.split(' ');
		assert.deepStrictEqual(result, expected);
	});

	it('Properly tokenize-es 3', function () {
		const result = tokenize(`
			<tags_a> = { tag1a tag2a tag3a }
			<tags_b> = { tag1b tag2b tag3b }
			<tags> = <tags_a> UNION <tags_b>
			export <tags>
		`);
		const expected = '< tags_a > = { tag1a tag2a tag3a } < tags_b > = { tag1b tag2b tag3b } < tags > = < tags_a > UNION < tags_b > export < tags >'.split(' ');
		assert.deepStrictEqual(result, expected);
	});

	it('Properly tokenize-es 4', function () {
		const result = tokenize(`
			<tags_a> = { tag1 tag2 tag3 }
			<tags_b> = { tag2 tag3 tag4 }
			<tags> = <tags_a> MINUS <tags_b>
			export <tags>
		`);
		const expected = '< tags_a > = { tag1 tag2 tag3 } < tags_b > = { tag2 tag3 tag4 } < tags > = < tags_a > MINUS < tags_b > export < tags >'.split(' ');
		assert.deepStrictEqual(result, expected);
	});

	it('Properly tokenize-es 5', function () {
		const result = tokenize(`
			<tags_a> = { tag1 tag2 }
			<tags_b> = { tag3 tag4 }
			<tags> = <tags_a> CROSS <tags_b>
			export <tags>
		`);
		const expected = '< tags_a > = { tag1 tag2 } < tags_b > = { tag3 tag4 } < tags > = < tags_a > CROSS < tags_b > export < tags >'.split(' ');
		assert.deepStrictEqual(result, expected);
	});

	it('Properly tokenize-es 6', function () {
		const result = tokenize(`
			<tags> = {
				tag1 <- {tag_a}
				tag2 <- {tag_b}
				tag3 <- {tag_c}
			}
			export <tags>
		`);
		const expected = '< tags > = { tag1 < - { tag_a } tag2 < - { tag_b } tag3 < - { tag_c } } export < tags >'.split(' ');
		assert.deepStrictEqual(result, expected);
	});

	it('Properly tokenize-es 7', function () {
		const result = tokenize(`
			<tags> = {
				tag1 <- {tag_a tag_b tag_c}
				tag2 <- {tag_a tag_b tag_c}
				tag3 <- {tag_a tag_b tag_c}
			}
			export <tags>
		`);
		const expected = '< tags > = { tag1 < - { tag_a tag_b tag_c } tag2 < - { tag_a tag_b tag_c } tag3 < - { tag_a tag_b tag_c } } export < tags >'.split(' ');
		assert.deepStrictEqual(result, expected);
	});

	it('Properly tokenize-es 8', function () {
		const result = tokenize(`
			<requirements_a> = {tag_a}
			<requirements_b> = {tag_b}
			<requirements_c> = {tag_c}
		
			<tags> = {
				tag1 <- <requirements_a> UNION <requirements_b> UNION <requirements_c>
				tag2 <- <requirements_a> UNION <requirements_b> UNION <requirements_c>
				tag3 <- <requirements_a> UNION <requirements_b> UNION <requirements_c>
			}
			export <tags>
		`);
		const expected = '< requirements_a > = { tag_a } < requirements_b > = { tag_b } < requirements_c > = { tag_c } < tags > = { tag1 < - < requirements_a > UNION < requirements_b > UNION < requirements_c > tag2 < - < requirements_a > UNION < requirements_b > UNION < requirements_c > tag3 < - < requirements_a > UNION < requirements_b > UNION < requirements_c > } export < tags >'.split(' ');
		assert.deepStrictEqual(result, expected);
	});

	it('Properly tokenize-es 9', function () {
		const result = tokenize(`
			<tags> = {
				person_a_\\(character\\)
				person_b_\\(character\\)
				person_c_\\(artist\\)
			}
			export <tags>
		`);
		const expected = '< tags > = { person_a_(character) person_b_(character) person_c_(artist) } export < tags >'.split(' ');
		assert.deepStrictEqual(result, expected);
	});
});
