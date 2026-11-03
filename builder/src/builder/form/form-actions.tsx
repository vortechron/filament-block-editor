import { Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { safeButtonUrl } from '@/blocks/button-url';
import { SegmentedChoice } from '@/editor/segmented-choice';
import {
    type FormAction,
    type FormActionType,
    FORM_ACTION_TYPES,
    type FormField,
    isEmailTarget,
    isWebhookUrl,
    LABEL_LENGTH,
    MESSAGE_LENGTH,
    SHOP_EMAIL,
    SHOP_WHATSAPP,
} from '@/lib/form-definition';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { replaceItem } from '../../editor/helpers';
import { useDraft } from './use-draft';

export const ACTION_LABELS: Record<FormActionType, string> = {
    email: 'Email me',
    whatsapp: 'Open WhatsApp',
    redirect: 'Go to a page',
    webhook: 'Webhook',
};

const NEW_ACTIONS: Record<FormActionType, FormAction> = {
    email: { type: 'email', to: SHOP_EMAIL, subject: '' },
    whatsapp: { type: 'whatsapp', to: SHOP_WHATSAPP, message: '' },
    redirect: { type: 'redirect', url: '' },
    webhook: { type: 'webhook', url: '' },
};

/**
 * What happens after a visitor sends the form, besides keeping the
 * message: an email to the shop, WhatsApp, another page, and (developers
 * only) a webhook. At most one of each. A stored webhook stays, hidden,
 * for everyone else.
 */
export function FormActions({
    actions,
    fields,
    onChange,
}: {
    actions: FormAction[];
    fields: FormField[];
    onChange: (actions: FormAction[]) => void;
}) {
    const t = useT();
    const { developer } = useHost();
    const offered = FORM_ACTION_TYPES.filter(
        (type) => developer || type !== 'webhook',
    );
    const missing = offered.filter(
        (type) => !actions.some((action) => action.type === type),
    );

    return (
        <div className="grid grid-cols-1 gap-2">
            {actions.map((action, index) =>
                offered.includes(action.type) ? (
                    <div key={action.type} className="bg-card grid gap-3 rounded-xl border p-3">
                        <div className="flex items-center gap-2">
                            <p className="text-foreground flex-1 text-sm font-semibold">
                                {t(ACTION_LABELS[action.type])}
                            </p>
                            <button
                                type="button"
                                aria-label={t('Remove :action', {
                                    action: t(ACTION_LABELS[action.type]),
                                })}
                                onClick={() =>
                                    onChange(actions.filter((_, at) => at !== index))
                                }
                                className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 place-items-center rounded-md [&_svg]:size-3.5"
                            >
                                <Trash2 />
                            </button>
                        </div>
                        <ActionFields
                            action={action}
                            fields={fields}
                            onChange={(next) => onChange(replaceItem(actions, index, next))}
                        />
                    </div>
                ) : null,
            )}

            {missing.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {missing.map((type) => (
                        <button
                            key={type}
                            type="button"
                            aria-label={t('Add :action', { action: t(ACTION_LABELS[type]) })}
                            onClick={() => onChange([...actions, NEW_ACTIONS[type]])}
                            className="bg-card text-muted-foreground flex h-8 items-center gap-1 rounded-lg border border-dashed px-2.5 text-xs font-medium hover:border-[var(--builder-select)] hover:text-[var(--builder-select)]"
                        >
                            <Plus className="size-3.5" />
                            {t(ACTION_LABELS[type])}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ActionFields({
    action,
    fields,
    onChange,
}: {
    action: FormAction;
    fields: FormField[];
    onChange: (action: FormAction) => void;
}) {
    const t = useT();

    switch (action.type) {
        case 'email':
            return <EmailFields action={action} onChange={onChange} />;
        case 'whatsapp':
            return <WhatsAppFields action={action} fields={fields} onChange={onChange} />;
        case 'redirect':
            return (
                <AddressField
                    label={t('Page address')}
                    hint={t('A web address or a /path on your site.')}
                    problem={t('This link will not work. Use https://, #, /, mailto: or tel:.')}
                    value={action.url}
                    allowEmpty
                    isGood={(url) => safeButtonUrl(url) !== null}
                    onChange={(url) => onChange({ type: 'redirect', url })}
                />
            );
        case 'webhook':
            return (
                <AddressField
                    label={t('Webhook address')}
                    hint={t('The form’s answers are sent here as JSON.')}
                    problem={t('Use an address that starts with https://.')}
                    value={action.url}
                    allowEmpty
                    isGood={isWebhookUrl}
                    onChange={(url) => onChange({ type: 'webhook', url })}
                />
            );
    }
}

function EmailFields({
    action,
    onChange,
}: {
    action: Extract<FormAction, { type: 'email' }>;
    onChange: (action: FormAction) => void;
}) {
    const t = useT();
    const subjectId = useId();
    const toShop = action.to === SHOP_EMAIL;
    // Until a good address is typed, the mail still goes to the shop.
    const [wantsOther, setWantsOther] = useState(!toShop);
    const isOther = wantsOther || !toShop;

    return (
        <>
            <SegmentedChoice
                label={t('Send to')}
                value={isOther ? 'other' : 'shop'}
                options={[
                    { value: 'shop', label: t('The shop email') },
                    { value: 'other', label: t('Another email') },
                ]}
                onChange={(choice) => {
                    setWantsOther(choice === 'other');

                    if (choice === 'shop') {
                        onChange({ ...action, to: SHOP_EMAIL });
                    }
                }}
            />
            {isOther && (
                <AddressField
                    label={t('Email address')}
                    problem={t('Use an email address like kedai@example.com.')}
                    value={toShop ? '' : action.to}
                    inputMode="email"
                    placeholder="kedai@example.com"
                    isGood={(to) => to !== SHOP_EMAIL && isEmailTarget(to)}
                    onChange={(to) => onChange({ ...action, to })}
                />
            )}
            <div className="grid gap-1.5">
                <label htmlFor={subjectId} className="text-foreground text-xs font-medium">
                    {t('Subject')}
                </label>
                <Input
                    id={subjectId}
                    value={action.subject}
                    maxLength={LABEL_LENGTH}
                    className="bg-card"
                    onChange={(event) => onChange({ ...action, subject: event.target.value })}
                />
            </div>
        </>
    );
}

function WhatsAppFields({
    action,
    fields,
    onChange,
}: {
    action: Extract<FormAction, { type: 'whatsapp' }>;
    fields: FormField[];
    onChange: (action: FormAction) => void;
}) {
    const t = useT();
    const messageId = useId();

    return (
        <>
            <p className="text-muted-foreground text-xs">
                {t('After sending, the visitor opens WhatsApp to the shop’s number with this message.')}
            </p>
            <div className="grid gap-1.5">
                <label htmlFor={messageId} className="text-foreground text-xs font-medium">
                    {t('WhatsApp message')}
                </label>
                <Textarea
                    id={messageId}
                    value={action.message}
                    maxLength={MESSAGE_LENGTH}
                    rows={3}
                    className="bg-card"
                    onChange={(event) => onChange({ ...action, message: event.target.value })}
                />
            </div>
            {fields.length > 0 && (
                <div
                    role="group"
                    aria-label={t('Fields to put in the message')}
                    className="flex flex-wrap gap-1"
                >
                    {fields.map((field) => (
                        <button
                            key={field.id}
                            type="button"
                            title={field.label}
                            onClick={() =>
                                onChange({
                                    ...action,
                                    message: joinWords(action.message, `{${field.name}}`),
                                })
                            }
                            className="bg-muted hover:bg-secondary rounded-md px-2 py-1 font-mono text-[11px]"
                        >
                            {`{${field.name}}`}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}

/** A web or email address, kept only once it is a good one. */
function AddressField({
    label,
    hint,
    problem,
    value,
    allowEmpty = false,
    inputMode = 'url',
    placeholder = 'https://',
    isGood,
    onChange,
}: {
    /** Already translated, like `hint` and `problem`. */
    label: string;
    hint?: string;
    problem: string;
    value: string;
    /** An empty box clears the address. */
    allowEmpty?: boolean;
    inputMode?: 'url' | 'email';
    placeholder?: string;
    isGood: (text: string) => boolean;
    onChange: (value: string) => void;
}) {
    const id = useId();
    const draft = useDraft({
        value,
        format: (text) => text,
        parse: (text) => {
            const trimmed = text.trim();

            if (trimmed === '') {
                return allowEmpty ? '' : null;
            }

            return isGood(trimmed) ? trimmed : null;
        },
        commit: onChange,
    });
    const showsProblem = draft.isInvalid && draft.text.trim() !== '';

    return (
        <div className="grid gap-1.5">
            <label htmlFor={id} className="text-foreground text-xs font-medium">
                {label}
            </label>
            <Input
                id={id}
                value={draft.text}
                inputMode={inputMode}
                placeholder={placeholder}
                aria-invalid={showsProblem ? true : undefined}
                className="bg-card"
                onChange={(event) => draft.setText(event.target.value)}
            />
            {showsProblem ? (
                <p role="alert" className="text-destructive text-xs">
                    {problem}
                </p>
            ) : (
                hint && <p className="text-muted-foreground text-xs">{hint}</p>
            )}
        </div>
    );
}

/** The message with a word added at the end, with a space between. */
function joinWords(message: string, word: string): string {
    return message === '' || /\s$/.test(message) ? `${message}${word}` : `${message} ${word}`;
}
