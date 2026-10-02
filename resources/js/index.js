import { mountBlockNote } from './blocknote.jsx';
import './variables.js';

/**
 * The Alpine component behind the BlockNoteEditor form field. Filament loads
 * this file on demand (x-load), so React and BlockNote only reach the pages
 * that show an editor.
 *
 * There is deliberately no destroy() that unmounts React. When a block is
 * added above others, Livewire moves the existing items, Alpine tears their
 * components down and starts them again, and an unmount + remount there sent
 * the page into an endless loop. mountBlockNote() refuses to mount twice on
 * one element instead, so the editor that is already there simply stays.
 */
export default function blockNoteEditorFormComponent({ state, uploadUrl, mediaUrl, fonts, readOnly }) {
    return {
        state,

        root: null,

        init() {
            this.root = mountBlockNote(this.$refs.editor, {
                get: () => this.state,
                set: (value) => {
                    this.state = value;
                },
                uploadUrl,
                mediaUrl,
                fonts,
                readOnly,
            });
        },
    };
}
