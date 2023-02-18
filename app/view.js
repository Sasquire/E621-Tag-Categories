// Some utilities
function clear_children (node) {
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}
}

function get_selector_value (selector) {
	const index = selector.selectedIndex;
	if (index === -1) {
		return undefined;
	} else {
		return selector[index].value;
	}
}

function get_selector_index (selector, value) {
	if (value === undefined) {
		return 0;
	} else {
		return [...selector.children].findIndex(e => e.value === value) || 0;
	}
}



function make_view () {
	const container = document.createElement('div');
	container.classList.add('view');
	container.appendChild(make_view_header());
	container.appendChild(make_view_body());
	return container;

	function make_view_header () {
		const container = document.createElement('div');
		container.classList.add('view_header');
		container.appendChild(create_view_selector(container));
		container.appendChild(create_close_button(container));
		container.appendChild(create_split_button(container, false));
		container.appendChild(create_split_button(container, true));
		return container;

		function create_split_button (container, split_vertical) {
			const button = document.createElement('button');
			button.textContent = split_vertical ? '-' : '|';
			button.addEventListener('click', e => {
				split_view(container.parentNode, split_vertical);
			});
			return button;

			function split_view (view, split_vertical) {
				const container = make_container(split_vertical);
				view.parentNode.replaceChild(container, view);
				const original = view;
				const new_view = make_view();
				container.appendChild(view);
				container.appendChild(new_view);

				function make_container (split_vertical) {
					const container = document.createElement('div');
					container.classList.add('container');
					if (split_vertical === true) {
						container.classList.add('container_vertical');
					} else {
						container.classList.add('container_horizontal');
					}
					return container;
				}
			}
		}

		function create_close_button (container) {
			const button = document.createElement('button');
			button.textContent = 'X';
			button.addEventListener('click', e => {
				close_view(container.parentNode);
			});
			return button;

			function close_view (view) {
				const container = view.parentNode;
				const other = container.firstChild === view ? container.lastChild : container.firstChild;
				if (container.id !== 'main_body') {
					container.removeChild(view);
					container.parentNode.replaceChild(other, container);
				}
			}
		}

		function create_view_selector (container) {
			const selector = document.createElement('select');
			selector.classList.add('view_selector');
			selector.addEventListener('change', e => {
				select_from_selector(e, container.parentNode.lastChild, selector)
			});
			fill_selector_with_options(selector);
			Files.watch_file_names(() => fill_selector_with_options(selector));
			return selector;

			function select_from_selector (event, body, selector) {
				clear_children(body);
				const value = selector.value;
				const special = get_special_views().find(e => e.name === value);
				if (special !== undefined) {
					body.appendChild(special.make_node());
				} else if (Files.get_file_names().some(e => e.localeCompare(value))) {
					body.appendChild(make_text_editor(value));
				} else {
					throw new Error('Somehow there was an option for a file that doesn\'t exist');
				}
			}

			function make_text_editor (file_name) {
				const editor = document.createElement('textarea');
				editor.value = Files.get_file_content(file_name);
				editor.classList.add('text_editor');
				
				const ms_wait = 1000;
				let last_changed = new Date().getTime();
				editor.addEventListener('keydown', e => {
					editor.classList.add('text_editor_unsaved');

					const now = new Date().getTime();
					last_changed = now;
					setTimeout(() => {
						// If they are different, then there is another timeout
						// waiting. Being the same means typing has stopped.
						if (now === last_changed) {
							Files.update_content(file_name, editor.value);
							editor.classList.remove('text_editor_unsaved');
						}
					}, ms_wait);

					// https://stackoverflow.com/questions/6637341/use-tab-to-indent-in-textarea
					if (e.key == 'Tab') {
						e.preventDefault();
						document.execCommand('insertText', false, '\t');
					}
				});

				Files.watch_specific_file(file_name, () => {
					editor.value = Files.get_file_content(file_name);
				})

				return editor;
			}

			function fill_selector_with_options (selector) {
				const files = Files.get_file_names();
				const special = get_special_views().map(e => e.name);
				const selector_value = get_selector_value(selector);

				clear_children(selector);

				[...files, ...special]
					.map(e => {
						const max_file_name_size = 20;
						const option = document.createElement('option');
						option.value = e;
						option.textContent = e.length > max_file_name_size ? `${e.substring(0, max_file_name_size - 3)}...` : e;
						return option;
					})
					.sort((a, b) => a.textContent.localeCompare(b.textContent))
					.forEach(e => selector.appendChild(e));
				
				selector.selectedIndex = get_selector_index(selector, selector_value);
			}
		}
	}

	function make_view_body () {
		const container = document.createElement('div');
		container.classList.add('view_body');
		return container;
	}
}

function get_special_views () {
	return [{
		name: '--Choose an Option--',
		make_node: () => document.createElement('div')
	}, {
		name: '$; File Manager',
		make_node: () => {
			const container = document.createElement('div');
			container.classList.add('file_manager');
			container.classList.add('children_alternating_colors');
			
			container.appendChild(make_new_file_button());
			Files.get_file_names()
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(e => make_file_select_option(e))
				.forEach(e => container.appendChild(e));

			return container;

			function make_new_file_button () {
				const container = document.createElement('div');
				
				const button = document.createElement('button');
				button.textContent = 'Create\xa0new\xa0file\xa0called\xa0\'$-New\xa0File\'';
				button.addEventListener('click', e => Files.create('$-New File'));
				
				container.appendChild(button);
				return container;
			}

			function make_file_select_option (name) {
				const container = document.createElement('div');
				container.classList.add('file_manager_option');

				container.appendChild(create_title(name));
				container.appendChild(create_delete_button());
				const rename = create_rename_elements();
				container.appendChild(rename[0]);
				container.appendChild(rename[1]);
				return container;

				function create_title (name) {
					const title = document.createElement('span');
					title.textContent = name;
					return title;
				}

				function create_delete_button () {
					const button = document.createElement('button');
					button.textContent = 'Delete\xa0File';
					button.addEventListener('click', e => {
						const file_name = e.target.parentNode.firstChild.textContent;
						Files.delete(file_name);
					});
					return button;
				}

				function create_rename_elements () {
					const new_name = document.createElement('input');
					new_name.type = 'text';
					new_name.placeholder = 'New filename';

					const button = document.createElement('button');
					button.textContent = 'Rename\xa0File';
					button.addEventListener('click', e => {
						const file_name = e.target.parentNode.firstChild.textContent;
						const new_name = e.target.parentNode.querySelector('input').value;
						Files.rename(file_name, new_name);
					});

					return [button, new_name];
				}
			}
		}
	}, {
		name: '$: Tag Matching',
		make_node: () => {
			const container = document.createElement('div');
			container.classList.add('tag_matching');
			container.classList.add('children_alternating_colors');
			
			SiteTags.get_tags_with_counts()
				.sort((a, b) => b[1] - a[1])
				.forEach(([tag, count]) => container.appendChild(create_row(tag, count)));

			return container;

			function create_row (tag, count) {
				const container = document.createElement('div');
				container.classList.add('tag_matching_row');

				const count_container = document.createElement('span');
				count_container.textContent = count.toLocaleString();

				const tag_container = document.createElement('span');
				tag_container.textContent = tag;
				if (Compiler.is_tag_present(tag) === true) {
					tag_container.classList.add('used_tag');
				} else {
					tag_container.classList.add('unused_tag');
				}

				container.appendChild(tag_container);
				container.appendChild(count_container);
				return container;
			}
		}
	}, {
		name: '$: Global Tag Sets',
		make_node: () => {
			const container = document.createElement('div');
			container.classList.add('tag_sets');
			container.classList.add('children_alternating_colors');

			Object.entries(Compiler.get_compiled_results().main)
				.sort((a, b) => a[0].localeCompare(b[0]))
				.forEach(([key, value]) => {
					container.appendChild(create_row(key, false, false));
					[...value]
						.sort((a, b) => a[0].localeCompare(b[0]))
						.map(e => create_row(e, true, true))
						.forEach(e => container.appendChild(e));
				});

			return container;
			
			function create_row (name, should_indent, is_tag) {
				const container = document.createElement('div');
				container.textContent = name;
				if (should_indent === true) {
					container.classList.add('tag_sets_indented');
				}
				if (is_tag === true) {
					if (SiteTags.is_tag_on_site(name) === true) {
						container.classList.add('used_tag');
					} else {
						container.classList.add('unused_tag');
					}
				} else {
					container.classList.add('tag_sets_set_name');
				}
				return container;
			}
		}
	}, {
		name: '$; Export/Import',
		make_node: () => {
			const container = document.createElement('div');
			container.classList.add('import_export');
			container.appendChild(make_download_structure_button());
			container.appendChild(make_download_output_button());
			container.appendChild(make_upload_structure_field());
			return container;

			function make_download_structure_button () {
				const button = document.createElement('button');
				button.textContent = 'Download\xa0the\xa0current\xa0file\xa0structure';
				button.addEventListener('click', e => {
					download_json(Files.get_file_object(), `e621_tag_categories_source_${new Date().toISOString()}.json`)
				});
				return button;
			}

			function make_download_output_button () {
				const button = document.createElement('button');
				button.textContent = 'Download\xa0the\xa0current\xa0compiled\xa0output';
				button.addEventListener('click', e => {
					download_json(Compiler.get_compiled_results(), `e621_tag_categories_compiled_${new Date().toISOString()}.json`)
				});
				return button;
			}

			// TODO more feedback should be given to the user that
			// they have successfully imported the file
			function make_upload_structure_field () {
				const container = document.createElement('div');
				const message = document.createElement('span');
				message.textContent = 'Upload\xa0file\xa0structure\xa0from\xa0file';
				container.appendChild(message);
				container.appendChild(document.createElement('br'));
				container.appendChild(create_upload_form())
				return container;

				// https://github.com/Sasquire/Idems-Sourcing-Suite/blob/master/source/utils/nodes.js
				function create_upload_form () {
					const file_box = document.createElement('input');
					file_box.type = 'file';
					file_box.addEventListener('change', () => {
						read_blob(file_box.files[0])
							.then(e => Files.set_file_object(e))
							.then(e => file_box.value = '');
					});
				
					return file_box;

					// https://stackoverflow.com/questions/19706046/how-to-read-an-external-local-json-file-in-javascript
					async function read_blob (blob) {
						return new Promise((resolve, reject) => {
							const reader = new FileReader();
							reader.onload = (e) => {
    									const content = e.target.result;
    									resolve(JSON.parse(content));
  									};
  									reader.readAsText(blob);
						});
					}
				}
			}

			function download_json (json_object, filename) {
				// https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
				const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json_object, Set_toJSON, '\t'));
				const anchor = document.createElement('a');
				anchor.setAttribute('href', dataStr);
				anchor.setAttribute('download', filename);
				anchor.click();

				// https://stackoverflow.com/questions/31190885/json-stringify-a-set
				function Set_toJSON(key, value) {
				  	if (typeof value === 'object' && value instanceof Set) {
					  	return [...value];
					}
					return value;
				}
			}
		}
	}];
}

async function init () {
	await Files.load_files();
	await SiteTags.load_tags();
	await Compiler.compile_files();
	document.getElementById('main_body').appendChild(make_view());
	
	// Recompile whenever a file changes
	Files.watch_for_any_file_change(() => Compiler.compile_files());
	Files.watch_file_names(() => {
		update_all_views_named('file_manager', '$; File Manager');
	});
	
	Compiler.watch_compiled_tag(() => {
		update_all_views_named('tag_sets', '$: Global Tag Sets');
		update_all_views_named('tag_matching', '$: Tag Matching');
	});
	
	// https://stackoverflow.com/questions/11000826/ctrls-preventdefault-in-chrome
	document.addEventListener('keydown', function(e) {
		if (e.key === 's' && (navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey)) {
			e.preventDefault();
		}
	}, false);

	function update_all_views_named (classname, node_name) {
		[...document.getElementsByClassName(classname)]
			.forEach(e => {
				clear_children(e);
				e.appendChild(get_special_views()
					.find(e => e.name === node_name)
					.make_node());
			});
	}
}

init();