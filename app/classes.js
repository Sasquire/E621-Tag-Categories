
class Files {
	static global_files = {};
	static name_change_watchers = [];
	static specific_file_watchers = {};
	static any_file_watchers = [];

	static async load_files () {
		const response = await fetch('./tag_category_definitions.json')
			.then(e => e.json());

		Files.set_file_object(response);
	}
	
	static delete (file_name, run_callbacks = true) {
		console.log(`Deleting file ${file_name}`);
		delete Files.global_files[file_name];
		if (run_callbacks === true) {
			Files.call_all_name_watchers();
		}
	}

	static rename (old_name, new_name) {
		if (new_name === '') {
			return;
		}
		console.log(`Renaming file ${old_name} to ${new_name}`);
		Files.global_files[new_name] = Files.global_files[old_name];
		Files.delete(old_name, false);
		Files.call_all_name_watchers();
	}

	static create (file_name) {
		console.log(`Creating file ${name}`);
		Files.global_files[file_name] = '';
		Files.call_all_name_watchers();
	}

	static update_content (file_name, content) {
		Files.global_files[file_name] = content;
		Files.file_content_changed(file_name);
	}

	static set_file_object (new_object) {
		Files.global_files = new_object;
		Files.call_all_name_watchers();
		Object.keys(new_object).forEach(name => Files.file_content_changed(name));
	}

	// Getters
	static get_file_content (file_name) {
		return Files.global_files[file_name];
	}

	static get_file_names () {
		return Object.keys(Files.global_files);
	}

	static get_file_object () {
		return Files.global_files;
	}

	// Listeners below
	static watch_file_names (callback) {
		Files.name_change_watchers.push(callback);
	}
	
	static call_all_name_watchers () {
		Files.name_change_watchers.forEach(e => e());
	}

	static watch_specific_file (file_name, callback) {
		if (Files.specific_file_watchers[file_name] === undefined) {
			Files.specific_file_watchers[file_name] = [];
		}

		Files.specific_file_watchers[file_name].push(callback);
	}

	static watch_for_any_file_change (callback) {
		Files.any_file_watchers.push(callback);
	}

	static file_content_changed (file_name) {
		call_everything_watching_file(file_name);
		call_everything_watching_any_file_change();

		function call_everything_watching_file (file_name) {
			if (Files.specific_file_watchers[file_name] !== undefined) {
				Files.specific_file_watchers[file_name].forEach(e => e());
			}
		}

		function call_everything_watching_any_file_change () {
			Files.any_file_watchers.forEach(e => e());
		}
	}
}


class SiteTags {
	static tags_with_counts = {};

	static async load_tags () {
		const all_tags = await fetch('./popular_tags.json')
			.then(e => e.json());
		
		all_tags.forEach(e => {
			SiteTags.tags_with_counts[e.name] = e.count;
		});
	}

	static get_tags_with_counts () {
		return Object.entries(SiteTags.tags_with_counts);
	}

	static is_tag_on_site (tag) {
		return SiteTags.tags_with_counts[tag] !== undefined;
	}
}


class Compiler {
	static compiled_results = {};
	static last_compiled = new Date(0);
	static compiled_tag_watchers = [];

	static compile_files () {
		const files = Files.get_file_object();
		try {
			Compiler.compiled_results = window.compile_file(files);
			Compiler.last_compiled = new Date();
			Compiler.call_all_compiled_tag_watchers();
		} catch (e) {
			// TODO actually deal with errors somehow
			throw e.actual
		}
	}

	static get_compiled_results () {
		const seconds_since_last_update = new Date().getTime() - Compiler.last_compiled.getTime();
		const max_ms_allowed_stale = 10 * 1000;
		if (seconds_since_last_update > max_ms_allowed_stale) {
			Compiler.compile_files();
		}
		return Compiler.compiled_results;	
	}

	static is_tag_present (tag) {
		return Object.values(Compiler.compiled_results.main)
			.some(set => [...set].some(e => e === tag));
	}

	static watch_compiled_tag (callback) {
		Compiler.compiled_tag_watchers.push(callback);
	}

	static call_all_compiled_tag_watchers () {
		Compiler.compiled_tag_watchers.forEach(e => e());
	}
}
