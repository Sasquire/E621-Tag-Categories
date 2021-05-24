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

	return string
		.match(regex)
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
