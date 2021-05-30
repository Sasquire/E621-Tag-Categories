const set_operations = require('./../source/compiler/set_operations.js');
const assert = require('assert');
const describe = require('mocha').describe;
const it = require('mocha').it;
const empty_set = new Set([]);

describe('Set Operations', function () {
	describe('Union', function () {
		const union = set_operations.union;

		it('should return {} with no input', function () {
			assert.deepStrictEqual(union(), empty_set);
		});

		it('{} = {}', function () {
			assert.deepStrictEqual(union(empty_set), empty_set);
		});

		it('{1, 2, 3} = {1, 2, 3}', function () {
			assert.deepStrictEqual(union(new Set([1, 2, 3])), new Set([1, 2, 3]));
		});

		it('{} U {} = {}', function () {
			assert.deepStrictEqual(union(empty_set, empty_set), empty_set);
		});

		it('{1, 2, 3} U {} = {1, 2, 3}', function () {
			assert.deepStrictEqual(union(new Set([1, 2, 3]), empty_set), new Set([1, 2, 3]));
		});

		it('{} U {1, 2, 3} = {1, 2, 3}', function () {
			assert.deepStrictEqual(union(empty_set, new Set([1, 2, 3])), new Set([1, 2, 3]));
		});

		it('{1, 2, 3} U {1, 2, 3} = {1, 2, 3}', function () {
			assert.deepStrictEqual(union(new Set([1, 2, 3]), new Set([1, 2, 3])), new Set([1, 2, 3]));
		});

		it('{1, 2, 3} U {4, 5, 6} = {1, 2, 3, 4, 5, 6}', function () {
			assert.deepStrictEqual(union(new Set([1, 2, 3]), new Set([4, 5, 6])), new Set([1, 2, 3, 4, 5, 6]));
		});

		it('{1, 2, 3} U {3, 4, 5} = {1, 2, 3, 4, 5}', function () {
			assert.deepStrictEqual(union(new Set([1, 2, 3]), new Set([3, 4, 5])), new Set([1, 2, 3, 4, 5]));
		});

		it('{1, 2} U {3, 4} U {5, 6} = {1, 2, 3, 4, 5, 6}', function () {
			assert.deepStrictEqual(union(new Set([1, 2]), new Set([3, 4]), new Set([5, 6])), new Set([1, 2, 3, 4, 5, 6]));
		});
	});

	describe('Intersection', function () {
		const intersect = set_operations.intersection;

		it('should return {} with no input', function () {
			assert.deepStrictEqual(intersect(), empty_set);
		});

		it('{} = {} ', function () {
			assert.deepStrictEqual(intersect(empty_set), empty_set);
		});

		it('{1, 2, 3} = {1, 2, 3}', function () {
			assert.deepStrictEqual(intersect(new Set([1, 2, 3])), new Set([1, 2, 3]));
		});

		it('{} n {} = {}', function () {
			assert.deepStrictEqual(intersect(empty_set, empty_set), empty_set);
		});

		it('{1, 2, 3} n {} = {}', function () {
			assert.deepStrictEqual(intersect(new Set([1, 2, 3]), empty_set), empty_set);
		});

		it('{} n {1, 2, 3} = {}', function () {
			assert.deepStrictEqual(intersect(empty_set, new Set([1, 2, 3])), empty_set);
		});

		it('{1, 2, 3} n {1, 2, 3} = {1, 2, 3}', function () {
			assert.deepStrictEqual(intersect(new Set([1, 2, 3]), new Set([1, 2, 3])), new Set([1, 2, 3]));
		});

		it('{1, 2, 3} n {4, 5, 6} = {}', function () {
			assert.deepStrictEqual(intersect(new Set([1, 2, 3]), new Set([4, 5, 6])), empty_set);
		});

		it('{1, 2, 3} n {3, 4, 5} = {3}', function () {
			assert.deepStrictEqual(intersect(new Set([1, 2, 3]), new Set([3, 4, 5])), new Set([3]));
		});

		it('{1, 2} n {3, 4} n {5, 6} = {}', function () {
			assert.deepStrictEqual(intersect(new Set([1, 2]), new Set([3, 4]), new Set([5, 6])), empty_set);
		});

		it('{0, 1, 2, 7, 8, 9} n {0, 3, 4, 7, 8, 9} n {0, 5, 6, 7, 8, 9} = {0, 7, 8, 9}', function () {
			assert.deepStrictEqual(intersect(new Set([0, 1, 2, 7, 8, 9]), new Set([0, 3, 4, 7, 8, 9]), new Set([0, 5, 6, 7, 8, 9])), new Set([0, 7, 8, 9]));
		});
	});

	describe('Difference', function () {
		const difference = set_operations.difference;

		it('should return {} with no input', function () {
			assert.deepStrictEqual(difference(), empty_set);
		});

		it('{} = {}', function () {
			assert.deepStrictEqual(difference(empty_set), empty_set);
		});

		it('{1, 2, 3} = {1, 2, 3}', function () {
			assert.deepStrictEqual(difference(new Set([1, 2, 3])), new Set([1, 2, 3]));
		});

		it('{} - {} = {}', function () {
			assert.deepStrictEqual(difference(empty_set, empty_set), empty_set);
		});

		it('{1, 2, 3} - {} = {1, 2, 3}', function () {
			assert.deepStrictEqual(difference(new Set([1, 2, 3]), empty_set), new Set([1, 2, 3]));
		});

		it('{} - {1, 2, 3} = {}', function () {
			assert.deepStrictEqual(difference(empty_set, new Set([1, 2, 3])), empty_set);
		});

		it('{1, 2, 3} - {1, 2, 3} = {}', function () {
			assert.deepStrictEqual(difference(new Set([1, 2, 3]), new Set([1, 2, 3])), new Set([]));
		});

		it('{1, 2, 3} - {4, 5, 6} = {1, 2, 3}', function () {
			assert.deepStrictEqual(difference(new Set([1, 2, 3]), new Set([4, 5, 6])), new Set([1, 2, 3]));
		});

		it('{1, 2, 3} - {3, 4, 5} = {1, 2}', function () {
			assert.deepStrictEqual(difference(new Set([1, 2, 3]), new Set([3, 4, 5])), new Set([1, 2]));
		});

		it('{1, 2} - {3, 4} - {5, 6} = {1, 2}', function () {
			assert.deepStrictEqual(difference(new Set([1, 2]), new Set([3, 4]), new Set([5, 6])), new Set([1, 2]));
		});

		it('{0, 1, 2, 7, 8, 9} - {0, 3, 4, 7, 8, 9} - {0, 2, 6, 7, 8, 9} = {1}', function () {
			assert.deepStrictEqual(difference(new Set([0, 1, 2, 7, 8, 9]), new Set([0, 3, 4, 7, 8, 9]), new Set([0, 2, 6, 7, 8, 9])), new Set([1]));
		});
	});

	describe('Cross Product', function () {
		const cross = set_operations.cross_product;

		it('should return {} with no input', function () {
			assert.deepStrictEqual(cross(), empty_set);
		});

		it('{} = {}', function () {
			assert.deepStrictEqual(cross(empty_set), empty_set);
		});

		it('{1, 2, 3} = {1, 2, 3}', function () {
			assert.deepStrictEqual(cross(new Set([1, 2, 3])), new Set(['1', '2', '3']));
		});

		it('{} X {} = {}', function () {
			assert.deepStrictEqual(cross(empty_set, empty_set), empty_set);
		});

		it('{1, 2, 3} X {} = {1, 2, 3}', function () {
			assert.deepStrictEqual(cross(new Set([1, 2, 3]), empty_set), new Set(['1', '2', '3']));
		});

		it('{} X {1, 2, 3} = {1, 2, 3}', function () {
			assert.deepStrictEqual(cross(empty_set, new Set(['1', '2', '3'])), new Set(['1', '2', '3']));
		});

		it('{1} X {2} X {3} X {4} X {5} = {12345}', function () {
			assert.deepStrictEqual(cross(new Set([1]), new Set([2]), new Set([3]), new Set([4]), new Set([5])), new Set(['12345']));
		});

		it('{1, 2, 3} X {1, 2, 3} = {11, 12, 13, 21, 22, 23, 31, 32, 33}', function () {
			assert.deepStrictEqual(cross(new Set([1, 2, 3]), new Set([1, 2, 3])), new Set(['11', '12', '13', '21', '22', '23', '31', '32', '33']));
		});

		it('{1, 2, 3} X {4, 5, 6} = {14, 15, 16, 24, 25, 26, 34, 35, 36}', function () {
			assert.deepStrictEqual(cross(new Set([1, 2, 3]), new Set([4, 5, 6])), new Set(['14', '15', '16', '24', '25', '26', '34', '35', '36']));
		});

		it('{1, 2, 3} X {3, 4, 5} = {13, 14, 15, 23, 24, 25, 33, 34, 35}', function () {
			assert.deepStrictEqual(cross(new Set([1, 2, 3]), new Set([3, 4, 5])), new Set(['13', '14', '15', '23', '24', '25', '33', '34', '35']));
		});

		it('{1, 2} X {3, 4} X {5, 6} = {135, 136, 145, 146, 235, 236, 245, 246}', function () {
			assert.deepStrictEqual(cross(new Set([1, 2]), new Set([3, 4]), new Set([5, 6])), new Set(['135', '136', '145', '146', '235', '236', '245', '246']));
		});

		it('{1, 2, 3} X {4} X {5, 6, 7} = {145, 146, 147, 245, 246, 247, 345, 346, 347}', function () {
			assert.deepStrictEqual(cross(new Set([1, 2, 3]), new Set([4]), new Set([5, 6, 7])), new Set(['145', '146', '147', '245', '246', '247', '345', '346', '347']));
		});
	});
});
