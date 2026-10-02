/**
 * Turning a pasted video link into the host's player URL, for the editor.
 *
 * Keep every pattern here in sync with BlockNoteRenderer::videoEmbedUrl() in
 * PHP. The editor and the customer page must agree on which links become an
 * embed, or a block looks right while it is being written and breaks once it
 * is sent.
 */

const EMBED_ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

/**
 * The embeddable player URL for a known video host, or null when the link
 * looks like a direct video file (or is empty).
 */
export function videoEmbedUrl(url) {
    if (typeof url !== 'string' || url.trim() === '') {
        return null;
    }

    return youTubeEmbedUrl(url) ?? vimeoEmbedUrl(url) ?? loomEmbedUrl(url);
}

/**
 * Watch, share, shorts, live and already-embedded YouTube links.
 */
function youTubeEmbedUrl(url) {
    const match = url.match(/youtube(?:-nocookie)?\.com\/watch\?.*v=([\w-]{6,})/)
        ?? url.match(/youtube(?:-nocookie)?\.com\/(?:shorts|embed|live|v)\/([\w-]{6,})/)
        ?? url.match(/youtu\.be\/([\w-]{6,})/);

    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

/**
 * Vimeo hands out the same video under several paths: vimeo.com/ID,
 * vimeo.com/video/ID, player.vimeo.com/video/ID, and prefixed paths such as
 * /channels/name/ID, /groups/name/videos/ID or /manage/videos/ID. An unlisted
 * video also carries a privacy hash, either as a trailing path segment
 * (vimeo.com/ID/HASH) or as ?h=HASH; the embed does not play without it.
 */
function vimeoEmbedUrl(url) {
    const event = url.match(/vimeo\.com\/event\/(\d+)/);

    if (event) {
        return `https://vimeo.com/event/${event[1]}/embed`;
    }

    const match = url.match(/vimeo\.com\/(?:[\w-]+\/)*?(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?/);

    if (! match) {
        return null;
    }

    const hash = match[2] ?? url.match(/[?&]h=([a-zA-Z0-9]+)/)?.[1] ?? '';
    const embed = `https://player.vimeo.com/video/${match[1]}`;

    return hash === '' ? embed : `${embed}?h=${hash}`;
}

/**
 * Share and already-embedded Loom links.
 */
function loomEmbedUrl(url) {
    const match = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);

    return match ? `https://www.loom.com/embed/${match[1]}` : null;
}

/**
 * BlockNote's built-in video block always renders `<video src={url}>`, so a
 * YouTube, Vimeo or Loom share link shows an empty, unplayable player while
 * the page is being written — the public page embedded it and the editor
 * did not.
 *
 * Wrapping the spec's render keeps everything BlockNote drew around the media
 * (the file placeholder, the caption, the resize handles) and only swaps the
 * <video> element itself for the host's iframe.
 */
export function withVideoEmbeds(blockSpecs) {
    const spec = blockSpecs.video;

    if (typeof spec?.implementation?.render !== 'function') {
        return blockSpecs;
    }

    const render = spec.implementation.render;

    return {
        ...blockSpecs,
        video: {
            ...spec,
            implementation: {
                ...spec.implementation,
                // A plain method, not an arrow: BlockNote calls render() with a
                // `this` carrying the block's DOM attributes, and the original
                // reads it.
                render(block, editor) {
                    const result = render.call(this, block, editor);

                    swapForEmbed(result?.dom, block, videoEmbedUrl(block?.props?.url));

                    return result;
                },
            },
        },
    };
}

function swapForEmbed(dom, block, embedUrl) {
    const video = embedUrl ? dom?.querySelector?.('video.bn-visual-media') : null;

    if (! video) {
        return;
    }

    const iframe = document.createElement('iframe');

    // bn-visual-media is what BlockNote's own stylesheet sizes the media with,
    // so the iframe keeps the width the video element had.
    iframe.className = 'bn-visual-media fbe-video-embed';
    iframe.src = embedUrl;
    iframe.allow = EMBED_ALLOW;
    iframe.allowFullscreen = true;
    iframe.contentEditable = 'false';
    iframe.draggable = false;

    if (block?.props?.previewWidth) {
        iframe.width = block.props.previewWidth;
    }

    video.replaceWith(iframe);
}
