const parser = require('./../source/parser.js');
const tokenizer = require('./tokenizer.js');
const loader = require('./loader.js');
const errors = require('./errors.js');

function compile_file (file_dictionary) {
	const trees = {};
	for (const [file_name, file_contents] of Object.entries(file_dictionary)) {
		const tokens = tokenize(file_name, file_contents);
		const tree = parse(file_name, tokens);
		trees[file_name] = {
			tree: tree,
			name: file_name,
			loaded: 'false'
		};
	}

	const state = {
		main: {}
	};
	for (const file_name of Object.keys(trees)) {
		load_file(state, trees, trees[file_name]);
	}

	return state;
}

function load_file (global_state, all_trees, this_tree) {
	if (this_tree.loaded === 'true') {
		// Do nothing
	} else if (this_tree.loaded === 'attempted') {
		throw new errors.RecursiveLoad(this_tree.name);
	} else if (this_tree.loaded === 'false') {
		// TODO can this while loop be avoided?
		this_tree.loaded = 'attempted';
		while (true) {
			try {
				loader.load_tree(global_state, this_tree.name, this_tree.tree);
				this_tree.loaded = 'true';
				return;
			} catch (e) {
				if (e instanceof errors.FileNotLoaded) {
					load_file(global_state, all_trees, all_trees[e.file_to_try]);
				} else {
					throw e;
				}
			}
		}
	} else {
		throw new Error(`While loading ${this_tree.name} encountered an unknown load-state.`);
	}
}

function tokenize (file_name, string) {
	try {
		return tokenizer.tokenize(string);
	} catch (e) {
		throw new errors.CouldNotTokenize(file_name, string, e);
	}
}

function parse (file_name, tokens) {
	try {
		return parser.parse_tokens(tokens);
	} catch (e) {
		throw new errors.CouldNotParse(file_name, tokens, e);
	}
}

// eslint-disable-next-line no-unused-vars
function state_to_output (state) {
	const return_object = {};
	for (const [file_name, file_state] of Object.entries(state)) {
		return_object[file_name] = {};
		for (const [set_name, set_contents] of Object.entries(file_state)) {
			return_object[file_name][set_name] = {};
			for (const set_item of set_contents) {
				return_object[file_name][set_name][set_item] = {};
			}
		}
	}
	return return_object;
}

module.exports = {
	compile: compile_file
};
