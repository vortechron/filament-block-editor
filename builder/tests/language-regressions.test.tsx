import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { mountBuilder } from './mount-helpers';
import type { RichSection } from '../src/types';

const fieldLanguages = {
    defaultLocale: 'ms',
    locales: [
        { locale: 'ms', label: 'Bahasa Melayu' },
        { locale: 'en', label: 'English' },
    ],
};
const button = (id: string) => ({
    id,
    type: 'button',
    props: { text: 'Maklumat', url: '/info', variant: 'solid' },
    children: [],
});

it('duplicates the chosen identical button with its own English words', async () => {
    const { builder } = mountBuilder({
        fieldLanguages,
        value: {
            sections: [
                {
                    id: 's',
                    type: 'rich',
                    data: { document: [button('first'), button('second')] },
                },
            ],
            translations: {
                en: {
                    'block:first/props/text': 'About us',
                    'block:second/props/text': 'Contact',
                },
            },
        },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(screen.getAllByRole('button', { name: /^Button/ })[1]);
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate' }));
    await waitFor(() => {
        const section = builder.getValue().sections[0] as RichSection;
        const copy = section.data.document.find(
            (block) =>
                block.type === 'button' &&
                block.id !== 'first' &&
                block.id !== 'second',
        );
        expect(
            builder.getValue().translations?.en[`block:${copy?.id}/props/text`],
        ).toBe('Contact');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
        (builder.getValue().sections[0] as RichSection).data.document.filter(
            (block) => block.type === 'button',
        ),
    ).toHaveLength(2);
    expect(Object.keys(builder.getValue().translations?.en ?? {})).toHaveLength(
        2,
    );
});

function formFixture() {
    const form = {
        name: 'Inbox',
        fields: [
            {
                id: 'service',
                type: 'select',
                name: 'servis',
                label: 'Servis',
                options: ['A', 'B'],
                option_ids: ['a', 'b'],
            },
        ],
        submit: { text: 'Hantar', align: 'left' },
        success: '',
        actions: [
            {
                type: 'whatsapp',
                to: '@site.whatsapp_number',
                message: 'Nama saya',
            },
        ],
    };
    return mountBuilder({
        fieldLanguages,
        value: {
            sections: [
                {
                    id: 's',
                    type: 'rich',
                    data: {
                        document: [
                            {
                                id: 'f',
                                type: 'form',
                                props: { form: JSON.stringify(form) },
                                children: [],
                            },
                        ],
                    },
                },
            ],
            translations: {
                en: {
                    'block:f/field:service/option:a': 'English A',
                    'block:f/field:service/option:b': 'English B',
                    'block:f/action:whatsapp/message': 'My name',
                },
            },
        },
    });
}

async function openFormFixture() {
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(screen.getAllByRole('button', { name: /^Form/ }).at(-1)!);
    await screen.findByRole('textbox', { name: 'Form name' });
}

it('keeps surviving choice identities when inserting before them, then reordering, renaming and deleting', async () => {
    const { builder } = formFixture();
    await openFormFixture();
    fireEvent.click(screen.getByRole('button', { name: 'Field 1: Servis' }));
    const choices = screen.getByRole('textbox', { name: 'Choices of field 1' });
    const savedField = () =>
        JSON.parse(
            (
                (builder.getValue().sections[0] as RichSection).data.document[0]
                    .props as { form: string }
            ).form,
        ).fields[0] as { options: string[]; option_ids: string[] };
    fireEvent.change(choices, { target: { value: 'X\nA\nB' } });
    const inserted = savedField().option_ids[0];
    expect(inserted).not.toBe('a');
    expect(inserted).not.toBe('b');
    expect(savedField().option_ids.slice(1)).toEqual(['a', 'b']);
    fireEvent.change(choices, { target: { value: 'B\nX\nA' } });
    expect(savedField().option_ids).toEqual(['b', inserted, 'a']);
    fireEvent.change(choices, { target: { value: 'B\nRenamed\nA' } });
    expect(savedField().option_ids).toEqual(['b', inserted, 'a']);
    fireEvent.change(choices, { target: { value: 'Renamed\nA' } });
    expect(savedField().option_ids).toEqual([inserted, 'a']);
});

it('inserts a WhatsApp field token into the selected English message only', async () => {
    const { builder } = formFixture();
    await openFormFixture();
    fireEvent.change(screen.getByLabelText('WhatsApp message language'), {
        target: { value: 'en' },
    });
    expect(
        screen.getByRole('textbox', { name: 'WhatsApp message' }),
    ).toHaveProperty('value', 'My name');
    fireEvent.click(screen.getByRole('button', { name: '{servis}' }));
    expect(
        screen.getByRole('textbox', { name: 'WhatsApp message' }),
    ).toHaveProperty('value', 'My name {servis}');
    expect(
        builder.getValue().translations?.en['block:f/action:whatsapp/message'],
    ).toBe('My name {servis}');
    const form = JSON.parse(
        (
            (builder.getValue().sections[0] as RichSection).data.document[0]
                .props as { form: string }
        ).form,
    );
    expect(form.actions[0].message).toBe('Nama saya');
});

it.each([
    ['paragraph', false],
    ['paragraph', true],
    ['quote', false],
    ['quote', true],
] as const)(
    'keeps %s Words multiline with field languages %s',
    async (type, enabled) => {
        const { builder } = mountBuilder({
            fieldLanguages: enabled ? fieldLanguages : undefined,
            value: {
                sections: [
                    {
                        id: 's',
                        type: 'rich',
                        data: {
                            document: [
                                {
                                    id: 'p',
                                    type,
                                    content: [
                                        {
                                            type: 'text',
                                            text: 'Long words',
                                            styles: {},
                                        },
                                    ],
                                    children: [],
                                },
                            ],
                        },
                    },
                ],
            },
        });
        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Show items of section 1' }),
        );
        fireEvent.click(
            screen.getByRole('button', {
                name: type === 'quote' ? /^Quote/ : /^Text/,
            }),
        );
        const words = await screen.findByRole('textbox', { name: 'Words' });
        expect(words.tagName).toBe('TEXTAREA');
        fireEvent.change(words, {
            target: { value: 'First line\nSecond line' },
        });
        await waitFor(() =>
            expect(JSON.stringify(builder.getValue())).toContain('First line'),
        );
    },
);

it('does not give an identical new template item another block’s translation', () => {
    const { builder } = mountBuilder({
        fieldLanguages,
        templates: [
            {
                key: 'same',
                label: 'Another info',
                section: { data: { document: [button('template')] } },
            },
        ],
        value: {
            sections: [
                {
                    id: 's',
                    type: 'rich',
                    data: { document: [button('original')] },
                },
            ],
            translations: { en: { 'block:original/props/text': 'About us' } },
        },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Another info/ }));
    const inserted = builder.getValue().sections[1] as RichSection;
    expect(
        builder.getValue().translations?.en[
            `block:${inserted.data.document[0].id}/props/text`
        ],
    ).toBeUndefined();
});

it('copies exact nested block and repeater words with a duplicated section in one undo step', async () => {
    const { builder } = mountBuilder({
        fieldLanguages,
        blocks: [
            {
                kind: 'info',
                label: 'Info',
                fields: [
                    {
                        name: 'rows',
                        type: 'list',
                        fields: [{ name: 'title', type: 'text' }],
                    },
                ],
            },
        ],
        value: {
            sections: [
                {
                    id: 's',
                    type: 'rich',
                    data: {
                        document: [
                            button('first'),
                            button('second'),
                            {
                                id: 'outer',
                                type: 'card',
                                content: [
                                    { type: 'text', text: 'Card', styles: {} },
                                ],
                                children: [
                                    {
                                        id: 'own',
                                        type: 'ownBlock',
                                        props: {
                                            kind: 'info',
                                            values: '{"rows":[{"_id":"row1","title":"Maklumat"}]}',
                                        },
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
            translations: {
                en: {
                    'block:first/props/text': 'About us',
                    'block:second/props/text': 'Contact',
                    'block:own/values/rows/row:row1/title': 'Nested title',
                },
            },
        },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(screen.getByRole('button', { name: /Card 1\. Plain/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate' }));
    const copy = builder.getValue().sections[1] as RichSection;
    expect(
        builder.getValue().translations?.en[
            `block:${copy.data.document[1].id}/props/text`
        ],
    ).toBe('Contact');
    const child = (copy.data.document[2].children as { id: string }[])[0];
    expect(
        builder.getValue().translations?.en[
            `block:${child.id}/values/rows/row:row1/title`
        ],
    ).toBe('Nested title');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(builder.getValue().sections).toHaveLength(1);
    expect(
        builder.getValue().translations?.en[
            `block:${child.id}/values/rows/row:row1/title`
        ],
    ).toBeUndefined();
});

it('keeps identified blank and duplicate choice labels paired with their ids in each control', async () => {
    const { builder } = formFixture();
    await openFormFixture();
    fireEvent.click(screen.getByRole('button', { name: 'Field 1: Servis' }));
    const field = () =>
        JSON.parse(
            (
                (builder.getValue().sections[0] as RichSection).data.document[0]
                    .props as { form: string }
            ).form,
        ).fields[0];
    fireEvent.change(screen.getByRole('textbox', { name: 'Choice 1' }), {
        target: { value: '' },
    });
    expect(field().options).toEqual(['', 'B']);
    expect(field().option_ids).toEqual(['a', 'b']);
    fireEvent.change(screen.getByLabelText('Choice 2 language'), {
        target: { value: 'en' },
    });
    expect(screen.getByRole('textbox', { name: 'Choice 2' })).toHaveProperty(
        'value',
        'English B',
    );
    fireEvent.change(screen.getByLabelText('Choice 2 language'), {
        target: { value: 'ms' },
    });
    fireEvent.change(
        screen.getByRole('textbox', { name: 'Choices of field 1' }),
        { target: { value: '\n' } },
    );
    expect(field().options).toEqual(['', '']);
    expect(field().option_ids).toEqual(['a', 'b']);
    fireEvent.change(
        screen.getByRole('textbox', { name: 'Choices of field 1' }),
        { target: { value: 'Same\nSame' } },
    );
    expect(field().options).toEqual(['Same', 'Same']);
    expect(field().option_ids).toEqual(['a', 'b']);
});

it('renames the first multiline choice to an existing label without moving either language identity', async () => {
    const first = formFixture();
    await openFormFixture();
    fireEvent.click(screen.getByRole('button', { name: 'Field 1: Servis' }));
    fireEvent.change(
        screen.getByRole('textbox', { name: 'Choices of field 1' }),
        { target: { value: 'B\nB' } },
    );
    const field = () =>
        JSON.parse(
            (
                (first.builder.getValue().sections[0] as RichSection).data
                    .document[0].props as { form: string }
            ).form,
        ).fields[0];
    expect(field().options).toEqual(['B', 'B']);
    expect(field().option_ids).toEqual(['a', 'b']);
    expect(
        first.builder.getValue().translations!.en[
            'block:f/field:service/option:a'
        ],
    ).toBe('English A');
    expect(
        first.builder.getValue().translations!.en[
            'block:f/field:service/option:b'
        ],
    ).toBe('English B');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(first.adapter.save).toHaveBeenCalled());
    const saved = first.adapter.save.mock.calls[0][0];
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(field().options).toEqual(['A', 'B']);
    expect(field().option_ids).toEqual(['a', 'b']);
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(field().option_ids).toEqual(['a', 'b']);
    act(() => first.builder.unmount());
    first.element.remove();
    const reloaded = mountBuilder({ fieldLanguages, value: saved });
    await openFormFixture();
    fireEvent.click(screen.getByRole('button', { name: 'Field 1: Servis' }));
    const form = JSON.parse(
        (
            (reloaded.builder.getValue().sections[0] as RichSection).data
                .document[0].props as { form: string }
        ).form,
    );
    expect(form.fields[0].option_ids).toEqual(['a', 'b']);
    fireEvent.change(screen.getByLabelText('Choice 1 language'), {
        target: { value: 'en' },
    });
    fireEvent.change(screen.getByLabelText('Choice 2 language'), {
        target: { value: 'en' },
    });
    expect(screen.getByRole('textbox', { name: 'Choice 1' })).toHaveProperty(
        'value',
        'English A',
    );
    expect(screen.getByRole('textbox', { name: 'Choice 2' })).toHaveProperty(
        'value',
        'English B',
    );
});
