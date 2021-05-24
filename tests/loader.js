const loader = require('./../source/loader.js');
const parse = require('./../source/parser.js').parse_tokens;
const tokenize = require('./../source/tokenizer.js').tokenize;
const assert = require('assert');
// https://github.com/mochajs/mocha/issues/956#issuecomment-139654285
const describe = require('mocha').describe;
const it = require('mocha').it;

function work (global_state, file_name, string) {
	return loader.load_tree(global_state, file_name, parse(tokenize(string)));
}

describe('Basic Parsing', function () {
	it('Properly ignore comments', function () {
		assert.deepStrictEqual(work({}, 'test', `
			# No inputs needed
			<tags> = { #tags because its a good name
				tag1
				tag2# Could  this be better
				tag3
			}
			# export the correct stuff
			export <tags>

			# done
		`), {
			test: {
				tags: new Set(['tag1', 'tag2', 'tag3'])
			}
		});
	});

	it('Can parse input', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<tags> = {
				tag1
				tag2
				tag3
			}
			export <tags>
		`), {
			test: {
				tags: new Set(['tag1', 'tag2', 'tag3'])
			}
		});
	});

	it('Ignores un-exported values', function () {
		assert.deepStrictEqual(work({}, 'test', `
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
		`), {
			test: {
				tags: new Set(['tag1', 'tag2', 'tag3'])
			}
		});
	});

	it('Can export multiple things', function () {
		assert.deepStrictEqual(work({}, 'test', `
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
			export <not_tags>
		`), {
			test: {
				tags: new Set(['tag1', 'tag2', 'tag3']),
				not_tags: new Set(['tag_b1', 'tag_b2', 'tag_b3'])
			}
		});
	});

	it('Can use sets from multiple files', function () {
		let state = {};
		state = work(state, 'first', `
			<tags> = {
				tag1
				tag2
				tag3
			}
			export <tags>
		`);
		state = work(state, 'second', `
			<not_tags> = {
				tag_b1
				tag_b2
				tag_b3
			}
			export <not_tags>
		`);

		assert.deepStrictEqual(state, {
			first: {
				tags: new Set(['tag1', 'tag2', 'tag3'])
			},
			second: {
				not_tags: new Set(['tag_b1', 'tag_b2', 'tag_b3'])
			}
		});
	});

	it('Can import sets from multiple files', function () {
		let state = {};
		state = work(state, 'first', `
			<tags> = {
				tag1
				tag2
				tag3
			}
			export <tags>
		`);
		state = work(state, 'second', `
			import <tags> from first
			<not_tags> = <tags>
			export <not_tags>
		`);

		assert.deepStrictEqual(state, {
			first: {
				tags: new Set(['tag1', 'tag2', 'tag3'])
			},
			second: {
				not_tags: new Set(['tag1', 'tag2', 'tag3'])
			}
		});
	});

	it('Does not export imported sets', function () {
		let state = {};
		state = work(state, 'first', `
			<tags> = {tag1 tag2 tag3}
			export <tags>
		`);
		state = work(state, 'second', `
			import <tags> from first
			<not_tags> = {gat1 gat2 gat3}
			export <not_tags>
		`);

		assert.deepStrictEqual(state, {
			first: {
				tags: new Set(['tag1', 'tag2', 'tag3'])
			},
			second: {
				not_tags: new Set(['gat1', 'gat2', 'gat3'])
			}
		});
	});
});

describe('Set operations', function () {
	it('UNION Works as expected', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<tags_a> = { tag1a tag2a tag3a }
			<tags_b> = { tag1b tag2b tag3b }
			<tags> = <tags_a> UNION <tags_b>
			export <tags>
		`), {
			test: {
				tags: new Set(['tag1a', 'tag2a', 'tag3a', 'tag1b', 'tag2b', 'tag3b'])
			}
		});
	});

	it('MINUS works as expected', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<tags_a> = { tag1 tag2 tag3 }
			<tags_b> = { tag2 tag3 tag4 }
			<tags> = <tags_a> MINUS <tags_b>
			export <tags>
		`), {
			test: {
				tags: new Set(['tag1'])
			}
		});
	});

	it('CROSS works as expected', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<tags_a> = { tag1 tag2 }
			<tags_b> = { tag3 tag4 }
			<tags> = <tags_a> CROSS <tags_b>
			export <tags>
		`), {
			test: {
				tags: new Set(['tag1tag3', 'tag1tag4', 'tag2tag3', 'tag2tag4'])
			}
		});
	});

	it('Works on a more complex example', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<biblical_sex> = { male female ambiguous }
			<intersex> = { gynomorph andromorph intersex }
			<herms> = (<biblical_sex> CROSS { _herm }) UNION { herm }

			<sexes> = <biblical_sex>
				UNION <intersex>
				UNION <herms>
				UNION { ambiguous_gender }
				MINUS { ambiguous }
			
			export <sexes>
		`), {
			test: {
				sexes: new Set([
					'male', 'female', 'ambiguous_gender',
					'herm', 'male_herm', 'female_herm', 'ambiguous_herm',
					'intersex', 'andromorph', 'gynomorph'
				])
			}
		});
	});
});

/*
describe('Requirements', function () {
	it('Properly requires tags', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<tags> = {
				tag1 <- {tag_a}
				tag2 <- {tag_b}
				tag3 <- {tag_c}
			}
			export <tags>
		`), {
			test: {
				tags: {
					tag1: {
						requires: [
							['tag_a']
						]
					},
					tag2: {
						requires: [
							['tag_b']
						]
					},
					tag3: {
						requires: [
							['tag_c']
						]
					}
				}
			}
		});
	});

	it('Properly requires more than 1 tag', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<tags> = {
				tag1 <- {tag_a tag_b tag_c}
				tag2 <- {tag_a tag_b tag_c}
				tag3 <- {tag_a tag_b tag_c}
			}
			export <tags>
		`), {
			test: {
				tags: {
					tag1: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					},
					tag2: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					},
					tag3: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					}
				}
			}
		});
	});

	it('Properly requires sets', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<requirements> = {tag_a tag_b tag_c}

			<tags> = {
				tag1 <- <requirements>
				tag2 <- <requirements>
				tag3 <- <requirements>
			}
			export <tags>
		`), {
			test: {
				tags: {
					tag1: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					},
					tag2: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					},
					tag3: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					}
				}
			}
		});
	});

	it('Properly requires set expressions', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<requirements_a> = {tag_a}
			<requirements_b> = {tag_b}
			<requirements_c> = {tag_c}

			<tags> = {
				tag1 <- <requirements_a> UNION <requirements_b> UNION <requirements_c>
				tag2 <- <requirements_a> UNION <requirements_b> UNION <requirements_c>
				tag3 <- <requirements_a> UNION <requirements_b> UNION <requirements_c>
			}
			export <tags>
		`), {
			test: {
				tags: {
					tag1: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					},
					tag2: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					},
					tag3: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					}
				}
			}
		});
	});

	it('Properly keeps requirements through unions', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<tags> = {
				tag1 <- {tag_b tag_c}
			} UNION {
				tag2 <- {tag_a tag_c}
			} UNION {
				tag3 <- {tag_a tag_b}
			}
			export <tags>
		`), {
			test: {
				tags: {
					tag1: {
						requires: [
							['tag_b', 'tag_c']
						]
					},
					tag2: {
						requires: [
							['tag_a', 'tag_c']
						]
					},
					tag3: {
						requires: [
							['tag_a', 'tag_b']
						]
					}
				}
			}
		});
	});

	it('Can require tags to an entire set', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<tags> = {
				tag1
				tag2
				tag3
			} <- { tag_a }
			export <tags>
		`), {
			test: {
				tags: {
					tag1: {
						requires: [
							['tag_a']
						]
					},
					tag2: {
						requires: [
							['tag_a']
						]
					},
					tag3: {
						requires: [
							['tag_a']
						]
					}
				}
			}
		});
	});

	it('Can require tags to an entire set', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<requirements> = {tag_a tag_b tag_c}
			<tags> = {
				tag1
				tag2
				tag3
			} <- <requirements>
			export <tags>
		`), {
			test: {
				tags: {
					tag1: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					},
					tag2: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					},
					tag3: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					}
				}
			}
		});
	});

	it('Can require tags to an entire set', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<requirements> = {tag_a tag_b tag_c}
			<tags> = {
				tag1
				tag2
				tag3
			} <- <requirements>
			export <tags>
		`), {
			test: {
				tags: {
					tag1: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					},
					tag2: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					},
					tag3: {
						requires: [
							['tag_a', 'tag_b', 'tag_c']
						]
					}
				}
			}
		});
	});

	it('Requiring self works properly', function () {
		assert.deepStrictEqual(work({}, 'test', `
			<tags> = {
				tag1
				tag2
				tag3
			} <- <self>
			export <tags>
		`), {
			test: {
				tags: {
					tag1: {
						requires: [
							['tag1']
						]
					},
					tag2: {
						requires: [
							['tag2']
						]
					},
					tag3: {
						requires: [
							['tag3']
						]
					}
				}
			}
		});
	});
});
*/
