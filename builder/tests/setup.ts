/**
 * What jsdom lacks and the builder uses: media queries (a laptop-wide
 * screen), ResizeObserver and scrolling.
 */
if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
        ({
            matches: /min-width/.test(query),
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        }) as MediaQueryList;
}

if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
    }

    (window as unknown as { ResizeObserver: unknown }).ResizeObserver =
        ResizeObserverStub;
}

Element.prototype.scrollIntoView ??= () => {};
window.scrollTo ??= () => {};

// jsdom has no CSS.escape. This is enough for the builder's ids and paths.
const scope = globalThis as unknown as { CSS?: { escape?: (value: string) => string } };

if (typeof scope.CSS?.escape !== 'function') {
    scope.CSS = {
        ...scope.CSS,
        escape: (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`),
    };
}
