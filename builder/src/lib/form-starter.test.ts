import { describe, expect, it } from 'vitest';
import { starterForm } from './form-starter';
import { type Locale, translate } from './i18n';

const inLocale = (locale: Locale) => (text: string) => translate(text, locale, {});

describe('the form a new form block starts with', () => {
    it('speaks the site language to visitors and the builder language to the owner', () => {
        const form = starterForm(inLocale('en'), inLocale('ms'));

        expect(form.fields.map((field) => field.label)).toEqual(['Nama', 'Telefon', 'Mesej']);
        expect(form.fields.map((field) => field.name)).toEqual(['nama', 'telefon', 'mesej']);
        expect(form.submit.text).toBe('Hantar');
        expect(form.success).toBe('Terima kasih. Kami akan hubungi anda.');
        // Only the owner sees these: in the list of messages and the email.
        expect(form.name).toBe('Enquiry form');
        expect(form.actions[0]).toMatchObject({ type: 'email', subject: 'New message from your website' });
    });

    it('uses the builder language for everything when no site language is given', () => {
        const form = starterForm(inLocale('ms'));

        expect(form.name).toBe('Borang pertanyaan');
        expect(form.submit.text).toBe('Hantar');
    });
});
