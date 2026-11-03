import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PageValueInput } from '../src/types';
import { firstSection, mountBuilder, pickSection } from './mount-helpers';

const FORM = {
    name: 'Borang pertanyaan',
    fields: [
        { id: 'f1', type: 'text', name: 'nama', label: 'Nama', required: true, width: 'half' },
    ],
    submit: { text: 'Hantar', align: 'left' },
    success: 'Terima kasih.',
    actions: [
        { type: 'email', to: '@site.email', subject: '' },
        { type: 'webhook', url: 'https://hooks.example.com/x' },
    ],
};

const WITH_FORM: PageValueInput = {
    version: 2,
    sections: [
        {
            id: 'cont0001',
            type: 'rich',
            data: {
                layout: 'plain',
                document: [
                    { id: 'head0001', type: 'heading', props: { level: 2 }, content: 'Hubungi kami' },
                    { id: 'form0001', type: 'form', props: { form: JSON.stringify(FORM) } },
                ],
            },
        },
    ],
};

type Builder = Parameters<typeof firstSection>[0];

/** The form block's JSON, read back from the builder's value. */
function formIn(builder: Builder, id = 'form0001') {
    const block = firstSection(builder).data.document.find(
        (entry) => entry.type === 'form' && (id === '*' || entry.id === id),
    ) as { props: { form: string } } | undefined;

    return block ? JSON.parse(block.props.form) : null;
}

async function openForm() {
    await pickSection(/Hubungi kami/);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit form' }));
}

describe('the form block', () => {
    it('shows its name and how many fields it has in the section’s words', async () => {
        mountBuilder({ value: WITH_FORM });

        await pickSection(/Hubungi kami/);

        expect(await screen.findByText('Borang pertanyaan')).toBeTruthy();
        expect(screen.getByText('1 field')).toBeTruthy();
    });

    it('adds a field, named from its label, into the form JSON', async () => {
        const { builder } = mountBuilder({ value: WITH_FORM });

        await openForm();
        fireEvent.click(screen.getByRole('button', { name: 'Add field' }));

        expect(formIn(builder).fields).toHaveLength(2);
        expect(formIn(builder).fields[1]).toMatchObject({
            type: 'text',
            label: 'New field',
            name: 'new_field',
        });

        fireEvent.change(screen.getByLabelText('Label of field 2'), {
            target: { value: 'Nombor IC' },
        });

        expect(formIn(builder).fields[1]).toMatchObject({
            label: 'Nombor IC',
            name: 'nombor_ic',
        });
        // The first field and the actions are kept as they were.
        expect(formIn(builder).fields[0]).toMatchObject({ name: 'nama', width: 'half' });
        expect(formIn(builder).actions).toEqual(FORM.actions);
    });

    it('turns a field into a choice field with its options, one per line', async () => {
        const { builder } = mountBuilder({ value: WITH_FORM });

        await openForm();
        fireEvent.click(screen.getByRole('button', { name: 'Field 1: Nama' }));
        fireEvent.change(screen.getByLabelText('Type of field 1'), {
            target: { value: 'select' },
        });
        fireEvent.change(screen.getByLabelText('Choices of field 1'), {
            target: { value: 'Fotostat\nParcel\n' },
        });

        expect(formIn(builder).fields[0]).toMatchObject({
            type: 'select',
            options: ['Fotostat', 'Parcel'],
        });
    });

    it('offers the webhook only to developers, and keeps a stored one for everyone', async () => {
        const { builder } = mountBuilder({ value: WITH_FORM });

        await openForm();

        expect(screen.queryByText('Webhook')).toBeNull();
        expect(screen.getByRole('button', { name: 'Add Open WhatsApp' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Add Webhook' })).toBeNull();

        fireEvent.change(screen.getByLabelText('Button text'), {
            target: { value: 'Hantar sekarang' },
        });

        expect(formIn(builder).submit.text).toBe('Hantar sekarang');
        expect(formIn(builder).actions).toContainEqual(FORM.actions[1]);
    });

    it('lets a developer change the webhook address', async () => {
        const { builder } = mountBuilder({ value: WITH_FORM, developer: true });

        await openForm();
        fireEvent.change(screen.getByLabelText('Webhook address'), {
            target: { value: 'https://hooks.example.com/new' },
        });

        expect(formIn(builder).actions[1]).toEqual({
            type: 'webhook',
            url: 'https://hooks.example.com/new',
        });

        fireEvent.change(screen.getByLabelText('Webhook address'), {
            target: { value: 'http://hooks.example.com/new' },
        });

        // Not https, so the last good address stays.
        expect(formIn(builder).actions[1].url).toBe('https://hooks.example.com/new');
        expect(screen.getByText('Use an address that starts with https://.')).toBeTruthy();
    });

    it('lets a WhatsApp message use the fields by name', async () => {
        const { builder } = mountBuilder({ value: WITH_FORM });

        await openForm();
        fireEvent.click(screen.getByRole('button', { name: 'Add Open WhatsApp' }));
        fireEvent.click(
            within(screen.getByRole('group', { name: 'Fields to put in the message' }))
                .getByRole('button', { name: '{nama}' }),
        );

        expect(formIn(builder).actions).toContainEqual({
            type: 'whatsapp',
            to: '@site.whatsapp_number',
            message: '{nama}',
        });
    });

    it('is added from the Items tab as a starter form', async () => {
        const { builder } = mountBuilder({ value: WITH_FORM });

        await pickSection(/Hubungi kami/);
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Items' }));
        fireEvent.click(screen.getByRole('button', { name: 'Form' }));

        await waitFor(() =>
            expect(
                firstSection(builder).data.document.filter((entry) => entry.type === 'form'),
            ).toHaveLength(2),
        );

        const added = firstSection(builder).data.document.filter(
            (entry) => entry.type === 'form',
        )[1] as { props: { form: string } };
        const form = JSON.parse(added.props.form);

        expect(form.fields.map((field: { name: string }) => field.name)).toEqual([
            'name',
            'phone',
            'message',
        ]);
        expect(form.actions).toEqual([
            { type: 'email', to: '@site.email', subject: 'New message from your website' },
        ]);
        expect(form.success).toBe('Thank you. We will get back to you soon.');
    });
});
