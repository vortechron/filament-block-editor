import { linkOrReference } from '@/blocks/button-url';
import RULES from '@/generated/rules.json';
import { dynamicRefKey } from './dynamic-values';

/**
 * The form block's JSON (docs/v2-plan.md, section 7), and the rules the
 * builder cleans it with before it goes into the block's `form` prop, so
 * it never sends junk. The server (Forms\FormDefinition) cleans it again.
 * The limits and lists come from the exported rules
 * (builder/src/generated/rules.json); tests/fixtures/shared/forms.json
 * checks the two sides clean a form the same way.
 *
 * Typed text is cut to its limit but never trimmed here, so a space can be
 * typed between two words.
 */

const FORM = RULES.form;

export const FORM_FIELD_TYPES = FORM.field_types;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

/** Fields with a list of choices. */
export const CHOICE_TYPES: readonly FormFieldType[] = FORM.choice_types;

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

export const FORM_ACTION_TYPES: readonly FormActionType[] = FORM.action_types;

export type SubmitAlign = (typeof FORM.submit_aligns)[number];

export const SUBMIT_ALIGNS: readonly SubmitAlign[] = FORM.submit_aligns;

export type FormDefinition = {
    name: string;
    fields: FormField[];
    submit: { text: string; align: SubmitAlign };
    success: string;
    actions: FormAction[];
};

export const MAX_FIELDS = FORM.max_fields;
export const MAX_OPTIONS = FORM.max_options;
export const LABEL_LENGTH = FORM.label_length;
export const PLACEHOLDER_LENGTH = FORM.placeholder_length;
/** The longest a field name may be. */
export const NAME_LENGTH = FORM.field_name_length;
/** The longest the form's own name may be. */
export const FORM_NAME_LENGTH = FORM.name_length;
export const SUBMIT_LENGTH = FORM.submit_length;
export const SUCCESS_LENGTH = FORM.success_length;
export const SUBJECT_LENGTH = FORM.subject_length;
export const MESSAGE_LENGTH = FORM.message_length;
export const MIN_ROWS = FORM.rows.min;
export const MAX_ROWS = FORM.rows.max;
const DEFAULT_ROWS = FORM.rows.default;
const EMAIL_LENGTH = FORM.email_length;

/** The shop's own address and number, filled in by the site. */
export const SHOP_EMAIL = '@site.email';
export const SHOP_WHATSAPP = '@site.whatsapp_number';

const FIELD_NAME = new RegExp(`^(?:${FORM.field_name})$`);
const FIELD_ID = new RegExp(`^[A-Za-z0-9_-]{1,${FORM.field_id_length}}$`);
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
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
        name: text(source.name, FORM_NAME_LENGTH),
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
                    ? { placeholder: text(field.placeholder, PLACEHOLDER_LENGTH) }
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
                subject: text(action.subject, SUBJECT_LENGTH),
            };
        case 'whatsapp':
            return {
                type: 'whatsapp',
                to: isWhatsAppTarget(action.to) ? action.to : SHOP_WHATSAPP,
                message: text(action.message, MESSAGE_LENGTH),
            };
        case 'redirect':
            return { type: 'redirect', url: linkOrReference(action.url) ?? '' };
        case 'webhook':
            return { type: 'webhook', url: isWebhookUrl(action.url) ? action.url.trim() : '' };
    }
}

/** An email address, or the shop's own (`@site.email`). */
export function isEmailTarget(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        (value === SHOP_EMAIL || (value.length <= EMAIL_LENGTH && EMAIL.test(value)))
    );
}

function isWhatsAppTarget(value: unknown): value is string {
    return (
        typeof value === 'string' && (dynamicRefKey(value) !== null || PHONE.test(value))
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
