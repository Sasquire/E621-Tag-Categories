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
