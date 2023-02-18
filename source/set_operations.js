const set_operations = {
	union: (...sets) => {
		const all_items = [];
		for (const set of sets) {
			for (const item of set) {
				all_items.push(item);
			}
		}
		return new Set(all_items);
	},

	intersection: (...sets) => {
		if (sets.length === 0) {
			return new Set([]);
		} else if (sets.length === 1) {
			return new Set([...sets[0]]);
		} else {
			const accepted_items = new Set([...sets[0]]);
			for (const this_set of sets.slice(1)) {
				for (const item of accepted_items) {
					if (this_set.has(item) === true) {
						continue;
					} else {
						accepted_items.delete(item);
					}
				}
			}
			return accepted_items;
		}
	},

	difference: (main, ...sets) => {
		if (main === undefined) {
			return new Set([]);
		} else if (sets.length === 0) {
			return new Set([...main]);
		} else {
			const only_in_main = new Set([...main]);
			for (const set of sets) {
				for (const item of set) {
					if (only_in_main.has(item)) {
						only_in_main.delete(item);
					}
				}
			}
			return only_in_main;
		}
	},

	// TODO rewrite this to give a consistent ordering
	cross_product: (...sets) => {
		if (sets.length === 0) {
			return new Set([]);
		}

		sets = sets.filter(e => e.size > 0);
		const values = sets.map(e => ([...e]).map(p => p.toString()));
		const counter = new Array(sets.length).fill(0);
		counter[0] = -1;

		const all_items = [];
		while (increase_counter(0)) {
			const value = counter
				.map((counter_index, index) => values[index][counter_index])
				.reduce((acc, e) => acc + e);
			all_items.push(value);
		}
		return new Set(all_items);

		function increase_counter (index) {
			if (index >= sets.length) {
				return false;
			}

			counter[index] += 1;
			if (counter[index] >= values[index].length) {
				counter[index] = 0;
				return increase_counter(index + 1);
			}

			return true;
		}
	}
};

module.exports = set_operations;
