import {
    ArrowDown,
    ArrowUp,
    Ban,
    CopyPlus,
    PencilLine,
    TextAlignCenter,
    TextAlignEnd,
    TextAlignStart,
    Trash2,
} from 'lucide-react';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { safeButtonUrl } from '@/blocks/button-url';
import { OwnBlockForm } from '@/blocks/own-block-form';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Input } from '@/ui/input';
import { SegmentedChoice } from '../editor/segmented-choice';
import { useBuilderContext } from './builder-context';
import { describeBlock } from './item-catalog';
import { PhotoField, VideoField } from './media-field';
import { ActionButton } from './action-button';
import type { ItemSnapshot, SectionEditorHandle } from './types';

/** Text blocks that can switch between each other without losing the words. */
const TEXT_TYPES = [
    { value: 'paragraph', label: 'Text', type: 'paragraph', level: null },
    { value: 'h2', label: 'Heading', type: 'heading', level: 2 },
    { value: 'h3', label: 'Small heading', type: 'heading', level: 3 },
    { value: 'quote', label: 'Quote', type: 'quote', level: null },
    { value: 'bullet', label: 'List', type: 'bulletListItem', level: null },
    {
        value: 'numbered',
        label: 'Numbered list',
        type: 'numberedListItem',
        level: null,
    },
] as const;

const TEXT_BLOCKS = new Set([
    'paragraph',
    'heading',
    'quote',
    'bulletListItem',
    'numberedListItem',
    'checkListItem',
    'toggleListItem',
]);

/**
 * BlockNote's named colours, drawn the way the public page draws them
 * (TEXT_COLORS and BACKGROUND_COLORS in BlockNoteRenderer.php).
 */
const TEXT_COLORS = {
    default: '#0f172a',
    gray: '#6b7280',
    brown: '#92400e',
    red: '#dc2626',
    orange: '#ea580c',
    yellow: '#ca8a04',
    green: '#16a34a',
    blue: '#2563eb',
    purple: '#9333ea',
    pink: '#db2777',
} as const;

const HIGHLIGHTS = {
    default: '#ffffff',
    gray: '#f3f4f6',
    brown: '#fef3c7',
    red: '#fee2e2',
    orange: '#ffedd5',
    yellow: '#fef9c3',
    green: '#dcfce7',
    blue: '#dbeafe',
    purple: '#f3e8ff',
    pink: '#fce7f3',
} as const;

/** Twelfths of the text column, then past the padding to the edge. */
const WIDTHS = [
    { value: '4', label: '⅓' },
    { value: '6', label: '½' },
    { value: '8', label: '⅔' },
    { value: '12', label: 'Full' },
    { value: '18', label: 'Edge' },
] as const;

const SPACES = [
    { value: 'none', label: '0' },
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
    { value: 'xl', label: 'XL' },
] as const;

const SPACER_SIZES = [
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
    { value: 'xl', label: 'XL' },
] as const;

/** The item's props again after every change, for the fields below. */
function readItem(
    handle: SectionEditorHandle | null,
    itemId: string,
    _version: number,
): ItemSnapshot | null {
    return handle?.getItem(itemId) ?? null;
}

/**
 * The picked item: its own settings (the button's words and link, an own
 * block's fields, a heading's size, colours, width and space) and buttons
 * to move, copy or delete it. Every change goes into the section's
 * editor, and the page shows it a moment later.
 */
export function ItemPanel() {
    const t = useT();
    const { builder } = useBuilderContext();
    const { ownBlocks } = useHost();
    const { sectionId, itemId } = builder.selection;
    const handle = builder.handleFor(sectionId);
    const [version, setVersion] = useState(0);

    useEffect(
        () => handle?.subscribe(() => setVersion((value) => value + 1)),
        [handle],
    );

    const item = itemId ? readItem(handle, itemId, version) : null;

    if (!handle || !item || !sectionId) {
        return (
            <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                {t('This item is no longer on the page.')}
            </p>
        );
    }

    const { label, icon: Icon, isOwn } = describeBlock(
        item.type,
        item.props,
        ownBlocks,
    );
    const ownDefinition =
        item.type === 'ownBlock'
            ? ownBlocks.find((entry) => entry.kind === item.props.kind)
            : undefined;
    const update = (props: Record<string, unknown>) =>
        handle.updateItem(item.id, props);
    const isText = TEXT_BLOCKS.has(item.type);

    return (
        <div className="grid grid-cols-1 gap-5">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--builder-select)] text-white shadow-sm">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-foreground text-sm font-semibold">
                        {isOwn ? label : t(label)}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                        {item.text || t('Edit it in the section.')}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={() => builder.editInSection(sectionId, item.id)}
                className="bg-card flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:border-[var(--builder-select)] hover:text-[var(--builder-select)]"
            >
                <PencilLine className="size-4" />
                {t('Edit in the section')}
            </button>

            <div className="bg-muted/60 flex items-center gap-1 rounded-xl border p-1">
                <ActionButton
                    label={t('Move up')}
                    disabled={item.isFirst}
                    onClick={() => handle.moveItem(item.id, -1)}
                >
                    <ArrowUp />
                </ActionButton>
                <ActionButton
                    label={t('Move down')}
                    disabled={item.isLast}
                    onClick={() => handle.moveItem(item.id, 1)}
                >
                    <ArrowDown />
                </ActionButton>
                <ActionButton
                    label={t('Duplicate')}
                    onClick={() => {
                        const copy = handle.duplicateItem(item.id);

                        if (copy) {
                            builder.selectItem(sectionId, copy);
                        }
                    }}
                >
                    <CopyPlus />
                </ActionButton>
                <span className="flex-1" />
                <ActionButton
                    label={t('Delete')}
                    destructive
                    onClick={() => {
                        handle.removeItem(item.id);
                        builder.selectSection(sectionId);
                    }}
                >
                    <Trash2 />
                </ActionButton>
            </div>

            {item.type === 'button' && (
                <ButtonFields
                    text={propText(item.props.text, '')}
                    url={propText(item.props.url, '')}
                    variant={propText(item.props.variant, 'solid')}
                    onChange={update}
                />
            )}

            {item.type === 'ownBlock' &&
                (ownDefinition ? (
                    <OwnBlockForm
                        definition={ownDefinition}
                        values={propText(item.props.values, '{}')}
                        onChange={(values) => update({ values })}
                    />
                ) : (
                    <InfoCard>
                        {t(
                            'This app has no block of this kind any more. Its values are kept, and the page leaves it out.',
                        )}
                    </InfoCard>
                ))}

            {item.type === 'gallery' && (
                <InfoCard>
                    {t(
                        'Add, remove and reorder the photos in the section. Tap Edit in the section.',
                    )}
                </InfoCard>
            )}

            {(item.type === 'image' || item.type === 'video') && (
                <div className="grid grid-cols-1 gap-3">
                    {item.type === 'image' ? (
                        <PhotoField
                            url={propText(item.props.url, '')}
                            onChange={(url) => update({ url })}
                        />
                    ) : (
                        <VideoField
                            url={propText(item.props.url, '')}
                            onChange={(url) => update({ url })}
                        />
                    )}
                    {item.type === 'image' && (
                        <TextField
                            label={t('Caption')}
                            hint={t(
                                'Shown under the photo. Also helps search engines.',
                            )}
                            value={propText(item.props.caption, '')}
                            onChange={(caption) => update({ caption })}
                        />
                    )}
                </div>
            )}

            {item.type === 'spacer' && (
                <Group label={t('Height')}>
                    <SegmentedChoice
                        label={t('Height')}
                        value={propText(item.props.size, 'md')}
                        options={SPACER_SIZES.map((option) => ({ ...option }))}
                        onChange={(size) => update({ size })}
                    />
                </Group>
            )}

            {item.type === 'card' && (
                <InfoCard>
                    {t(
                        'Type the card title in the section. Press Enter at the end of the title, then Tab, to put words inside the card.',
                    )}
                </InfoCard>
            )}

            {item.type === 'columnList' && (
                <InfoCard>
                    {t(
                        'Drag the line between two columns in the section to change how wide they are.',
                    )}
                </InfoCard>
            )}

            {isText && (
                <Group label={t('Kind of text')}>
                    <div className="grid grid-cols-3 gap-1.5">
                        {TEXT_TYPES.map((option) => {
                            const isChosen =
                                option.type === item.type &&
                                (option.level === null ||
                                    Number(item.props.level) === option.level ||
                                    (option.level === 2 &&
                                        Number(item.props.level) <= 2) ||
                                    (option.level === 3 &&
                                        Number(item.props.level) >= 3));

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={isChosen}
                                    onClick={() =>
                                        handle.changeItemType(
                                            item.id,
                                            option.type,
                                            option.level === null
                                                ? {}
                                                : { level: option.level },
                                        )
                                    }
                                    className={cn(
                                        'h-9 rounded-lg border px-1 text-xs font-medium transition-colors',
                                        isChosen
                                            ? 'border-foreground bg-secondary text-foreground'
                                            : 'text-muted-foreground hover:bg-secondary/60 bg-card',
                                    )}
                                >
                                    {t(option.label)}
                                </button>
                            );
                        })}
                    </div>
                </Group>
            )}

            {item.type === 'heading' && (
                <Group
                    label={t('Heading size')}
                    hint={t(
                        'In a Cards section, every small heading starts a new card.',
                    )}
                >
                    <SegmentedChoice
                        label={t('Heading size')}
                        value={propText(item.props.level, '2')}
                        options={[1, 2, 3, 4].map((level) => ({
                            value: String(level),
                            label: `H${level}`,
                        }))}
                        onChange={(level) => update({ level: Number(level) })}
                    />
                </Group>
            )}

            {'textAlignment' in item.props && (
                <Group label={t('Alignment')}>
                    <div className="grid grid-cols-3 gap-1.5">
                        {(
                            [
                                ['left', TextAlignStart, t('Left')],
                                ['center', TextAlignCenter, t('Centre')],
                                ['right', TextAlignEnd, t('Right')],
                            ] as const
                        ).map(([value, AlignIcon, alignLabel]) => {
                            const isChosen =
                                (item.props.textAlignment ?? 'left') === value;

                            return (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={isChosen}
                                    aria-label={alignLabel}
                                    title={alignLabel}
                                    onClick={() =>
                                        update({ textAlignment: value })
                                    }
                                    className={cn(
                                        'grid h-9 place-items-center rounded-lg border transition-colors',
                                        isChosen
                                            ? 'border-foreground bg-secondary text-foreground'
                                            : 'text-muted-foreground hover:bg-secondary/60 bg-card',
                                    )}
                                >
                                    <AlignIcon className="size-4" />
                                </button>
                            );
                        })}
                    </div>
                </Group>
            )}

            {isText && 'textColor' in item.props && (
                <Group label={t('Text colour')}>
                    <Swatches
                        colors={TEXT_COLORS}
                        value={propText(item.props.textColor, 'default')}
                        kind="text"
                        onChange={(textColor) => update({ textColor })}
                    />
                </Group>
            )}

            {isText && 'backgroundColor' in item.props && (
                <Group label={t('Highlight')}>
                    <Swatches
                        colors={HIGHLIGHTS}
                        value={propText(item.props.backgroundColor, 'default')}
                        kind="background"
                        onChange={(backgroundColor) =>
                            update({ backgroundColor })
                        }
                    />
                </Group>
            )}

            {'width' in item.props && (
                <Group
                    label={t('Width')}
                    hint={t('Or drag the edge of the item in the section.')}
                >
                    <SegmentedChoice
                        label={t('Width')}
                        value={nearestWidth(Number(item.props.width ?? 12))}
                        options={WIDTHS.map((option) => ({
                            value: option.value,
                            label: t(option.label),
                        }))}
                        onChange={(width) => update({ width: Number(width) })}
                    />
                </Group>
            )}

            {'spaceTop' in item.props && (
                <Group label={t('Space above')}>
                    <SegmentedChoice
                        label={t('Space above')}
                        value={propText(item.props.spaceTop, 'none')}
                        options={SPACES.map((option) => ({ ...option }))}
                        onChange={(spaceTop) => update({ spaceTop })}
                    />
                </Group>
            )}

            {'spaceBottom' in item.props && (
                <Group label={t('Space below')}>
                    <SegmentedChoice
                        label={t('Space below')}
                        value={propText(item.props.spaceBottom, 'none')}
                        options={SPACES.map((option) => ({ ...option }))}
                        onChange={(spaceBottom) => update({ spaceBottom })}
                    />
                </Group>
            )}
        </div>
    );
}

/** A prop as text, for a field. Anything that is not text or a number is left out. */
function propText(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
        return value;
    }

    return typeof value === 'number' ? String(value) : fallback;
}

function nearestWidth(width: number): string {
    return WIDTHS.reduce((best, option) =>
        Math.abs(Number(option.value) - width) <
        Math.abs(Number(best.value) - width)
            ? option
            : best,
    ).value;
}

function Group({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <p className="text-foreground text-sm font-medium">{label}</p>
            {children}
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
    );
}

function InfoCard({
    children,
    action,
}: {
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="bg-muted/60 text-muted-foreground grid gap-2 rounded-xl p-3 text-sm leading-relaxed">
            <p>{children}</p>
            {action}
        </div>
    );
}

function TextField({
    label,
    hint,
    error,
    value,
    placeholder,
    maxLength,
    onChange,
}: {
    label: string;
    hint?: string;
    error?: string;
    value: string;
    placeholder?: string;
    maxLength?: number;
    onChange: (value: string) => void;
}) {
    const id = useId();

    return (
        <div className="grid gap-2">
            <label htmlFor={id} className="text-foreground text-sm font-medium">
                {label}
            </label>
            <Input
                id={id}
                value={value}
                placeholder={placeholder}
                maxLength={maxLength}
                aria-invalid={error ? true : undefined}
                onChange={(event) => onChange(event.target.value)}
                className="bg-card"
            />
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
            {error && (
                <p role="alert" className="text-destructive text-xs">
                    {error}
                </p>
            )}
        </div>
    );
}

/** The button's words, link and look. */
function ButtonFields({
    text,
    url,
    variant,
    onChange,
}: {
    text: string;
    url: string;
    variant: string;
    onChange: (props: Record<string, unknown>) => void;
}) {
    const t = useT();
    const isBroken = url.trim() !== '' && safeButtonUrl(url) === null;

    return (
        <div className="grid grid-cols-1 gap-4">
            <TextField
                label={t('Button text')}
                value={text}
                maxLength={80}
                onChange={(value) => onChange({ text: value })}
            />
            <TextField
                label={t('Link')}
                hint={
                    isBroken
                        ? undefined
                        : t('A web address, #link-name, /path, mailto: or tel:')
                }
                error={
                    isBroken
                        ? t('This link will not work. Use https://, #, /, mailto: or tel:.')
                        : undefined
                }
                value={url}
                placeholder="https://"
                onChange={(value) => onChange({ url: value })}
            />
            <Group label={t('Look')}>
                <SegmentedChoice
                    label={t('Look')}
                    value={variant === 'outline' ? 'outline' : 'solid'}
                    options={[
                        { value: 'solid', label: t('Solid') },
                        { value: 'outline', label: t('Outline') },
                    ]}
                    onChange={(value) => onChange({ variant: value })}
                />
            </Group>
        </div>
    );
}

function Swatches({
    colors,
    value,
    kind,
    onChange,
}: {
    colors: Record<string, string>;
    value: string;
    kind: 'text' | 'background';
    onChange: (color: string) => void;
}) {
    const t = useT();

    return (
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
            {Object.entries(colors).map(([name, hex]) => {
                const isChosen = value === name;
                const isDefault = name === 'default';

                return (
                    <button
                        key={name}
                        type="button"
                        role="radio"
                        aria-checked={isChosen}
                        aria-label={isDefault ? t('No colour') : name}
                        title={isDefault ? t('No colour') : name}
                        onClick={() => onChange(name)}
                        className={cn(
                            'grid size-8 place-items-center rounded-lg border text-sm font-bold transition-shadow',
                            isChosen
                                ? 'ring-foreground ring-2 ring-offset-1'
                                : 'hover:border-input',
                        )}
                        style={
                            kind === 'text'
                                ? { color: hex, backgroundColor: '#ffffff' }
                                : { backgroundColor: hex }
                        }
                    >
                        {isDefault ? (
                            <Ban className="size-3.5 text-slate-400" />
                        ) : kind === 'text' ? (
                            'A'
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
