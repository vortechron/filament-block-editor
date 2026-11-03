import { Check, LoaderCircle } from 'lucide-react';
import { useId } from 'react';
import { SegmentedChoice } from '@/editor/segmented-choice';
import { FONTS } from '@/editor/rich-style-fields';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { cleanLength } from '@/lib/style-bag';
import type { Kit } from '@/types';
import { Button } from '@/ui/button';
import { useBuilderContext } from '../builder-context';
import { LengthInput } from '../style/length-input';
import { TRANSFORMS, WEIGHTS } from '../style/style-fields';
import { KitColors } from './kit-colors';
import { KitField, KitSection } from './kit-section';

const SELECT_CLASS =
    'border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]';

/**
 * The site's design kit: colours, fonts, text, corners, buttons and
 * forms. It is the same on every page. Every change shows on the page
 * at once (the preview gets the kit), and is kept with "Save design".
 */
export function DesignPanel() {
    const t = useT();
    const { kit } = useBuilderContext();
    const current = kit.kit;

    if (!kit.canSave) {
        return null;
    }

    const set = kit.setKit;

    return (
        <div className="grid grid-cols-1 gap-4">
            <p className="text-muted-foreground text-xs">
                {t(
                    'These design values are the same on every page. Changes show on the page now, and are kept when you save the design.',
                )}
            </p>

            <KitColors kit={current} onChange={set} />
            <KitFonts kit={current} onChange={set} />
            <KitShapes kit={current} onChange={set} />

            <div className="bg-card sticky bottom-0 -mx-4 -mb-4 flex items-center justify-end gap-2 border-t px-4 py-3">
                {!kit.isDirty && kit.recentlySuccessful && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Check className="size-3.5" />
                        {t('Saved')}
                    </span>
                )}
                <Button
                    type="button"
                    size="sm"
                    disabled={!kit.isDirty || kit.processing}
                    onClick={() => void kit.save()}
                    className="bg-[var(--builder-select)] text-white hover:bg-[var(--builder-select)]/90"
                >
                    {kit.processing && <LoaderCircle className="animate-spin" />}
                    {t('Save design')}
                </Button>
            </div>
        </div>
    );
}

type KitPart = { kit: Kit; onChange: (update: (kit: Kit) => Kit) => void };

/** The heading and body fonts, the base text size and the heading weight. */
function KitFonts({ kit, onChange }: KitPart) {
    const t = useT();
    const id = useId();
    const { fonts } = useHost();
    // The host's list when it gave one, else the builder's own fonts.
    const choices =
        fonts.length > 0
            ? fonts.filter((font) => font.value !== 'theme')
            : FONTS.filter((font) => font.value !== 'theme').map((font) => ({
                  value: font.value,
                  label: t(font.label),
              }));
    const fontSelect = (which: 'heading' | 'body', label: string) => (
        <KitField label={label} htmlFor={`${id}-${which}`}>
            <select
                id={`${id}-${which}`}
                value={kit.fonts[which]}
                onChange={(event) =>
                    onChange((current) => ({
                        ...current,
                        fonts: { ...current.fonts, [which]: event.target.value },
                    }))
                }
                className={SELECT_CLASS}
            >
                <option value="theme">{t('Theme')}</option>
                {choices.map((font) => (
                    <option key={font.value} value={font.value}>
                        {font.label}
                    </option>
                ))}
                {!choices.some((font) => font.value === kit.fonts[which]) &&
                    kit.fonts[which] !== 'theme' && (
                        <option value={kit.fonts[which]}>{kit.fonts[which]}</option>
                    )}
            </select>
        </KitField>
    );

    return (
        <KitSection title={t('Fonts and text')}>
            {fontSelect('heading', t('Heading font'))}
            {fontSelect('body', t('Body font'))}
            <KitField label={t('Base text size')} htmlFor={`${id}-size`}>
                <KitLength
                    id={`${id}-size`}
                    label={t('Base text size')}
                    value={kit.text.base_size}
                    onChange={(base_size) =>
                        onChange((current) => ({
                            ...current,
                            text: { ...current.text, base_size },
                        }))
                    }
                />
            </KitField>
            <KitField label={t('Heading weight')} htmlFor={`${id}-weight`}>
                <WeightSelect
                    id={`${id}-weight`}
                    value={kit.text.heading_weight}
                    onChange={(heading_weight) =>
                        onChange((current) => ({
                            ...current,
                            text: { ...current.text, heading_weight },
                        }))
                    }
                />
            </KitField>
        </KitSection>
    );
}

/** Corners, buttons and form fields. */
function KitShapes({ kit, onChange }: KitPart) {
    const t = useT();
    const id = useId();
    const setButtons = (part: Partial<Kit['buttons']>) =>
        onChange((current) => ({ ...current, buttons: { ...current.buttons, ...part } }));
    const setForms = (part: Partial<Kit['forms']>) =>
        onChange((current) => ({ ...current, forms: { ...current.forms, ...part } }));

    return (
        <>
            <KitSection title={t('Corners')}>
                <KitField label={t('Corner size')} htmlFor={`${id}-radius`}>
                    <KitLength
                        id={`${id}-radius`}
                        label={t('Corner size')}
                        value={kit.radius}
                        onChange={(radius) => onChange((current) => ({ ...current, radius }))}
                    />
                </KitField>
            </KitSection>

            <KitSection title={t('Buttons')}>
                <SegmentedChoice
                    label={t('Button look')}
                    value={kit.buttons.style}
                    options={[
                        { value: 'solid', label: t('Solid') },
                        { value: 'outline', label: t('Outline') },
                        { value: 'pill', label: t('Pill') },
                        { value: 'shadow', label: t('Shadow') },
                    ]}
                    onChange={(style) => setButtons({ style })}
                />
                <KitField label={t('Button corners')} htmlFor={`${id}-button-radius`}>
                    <KitLength
                        id={`${id}-button-radius`}
                        label={t('Button corners')}
                        value={kit.buttons.radius}
                        onChange={(radius) => setButtons({ radius })}
                    />
                </KitField>
                <SegmentedChoice
                    label={t('Button size')}
                    value={kit.buttons.size}
                    options={[
                        { value: 'sm', label: 'S' },
                        { value: 'md', label: 'M' },
                        { value: 'lg', label: 'L' },
                    ]}
                    onChange={(size) => setButtons({ size })}
                />
                <KitField label={t('Capital letters')} htmlFor={`${id}-transform`}>
                    <select
                        id={`${id}-transform`}
                        value={kit.buttons.text_transform}
                        onChange={(event) => setButtons({ text_transform: event.target.value })}
                        className={SELECT_CLASS}
                    >
                        {TRANSFORMS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {t(option.label)}
                            </option>
                        ))}
                    </select>
                </KitField>
                <KitField label={t('Button text weight')} htmlFor={`${id}-button-weight`}>
                    <WeightSelect
                        id={`${id}-button-weight`}
                        value={kit.buttons.font_weight}
                        onChange={(font_weight) => setButtons({ font_weight })}
                    />
                </KitField>
            </KitSection>

            <KitSection title={t('Forms')}>
                <SegmentedChoice
                    label={t('Field look')}
                    value={kit.forms.style}
                    options={[
                        { value: 'outline', label: t('Outline') },
                        { value: 'filled', label: t('Filled') },
                        { value: 'underline', label: t('Underline') },
                    ]}
                    onChange={(style) => setForms({ style })}
                />
                <KitField label={t('Field corners')} htmlFor={`${id}-form-radius`}>
                    <KitLength
                        id={`${id}-form-radius`}
                        label={t('Field corners')}
                        value={kit.forms.radius}
                        onChange={(radius) => setForms({ radius })}
                    />
                </KitField>
                <SegmentedChoice
                    label={t('Field labels')}
                    value={kit.forms.labels}
                    options={[
                        { value: 'above', label: t('Above the field') },
                        { value: 'hidden', label: t('Hidden') },
                    ]}
                    onChange={(labels) => setForms({ labels })}
                />
            </KitSection>
        </>
    );
}

/** A kit length: it always has a value, so emptying the field keeps the old one. */
function KitLength({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <LengthInput
            id={id}
            label={label}
            value={value}
            validate={(typed) => cleanLength(typed, false)}
            onChange={(next) => {
                if (next !== null) {
                    onChange(next);
                }
            }}
        />
    );
}

function WeightSelect({
    id,
    value,
    onChange,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const t = useT();

    return (
        <select
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={SELECT_CLASS}
        >
            {WEIGHTS.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.value} · {t(option.label)}
                </option>
            ))}
        </select>
    );
}
