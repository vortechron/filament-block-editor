import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { firstSection, mountBuilder } from './mount-helpers';

const fieldLanguages = {
    defaultLocale: 'ms',
    locales: [
        { locale: 'ms', label: 'Bahasa Melayu' },
        { locale: 'en', label: 'English' },
    ],
};

it('creates canonical Malay form defaults from an English bookmark while preview stays English', async () => {
    const { builder, adapter } = mountBuilder({
        value: { sections: [] },
        locale: 'en',
        contentLocale: 'en',
        fieldLanguages: {
            defaultLocale: 'ms',
            locales: [
                { locale: 'ms', label: 'Bahasa Melayu' },
                { locale: 'en', label: 'English' },
            ],
        },
    });
    expect(screen.getByLabelText('Preview language')).toHaveProperty(
        'value',
        'en',
    );
    fireEvent.click(screen.getByRole('button', { name: /^Blank/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Form' }));
    const definition: unknown = await waitFor(() => {
        const block = firstSection(builder).data.document.find(
            (entry) => entry.type === 'form',
        );
        const props = block?.props;
        expect(
            props &&
                typeof props === 'object' &&
                'form' in props &&
                typeof props.form === 'string',
        ).toBe(true);
        return props &&
            typeof props === 'object' &&
            'form' in props &&
            typeof props.form === 'string'
            ? JSON.parse(props.form)
            : null;
    });
    expect(definition).toMatchObject({
        fields: [
            { label: 'Nama', name: 'nama' },
            { label: 'Telefon', name: 'telefon' },
            { label: 'Mesej', name: 'mesej' },
        ],
        submit: { text: 'Hantar' },
        name: 'Enquiry form',
    });
    expect(await screen.findByLabelText('Button text language')).toHaveProperty(
        'value',
        'ms',
    );
    const beforeLanguageSwitch = builder.getValue();
    fireEvent.change(screen.getByLabelText('Button text language'), {
        target: { value: 'en' },
    });
    expect(screen.getByRole('textbox', { name: 'Button text' })).toHaveProperty(
        'value',
        'Hantar',
    );
    expect(
        screen.getByText('No English text yet. Showing Bahasa Melayu.'),
    ).toBeTruthy();
    expect(builder.getValue()).toEqual(beforeLanguageSwitch);
    expect(builder.getValue().translations?.en).toBeUndefined();
    expect(screen.getByLabelText('Preview language')).toHaveProperty(
        'value',
        'en',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(adapter.save).toHaveBeenCalledTimes(1));
    expect(adapter.save.mock.calls[0][0].translations?.en).toBeUndefined();
    await waitFor(() =>
        expect(adapter.preview).toHaveBeenLastCalledWith(expect.anything(), {
            contentLocale: 'en',
        }),
    );
    const addField = screen.getByRole('button', { name: 'Add field' });
    act(() => addField.focus());
    fireEvent.click(addField);
    expect(
        await screen.findByRole('textbox', { name: 'Label of field 4' }),
    ).toHaveProperty('value', 'Ruangan baru');
    expect(
        screen.getByRole('textbox', { name: 'Name of field 4' }),
    ).toHaveProperty('value', 'ruangan_baru');
    expect(screen.getByLabelText('Label language')).toHaveProperty(
        'value',
        'ms',
    );
    expect(screen.getByLabelText('Preview language')).toHaveProperty(
        'value',
        'en',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(adapter.save).toHaveBeenCalledTimes(2));
    expect(adapter.save.mock.calls[1][0].translations?.en).toBeUndefined();
});

it.each([
    { item: 'Button', label: 'Button text', words: 'Baca lagi' },
    { item: 'Heading', label: 'Words', words: 'Tajuk anda' },
    { item: 'Text', label: 'Words', words: 'Tulis ayat anda di sini.' },
])(
    'adds canonical Malay $item words while an English preview stays selected',
    async ({ item, label, words }) => {
        const { builder, adapter } = mountBuilder({
            locale: 'en',
            contentLocale: 'en',
            fieldLanguages,
        });
        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(screen.getByRole('button', { name: /Selamat datang/ }));
        fireEvent.click(await screen.findByRole('button', { name: item }));
        if (item !== 'Button')
            fireEvent.click(
                await screen.findByRole('button', { name: 'Item settings' }),
            );
        expect(
            await screen.findByRole('textbox', { name: label }),
        ).toHaveProperty('value', words);
        expect(screen.getByLabelText(`${label} language`)).toHaveProperty(
            'value',
            'ms',
        );
        expect(screen.getByLabelText('Preview language')).toHaveProperty(
            'value',
            'en',
        );
        const canonical = builder.getValue();
        fireEvent.change(screen.getByLabelText(`${label} language`), {
            target: { value: 'en' },
        });
        expect(screen.getByRole('textbox', { name: label })).toHaveProperty(
            'value',
            words,
        );
        expect(
            screen.getByText('No English text yet. Showing Bahasa Melayu.'),
        ).toBeTruthy();
        expect(builder.getValue()).toEqual(canonical);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(adapter.save).toHaveBeenCalledTimes(1));
        expect(adapter.save.mock.calls[0][0].translations?.en).toBeUndefined();
        fireEvent.change(screen.getByLabelText('Preview language'), {
            target: { value: 'ms' },
        });
        expect(screen.getByLabelText(`${label} language`)).toHaveProperty(
            'value',
            'en',
        );
        expect(builder.getValue()).toEqual(canonical);
        await waitFor(() =>
            expect(adapter.preview).toHaveBeenLastCalledWith(
                expect.anything(),
                { contentLocale: 'ms' },
            ),
        );
    },
);

it('creates fallback templates in canonical Malay from an English bookmark', async () => {
    const { builder } = mountBuilder({
        value: { sections: [] },
        locale: 'en',
        contentLocale: 'en',
        fieldLanguages,
    });
    fireEvent.click(screen.getByRole('button', { name: /^Hero/ }));
    expect(JSON.stringify(builder.getValue().sections)).toContain(
        'Tajuk besar halaman anda',
    );
    expect(JSON.stringify(builder.getValue().sections)).not.toContain(
        'The big headline of your page',
    );
    expect(builder.getValue().translations?.en).toBeUndefined();
    expect(screen.getByLabelText('Preview language')).toHaveProperty(
        'value',
        'en',
    );
});

it.each([undefined, 'unsupported'])(
    'retains English defaults without a supported canonical field locale (%s)',
    async (defaultLocale) => {
        const { builder } = mountBuilder({
            value: { sections: [] },
            locale: 'en',
            contentLocale: 'en',
            ...(defaultLocale
                ? { fieldLanguages: { ...fieldLanguages, defaultLocale } }
                : {}),
        });
        fireEvent.click(screen.getByRole('button', { name: /^Hero/ }));
        expect(JSON.stringify(builder.getValue().sections)).toContain(
            'The big headline of your page',
        );
        fireEvent.click(await screen.findByRole('button', { name: 'Form' }));
        const definition: unknown = await waitFor(() => {
            const props = firstSection(builder).data.document.find(
                (entry) => entry.type === 'form',
            )?.props;
            expect(
                props &&
                    typeof props === 'object' &&
                    'form' in props &&
                    typeof props.form === 'string',
            ).toBe(true);
            return props &&
                typeof props === 'object' &&
                'form' in props &&
                typeof props.form === 'string'
                ? JSON.parse(props.form)
                : null;
        });
        expect(definition).toMatchObject({
            fields: [
                { label: 'Name', name: 'name' },
                { label: 'Phone', name: 'phone' },
                { label: 'Message', name: 'message' },
            ],
            submit: { text: 'Send' },
        });
        if (!defaultLocale)
            expect(screen.queryByLabelText('Button text language')).toBeNull();
    },
);
