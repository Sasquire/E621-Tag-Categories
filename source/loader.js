const set_operations = require('./../source/set_operations.js');
const errors = require('./errors.js');

function parse_start (global_state, file_name, tree) {
	const [imports, definitions, exports] = new Array(3)
		.fill(undefined)
		.concat(tree.subtrees.map(e => parse_left_recursive_list(e, 0, 1)))
		.splice(-3);

	let local_state = parse_imports(global_state, imports);
	local_state = parse_set_definitions(local_state, definitions || []);
	return add_exports_to_global_state(global_state, local_state, file_name, exports);
}

// Returns a local_state_
function parse_imports (global_state, imports) {
	const local_state = {};
	for (const import_command of (imports || [])) {
		const set_name = import_command.subtrees[1].subtrees[1].subtrees[0].root[0];
		const file_name = import_command.subtrees[3].subtrees[0].root[0];
		if (global_state[file_name] === undefined) {
			throw new errors.FileNotLoaded(file_name);
		} else if (global_state[file_name][set_name] === undefined) {
			throw new Error(`Tried to import from file ${file_name} the set ${set_name} which does not exist`);
		} else {
			local_state[set_name] = global_state[file_name][set_name];
		}
	}
	return local_state;
}

function add_exports_to_global_state (global_state, local_state, file_name, exports) {
	if (global_state[file_name] !== undefined) {
		throw new Error(`Can not overwrite file ${file_name} in global state`);
	} else {
		global_state[file_name] = {};
	}

	exports
		.map(e => ({
			global_export: e.subtrees.length === 3,
			name: e.subtrees.splice(-1)[0].subtrees[1].subtrees[0].root[0]
		}))
		.forEach(e => {
			if (local_state[e.name] === undefined) {
				throw new Error(`Tried to export set ${e.name} from ${file_name} which does not exist`);
			}
			global_state[file_name][e.name] = local_state[e.name];
			if (e.global_export) {
				global_state.main[e.name] = local_state[e.name];
			}
		});

	return global_state;
}

function parse_set_definitions (state, definitions) {
	for (const definition of definitions) {
		const set_name = definition.subtrees[0].subtrees[1].subtrees[0].root[0];
		const set_value = parse_set_expression(state, definition.subtrees[2]);
		state[set_name] = set_value;
	}
	return state;
}

function parse_set_expression (state, set_expression) {
	const set_expressions = {
		set_literal: {
			matches: (len, names) => len === 1 && names[0] === 'Set_Literal',
			work: (state, nodes) => {
				const items = parse_left_recursive_list(nodes[0].subtrees[1], 0, 1)
					.map(e => e.subtrees[0].root[0]);
				return new Set(items);
			}
		},
		named_set: {
			matches: (len, names) => len === 1 && names[0] === 'Named_Set',
			work: (state, nodes) => {
				const set_name = nodes[0].subtrees[1].subtrees[0].root[0];
				if (state[set_name] === undefined) {
					throw new Error(`Tried to access a set ${set_name} which does not exist`);
				} else {
					return state[set_name];
				}
			}
		},
		parenthetical_expression: {
			matches: (len, names) => len === 3 && names[1] === 'Set_Expression',
			work: (state, nodes) => parse_set_expression(state, nodes[1])
		},
		union_operation: {
			matches: (len, names) => len === 3 && names[1] === 'UNION',
			work: (state, nodes) => left_right_operation(state, nodes, set_operations.union)
		},
		intersection_operation: {
			matches: (len, names) => len === 3 && names[1] === 'INTERSECTION',
			work: (state, nodes) => left_right_operation(state, nodes, set_operations.intersection)
		},
		minus_operation: {
			matches: (len, names) => len === 3 && names[1] === 'MINUS',
			work: (state, nodes) => left_right_operation(state, nodes, set_operations.difference)
		},
		cross_operation: {
			matches: (len, names) => len === 3 && names[1] === 'CROSS',
			work: (state, nodes) => left_right_operation(state, nodes, set_operations.cross_product)
		}
	};

	const children = set_expression.subtrees;
	const names = children.map(e => e.root);
	const matching = Object.values(set_expressions)
		.filter(e => e.matches(children.length, names))[0];
	if (matching === undefined) {
		throw new Error(`Could not find a suitable plan to parse this ${set_expression.root[0]} set`);
	} else {
		return matching.work(state, children);
	}

	function left_right_operation (state, nodes, operation) {
		const left = parse_set_expression(state, nodes[0]);
		const right = parse_set_expression(state, nodes[2]);
		return operation(left, right);
	}
}

function parse_left_recursive_list (tree, value_index = 0, tree_index = 1) {
	const value = tree.subtrees[value_index];
	const rest = tree.subtrees[tree_index] ? parse_left_recursive_list(tree.subtrees[tree_index]) : [];
	return [value, ...rest];
}

module.exports = {
	load_tree: parse_start
};
