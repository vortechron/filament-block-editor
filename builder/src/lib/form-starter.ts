import type { Translate } from '@/lib/i18n';
import {
    cleanForm,
    fieldNameFrom,
    type FormDefinition,
    newFieldId,
    SHOP_EMAIL,
} from './form-definition';

/**
 * The form a new form block starts with: name, phone and message, sent to
 * the shop's email, in the builder's language.
 */
export function starterForm(t: Translate): FormDefinition {
    const field = (
        type: 'text' | 'tel' | 'textarea',
        label: string,
        extra: Record<string, unknown> = {},
    ) => ({
        id: newFieldId(),
        type,
        name: fieldNameFrom(label),
        label,
        placeholder: '',
        ...extra,
    });

    return cleanForm({
        name: t('Enquiry form'),
        fields: [
            field('text', t('Name'), { required: true, width: 'half' }),
            field('tel', t('Phone'), { required: true, width: 'half' }),
            field('textarea', t('Message'), { rows: 4 }),
        ],
        submit: { text: t('Send'), align: 'left' },
        success: t('Thank you. We will get back to you soon.'),
        actions: [
            {
                type: 'email',
                to: SHOP_EMAIL,
                subject: t('New message from your website'),
            },
        ],
    });
}
