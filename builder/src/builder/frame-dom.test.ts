import { describe, expect, it } from 'vitest';
import { frameSection, pageSections } from './frame-dom';

/**
 * The footer builder in the CMS: the header made of sections, the
 * footer being built, and the home page's content in `data-part="page"`.
 * The home page happens to hold a section with the same id as one being
 * built, which the builder must never mistake for its own.
 */
function footerBuilderFrame(): HTMLIFrameElement {
    const frame = document.createElement('iframe');

    document.body.append(frame);

    const page = frame.contentDocument as Document;

    page.body.innerHTML = `
<div data-part="header" class="sf-page"><div data-block-id="head0001"><p>Kedai Buku</p></div></div>
<div data-part="page" class="sf-page"><div data-block-id="foot0001"><p>Laman utama</p></div></div>
<div class="sf-page" data-preview><div data-block-id="foot0001"><p>© Kedai Buku</p></div></div>`;

    return frame;
}

describe('the sections of the page on the canvas', () => {
    it('are only the ones outside every part', () => {
        const frame = footerBuilderFrame();

        expect(
            pageSections(frame.contentDocument as Document).map((section) => section.textContent),
        ).toEqual(['© Kedai Buku']);
        frame.remove();
    });

    it('are found by id without a part’s section of the same id', () => {
        const frame = footerBuilderFrame();

        expect(frameSection(frame, 'foot0001')?.textContent).toBe('© Kedai Buku');
        expect(frameSection(frame, 'head0001')).toBeNull();
        frame.remove();
    });
});
