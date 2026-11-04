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
 * the shop's email. What visitors read (the labels, the button, the thank
 * you) is in the site's language (`siteT`); the form's name and the
 * email's subject, which only the owner sees, in the builder's (`t`).
 */
export function starterForm(t: Translate, siteT: Translate = t): FormDefinition {
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
            field('text', siteT('Name'), { required: true, width: 'half' }),
            field('tel', siteT('Phone'), { required: true, width: 'half' }),
            field('textarea', siteT('Message'), { rows: 4 }),
        ],
        submit: { text: siteT('Send'), align: 'left' },
        success: siteT('Thank you. We will get back to you soon.'),
        actions: [
            {
                type: 'email',
                to: SHOP_EMAIL,
                subject: t('New message from your website'),
            },
        ],
    });
}
