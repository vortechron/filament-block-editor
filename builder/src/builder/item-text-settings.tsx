import { Ban, TextAlignCenter, TextAlignEnd, TextAlignStart } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SegmentedChoice } from '../editor/segmented-choice';
import { Group, propText } from './item-fields';
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

export const TEXT_BLOCKS = new Set([
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

type TextProps = {
    item: ItemSnapshot;
    onChange: (props: Record<string, unknown>) => void;
};

/** A heading's sizes, H1 to H4. */
const HEADING_LEVELS = [1, 2, 3, 4] as const;

/**
 * A text item's settings: what kind of text it is, a heading's size, its
 * alignment and its colours.
 */
export function TextItemSettings({
    item,
    handle,
    onChange,
}: TextProps & { handle: SectionEditorHandle }) {
    const t = useT();
    const isText = TEXT_BLOCKS.has(item.type);

    return (
        <>
            {isText && <TextKindChoice item={item} handle={handle} />}

            {item.type === 'heading' && (
                <Group
                    label={t('Heading size')}
                    hint={t('In a Cards section, every small heading starts a new card.')}
                >
                    <SegmentedChoice
                        label={t('Heading size')}
                        value={propText(item.props.level, '2')}
                        options={HEADING_LEVELS.map((level) => ({
                            value: String(level),
                            label: `H${level}`,
                        }))}
                        onChange={(level) => onChange({ level: Number(level) })}
                    />
                </Group>
            )}

            {'textAlignment' in item.props && <AlignmentChoice item={item} onChange={onChange} />}

            {isText && 'textColor' in item.props && (
                <Group label={t('Text colour')}>
                    <Swatches
                        colors={TEXT_COLORS}
                        value={propText(item.props.textColor, 'default')}
                        kind="text"
                        onChange={(textColor) => onChange({ textColor })}
                    />
                </Group>
            )}

            {isText && 'backgroundColor' in item.props && (
                <Group label={t('Highlight')}>
                    <Swatches
                        colors={HIGHLIGHTS}
                        value={propText(item.props.backgroundColor, 'default')}
                        kind="background"
                        onChange={(backgroundColor) => onChange({ backgroundColor })}
                    />
                </Group>
            )}
        </>
    );
}

/** Text, heading, quote or list: the words stay when the kind changes. */
function TextKindChoice({ item, handle }: { item: ItemSnapshot; handle: SectionEditorHandle }) {
    const t = useT();
    const level = Number(item.props.level);

    return (
        <Group label={t('Kind of text')}>
            <div className="grid grid-cols-3 gap-1.5">
                {TEXT_TYPES.map((option) => {
                    const isChosen =
                        option.type === item.type &&
                        (option.level === null ||
                            level === option.level ||
                            (option.level === 2 && level <= 2) ||
                            (option.level === 3 && level >= 3));

                    return (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={isChosen}
                            onClick={() =>
                                handle.changeItemType(
                                    item.id,
                                    option.type,
                                    option.level === null ? {} : { level: option.level },
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
    );
}

function AlignmentChoice({ item, onChange }: TextProps) {
    const t = useT();
    const alignments = [
        ['left', TextAlignStart, t('Left')],
        ['center', TextAlignCenter, t('Centre')],
        ['right', TextAlignEnd, t('Right')],
    ] as const;

    return (
        <Group label={t('Alignment')}>
            <div className="grid grid-cols-3 gap-1.5">
                {alignments.map(([value, AlignIcon, alignLabel]) => {
                    const isChosen = (item.props.textAlignment ?? 'left') === value;

                    return (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={isChosen}
                            aria-label={alignLabel}
                            title={alignLabel}
                            onClick={() => onChange({ textAlignment: value })}
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
