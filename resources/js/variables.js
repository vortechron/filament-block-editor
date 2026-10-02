// Remembers where the user was last typing so a click in the Variables panel
// can drop a token there: a BlockNote editor or a plain text field. When
// nothing was focused, the token is copied to the clipboard instead.
//
// Caret positions are remembered here because Livewire re-renders (for
// example when the panel changes the Zoho record type) reset a blurred
// input's own selection back to the start.
const TEXT_FIELD_SELECTOR = 'input:not([type]), input[type="text"], textarea';

const editors = new WeakMap();

const noTarget = { kind: null, editor: null, field: null, start: null, end: null };

let target = noTarget;

export function registerEditor(mountElement, editor) {
    editors.set(mountElement, editor);
}

function rememberCaret(field) {
    target = { ...target, start: field.selectionStart, end: field.selectionEnd };
}

function trackFocus(event) {
    const element = event.target;

    if (!(element instanceof HTMLElement) || element.closest('.fi-modal')) {
        return;
    }

    const mountElement = element.closest('[data-blocknote-mounted]');

    if (mountElement && editors.has(mountElement)) {
        target = { ...noTarget, kind: 'editor', editor: editors.get(mountElement) };

        return;
    }

    if (element.matches(TEXT_FIELD_SELECTOR)) {
        target = { ...noTarget, kind: 'field', field: element };
        rememberCaret(element);
    }
}

function trackCaret(event) {
    if (target.kind === 'field' && event.target === target.field) {
        rememberCaret(target.field);
    }
}

function trackSelection() {
    if (target.kind === 'field' && document.activeElement === target.field) {
        rememberCaret(target.field);
    }
}

function insertIntoField(field, token) {
    const start = target.start ?? field.value.length;
    const end = target.end ?? start;

    field.setRangeText(token, start, end, 'end');
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));

    target = { ...target, start: start + token.length, end: start + token.length };
}

function insert(token) {
    if (target.kind === 'editor' && target.editor) {
        target.editor.insertInlineContent(token);

        return 'inserted';
    }

    if (target.kind === 'field' && target.field?.isConnected) {
        insertIntoField(target.field, token);

        return 'inserted';
    }

    navigator.clipboard?.writeText(token).catch(() => {});

    return 'copied';
}

document.addEventListener('focusin', trackFocus);
document.addEventListener('keyup', trackCaret);
document.addEventListener('mouseup', trackCaret);
document.addEventListener('input', trackCaret);
document.addEventListener('selectionchange', trackSelection);

window.FilamentBlockEditor = { insert };
