import { safeButtonUrl } from '@/blocks/button-url';

/**
 * The form block's JSON (docs/v2-plan.md, section 7), and the rules the
 * builder cleans it with before it goes into the block's `form` prop, so
 * it never sends junk. The server (Forms\FormDefinition) cleans it again.
 *
 * Typed text is cut to its limit but never trimmed here, so a space can be
 * typed between two words.
 */

export const FORM_FIELD_TYPES = [
    'text',
    'email',
    'tel',
    'number',
    'date',
    'textarea',
    'select',
    'radio',
    'checkboxes',
    'consent',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

/** Fields with a list of choices. */
export const CHOICE_TYPES: readonly FormFieldType[] = ['select', 'radio', 'checkboxes'];

/** Fields that show a hint inside the empty box. */
export const PLACEHOLDER_TYPES: readonly FormFieldType[] = [
    'text',
    'email',
    'tel',
    'number',
    'textarea',
];

export type FormField = {
    id: string;
    type: FormFieldType;
    name: string;
    label: string;
    placeholder?: string;
    required: boolean;
    width: 'full' | 'half';
    options?: string[];
    rows?: number;
};

export type FormAction =
    | { type: 'email'; to: string; subject: string }
    | { type: 'whatsapp'; to: string; message: string }
    | { type: 'redirect'; url: string }
    | { type: 'webhook'; url: string };

export type FormActionType = FormAction['type'];

export const FORM_ACTION_TYPES: readonly FormActionType[] = [
    'email',
    'whatsapp',
    'redirect',
    'webhook',
];

export type SubmitAlign = 'left' | 'center' | 'right' | 'full';

export const SUBMIT_ALIGNS: readonly SubmitAlign[] = ['left', 'center', 'right', 'full'];

export type FormDefinition = {
    name: string;
    fields: FormField[];
    submit: { text: string; align: SubmitAlign };
    success: string;
    actions: FormAction[];
};

export const MAX_FIELDS = 30;
export const MAX_OPTIONS = 30;
export const LABEL_LENGTH = 200;
export const NAME_LENGTH = 40;
export const SUBMIT_LENGTH = 80;
export const SUCCESS_LENGTH = 500;
export const MESSAGE_LENGTH = 1000;
export const MIN_ROWS = 2;
export const MAX_ROWS = 10;
const DEFAULT_ROWS = 4;

/** The shop's own address and number, filled in by the site. */
export const SHOP_EMAIL = '@site.email';
export const SHOP_WHATSAPP = '@site.whatsapp_number';

const FIELD_NAME = /^[a-z][a-z0-9_]{0,39}$/;
const FIELD_ID = /^[A-Za-z0-9_-]{1,40}$/;
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const DYNAMIC_REF = /^@[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,3}$/;
const PHONE = /^\+?[0-9]{8,15}$/;
const HTTPS = /^https:\/\/[^\s/?#]+[^\s]*$/i;

/** A form from the block's `form` prop. Bad JSON reads as an empty form. */
export function parseForm(raw: unknown): FormDefinition {
    if (typeof raw !== 'string' || raw === '') {
        return cleanForm(null);
    }

    try {
        return cleanForm(JSON.parse(raw));
    } catch {
        return cleanForm(null);
    }
}

/** The block's `form` prop for a form: compact JSON, cleaned. */
export function serializeForm(form: FormDefinition): string {
    return JSON.stringify(cleanForm(form));
}

/** The form with every rule applied. Anything that is not a form is an empty one. */
export function cleanForm(raw: unknown): FormDefinition {
    const source = isObject(raw) ? raw : {};
    const submit = isObject(source.submit) ? source.submit : {};

    return {
        name: text(source.name, LABEL_LENGTH),
        fields: cleanFields(source.fields),
        submit: {
            text: text(submit.text, SUBMIT_LENGTH),
            align: oneOf(submit.align, SUBMIT_ALIGNS, 'left'),
        },
        success: text(source.success, SUCCESS_LENGTH),
        actions: cleanActions(source.actions),
    };
}

/**
 * A field name from a label, the way a person would read it: "Nombor
 * Telefon" is `nombor_telefon`. It always starts with a letter.
 */
export function fieldNameFrom(label: string): string {
    const words = label
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    if (words === '') {
        return 'field';
    }

    return (/^[a-z]/.test(words) ? words : `f_${words}`).slice(0, NAME_LENGTH);
}

/**
 * The name as it is typed into the name box: lower case, every other
 * character an underscore. It may end in an underscore while typing.
 */
export function typeFieldName(typed: string): string {
    return typed
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^[^a-z]+/, '')
        .slice(0, NAME_LENGTH);
}

/** `name`, or `name_2`, `name_3`…, whichever is not taken yet. */
export function uniqueName(name: string, taken: ReadonlySet<string>): string {
    if (!taken.has(name)) {
        return name;
    }

    for (let count = 2; ; count += 1) {
        const suffix = `_${count}`;
        const candidate = `${name.slice(0, NAME_LENGTH - suffix.length)}${suffix}`;

        if (!taken.has(candidate)) {
            return candidate;
        }
    }
}

/** A new field id. Math.random on purpose: crypto.randomUUID needs https. */
export function newFieldId(): string {
    return `f${Math.random().toString(36).slice(2, 10)}`;
}

function cleanFields(raw: unknown): FormField[] {
    const names = new Set<string>();
    const ids = new Set<string>();

    return (Array.isArray(raw) ? raw : [])
        .filter(isObject)
        .filter((field) =>
            (FORM_FIELD_TYPES as readonly unknown[]).includes(field.type),
        )
        .slice(0, MAX_FIELDS)
        .map((field) => {
            const type = field.type as FormFieldType;
            const label = text(field.label, LABEL_LENGTH);
            const wanted =
                typeof field.name === 'string' && FIELD_NAME.test(field.name)
                    ? field.name
                    : fieldNameFrom(
                          label !== '' || typeof field.name !== 'string'
                              ? label
                              : field.name,
                      );
            const name = uniqueName(wanted, names);
            const id =
                typeof field.id === 'string' &&
                FIELD_ID.test(field.id) &&
                !ids.has(field.id)
                    ? field.id
                    : freshId(ids);

            names.add(name);
            ids.add(id);

            return {
                id,
                type,
                name,
                label,
                ...(PLACEHOLDER_TYPES.includes(type)
                    ? { placeholder: text(field.placeholder, LABEL_LENGTH) }
                    : {}),
                required: field.required === true,
                width: field.width === 'half' ? 'half' : 'full',
                ...(CHOICE_TYPES.includes(type)
                    ? { options: cleanOptions(field.options) }
                    : {}),
                ...(type === 'textarea' ? { rows: cleanRows(field.rows) } : {}),
            } satisfies FormField;
        });
}

function freshId(taken: ReadonlySet<string>): string {
    let id = newFieldId();

    while (taken.has(id)) {
        id = newFieldId();
    }

    return id;
}

function cleanOptions(raw: unknown): string[] {
    const options = (Array.isArray(raw) ? raw : [])
        .filter((option): option is string => typeof option === 'string')
        .map((option) => option.trim().slice(0, LABEL_LENGTH))
        .filter((option) => option !== '');

    return [...new Set(options)].slice(0, MAX_OPTIONS);
}

function cleanRows(raw: unknown): number {
    const rows = Number(raw);

    if (typeof raw !== 'number' || !Number.isFinite(rows)) {
        return DEFAULT_ROWS;
    }

    return Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.round(rows)));
}

/** At most one action of each type, in the order they came. */
function cleanActions(raw: unknown): FormAction[] {
    const seen = new Set<string>();

    return (Array.isArray(raw) ? raw : [])
        .filter(isObject)
        .filter((action) => {
            const isNew =
                (FORM_ACTION_TYPES as readonly unknown[]).includes(action.type) &&
                !seen.has(action.type as string);

            seen.add(action.type as string);

            return isNew;
        })
        .map(cleanAction);
}

function cleanAction(action: Record<string, unknown>): FormAction {
    switch (action.type as FormActionType) {
        case 'email':
            return {
                type: 'email',
                to: isEmailTarget(action.to) ? action.to : SHOP_EMAIL,
                subject: text(action.subject, LABEL_LENGTH),
            };
        case 'whatsapp':
            return {
                type: 'whatsapp',
                to: isWhatsAppTarget(action.to) ? action.to : SHOP_WHATSAPP,
                message: text(action.message, MESSAGE_LENGTH),
            };
        case 'redirect':
            return { type: 'redirect', url: safeButtonUrl(action.url) ?? '' };
        case 'webhook':
            return { type: 'webhook', url: isWebhookUrl(action.url) ? action.url.trim() : '' };
    }
}

/** An email address, or the shop's own (`@site.email`). */
export function isEmailTarget(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        (value === SHOP_EMAIL || (value.length <= 254 && EMAIL.test(value)))
    );
}

function isWhatsAppTarget(value: unknown): value is string {
    return (
        typeof value === 'string' && (DYNAMIC_REF.test(value) || PHONE.test(value))
    );
}

/** Webhooks only go to https:// addresses. */
export function isWebhookUrl(value: unknown): value is string {
    return typeof value === 'string' && HTTPS.test(value.trim());
}

function text(value: unknown, limit: number): string {
    return typeof value === 'string' ? value.slice(0, limit) : '';
}

function oneOf<T extends string>(
    value: unknown,
    allowed: readonly T[],
    fallback: T,
): T {
    return (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
