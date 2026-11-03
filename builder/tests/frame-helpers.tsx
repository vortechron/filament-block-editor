import { act, fireEvent, waitFor } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * jsdom does not load an iframe's srcdoc, so the canvas never shows the
 * page by itself. This writes the page the builder asked for into the
 * frame and fires its load, the way a browser would, then waits until
 * the builder shows it.
 */
export async function loadCanvasPage(): Promise<Document> {
    const frame = await waitFor(() => {
        const found = document.querySelector<HTMLIFrameElement>('iframe[srcdoc]');

        expect(found).not.toBeNull();

        return found as HTMLIFrameElement;
    });
    const view = frame.contentWindow as Window;
    const page = frame.contentDocument as Document;

    view.scrollTo = () => {};
    page.open();
    page.write(frame.getAttribute('srcdoc') ?? '');
    page.close();

    await act(async () => {
        fireEvent.load(frame);
    });
    await waitFor(() => expect(frame.getAttribute('data-builder-frame')).toBe('live'), {
        timeout: 2000,
    });

    return page;
}

/** A page as the server draws it for the builder: header, sections, footer. */
export function pageHtml(sections: string): string {
    return `<!doctype html><html><head></head><body class="sf-page">
<div data-part="header"><nav><a href="/">Kedai Buku</a><span>012-345 6789</span></nav></div>
${sections}
<div data-part="footer"><p>© Kedai Buku</p></div>
</body></html>`;
}
