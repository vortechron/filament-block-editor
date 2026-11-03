import { describe, expect, it } from 'vitest';
import { cleanForm, fieldNameFrom, parseForm } from './form-definition';

/** The form from docs/v2-plan.md, section 7. */
const CONTRACT_FORM = {
    name: 'Borang pertanyaan',
    fields: [
        { id: 'f1', type: 'text', name: 'nama', label: 'Nama', placeholder: '', required: true, width: 'half' },
        { id: 'f2', type: 'tel', name: 'telefon', label: 'Telefon', required: true, width: 'half' },
        { id: 'f3', type: 'select', name: 'servis', label: 'Servis', options: ['Fotostat', 'Parcel'] },
        { id: 'f4', type: 'textarea', name: 'mesej', label: 'Mesej', rows: 4 },
        { id: 'f5', type: 'consent', name: 'setuju', label: 'Saya setuju dihubungi.', required: true },
    ],
    submit: { text: 'Hantar', align: 'left' },
    success: 'Terima kasih. Kami akan hubungi anda.',
    actions: [
        { type: 'email', to: '@site.email', subject: 'Pertanyaan baru dari website' },
        { type: 'whatsapp', to: '@site.whatsapp_number', message: 'Hai, saya {nama}. {mesej}' },
        { type: 'redirect', url: '/terima-kasih' },
        { type: 'webhook', url: 'https://hooks.example.com/x' },
    ],
};

describe('cleaning a form', () => {
    it('keeps the contract’s form, with every field in one full shape', () => {
        expect(cleanForm(CONTRACT_FORM)).toEqual({
            name: 'Borang pertanyaan',
            fields: [
                { id: 'f1', type: 'text', name: 'nama', label: 'Nama', placeholder: '', required: true, width: 'half' },
                { id: 'f2', type: 'tel', name: 'telefon', label: 'Telefon', placeholder: '', required: true, width: 'half' },
                { id: 'f3', type: 'select', name: 'servis', label: 'Servis', required: false, width: 'full', options: ['Fotostat', 'Parcel'] },
                { id: 'f4', type: 'textarea', name: 'mesej', label: 'Mesej', placeholder: '', required: false, width: 'full', rows: 4 },
                { id: 'f5', type: 'consent', name: 'setuju', label: 'Saya setuju dihubungi.', required: true, width: 'full' },
            ],
            submit: { text: 'Hantar', align: 'left' },
            success: 'Terima kasih. Kami akan hubungi anda.',
            actions: CONTRACT_FORM.actions,
        });
    });

    it('drops fields of an unknown type and keeps at most 30', () => {
        const fields = [
            { id: 'bad', type: 'password', name: 'kata', label: 'Kata laluan' },
            ...Array.from({ length: 35 }, (_, index) => ({
                id: `f${index}`,
                type: 'text',
                name: `ruang_${index}`,
                label: `Ruang ${index}`,
            })),
        ];
        const clean = cleanForm({ ...CONTRACT_FORM, fields });

        expect(clean.fields).toHaveLength(30);
        expect(clean.fields[0].name).toBe('ruang_0');
        expect(clean.fields.at(-1)?.name).toBe('ruang_29');
    });

    it('makes every name valid and unique in the form', () => {
        const clean = cleanForm({
            fields: [
                { id: 'a', type: 'text', name: 'nama', label: 'Nama' },
                { id: 'b', type: 'text', name: 'nama', label: 'Nama lagi' },
                { id: 'c', type: 'email', name: '9 bad!', label: 'E-mel Anda' },
                { id: 'd', type: 'text', name: '', label: '' },
            ],
        });

        expect(clean.fields.map((field) => field.name)).toEqual([
            'nama',
            'nama_2',
            'e_mel_anda',
            'field',
        ]);
    });

    it('gives a field without a usable id a new one, and never two the same', () => {
        const clean = cleanForm({
            fields: [
                { id: 'f1', type: 'text', name: 'a', label: 'A' },
                { id: 'f1', type: 'text', name: 'b', label: 'B' },
                { id: '<b>', type: 'text', name: 'c', label: 'C' },
            ],
        });
        const ids = clean.fields.map((field) => field.id);

        expect(ids[0]).toBe('f1');
        expect(new Set(ids).size).toBe(3);
        expect(ids.every((id) => /^[A-Za-z0-9_-]{1,40}$/.test(id))).toBe(true);
    });

    it('cuts labels to 200 characters, and keeps options only on choice fields', () => {
        const clean = cleanForm({
            fields: [
                { id: 'a', type: 'text', name: 'a', label: 'x'.repeat(250), options: ['Satu'] },
                {
                    id: 'b',
                    type: 'radio',
                    name: 'b',
                    label: 'Pilih',
                    options: ['Satu', '', 'Satu', 7, ...Array.from({ length: 40 }, (_, i) => `P${i}`)],
                },
            ],
        });

        expect(clean.fields[0].label).toHaveLength(200);
        expect('options' in clean.fields[0]).toBe(false);
        expect(clean.fields[1].options?.slice(0, 3)).toEqual(['Satu', 'P0', 'P1']);
        expect(clean.fields[1].options).toHaveLength(30);
    });

    it('keeps the rows of a text box between 2 and 10', () => {
        const rows = (value: unknown) =>
            cleanForm({ fields: [{ id: 'a', type: 'textarea', name: 'a', label: 'A', rows: value }] })
                .fields[0].rows;

        expect(rows(6)).toBe(6);
        expect(rows(50)).toBe(10);
        expect(rows(0)).toBe(2);
        expect(rows('lots')).toBe(4);
    });

    it('keeps at most one action of each type, and only good addresses', () => {
        const clean = cleanForm({
            actions: [
                { type: 'email', to: 'kedai@example.com', subject: 'Baru' },
                { type: 'email', to: 'other@example.com' },
                { type: 'redirect', url: 'javascript:alert(1)' },
                { type: 'webhook', url: 'http://hooks.example.com/x' },
                { type: 'sms', to: '0123' },
            ],
        });

        expect(clean.actions).toEqual([
            { type: 'email', to: 'kedai@example.com', subject: 'Baru' },
            { type: 'redirect', url: '' },
            { type: 'webhook', url: '' },
        ]);
    });

    it('sends mail to the shop email when the address is not an email', () => {
        expect(cleanForm({ actions: [{ type: 'email', to: 'not an email' }] }).actions).toEqual([
            { type: 'email', to: '@site.email', subject: '' },
        ]);
    });

    it('turns anything that is not a form into an empty form', () => {
        const empty = {
            name: '',
            fields: [],
            submit: { text: '', align: 'left' },
            success: '',
            actions: [],
        };

        expect(cleanForm(null)).toEqual(empty);
        expect(cleanForm('nope')).toEqual(empty);
        expect(parseForm('{not json')).toEqual(empty);
        expect(parseForm(JSON.stringify(CONTRACT_FORM)).name).toBe('Borang pertanyaan');
    });
});

describe('a field name made from its label', () => {
    it('is lower case with underscores, starts with a letter, and is at most 40 long', () => {
        expect(fieldNameFrom('Nombor Telefon')).toBe('nombor_telefon');
        expect(fieldNameFrom('Café & Kek!')).toBe('cafe_kek');
        expect(fieldNameFrom('2 orang')).toBe('f_2_orang');
        expect(fieldNameFrom('a'.repeat(60))).toHaveLength(40);
        expect(fieldNameFrom('!!!')).toBe('field');
    });
});
