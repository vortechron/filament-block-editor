import { useEffect, useEffectEvent } from 'react';

/**
 * Ctrl+S (⌘S on a Mac) saves, like in any editor. Ctrl+Z (⌘Z) undoes a
 * change to the page, and Ctrl+Shift+Z (⇧⌘Z) or Ctrl+Y redoes it, except
 * in a text box, which keeps its own undo for its own text. Escape picks
 * nothing, unless it is closing something else first, like a menu or a
 * dialog.
 */
export function useBuilderShortcuts({
    onSave,
    onEscape,
    onUndo,
    onRedo,
}: {
    onSave: () => void;
    onEscape: () => void;
    onUndo: () => void;
    onRedo: () => void;
}) {
    const handleKey = useEffectEvent((event: KeyboardEvent) => {
        if (
            (event.metaKey || event.ctrlKey) &&
            event.key.toLowerCase() === 's'
        ) {
            event.preventDefault();
            onSave();

            return;
        }

        const move = historyKeyOf(event);

        if (move !== null) {
            if (
                !event.defaultPrevented &&
                !isTextBox(event.target) &&
                !isInModal(event.target)
            ) {
                event.preventDefault();

                if (move === 'undo') {
                    onUndo();
                } else {
                    onRedo();
                }
            }

            return;
        }

        if (event.key !== 'Escape' || event.defaultPrevented) {
            return;
        }

        const target = event.target;
        const isTyping =
            target instanceof HTMLElement &&
            (target.isContentEditable ||
                target.closest(
                    'input, textarea, select, [role="dialog"], [role="menu"]',
                ));

        if (!isTyping) {
            onEscape();
        }
    });

    useEffect(() => {
        window.addEventListener('keydown', handleKey);

        return () => window.removeEventListener('keydown', handleKey);
    }, []);
}

/** Undo or redo for Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y (⌘ on a Mac). */
export function historyKeyOf(event: KeyboardEvent): 'undo' | 'redo' | null {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return null;
    }

    const key = event.key.toLowerCase();

    if (key === 'z') {
        return event.shiftKey ? 'redo' : 'undo';
    }

    return key === 'y' && event.ctrlKey && !event.shiftKey ? 'redo' : null;
}

/** Inputs that hold no typed text, so the page's undo works in them. */
const NOT_TEXT = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
]);

/**
 * Is the keyboard in a box that holds typed text: a text field, a
 * textarea or editable text, like the section's words? Those keep their
 * own undo. Duck-typed, so an element of the canvas's page counts too.
 */
export function isTextBox(target: EventTarget | null): boolean {
    const element = target as Partial<HTMLElement> | null;

    if (typeof element?.closest !== 'function') {
        return false;
    }

    if (
        element.isContentEditable ||
        element.closest('textarea, [contenteditable]:not([contenteditable="false"])')
    ) {
        return true;
    }

    const input = element.closest('input') as HTMLInputElement | null;

    return input !== null && !NOT_TEXT.has(input.type);
}

/**
 * Is the keyboard in a dialog or a menu? Undo there would change the page
 * behind it, like taking back the section a "Delete this section?" asks
 * about. The phone's bottom sheet (data-builder-sheet) is a dialog too,
 * but it is the sidebar, so the keys work in it.
 */
export function isInModal(target: EventTarget | null): boolean {
    const element = target as Partial<HTMLElement> | null;

    return (
        typeof element?.closest === 'function' &&
        element.closest(
            '[role="alertdialog"], [role="menu"], [role="dialog"]:not([data-builder-sheet])',
        ) !== null
    );
}

/** The undo and redo keys, as the top bar shows them and as ARIA names them. */
export function historyShortcuts() {
    const isMac =
        typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

    return isMac
        ? {
              undo: { shown: '⌘Z', aria: 'Meta+Z' },
              redo: { shown: '⇧⌘Z', aria: 'Meta+Shift+Z' },
          }
        : {
              undo: { shown: 'Ctrl+Z', aria: 'Control+Z' },
              redo: { shown: 'Ctrl+Y', aria: 'Control+Y Control+Shift+Z' },
          };
}
