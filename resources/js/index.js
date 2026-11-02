import { insertText, mountBlockEditor, trackTextTargets } from '@vortechron/blocknote-kit';

/**
 * The Alpine component behind the BlockNoteEditor form field. Filament loads
 * this file on demand (x-load), so React and BlockNote only reach the pages
 * that show an editor.
 *
 * The editor itself is @vortechron/blocknote-kit. This file only connects it
 * to Livewire (the entangled `state`) and to the panel's upload and media
 * routes. The section surface around it is drawn by the Blade view, from
 * BlockAppearanceFields::editorAttributes(), so `surface` is off here.
 *
 * There is deliberately no destroy() that unmounts React. When a block is
 * added above others, Livewire moves the existing items, Alpine tears their
 * components down and starts them again, and an unmount + remount there sent
 * the page into an endless loop. mountBlockEditor() refuses to mount twice on
 * one element instead, so the editor that is already there simply stays.
 */
export default function blockNoteEditorFormComponent({ state, uploadUrl, mediaUrl, fonts, readOnly }) {
    return {
        state,

        init() {
            const upload = laravelUpload(uploadUrl);

            mountBlockEditor(this.$refs.editor, {
                initialContent: this.state,
                onChange: (document) => {
                    this.state = document;
                },
                editable: ! readOnly,
                fonts,
                surface: false,
                trackInsertTargets: true,
                uploadFile: async (file) => (await upload(file)).url,
                media: {
                    list: (query) => listMedia(mediaUrl, query),
                    upload,
                },
            });
        },
    };
}

function readXsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Posts a file to the panel's upload route and resolves to its JSON answer:
 * { url, asset }. Validation messages from Laravel are passed on as the error.
 */
function laravelUpload(uploadUrl) {
    return async (file) => {
        const body = new FormData();
        body.append('file', file);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-XSRF-TOKEN': readXsrfToken() },
            body,
            credentials: 'same-origin',
        });

        const json = await response.json().catch(() => ({}));

        if (! response.ok) {
            throw new Error(json.errors?.file?.[0] || json.message || 'Upload failed. Please try again.');
        }

        return json;
    };
}

async function listMedia(mediaUrl, { search, page, kind, signal }) {
    const url = new URL(mediaUrl, window.location.origin);
    url.searchParams.set('search', search ?? '');
    url.searchParams.set('page', page ?? 1);

    if (kind) {
        url.searchParams.set('kind', kind);
    }

    const response = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin', signal });

    if (! response.ok) {
        throw new Error('The media library could not be loaded. Please try again.');
    }

    return response.json();
}

// "Insert at the caret" for any Variables or merge-tag panel the host app
// adds: window.FilamentBlockEditor.insert('{{ name }}').
trackTextTargets();
window.FilamentBlockEditor = { insert: insertText };
