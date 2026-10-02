import React, { useEffect, useRef, useState } from 'react';
import { FilePanelExtension } from '@blocknote/core/extensions';
import {
    FilePanelController,
    FileReplaceButton,
    FormattingToolbar,
    getFormattingToolbarItems,
    useBlockNoteEditor,
    useComponentsContext,
    useDictionary,
    useEditorState,
    useExtensionState,
} from '@blocknote/react';
import { FontFamilySelect } from './font-family.jsx';

function isLibraryMedia(block) {
    return block?.type === 'image' || block?.type === 'video';
}

/**
 * The kind of file the shared library sheet picks for this block, or null
 * when the block keeps BlockNote's own file panel. A card's banner is a
 * picture (resources/js/card-block.jsx).
 */
function libraryKindOf(block) {
    if (isLibraryMedia(block)) return block.type;

    return block?.type === 'card' ? 'image' : null;
}

/** The props a chosen file is written into. A card only has its banner url. */
function mediaProps(block, props) {
    return block.type === 'card' ? { url: props.url } : props;
}

export function MediaFilePanelController() {
    const editor = useBlockNoteEditor();
    const blockId = useExtensionState(FilePanelExtension);

    // Images, videos and card banners open the shared sheet. Other file types keep their panel.
    return libraryKindOf(blockId && editor.getBlock(blockId)) ? null : <FilePanelController />;
}

function MediaReplaceButton() {
    const editor = useBlockNoteEditor();
    const Components = useComponentsContext();
    const dictionary = useDictionary();
    const block = useEditorState({
        editor,
        selector: ({ editor }) => {
            const blocks = editor.getSelection()?.blocks || [editor.getTextCursorPosition().block];
            return editor.isEditable && blocks.length === 1 ? blocks[0] : undefined;
        },
    });

    if (!isLibraryMedia(block)) return <FileReplaceButton />;

    const label = dictionary.formatting_toolbar.file_replace.tooltip[block.type];

    return <Components.FormattingToolbar.Button
        className="bn-button"
        mainTooltip={label}
        label={label}
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 10V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6M3 16l5-5 5 5 3-3M15 20l5-5 2 2-5 5h-2z" /><circle cx="15" cy="8" r="1" /></svg>}
        onClick={() => editor.getExtension(FilePanelExtension).showMenu(block.id)}
    />;
}

export function MediaFormattingToolbar({ fonts = [], ...props }) {
    return <FormattingToolbar {...props}>
        {getFormattingToolbarItems(props.blockTypeSelectItems).flatMap((item) => {
            if (item.key === 'replaceFileButton') {
                return <MediaReplaceButton key={item.key} />;
            }

            // The typeface picker sits next to the block type select, the way
            // a word processor puts them together.
            if (item.key === 'blockTypeSelect' && fonts.length > 0) {
                return [item, <FontFamilySelect key="fontFamilySelect" fonts={fonts} />];
            }

            return item;
        })}
    </FormattingToolbar>;
}

export function MediaLibraryDialog({ editor, mediaUrl, uploadUrl, csrfToken }) {
    const dialog = useRef(null);
    const [request, setRequest] = useState(null);
    const filePanelBlockId = useExtensionState(FilePanelExtension, { editor });
    const open = request !== null;
    const kind = request?.kind || '';
    const [search, setSearch] = useState('');
    const [mediaLink, setMediaLink] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ data: [], last_page: 1 });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        const block = filePanelBlockId && editor.getBlock(filePanelBlockId);
        const blockKind = libraryKindOf(block);
        if (!blockKind) return;

        setSearch('');
        setMediaLink('');
        setPage(1);
        setError('');
        setRequest({ blockId: block.id, kind: blockKind });
        editor.getExtension(FilePanelExtension).closeMenu();
    }, [editor, filePanelBlockId]);

    useEffect(() => {
        if (open) {
            if (!dialog.current.open) dialog.current.showModal();
        } else {
            dialog.current.close();
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const url = new URL(mediaUrl, window.location.origin);
                url.searchParams.set('search', search);
                url.searchParams.set('page', page);
                if (kind) url.searchParams.set('kind', kind);
                const response = await fetch(url, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error('The media library could not be loaded. Please try again.');
                setResult(await response.json());
                setError('');
            } catch (failure) {
                if (failure.name !== 'AbortError') setError(failure.message);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, search ? 300 : 0);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [open, search, page, refresh, mediaUrl, kind]);

    function choose(asset) {
        try {
            const target = editor.getBlock(request.blockId);
            if (!target) throw new Error('The insertion point changed. Close the library and choose a place in the block again.');
            const type = asset.is_video ? 'video' : 'image';
            if (libraryKindOf(target) !== kind || type !== kind) throw new Error('The media type changed. Close the library and select the block again.');

            editor.updateBlock(target, { props: mediaProps(target, { url: asset.url, name: asset.name, showPreview: true }) });
            setRequest(null);
        } catch (failure) {
            setError(failure.message);
        }
    }

    function chooseLink() {
        try {
            const url = new URL(mediaLink.trim());
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
        } catch {
            setError('Enter a full http:// or https:// link.');
            return;
        }

        try {
            const target = editor.getBlock(request.blockId);
            if (!target || libraryKindOf(target) !== kind) throw new Error('The block changed. Close the library and select it again.');
            editor.updateBlock(target, { props: mediaProps(target, { url: mediaLink.trim(), showPreview: true }) });
            setRequest(null);
        } catch (failure) {
            setError(failure.message);
        }
    }

    async function upload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        if (kind && !file.type.startsWith(`${kind}/`)) {
            setError(kind === 'image' ? 'Choose an image file.' : 'Choose a video file.');
            event.target.value = '';
            return;
        }
        setUploading(true);
        setError('');
        try {
            const body = new FormData();
            body.append('file', file);
            const response = await fetch(uploadUrl, {
                method: 'POST', body, credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-XSRF-TOKEN': csrfToken() },
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.errors?.file?.[0] || json.message || 'Upload failed. Please try again.');
            setSearch('');
            setPage(1);
            setRefresh((value) => value + 1);
        } catch (failure) {
            setError(failure.message);
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    }

    return <dialog className="fbe-media-dialog" ref={dialog} aria-label="Media library" onClose={() => setRequest(null)}>
        <div className="fbe-media-dialog-header">
            <div><h2>Media library</h2><p>{kind === 'video' ? 'Choose a video for this block.' : 'Choose an image for this block.'}</p></div>
            <button type="button" aria-label="Close media library" onClick={() => setRequest(null)}>×</button>
        </div>
        <div className="fbe-media-dialog-tools">
            <input aria-label="Search media" placeholder="Search media" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            <label className="fbe-media-upload">
                {uploading ? 'Uploading…' : 'Upload media'}
                <input type="file" accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/gif,image/webp,image/avif'} disabled={uploading} onChange={upload} />
            </label>
            <details>
                <summary>Use a link</summary>
                <div className="fbe-media-dialog-tools">
                    <input
                        type="url"
                        aria-label={kind === 'image' ? 'Image URL' : 'Video URL'}
                        placeholder="https://"
                        value={mediaLink}
                        onChange={(event) => setMediaLink(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') { event.preventDefault(); chooseLink(); }
                        }}
                    />
                    <button className="fbe-media-upload" type="button" onClick={chooseLink}>Use link</button>
                </div>
            </details>
        </div>
        {error && <p role="alert" className="fbe-media-error">{error} <button type="button" onClick={() => setRefresh((value) => value + 1)}>Retry</button></p>}
        {loading && <p role="status" className="fbe-media-status">Loading media…</p>}
        <div className="fbe-media-dialog-grid" aria-busy={loading}>
            {!loading && result.data.map((asset) => <button className="fbe-library-card" type="button" key={asset.id} aria-label={`Use ${asset.name}`} onClick={() => choose(asset)}>
                <div className="fbe-media-thumbnail">
                    {asset.is_video ? <><video src={`${asset.url}#t=0.1`} preload="metadata" muted playsInline /><span className="fbe-media-video-label">▶ Video</span></> : <img src={asset.url} alt="" loading="lazy" />}
                </div>
                <span className="fbe-library-card-caption"><strong>{asset.name}</strong></span>
            </button>)}
            {!loading && !error && !result.data.length && <p className="fbe-media-status">No media found. Upload a file to get started.</p>}
        </div>
        {result.last_page > 1 && <div className="fbe-library-pagination">
            <button type="button" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>{page} / {result.last_page}</span>
            <button type="button" disabled={page >= result.last_page || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>}
    </dialog>;
}
