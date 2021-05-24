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
