import { useHost } from '@/lib/host';
import { newBlockId } from '@/lib/block-ids';
import { LocalizedText, PrepareTranslation } from '../field-language';
import { type ReactNode, useId, useRef, useState } from 'react';
import { SegmentedChoice } from '@/editor/segmented-choice';
import {
    cleanForm,
    type FormDefinition,
    FORM_NAME_LENGTH,
    parseForm,
    SUBMIT_LENGTH,
    SUCCESS_LENGTH,
    type SubmitAlign,
} from '@/lib/form-definition';
import { useT } from '@/lib/i18n';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { SiteInfoRows } from '../part/site-info-rows';
import { FormActions } from './form-actions';
import { FormFields } from './form-fields';

/**
 * The form block's settings: its name, its fields, the button, the message
 * after sending, and what happens then, with the shop info an action sends
 * to (like the shop email) right under it. Every change is cleaned
 * (lib/form-definition.ts) and written into the block's `form` prop.
 *
 * The form is read once, when the panel opens for the block (it is keyed
 * by the block id), so a field keeps its place while it is typed in.
 */
export function FormEditor({
    form,
    onChange,
}: {
    /** The block's `form` prop: the form as JSON. */
    form: string;
    onChange: (form: string) => void;
}) {
    const t = useT();
    const { fieldLanguages } = useHost();
    const nameId = useId();
    const submitId = useId();
    const successId = useId();
    const [current, setCurrent] = useState<FormDefinition>(() => {
        const current = parseForm(form);
        if (fieldLanguages)
            current.fields = current.fields.map((field) => ({
                ...field,
                ...(field.options
                    ? {
                          option_ids: field.options.map(
                              (_, i) => field.option_ids?.[i] ?? newBlockId(),
                          ),
                      }
                    : {}),
            }));
        return current;
    });
    const latest = useRef(current);

    function change(update: (form: FormDefinition) => FormDefinition) {
        const next = cleanForm(update(latest.current));

        latest.current = next;
        setCurrent(next);
        onChange(JSON.stringify(next));
    }

    return (
        <PrepareTranslation
            value={() => {
                const prepared = JSON.stringify(latest.current);
                if (prepared !== form) onChange(prepared);
            }}
        >
            <div className="grid grid-cols-1 gap-5">
                <div className="grid gap-1.5">
                    <label
                        htmlFor={nameId}
                        className="text-foreground text-sm font-medium"
                    >
                        {t('Form name')}
                    </label>
                    <Input
                        id={nameId}
                        value={current.name}
                        maxLength={FORM_NAME_LENGTH}
                        className="bg-card"
                        onChange={(event) => {
                            const name = event.target.value;

                            change((form) => ({ ...form, name }));
                        }}
                    />
                    <p className="text-muted-foreground text-xs">
                        {t('Only you see it, in your list of messages.')}
                    </p>
                </div>

                <Part title={t('Fields')}>
                    <FormFields
                        fields={current.fields}
                        onChange={(fields) =>
                            change((form) => ({ ...form, fields }))
                        }
                    />
                </Part>

                <Part title={t('Send button')}>
                    <div className="grid gap-1.5">
                        <label
                            htmlFor={submitId}
                            className="text-foreground text-xs font-medium"
                        >
                            {t('Button text')}
                        </label>
                        <LocalizedText
                            path="/form/submit"
                            label={t('Button text')}
                            value={current.submit.text}
                            onChange={(text) =>
                                change((form) => ({
                                    ...form,
                                    submit: { ...form.submit, text },
                                    _translated_empty: [
                                        ...(
                                            form._translated_empty ?? []
                                        ).filter((part) => part !== 'submit'),
                                        ...(text.trim() === ''
                                            ? ['submit' as const]
                                            : []),
                                    ],
                                }))
                            }
                        >
                            {(value, changeText) => (
                                <Input
                                    id={submitId}
                                    value={value}
                                    maxLength={SUBMIT_LENGTH}
                                    className="bg-card"
                                    onChange={(event) =>
                                        changeText(event.target.value)
                                    }
                                />
                            )}
                        </LocalizedText>
                    </div>
                    <SegmentedChoice<SubmitAlign>
                        label={t('Button place')}
                        value={current.submit.align}
                        options={[
                            { value: 'left', label: t('Left') },
                            { value: 'center', label: t('Centre') },
                            { value: 'right', label: t('Right') },
                            { value: 'full', label: t('Full width') },
                        ]}
                        onChange={(align) =>
                            change((form) => ({
                                ...form,
                                submit: { ...form.submit, align },
                            }))
                        }
                    />
                </Part>

                <div className="grid gap-1.5">
                    <label
                        htmlFor={successId}
                        className="text-foreground text-sm font-medium"
                    >
                        {t('Message after sending')}
                    </label>
                    <LocalizedText
                        path="/form/success"
                        label={t('Message after sending')}
                        value={current.success}
                        onChange={(success) =>
                            change((form) => ({
                                ...form,
                                success,
                                _translated_empty: [
                                    ...(form._translated_empty ?? []).filter(
                                        (part) => part !== 'success',
                                    ),
                                    ...(success.trim() === ''
                                        ? ['success' as const]
                                        : []),
                                ],
                            }))
                        }
                    >
                        {(value, changeText) => (
                            <Textarea
                                id={successId}
                                value={value}
                                maxLength={SUCCESS_LENGTH}
                                rows={2}
                                className="bg-card"
                                onChange={(event) =>
                                    changeText(event.target.value)
                                }
                            />
                        )}
                    </LocalizedText>
                </div>

                <Part
                    title={t('After sending')}
                    hint={t(
                        'Every message is kept for you, whatever you pick here.',
                    )}
                >
                    <FormActions
                        actions={current.actions}
                        fields={current.fields}
                        onChange={(actions) =>
                            change((form) => ({ ...form, actions }))
                        }
                    />
                    <SiteInfoRows
                        source={{
                            type: 'form',
                            props: { form: JSON.stringify(current) },
                        }}
                        back={{ name: 'item' }}
                    />
                </Part>
            </div>
        </PrepareTranslation>
    );
}

function Part({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-2">
            <div className="grid gap-0.5">
                <h3 className="text-foreground text-sm font-medium">{title}</h3>
                {hint && (
                    <p className="text-muted-foreground text-xs">{hint}</p>
                )}
            </div>
            {children}
        </section>
    );
}
