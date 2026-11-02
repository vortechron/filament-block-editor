import { useSyncExternalStore } from 'react';

/**
 * True while the screen matches a CSS media query, like "(min-width: 1024px)".
 * It is false on the server, so nothing heavy loads before the browser knows.
 */
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (onChange) => {
            const list = window.matchMedia(query);
            list.addEventListener('change', onChange);

            return () => list.removeEventListener('change', onChange);
        },
        () => window.matchMedia(query).matches,
        () => false,
    );
}
