const tinynlp = require('./tinynlp.js');
const fs = require('fs');

const grammar = new tinynlp.Grammar([
	'Start -> Start Complete_Set | Complete_Set',

	'Complete_Set -> Set_Header Set_Expression',
	'Complete_Set -> Set_Header Color Set_Expression',

	'Set_Expression -> op Set_Expression UNION Set_Expression cp',
	'Set_Expression -> op Set_Expression MINUS Set_Expression cp',
	'Set_Expression -> op Set_Expression RIGHT Set_Expression cp',

	'Set_Expression -> op Set_Expression INNER Set_Expression cp',
	'Set_Expression -> op Set_Expression OUTER Set_Expression cp',
	'Set_Expression -> op Set_Expression CROSS Set_Expression cp',

	'Set_Expression -> op Set_Expression cp',

	'Set_Expression -> Set_Literal | Set_Named'
]);

grammar.terminalSymbols = (token) => {
	if((/\[\w+\]/u).test(token)){
		return ['Set_Header'];
	} else if((/<\w+>/u).test(token)){
		return ['Set_Named'];
	} else if((/^~......$/u).test(token)){
		return ['Color'];
	} else if(token == '('){
		return ['op'];
	} else if(token == ')'){
		return ['cp'];
	} else {
		return ['Set_Literal'];
	}
};

function get_tokens(){
	const raw_tokens = fs
		.readFileSync('./categories.txt', 'utf8')
		.split('\n')
		.map(e => e.split(/\s+/u))
		.map(e => { // Remove comments
			const first_pound = e.findIndex(s => s.charAt(0) === '#');
			if(first_pound == -1){
				return e;
			} else {
				return e.filter((p, i) => i < first_pound);
			}
		})
		.reduce((acc, e) => [...acc, ...e], []) // Flatten
		.filter(e => e);

	// Convert tag literals to a single string
	const tokens = [];
	for(let i = 0; i < raw_tokens.length; i++){
		const token = raw_tokens[i];
		if(token === '{'){
			i++;
			const tag_literal = [];
			while(raw_tokens[i] != '}'){
				tag_literal.push(raw_tokens[i++]);
			}
			tokens.push(tag_literal.join(' '));
		} else {
			tokens.push(token);
		}
	}

	return tokens;
}

function make_sets(start_node){
	const sets = {};
	parse_start(start_node);
	return sets;

	function parse_start(node){
		// Node.root == 'Start'
		if(node.subtrees[0].root == 'Start'){
			parse_start(node.subtrees[0]);
			parse_complete(node.subtrees[1]);
		} else {
			parse_complete(node.subtrees[0]);
		}
	}

	function parse_complete(node){
		// Node.root == 'Complete_set'
		const title = node.subtrees[0].subtrees[0].root[0].slice(1, -1);
		if(node.subtrees.length == 2){
			sets[title] = {};
			sets[title].name = title;
			sets[title].values = parse_set_expression(node.subtrees[1]);
		} else {
			// Has color
			sets[title] = {};
			sets[title].name = title;
			sets[title].values = parse_set_expression(node.subtrees[2]);
			sets[title].color = node.subtrees[1].subtrees[0].root[0].slice(1);
		}
	}

	function parse_set_expression(node){
		// Node.root == 'Set_Expression'
		if(node.subtrees.length == 1){
			// Parse literal/named
			const single = node.subtrees[0];
			if(single.root == 'Set_Literal'){
				return new Set(single.subtrees[0].root[0].split(' '));
			} else {
				const set_name = single.subtrees[0].root[0].slice(1, -1);
				return sets[set_name].values;
			}
		} else if(node.subtrees.length == 3){
			// Single closed
			return parse_set_expression(node.subtrees[1]);
		} else if(node.subtrees.length == 5){
			// Has operator
			const [_, n1, opp, n2, $] = node.subtrees;
			const v1 = parse_set_expression(n1);
			const v2 = parse_set_expression(n2);
			return operate(v1, v2, opp.root);
		} else {
			return undefined; // Doesnt happen
		}
	}
}

function arrayify_sets(sets){
	const array_sets = Object.values(sets).map(value => ({
		title: value.name,
		color: value.color,
		tags: Array.from(value.values)
	}));

	fs.writeFileSync('./tag.json', JSON.stringify(array_sets, null, 2));
	return array_sets;
}

function get_known_tags(){
	const known = {};

	fs.readFileSync('./tags_with_count.ssv', 'utf8')
		.split('\n')
		.filter(e => e)
		.map(e => e.split(' '))
		.forEach(e => (known[e[0]] = parseInt(e[1], 10)));

	return known;
}

function get_unused_tags(sets, known){
	const used_tags = new Set();

	Object.values(sets).forEach(value => {
		if(value.name.charAt(0) == '_'){
			// Do nothing because _ means hidden
		} else {
			Array.from(value.values).forEach(e => used_tags.add(e));
		}
	});

	return Object.entries(known)
		.map(([name, value]) => ({
			name: name,
			count: value
		}))
		.sort((a, b) => a.count - b.count) // Sort descending
		.filter(e => used_tags.has(e.name) == false);
}


const parsed_tokens = get_tokens();
const chart = tinynlp.parse(parsed_tokens, grammar, 'Start');
const tree = chart.getFinishedRoot('Start').traverse()[0];
const parsed_sets = make_sets(tree);
arrayify_sets(parsed_sets);
const known_tags = get_known_tags();

if(process.argv[3] != 'silent'){
	get_unused_tags(parsed_sets, known_tags)
		.forEach(e => console.log(`Tag ${e.name} (${e.count}) is unused`));
}



console.log();

/* Maybe put this back in later
if(process.argv[3] == 'unkown'){
	Object.entries(sets).map(([name, value]) => {
		if(name.charAt(0) == '_'){ return []; }
		Array.from(value).forEach(e => {
			const count = known_tags[e];
			if(count == undefined){
				console.log(`Tag ${e} is unknown`);
			}
		});
	});
} */



function union(a, b){
	return new Set([...a, ...b]);
}

function intersection(a, b){
	return new Set([...a].filter(e => b.has(e)));
}

function complement(a, b){
	return new Set([...b].filter(e => !a.has(e)));
}

function left(a, b){
	return complement(b, a);
}

function right(a, b){
	return complement(a, b);
}

function outer(a, b){
	return union(left(a, b), right(a, b));
}

function cross(a, b){
	const a_arr = [...a];
	const b_arr = [...b];
	const cross_prod = a_arr
		.map(e => b_arr.map(p => e.toString() + p.toString()))
		.reduce((acc, e) => [...acc, ...e]);

	return new Set(cross_prod);
}

function operate(a, b, name){
	switch (name){
		case 'UNION': return union(a, b);
		case 'MINUS': return left(a, b);
		case 'RIGHT': return right(a, b);

		case 'INNER': return intersection(a, b);
		case 'OUTER': return outer(a, b);
		case 'CROSS': return cross(a, b);
		default: return undefined; // Shouldnt happen
	}
}
