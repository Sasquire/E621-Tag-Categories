(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const parser = require('./parser.js');
const tokenizer = require('./tokenizer.js');
const loader = require('./loader.js');
const errors = require('./errors.js');

function compile_file (file_dictionary) {
	const trees = {};
	for (const [file_name, file_contents] of Object.entries(file_dictionary)) {
		const tokens = tokenize(file_name, file_contents);
		if (tokens.length === 0) {
			continue;
		}
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

},{"./errors.js":2,"./loader.js":3,"./parser.js":4,"./tokenizer.js":7}],2:[function(require,module,exports){
class FileNotLoaded extends Error {
	constructor (file_accessed, ...args) {
		const message = `Tried to access file ${file_accessed} which does not exist in the global state. Try loading it first?`;
		super(message, ...args);
		this.message = message;
		this.file_to_try = file_accessed;
	}
}

class RecursiveLoad extends Error {
	constructor (file_accessed, ...args) {
		const message = `Could not import ${file_accessed} there is a chain that imports itself`;
		super(message, ...args);
		this.message = message;
		this.file_accessed = file_accessed;
	}
}

class CouldNotTokenize extends Error {
	constructor (file, string, actual, ...args) {
		const message = `Encountered an error while tokenizing ${file}.`;
		super(message, ...args);
		this.message = message;
		this.file_accessed = file;
		this.raw_file = string;
		this.actual = actual;
	}
}

class CouldNotParse extends Error {
	constructor (file, tokens, actual, ...args) {
		const message = `Encountered an error while parsing ${file}.`;
		super(message, ...args);
		this.message = message;
		this.file_accessed = file;
		this.tokens = tokens;
		this.actual = actual;
	}
}

class ParseError extends Error {
	constructor (state, tokens, ...args) {
		const last_chart = state.chart.filter(e => e.length > 0).splice(-1)[0];
		const last_item = last_chart.filter(e => e).splice(-1)[0];
		const failed_item_string = (() => {
			const start = last_item.left;
			const end = last_item.right;
			const items = [];
			for (let i = start; i < end; i++) {
				items.push(tokens[i]);
			}
			return items.join(' ');
		})();
		const message = `ParseError, likely happened when trying to parse a ${last_item.lhs} and found ###${failed_item_string}###.`;

		super(message, ...args);
		this.state = state;
		this.tokens = tokens;
	}
}

module.exports = {
	FileNotLoaded: FileNotLoaded,
	CouldNotTokenize: CouldNotTokenize,
	CouldNotParse: CouldNotParse,
	RecursiveLoad: RecursiveLoad,
	ParseError: ParseError
};

},{}],3:[function(require,module,exports){
const set_operations = require('./set_operations.js');
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

},{"./errors.js":2,"./set_operations.js":5}],4:[function(require,module,exports){
const tiny_nlp = require('./tinynlp.js');
const errors = require('./errors.js');

function parse_tokens (tokens) {
	const chart = tiny_nlp.parse(tokens, get_grammar(), 'Start');
	const root = chart.getFinishedRoot('Start');
	if (root === null) {
		throw new errors.ParseError(chart, tokens);
	}
	return root.traverse()[0];
}

function get_grammar () {
	const grammar = new tiny_nlp.Grammar([
		'Named_Set -> oc word cc',

		'Start -> Imports Set_Definitions Exports | Set_Definitions Exports',

		'Imports -> Import_Statement Imports | Import_Statement',
		'Import_Statement -> import Named_Set from word',
		'Exports -> Export_Statement Exports | Export_Statement',
		'Export_Statement -> export Named_Set | global export Named_Set',

		'Set_Definitions -> Set_Definition Set_Definitions | Set_Definition',
		'Set_Definition -> Named_Set eq Set_Expression',

		'Set_Expression -> op Set_Expression cp',
		'Set_Expression -> Set_Expression UNION Set_Expression',
		'Set_Expression -> Set_Expression INTERSECTION Set_Expression',
		'Set_Expression -> Set_Expression CROSS Set_Expression',
		'Set_Expression -> Set_Expression MINUS Set_Expression',
		'Set_Expression -> Set_Literal',
		'Set_Expression -> Named_Set',

		'Set_Literal -> ob Set_Literal_Contents cb',
		'Set_Literal_Contents -> word Set_Literal_Contents | word'
	]);

	grammar.terminalSymbols = (token) => {
		const value = {
			'<': 'oc',
			'>': 'cc',
			'(': 'op',
			')': 'cp',
			'{': 'ob',
			'}': 'cb',
			'[': 'os',
			']': 'cs',
			$: 'do',
			'~': 'ti',
			'*': 'st',
			'-': 'da',
			'=': 'eq'
		}[token];

		return [value || 'word'];
	};

	return grammar;
}

module.exports = {
	parse_tokens: parse_tokens
};

},{"./errors.js":2,"./tinynlp.js":6}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
/* eslint-disable */

//   Copyright 2015 Yurii Lahodiuk (yura.lagodiuk@gmail.com)
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

// In accordance with the Apache 2.0 License, section 4.b
// this is a notice that this code has been modified.
// It has been changed so that it will work cleanly with nodejs
// opting to use module.exports instead of a global variable.
// The original source can be found here
// https://github.com/lagodiuk/earley-parser-js

module.exports =  (function(){
    
    function Grammar(rules) {
        this.lhsToRhsList = {};
        for (var i in rules) {
            var rule = rules[i];
            // "A -> B C | D" -> ["A ", " B C | D"]
            var parts = rule.split('->');
            // "A"
            var lhs = parts[0].trim();
            // "B C | D"
            var rhss = parts[1].trim();
            // "B C | D" -> ["B C", "D"]
            var rhssParts = rhss.split('|');
            if (!this.lhsToRhsList[lhs]) {
                this.lhsToRhsList[lhs] = [];
            }
            for (var j in rhssParts) {
                this.lhsToRhsList[lhs].push(rhssParts[j].trim().split(' '));
            }
            // now this.lhsToRhsList contains list of these rules:
            // {... "A": [["B", "C"], ["D"]] ...}
        }
    }
    Grammar.prototype.terminalSymbols = function(token) {
        return [];
    }
    Grammar.prototype.getRightHandSides = function(leftHandSide) {
            var rhss = this.lhsToRhsList[leftHandSide];
            if (rhss) {
                return rhss;
            }
            return null;
    }
    Grammar.prototype.isEpsilonProduction = function(term) {
        // This is needed for handling of epsilon (empty) productions
        // TODO: get rid of this hardcode name for epsilon productions
        return "_EPSILON_" == term;
    }
    
    //------------------------------------------------------------------------------------
    
    loggingOn = true;
    function logging(allow) {
        loggingOn = allow;
    }

    function Chart(tokens) {
        this.idToState = {};
        this.currentId = 0;
        this.chart = [];
        for (var i = 0; i < tokens.length + 1; i++) {
            this.chart[i] = [];
        }
    }
    Chart.prototype.addToChart = function(newState, position) {
        newState.setId(this.currentId);
        // TODO: use HashSet + LinkedList
        var chartColumn = this.chart[position];
        for (var x in chartColumn) {
            var chartState = chartColumn[x];
            if (newState.equals(chartState)) {
            
                var changed = false; // This is needed for handling of epsilon (empty) productions
                
                changed = chartState.appendRefsToChidStates(newState.getRefsToChidStates());
                return changed;
            }
        }
        chartColumn.push(newState);
        this.idToState[this.currentId] = newState;
        this.currentId++;
        
        var changed = true; // This is needed for handling of epsilon (empty) productions
        return changed;
    }
    Chart.prototype.getStatesInColumn = function(index) {
        return this.chart[index];
    }
    Chart.prototype.countStatesInColumn = function(index) {
        return this.chart[index].length;
    }
    Chart.prototype.getState = function(id) {
        return this.idToState[id];
    }
    Chart.prototype.getFinishedRoot = function( rootRule ) {
		var lastColumn = this.chart[this.chart.length - 1];
		// console.log(this.chart[this.chart.length - 20])
		for(var i in lastColumn) {
            var state = lastColumn[i];
            if(state.complete() && state.getLeftHandSide() == rootRule ) {
                // TODO: there might be more than one root rule in the end
                // so, there is needed to return an array with all these roots
                return state;
            }
        }
        return null;
    }
    Chart.prototype.log = function(column) {
        if(loggingOn == 'a') {
            console.log('-------------------')
            console.log('Column: ' + column)
            console.log('-------------------')
            for (var j in this.chart[column]) {
                console.log(this.chart[column][j].toString())
            }
        }
    }
    
    //------------------------------------------------------------------------------------
    
    function State(lhs, rhs, dot, left, right) {
        this.lhs = lhs;
        this.rhs = rhs;
        this.dot = dot;
        this.left = left;
        this.right = right;
        this.id = -1;
        this.ref = [];
        for (var i = 0; i < rhs.length; i++) {
            this.ref[i] = {};
        }
    }
    State.prototype.complete = function() {
        return this.dot >= this.rhs.length;
    }
    State.prototype.toString = function() {
        var builder = [];
        builder.push('(id: ' + this.id + ')');
        builder.push(this.lhs);
        builder.push('→');
        for (var i = 0; i < this.rhs.length; i++) {
            if (i == this.dot) {
                builder.push('•');
            }
            builder.push(this.rhs[i]);
        }
        if (this.complete()) {
            builder.push('•');
        }
        builder.push('[' + this.left + ', ' + this.right + ']');
        builder.push(JSON.stringify(this.ref))
        return builder.join(' ');
    }
    State.prototype.expectedNonTerminal = function(grammar) {
        var expected = this.rhs[this.dot];
        var rhss = grammar.getRightHandSides(expected);
        if (rhss !== null) {
            return true;
        }
        return false;
    }
    State.prototype.setId = function(id) {
        this.id = id;
    }
    State.prototype.getId = function() {
        return this.id;
    }
    State.prototype.equals = function(otherState) {
        if (this.lhs === otherState.lhs && this.dot === otherState.dot && this.left === otherState.left && this.right === otherState.right && JSON.stringify(this.rhs) === JSON.stringify(otherState.rhs)) {
            return true;
        }
        return false;
    }
    State.prototype.getRefsToChidStates = function() {
        return this.ref;
    }
    State.prototype.appendRefsToChidStates = function(refs) {
    
        var changed = false; // This is needed for handling of epsilon (empty) productions
        
        for (var i = 0; i < refs.length; i++) {
            if (refs[i]) {
                for (var j in refs[i]) {
                    if(this.ref[i][j] != refs[i][j]) {
                    	changed = true;
                    }
                    this.ref[i][j] = refs[i][j];
                }
            }
        }
        return changed;
    }
    State.prototype.predictor = function(grammar, chart) {
        var nonTerm = this.rhs[this.dot];
        var rhss = grammar.getRightHandSides(nonTerm);
        var changed = false; // This is needed for handling of epsilon (empty) productions
        for (var i in rhss) {
            var rhs = rhss[i];
            
            // This is needed for handling of epsilon (empty) productions
            // Just skipping over epsilon productions in right hand side
            // However, this approach might lead to the smaller amount of parsing tree variants
            var dotPos = 0;
            while(rhs && (dotPos < rhs.length) && (grammar.isEpsilonProduction(rhs[dotPos]))) {
            	dotPos++;
            }
            
            var newState = new State(nonTerm, rhs, dotPos, this.right, this.right);
            changed |= chart.addToChart(newState, this.right);
        }
        return changed;
    }
    State.prototype.scanner = function(grammar, chart, token) {
        var term = this.rhs[this.dot];
        
        var changed = false; // This is needed for handling of epsilon (empty) productions
	//	console.log(token)
	//	console.log(grammar.terminalSymbols(token))
        var tokenTerminals = token ? grammar.terminalSymbols(token) : [];
        if(!tokenTerminals) {
            // in case if grammar.terminalSymbols(token) returned 'undefined' or null
            tokenTerminals = [];
        }
        tokenTerminals.push(token);
        for (var i in tokenTerminals) {
            if (term == tokenTerminals[i]) {
                var newState = new State(term, [token], 1, this.right, this.right + 1);
                changed |= chart.addToChart(newState, this.right + 1);
                break;
            }
        }
        
        return changed;
    }
    State.prototype.completer = function(grammar, chart) {
    
        var changed = false; // This is needed for handling of epsilon (empty) productions
        
        var statesInColumn = chart.getStatesInColumn(this.left);
        for (var i in statesInColumn) {
            var existingState = statesInColumn[i];
            if (existingState.rhs[existingState.dot] == this.lhs) {
            
                // This is needed for handling of epsilon (empty) productions
                // Just skipping over epsilon productions in right hand side
                // However, this approach might lead to the smaller amount of parsing tree variants
                var dotPos = existingState.dot + 1;
                while(existingState.rhs && (dotPos < existingState.rhs.length) && (grammar.isEpsilonProduction(existingState.rhs[dotPos]))) {
                  dotPos++;
                }
                
                var newState = new State(existingState.lhs, existingState.rhs, dotPos, existingState.left, this.right);
                // copy existing refs to new state
                newState.appendRefsToChidStates(existingState.ref);
                // add ref to current state
                var rf = new Array(existingState.rhs.length);
                rf[existingState.dot] = {};
                rf[existingState.dot][this.id] = this;
                newState.appendRefsToChidStates(rf)
                changed |= chart.addToChart(newState, this.right);
            }
        }
        
        return changed;
    }
    
    //------------------------------------------------------------------------------------
    
    // Returning all possible correct parse trees
    // Possible exponential complexity and memory consumption!
    // Take care of your grammar!
    // TODO: instead of returning all possible parse trees - provide iterator + callback
    State.prototype.traverse = function() {
        if (this.ref.length == 1 && Object.keys(this.ref[0]).length == 0) {
            // This is last production in parse tree (leaf)
            var subtrees = [];
            if (this.lhs != this.rhs) {
                // prettify leafs of parse tree
                subtrees.push({
                    root: this.rhs,
                    left: this.left,
                    right: this.right
                });
            }
            return [{
                root: this.lhs,
                left: this.left,
                right: this.right,
                subtrees: subtrees
            }];
        }
        var rhsSubTrees = [];
        for (var i = 0; i < this.ref.length; i++) {
            rhsSubTrees[i] = [];
            for (var j in this.ref[i]) {
                rhsSubTrees[i] = rhsSubTrees[i].concat(this.ref[i][j].traverse());
            }
        }
        var possibleSubTrees = [];
        combinations(rhsSubTrees, 0, [], possibleSubTrees);
        var result = [];
        for (var i in possibleSubTrees) {
            result.push({
                root: this.lhs, 
                left: this.left,
                right: this.right,
                subtrees: possibleSubTrees[i]
            })
        }
        return result;
    }
    
    // Generating array of all possible combinations, e.g.:
    // input: [[1, 2, 3], [4, 5]]
    // output: [[1, 4], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5]]
    //
    // Empty subarrays will be ignored. E.g.:
    // input: [[1, 2, 3], []]
    // output: [[1], [2], [3]]
    function combinations(arrOfArr, i, stack, result) {
        if (i == arrOfArr.length) {
            result.push(stack.slice());
            return;
        }
        if(arrOfArr[i].length == 0) {
            combinations(arrOfArr, i + 1, stack, result);
        } else {
            for (var j in arrOfArr[i]) {
                if(stack.length == 0 || stack[stack.length - 1].right == arrOfArr[i][j].left) {
                    stack.push(arrOfArr[i][j]);
                    combinations(arrOfArr, i + 1, stack, result);
                    stack.pop();
                }
            }
        }
    }
    
    //------------------------------------------------------------------------------------
            
    State.prototype.getLeftHandSide = function() {
        return this.lhs;
    }
            
    //------------------------------------------------------------------------------------
    
    function parse(tokens, grammar, rootRule) {
        var chart = new Chart(tokens);
        var rootRuleRhss = grammar.getRightHandSides(rootRule);
        for (var i in rootRuleRhss) {
            var rhs = rootRuleRhss[i];
            var initialState = new State(rootRule, rhs, 0, 0, 0);
            chart.addToChart(initialState, 0);
        }
        for (var i = 0; i < tokens.length + 1; i++) {
        
            var changed = true; // This is needed for handling of epsilon (empty) productions
            
            while(changed) {
                changed = false;
                j = 0;
                while (j < chart.countStatesInColumn(i)) {
                    var state = chart.getStatesInColumn(i)[j];
                    if (!state.complete()) {
                        if (state.expectedNonTerminal(grammar)) {
                            changed |= state.predictor(grammar, chart);
                        } else {
                            changed |= state.scanner(grammar, chart, tokens[i]);
                        }
                    } else {
                        changed |= state.completer(grammar, chart);
                    }
                    j++;
                }
            }
            chart.log(i)
        }
        return chart;
    }    
    
    var exports = {};
    exports.Grammar = Grammar;
    exports.State = State;
    exports.Chart = Chart;
    exports.parse = parse;
    exports.logging = logging;
    return exports;
})();
},{}],7:[function(require,module,exports){
// On tag requirements
// Looking through https://e621.net/db_export/ it appears that
// the {} characters are forbidden from being in a tag name
// (searching with /\}.*,\d+,[^0]+/ returns no results)
// Because of this I will assume no future tags will ever have the
// curly braces in their name
// Furthermore a similar search was done with the square brackets.
// There are some results using square brackets, but only
// character and artist tags which I think are out of the scope of
// this project currently.

// More succinctly
// Tags can not start with - or ~ (they can include them)
// Tags can not contain *
// No tags include #<>%,
// No important tags include {}@[]

// Tags can include !"&'()+,/:;?^
// A single tag includes $

function tokenize (string) {
	const token_characters = '<>(){}[]~!@$%^A&*-=+"\',./?|`';
	const split_characters = ' ';

	const clean_string = preprocess(string);
	const tokens = split_on_values_with_escape_character(clean_string, split_characters, token_characters, '\\');
	return tokens;
}

// Can not split something like `eeee` on `e`. Will return empty array.
function split_on_values_with_escape_character (string, splits, token_characters, escape) {
	// Using regextester.com I was able to perfect this regex by hand
	// here is an attempt to recreate it using code in a way interpretable
	// to actual humans. I hope that the code makes it easier to understand
	// Regex: /((?!\\)[\<\>\(\)\{\}\[\]\#\$\~\*\-])|((\\.)|[^( \n	\r\<\>\(\)\{\}\[\]\#\$\~\*\-)\<\>\(\)\{\}\[\]\#\$\~\*\-])+/g

	// The motive of this regex is to split on all split_characters,
	// and to split _and save_ on all token_characters that are not
	// escaped. This means `<hello>` becomes [<, hello, >]
	// and `\<hello\>` becomes [<hello>]. This allows working with
	// tags that require reserved symbols. Examples include the tags
	// :<, <3, :(, >_>, $, digital_media_(artwork), membrane_(anatomy)

	// What this function started with
	// https://stackoverflow.com/questions/14333706/how-can-i-use-javascript-split-method-using-escape-character

	// Tokens, written so when included in the regex they're escaped
	const tokens = token_characters.split('').map(e => `\\${e}`).join('');

	// Matches a token that is not escaped with the escape variable
	const not_escaped_token_char = `((?!\\\\)[${tokens}])`;

	const escaped_char = `(\\${escape}.)`; // Matches a character that is escaped
	const split_chars = `(${splits}${tokens})`; // Characters that should be split on

	// A non-zero number of (escaped characters or non-split-able characters)
	const word_string = `(${escaped_char}|[^${split_chars}${tokens}])+`;

	// Match (un-escaped token characters or a word (that may contain escaped token chars))
	const regex = new RegExp(`${not_escaped_token_char}|${word_string}`, 'g');

	return (string
		.match(regex) || [])
		.map(e => e.replace(new RegExp(`\\${escape}`, 'g'), ''));
}

function preprocess (string) {
	return string.split('\n')
		.map(e => e.split('#')[0]) // Remove comments
		.map(e => e.split(/\s+/u))
		.flat()
		.filter(e => e)
		.join(' ');
}

module.exports = {
	tokenize: tokenize
};

},{}],8:[function(require,module,exports){
const compiler = require('./compiler.js');
window.compile_file = compiler.compile;

},{"./compiler.js":1}]},{},[8]);
