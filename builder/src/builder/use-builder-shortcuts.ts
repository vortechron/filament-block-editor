import { useEffect, useEffectEvent } from 'react';

/**
 * Ctrl+S (⌘S on a Mac) saves, like in any editor. Escape picks nothing,
 * unless it is closing something else first, like a menu or a dialog.
 */
export function useBuilderShortcuts({
    onSave,
    onEscape,
}: {
    onSave: () => void;
    onEscape: () => void;
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
