import { richValue, richContent } from '@/lib/rich-text';
import { RichWordsField } from './rich-words-field';
import { LocalizedText } from './field-language';
import { OwnBlockForm } from '@/blocks/own-block-form';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { ownBlockSource } from '@/lib/own-block-source';
import {
    GalleryBlock,
    galleryUrls,
    MAX_GALLERY_PHOTOS,
} from '../editor/gallery-block';
import { SegmentedChoice } from '../editor/segmented-choice';
import { ButtonFields } from './button-fields';
import { EditElsewhereLink } from './edit-elsewhere-link';
import { FormEditor } from './form/form-editor';
import { Group, InfoCard, propText, TextField } from './item-fields';
import { TextItemSettings } from './item-text-settings';
import { TableWordsFields } from './table-words-fields';
import { PhotoField, VideoField } from './media-field';
import { SiteInfoRows } from './part/site-info-rows';
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

type SettingsProps = {
    item: ItemSnapshot;
    onChange: (props: Record<string, unknown>) => void;
};

/** Items whose words the panel can change in a plain text box. */
const WORD_ITEMS = new Set([
    'paragraph',
    'heading',
    'quote',
    'bulletListItem',
    'numberedListItem',
    'checkListItem',
    'toggleListItem',
    'card',
]);

/** Items whose words may run over several lines. */
const LONG_WORD_ITEMS = new Set(['paragraph', 'quote']);

/** A full row: the kit's WIDTH_COLUMNS (BlockNoteRenderer::WIDTH_COLUMNS). */
const FULL_COLUMNS = 12;

/**
 * The picked item's own settings, on the item panel's Settings tab: a text
 * item's words, the button's words and link, an own block's fields, the
 * form, a photo or the slideshow's photos, the shop info the item shows,
 * the kind of text, and the width and space every item has. A form shows
 * its shop info with its actions instead.
 */
export function ItemSettings({
    item,
    handle,
    onChange,
    onWords,
}: SettingsProps & {
    handle: SectionEditorHandle;
    onWords: (content: unknown) => void;
}) {
    return (
        <div className="grid grid-cols-1 gap-5">
            <WordsField item={item} onWords={onWords} handle={handle} />
            <KindSettings item={item} handle={handle} onChange={onChange} />
            {item.type !== 'form' && (
                <SiteInfoRows source={item} back={{ name: 'item' }} />
            )}
            <TextItemSettings item={item} handle={handle} onChange={onChange} />
            <PlacementSettings item={item} onChange={onChange} />
        </div>
    );
}

/**
 * One complete inline field per language. Plain words keep a normal box;
 * marked words keep their full inline tree in the field editor.
 */
function WordsField({
    item,
    onWords,
    handle,
}: {
    item: ItemSnapshot;
    onWords: (content: unknown) => void;
    handle: SectionEditorHandle;
}) {
    const t = useT();

    if (item.type === 'table')
        return <TableWordsFields item={item} handle={handle} />;

    if (!WORD_ITEMS.has(item.type)) {
        return null;
    }

    return (
        <LocalizedText
            path="/rich"
            label={t('Words')}
            value={richValue(item.content)}
            onChange={(value) => onWords(richContent(value))}
        >
            {(value, change) => (
                <RichWordsField
                    label={t('Words')}
                    value={value}
                    multiline={LONG_WORD_ITEMS.has(item.type)}
                    onChange={change}
                />
            )}
        </LocalizedText>
    );
}

/** What only this kind of item has. */
function KindSettings({
    item,
    handle,
    onChange,
}: SettingsProps & { handle: SectionEditorHandle }) {
    const t = useT();

    switch (item.type) {
        case 'button':
            return (
                <ButtonFields
                    text={propText(item.props.text, '')}
                    url={propText(item.props.url, '')}
                    variant={propText(item.props.variant, 'solid')}
                    onChange={onChange}
                />
            );
        case 'form':
            return (
                <FormEditor
                    key={item.id}
                    form={propText(item.props.form, '')}
                    onChange={(form) => onChange({ form })}
                />
            );
        case 'ownBlock':
            return <OwnBlockSettings item={item} onChange={onChange} />;
        case 'image':
        case 'video':
            return <MediaSettings item={item} onChange={onChange} />;
        case 'spacer':
            return (
                <Group label={t('Height')}>
                    <SegmentedChoice
                        label={t('Height')}
                        value={propText(item.props.size, 'md')}
                        options={SPACER_SIZES.map((option) => ({ ...option }))}
                        onChange={(size) => onChange({ size })}
                    />
                </Group>
            );
        case 'gallery':
            return (
                <GallerySettings
                    item={item}
                    handle={handle}
                    onChange={onChange}
                />
            );
        case 'card':
            return (
                <InfoCard>
                    {t(
                        'Type the card title in the section. Press Enter at the end of the title, then Tab, to put words inside the card.',
                    )}
                </InfoCard>
            );
        case 'columnList':
            return (
                <InfoCard>
                    {t(
                        'Drag the line between two columns in the section to change how wide they are.',
                    )}
                </InfoCard>
            );
        default:
            return null;
    }
}

/**
 * The slideshow's photos: add (several at once), move and remove them.
 * Photos that finish uploading join the ones the slideshow has by then.
 */
function GallerySettings({
    item,
    handle,
    onChange,
}: SettingsProps & { handle: SectionEditorHandle }) {
    const t = useT();
    const { upload } = useHost();

    return (
        <Group label={t('Photos')}>
            <GalleryBlock
                images={propText(item.props.images, '')}
                uploadFile={(file) => upload(file, 'image')}
                onAdd={(urls) => {
                    const now = galleryUrls(
                        propText(handle.getItem(item.id)?.props.images, ''),
                    );

                    onChange({
                        images: [...now, ...urls]
                            .slice(0, MAX_GALLERY_PHOTOS)
                            .join('\n'),
                    });
                }}
                onChange={(urls) => onChange({ images: urls.join('\n') })}
            />
        </Group>
    );
}

function OwnBlockSettings({ item, onChange }: SettingsProps) {
    const t = useT();
    const { ownBlocks, developer } = useHost();
    const definition = ownBlocks.find(
        (entry) => entry.kind === item.props.kind,
    );
    const source = definition ? ownBlockSource(definition, developer) : null;

    return definition && source ? (
        <div className="grid grid-cols-1 gap-4">
            {(source.note !== null ||
                source.link !== null ||
                source.isEmpty) && (
                <InfoCard
                    action={
                        source.link && (
                            <EditElsewhereLink
                                href={source.link.url}
                                label={source.link.label}
                            />
                        )
                    }
                >
                    {source.note ??
                        (source.isEmpty
                            ? t('This block has nothing to set here.')
                            : t('What it shows is changed on another screen.'))}
                </InfoCard>
            )}
            <OwnBlockForm
                definition={definition}
                values={propText(item.props.values, '{}')}
                onChange={(values) => onChange({ values })}
                allowShopValues
            />
        </div>
    ) : (
        <InfoCard>
            {t(
                'This app has no block of this kind any more. Its values are kept, and the page leaves it out.',
            )}
        </InfoCard>
    );
}

function MediaSettings({ item, onChange }: SettingsProps) {
    const t = useT();
    const url = propText(item.props.url, '');

    return (
        <div className="grid grid-cols-1 gap-3">
            {item.type === 'image' ? (
                <>
                    <PhotoField
                        url={url}
                        onChange={(next) => onChange({ url: next })}
                    />
                    <TextField
                        label={t('Caption')}
                        translationPath="/props/caption"
                        hint={t(
                            'Shown under the photo. Also helps search engines.',
                        )}
                        value={propText(item.props.caption, '')}
                        onChange={(caption) => onChange({ caption })}
                    />
                </>
            ) : (
                <VideoField
                    url={url}
                    onChange={(next) => onChange({ url: next })}
                />
            )}
        </div>
    );
}

/** The width and the space above and below that most items have. */
function PlacementSettings({ item, onChange }: SettingsProps) {
    const t = useT();

    return (
        <>
            {'width' in item.props && (
                <Group
                    label={t('Width')}
                    hint={t('Or drag the edge of the item in the section.')}
                >
                    <SegmentedChoice
                        label={t('Width')}
                        value={nearestWidth(
                            Number(item.props.width ?? FULL_COLUMNS),
                        )}
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
        </>
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
