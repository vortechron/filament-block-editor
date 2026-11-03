import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import {
    ClipboardList,
    Images,
    MousePointerClick,
    Settings2,
    TriangleAlert,
} from 'lucide-react';
import { createElement, useContext } from 'react';
import { safeButtonUrl } from '@/blocks/button-url';
import { parseValues, summarizeValues } from '@/blocks/own-block-values';
import { serializeForm } from '@/lib/form-definition';
import { starterForm } from '@/lib/form-starter';
import { iconByName } from '@/lib/icons';
import { useT } from '@/lib/i18n';
import type { OwnBlockDefinition } from '@/types';
import { formBlock } from './form-block';
import { GalleryBlock, galleryUrls, MAX_GALLERY_PHOTOS } from './gallery-block';
import { LOOK_PROP_SCHEMA } from './look-prop';
import { PageBlocksContext } from './page-blocks-context';
import type { Translate } from './helpers';

export { type PageBlocksInfo, PageBlocksContext } from './page-blocks-context';

/**
 * The page's own blocks inside a section, on top of BlockNote's and
 * @vortechron/blocknote-kit's: the photo slideshow, the button, the form
 * (form-block.tsx) and the host's own blocks. The PHP renderer draws them on the public page
 * (Blocks\BlockRegistry for own blocks). Keep the two in step.
 *
 * Loaded with the editor only (see rich-editor.tsx), because BlockNote is
 * large. Each one declares the `look` prop itself: BlockNote draws a React
 * block with the prop schema it was made with (see page-schema.ts).
 */

export const BUTTON_VARIANTS = ['solid', 'outline'] as const;

const gallery = createReactBlockSpec(
    {
        type: 'gallery',
        propSchema: { images: { default: '' }, ...LOOK_PROP_SCHEMA },
        content: 'none',
    },
    {
        render: ({ block, editor }) => (
            <GalleryBlock
                images={block.props.images}
                uploadFile={editor.uploadFile}
                onAdd={(added) => {
                    // Read the block again: it may have changed while the
                    // photos were uploading.
                    const current = editor.getBlock(block.id);
                    const urls = galleryUrls(
                        typeof current?.props.images === 'string'
                            ? current.props.images
                            : '',
                    );

                    editor.updateBlock(block.id, {
                        props: {
                            images: [...urls, ...added]
                                .slice(0, MAX_GALLERY_PHOTOS)
                                .join('\n'),
                        },
                    });
                }}
                onChange={(urls) =>
                    editor.updateBlock(block.id, {
                        props: { images: urls.join('\n') },
                    })
                }
            />
        ),
    },
);

const button = createReactBlockSpec(
    {
        type: 'button',
        propSchema: {
            text: { default: '' },
            url: { default: '' },
            variant: { default: 'solid', values: BUTTON_VARIANTS },
            ...LOOK_PROP_SCHEMA,
        },
        content: 'none',
    },
    {
        render: ({ block, editor }) => (
            <ButtonBlock
                id={block.id}
                text={block.props.text}
                url={block.props.url}
                variant={block.props.variant}
                onTextChange={(text) =>
                    editor.updateBlock(block, { props: { text } })
                }
            />
        ),
    },
);

const ownBlock = createReactBlockSpec(
    {
        type: 'ownBlock',
        propSchema: {
            kind: { default: '' },
            values: { default: '{}' },
            ...LOOK_PROP_SCHEMA,
        },
        content: 'none',
    },
    {
        render: ({ block }) => (
            <OwnBlockCard
                id={block.id}
                kind={block.props.kind}
                values={block.props.values}
            />
        ),
    },
);

export const pageBlockSpecs = {
    gallery: gallery(),
    button: button(),
    ownBlock: ownBlock(),
    form: formBlock(),
};

type SlashMenuEditor = Parameters<typeof insertOrUpdateBlockForSlashMenu>[0];

/** The "Page" group in the "/" menu: the slideshow, the button, the form, own blocks. */
export function pageSlashMenuItems(
    editor: SlashMenuEditor,
    t: Translate,
    ownBlocks: Iterable<OwnBlockDefinition>,
) {
    const group = t('Page');
    const insert = (type: string, props?: Record<string, unknown>) => () =>
        insertOrUpdateBlockForSlashMenu(editor, { type, props } as never);

    return [
        {
            title: t('Photo slideshow'),
            subtext: t('Several photos visitors swipe through'),
            aliases: ['gallery', 'slideshow', 'slider', 'carousel', 'galeri', 'gambar'],
            group,
            icon: createElement(Images, { size: 18 }),
            onItemClick: insert('gallery'),
        },
        {
            title: t('Button'),
            subtext: t('A link that looks like a button'),
            aliases: ['button', 'link', 'cta', 'butang', 'pautan'],
            group,
            icon: createElement(MousePointerClick, { size: 18 }),
            onItemClick: insert('button', { text: t('Read more') }),
        },
        {
            title: t('Form'),
            subtext: t('Visitors send you their name, phone and message'),
            aliases: ['form', 'contact', 'enquiry', 'borang', 'hubungi', 'pertanyaan'],
            group,
            icon: createElement(ClipboardList, { size: 18 }),
            onItemClick: insert('form', { form: serializeForm(starterForm(t)) }),
        },
        ...[...ownBlocks].map((definition) => ({
            title: definition.label,
            subtext: definition.description ?? '',
            aliases: [definition.kind, ...definition.label.toLowerCase().split(/\s+/)],
            group,
            icon: createElement(iconByName(definition.icon), { size: 18 }),
            onItemClick: insert('ownBlock', {
                kind: definition.kind,
                values: '{}',
            }),
        })),
    ];
}

function ButtonBlock({
    id,
    text,
    url,
    variant,
    onTextChange,
}: {
    id: string;
    text: string;
    url: string;
    variant: string;
    onTextChange: (text: string) => void;
}) {
    const t = useT();
    const { openItem } = useContext(PageBlocksContext);
    const link = safeButtonUrl(url);
    const isOutline = variant === 'outline';

    return (
        <div className="my-2 w-full" contentEditable={false}>
            <input
                value={text}
                maxLength={80}
                placeholder={t('Button text')}
                aria-label={t('Button text')}
                onChange={(event) => onTextChange(event.target.value)}
                className="nj-button w-full px-6 py-3 text-center outline-none focus:ring-4 focus:ring-black/20"
                style={
                    isOutline
                        ? {
                              background: 'transparent',
                              boxShadow: 'none',
                              border: '2px solid var(--accent)',
                              color: 'var(--accent)',
                          }
                        : undefined
                }
            />
            <p className="nj-hint mt-1 flex items-center justify-center gap-1.5 text-center text-xs">
                <span className="truncate">
                    {link ?? (url.trim() === '' ? t('No link yet') : t('This link will not work'))}
                </span>
                {openItem && (
                    <button
                        type="button"
                        onClick={() => openItem(id)}
                        className="shrink-0 font-semibold underline"
                    >
                        {t('Change link')}
                    </button>
                )}
            </p>
        </div>
    );
}

function OwnBlockCard({
    id,
    kind,
    values,
}: {
    id: string;
    kind: string;
    values: string;
}) {
    const t = useT();
    const { ownBlocks, openItem } = useContext(PageBlocksContext);
    const definition = ownBlocks.get(kind);

    if (!definition) {
        return (
            <div
                contentEditable={false}
                className="my-2 flex w-full items-start gap-3 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-3 text-left text-amber-900"
            >
                <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                <span className="grid gap-0.5 text-sm">
                    <span className="font-semibold">
                        {t('Unknown block: :kind', { kind: kind || '?' })}
                    </span>
                    <span className="text-xs">
                        {t('This app has no block of this kind any more. Its values are kept.')}
                    </span>
                </span>
            </div>
        );
    }

    const Icon = iconByName(definition.icon);
    const summary = summarizeValues(definition, parseValues(values));

    return (
        <div
            contentEditable={false}
            className="my-2 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left text-slate-900 shadow-sm"
        >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <Icon className="size-5" />
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-semibold">
                    {definition.label}
                </span>
                <span className="truncate text-xs text-slate-500">
                    {summary || definition.description || t('Tap to fill in')}
                </span>
            </span>
            {openItem && (
                <button
                    type="button"
                    onClick={() => openItem(id)}
                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                    <Settings2 className="size-3.5" />
                    {t('Edit')}
                </button>
            )}
        </div>
    );
}
