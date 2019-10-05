// ==UserScript==
// @name         e621 Better upload
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Implements the [[ tagging_checklist ]] into the upload form of e621
// @author       Sasquire
// @match        *://e621.net/post/upload
// @grant        GM_addStyle
// @grant        GM.addStyle
// ==/UserScript==

function init_css() {
    // https://stackoverflow.com/questions/23608346/how-to-style-a-div-like-the-button-element
    (GM_addStyle || GM.addStyle)(`
        .tag_button {
            display: inline-block;
            margin: 0 2px;
            padding: 2px;
            font-size: 12px;
            font-weight: 400;
            line-height: 1.42857143;
            text-align: center;
            white-space: nowrap;
            vertical-align: middle;
            -ms-touch-action: manipulation;
            touch-action: manipulation;
            cursor: pointer;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            background-image: none;
            border: 1px solid transparent;
            border-radius: 4px;
            text-decoration: none;

            color: #333;
            background-color: #fff;
            border-color: #ccc;
        }
        .space-bottom > td { padding-bottom: 1em; }
        .custom_label { width: 100%; display: block; }
        .custom_tag > input { padding: 2px; }

        .highlit {
            background-color: #288233; /* e621 approval green */
            color: white;
        }

        #upload_preview_img {
            position: fixed;
            max-width: 50vw;
            right: 0px;
            top: 50px;
            max-height: 50vh;
            overflow: initial;
            border: 1px solid white;
        }
    `);
}

// tags is space seperated
function straight_add_tags(tags){
    document.getElementById('post_tags').value += ` ${tags}`
}

function highlight_event(event) {
    highlight_node(event.target);
}

function highlight_node (node) {
    if(event.target.nodeName == 'LABEL'){
        node.parentNode.classList.add('highlit');
    } else {
        node.classList.add('highlit');
    }
}

function add_tag(event) {
    straight_add_tags(event.target.dataset.tags);
    highlight_event(event);
    highlight_node(event.target.parentNode.parentNode);
}

function create_button(text, ...values) {
    const button = string_to_node(`<div class="tag_button" id="button_${text}" data-tags="${values.concat(text).join(' ')}">${text}</div>`);
    button.addEventListener('click', add_tag);
    return button;
}

function string_to_node(string, id = '', enclose = false){
	const temp = document.createElement('div');
	temp.innerHTML = string;
	if(typeof id == 'string' && id != ''){
		temp.id = id;
	}

	return enclose ? temp : temp.children.item(0);
}

function label(text) {
    const node = string_to_node(`<label class="custom_label">${text}</label>`);
    return node;
}

function url_text(text, url) {
    return `<a href="${url}">${text}</a>`;
}

function custom_tag(placeholder) {
    const container = string_to_node(`
        <span class="custom_tag">
            <input form="fakeForm" type="text" placeholder="${placeholder}"></input>
            <div class="tag_button">Add tag</div>
        </span>
    `);

    container.querySelector('div').addEventListener('click', (e) => {
        straight_add_tags(container.querySelector('input').value);
        container.querySelector('input').value = '';
        highlight_node(container.parentNode.parentNode);
    });

    return container;
}

function create_area(title, ...buttons) {
    const spacer = document.getElementsByClassName('spacer-row')[0];
    spacer.parentNode.insertBefore(string_to_node(`
        <table>
        <tr class="space-bottom">
            <td><label>${title}</label></td>
            <td id="area_${title}"></td>
        </tr>
        </table>
    `).querySelector('tr'), spacer);
    // querySelector must be used here because just trying to use
    // string_to_node to make a <tr> does not work

    const area = document.getElementById(`area_${title}`);
    buttons.forEach(button => area.appendChild(button));

    area.parentNode.children[0].addEventListener('click', (e) => {
        highlight_node(e.target.parentNode);
    });
}

function move_rating(){
    const old_node = document.getElementById('post_rating_explicit').parentNode;
    const old_row = old_node.parentNode;
    create_area(
        'Rating',
        ...old_node.children,
        label(url_text(
            'Don\'t forget it!',
            'https://e621.net/help/show/ratings'
        ))
    );
    old_row.nextSibling.nextSibling.remove(); // Remove reminder text
    old_row.remove();
    Array.from(document.querySelectorAll('#area_Rating > label'))
        .filter(e => e.classList.contains('custom_label') == false)
        .forEach(e => e.parentNode.insertBefore(string_to_node('<br>'), e.nextSibling));
}

function move_sources() {
    const old_node = document.getElementById('post_source');
    const old_row = old_node.parentNode.parentNode;
    create_area(
        'Source URLs',
        old_node
    );
    old_row.remove();
    old_node.placeholder += '\nhttps://google.com\nLimit of 10. Use them!';
}

function move_description() {
    const old_node = document.getElementById('post_description');
    const old_row = old_node.parentNode.parentNode;
    create_area(
        'Description',
        old_node
    );
    old_row.remove();

    old_node.placeholder = 'If you can not think of a description, use the artists description!';
}

function move_parent_id() {
    const old_node = document.getElementById('post_parent_id');
    const old_row = old_node.parentNode.parentNode;
    create_area(
        'Parent Post',
        old_node
    );
    old_row.remove();
}

function remove_tag_reminder(){
    document.getElementById('post_tags').parentNode.parentNode.nextSibling.nextSibling.remove();
}

function cross_fill(array, middle){
    // I don't want to do it like this, but e621
    // messes with some prototypes making doing
    // this with map and reduce difficult.
    const results = [];
    for(const word1 of array) {
        for(const word2 of array){
            results.push(word1 + middle + word2);
        }
    }
    return results;
}

init_css();

/*************************

This area is where you can add your own
custom tag groups. Hopefully the format
should be obvious.

*************************/

move_sources();
move_description();
move_parent_id();
move_rating();
remove_tag_reminder();

create_area(
    'Artist',
    custom_tag('Artist'),
    label('The artist of the image')
);

create_area(
    'Copyright',
    custom_tag('Copyright'),
    label('The original series or company a character or game is owned by')
);

create_area(
    'Character',
    custom_tag('Character Name'),
    label('Tag the character\'s best known name. If not that, their full name')
);

create_area(
    'Body Type',
    ...[
        'anthro',
        'semi_anthro',
        'feral',
        'humanoid',
        'taur',
        'anthrofied',
        'ponified',
        'feralized'].map(e => create_button(e))
);

create_area(
    'Species',
    ...[
        'human',
        'canine',
        'feline',
        'bovine',
        'cervine',
        'equine',
        'lagomorph',
        'rodent',
        'avian',
        'insect',
        'marine',
        'cetacean',
        'shark',
        'scalie'].map(e => create_button(e)),
    label('or do it yourself because you know it'),
    custom_tag('Species')
);

create_area(
    'Sexes',
    ...[
        'ambiguous_gender',
        'male',
        'female',
        'intersex',
        'gynomorph',
        'andromorph',
        'herm',
        'maleherm',
        // adding these terms for those that forget
        // what e621 has switched to.
        'cuntboy',
        'dickgirl'].map(e => create_button(e)),
    label(url_text(
        'For the love of god, TWYS not TWYK',
        'https://e621.net/wiki/show/howto:tag_genders'
    ))
);

/*
// This creates something very not
// pretty, and will be fixed in the
// next version. For now the feature
// is just dissabled. Hope for it soon
create_area(
    'Sex Pairings',
    ...cross_fill([
        'ambiguous',
        'male',
        'female',
        'intersex',
        'gynomorph',
        'andromorph',
        'herm',
        'maleherm',
        'cuntboy',
        'dickgirl'],
        '/')
    .map(e => create_button(e))
);
*/

create_area(
    'How many',
    ...[
        'none_pictured',
        'solo',
        'duo',
        'group'].map(e => create_button(e))
);

create_area(
    'Focus',
    ...[
        'solo_focus',
        'duo_focus'].map(e => create_button(e)),
    label('Solo focus can not have Solo. Duo focus can not have Duo')
);

create_area(
    'Clothing',
    ...[
        'fully_clothed',
        'partially_clothed',
        'skimpy',
        'nude',
        'bottomless',
        'topless',
        'underwear',
        'open_shirt'].map(e => create_button(e))
);

create_area(
    'Location',
    ...[
        'inside',
        'outside',
        'bedroom',
        'kitchen',
        'forest',
        'beach'].map(e => create_button(e))
);

create_area(
    'Male Genitalia',
    ...[
        'penis',
        'balls',
        'sheath',
        'knot',
        'erection',
        'half-erect',
        'flaccid',
        'humanoid_penis',
        'equine_penis',
        'canine_penis',
        'tapering_penis',
        'veiny_penis',
        'uncut',
        'circumcised'].map(e => create_button(e))
);

create_area(
    'Female Genitalia',
    ...[
        'pussy',
        'clitoris',
        'plump_labia',
        'humanoid_pussy',
        'equine_pussy',
        'canine_pussy'].map(e => create_button(e))
);

create_area(
    'Common Genitalia',
    ...[
        'butt',
        'anus',
        'puffy_anus',
        'gaping_anus',
        'urethra',
        'genital_slit'].map(e => create_button(e))
);

create_area(
    'Sex Act',
    create_button('sex'),
    label(''),
    custom_tag('male/female'),
    label(''),
    ...[
        'masturbation',
        'handjob',
        'footjob',
        'fellatio',
        'cunnilingus',
        'vaginal_penetration',
        'anal_penetration',
        'threesome',
        'foursome',
        'orgy',
        'gangbang',
        'frottage',
        'tribadism',
        'orgasm',
        'cum_inside'].map(e => create_button(e))
);

create_area(
    'Position',
    ...[
        'missionary_position',
        'cowgirl_position',
        'reverse_cowgirl_position',
        'from_behind',
        '69_position',
        'stand_and_carry_position'].map(e => create_button(e)),
    label(url_text(
        'For more positions',
        'https://e621.net/wiki/show/tag_group:sex_positions'
    )),
    custom_tag('custom_position')
);

create_area(
    'Limbs',
    ...[
        'crossed_arms',
        'raised_arms',
        'arms_behind_head',
        'spread_legs',
        'crossed_legs',
        'raised_leg',
        'legs_up',
        'raised_tail',
        'tailwag'].map(e => create_button(e))
);

create_area(
    'Gaze',
    ...[
        'looking_at_viewer',
        'looking_back',
        'eye_contact',
        'eyes_closed'].map(e => create_button(e))
);

create_area(
    'Expression',
    ...[
        'blush',
        'wink',
        'smile',
        'grin',
        'tongue_out',
        'naughty_face',
        'embarrassed',
        'happy',
        'sad',
        'bedroom_eyes'].map(e => create_button(e))
);

create_area(
    'Medium',
    ...[
        'sketch',
        'line_art',
        'monochrome',
        'shaded',
        'pencil_(artwork)',
        'watercolor',
        '3D',
        'digital_media_(artwork)'].map(e => create_button(e))
);

create_area(
    'Organization',
    ...[
        'comic',
        'multiple_scenes',
        'sequence',
        'close-up',
        'portrait',
        'pinup',
        'wallpaper'].map(e => create_button(e))
);

create_area(
    'Style',
    ...[
        'toony',
        'detailed',
        'realistic'].map(e => create_button(e))
);

create_area(
    'Text and Language',
    ...[
        'english_text',
        'japanese_text',
        'spanish_text',
        'runes',
        'dialogue',
        'speech_bubble',
        'symbol'].map(e => create_button(e))
);

create_area(
    'Requests',
    ...[
        'translation_request',
        'source_request',
        'tagme'].map(e => create_button(e))
);

create_area(
    'Year of Creation',
    ...[
        '2019',
        '2018',
        '2017',
        '2016'].map(e => create_button(e)),
    custom_tag('millennia old')
);
