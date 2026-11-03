import { OwnBlockForm } from '@/blocks/own-block-form';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { SegmentedChoice } from '../editor/segmented-choice';
import { ButtonFields } from './button-fields';
import { FormEditor } from './form/form-editor';
import { Group, InfoCard, propText, TextField } from './item-fields';
import { TextItemSettings } from './item-text-settings';
import { PhotoField, VideoField } from './media-field';
import type { ItemSnapshot, SectionEditorHandle } from './types';

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

/**
 * The picked item's own settings, on the item panel's Settings tab: the
 * button's words and link, an own block's fields, the form, a photo, the
 * kind of text, and the width and space every item has.
 */
export function ItemSettings({
    item,
    handle,
    onChange,
}: {
    item: ItemSnapshot;
    handle: SectionEditorHandle;
    onChange: (props: Record<string, unknown>) => void;
}) {
    const t = useT();
    const { ownBlocks } = useHost();
    const ownDefinition =
        item.type === 'ownBlock'
            ? ownBlocks.find((entry) => entry.kind === item.props.kind)
            : undefined;

    return (
        <div className="grid grid-cols-1 gap-5">
            {item.type === 'button' && (
                <ButtonFields
                    text={propText(item.props.text, '')}
                    url={propText(item.props.url, '')}
                    variant={propText(item.props.variant, 'solid')}
                    onChange={onChange}
                />
            )}

            {item.type === 'form' && (
                <FormEditor
                    key={item.id}
                    form={propText(item.props.form, '')}
                    onChange={(form) => onChange({ form })}
                />
            )}

            {item.type === 'ownBlock' &&
                (ownDefinition ? (
                    <OwnBlockForm
                        definition={ownDefinition}
                        values={propText(item.props.values, '{}')}
                        onChange={(values) => onChange({ values })}
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
                            onChange={(url) => onChange({ url })}
                        />
                    ) : (
                        <VideoField
                            url={propText(item.props.url, '')}
                            onChange={(url) => onChange({ url })}
                        />
                    )}
                    {item.type === 'image' && (
                        <TextField
                            label={t('Caption')}
                            hint={t('Shown under the photo. Also helps search engines.')}
                            value={propText(item.props.caption, '')}
                            onChange={(caption) => onChange({ caption })}
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
                        onChange={(size) => onChange({ size })}
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

            <TextItemSettings item={item} handle={handle} onChange={onChange} />

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
                        onChange={(width) => onChange({ width: Number(width) })}
                    />
                </Group>
            )}

            {'spaceTop' in item.props && (
                <Group label={t('Space above')}>
                    <SegmentedChoice
                        label={t('Space above')}
                        value={propText(item.props.spaceTop, 'none')}
                        options={SPACES.map((option) => ({ ...option }))}
                        onChange={(spaceTop) => onChange({ spaceTop })}
                    />
                </Group>
            )}

            {'spaceBottom' in item.props && (
                <Group label={t('Space below')}>
                    <SegmentedChoice
                        label={t('Space below')}
                        value={propText(item.props.spaceBottom, 'none')}
                        options={SPACES.map((option) => ({ ...option }))}
                        onChange={(spaceBottom) => onChange({ spaceBottom })}
                    />
                </Group>
            )}
        </div>
    );
}

function nearestWidth(width: number): string {
    return WIDTHS.reduce((best, option) =>
        Math.abs(Number(option.value) - width) <
        Math.abs(Number(best.value) - width)
            ? option
            : best,
    ).value;
}
