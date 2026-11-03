import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { firstSection, mountBuilder, pickSection } from './mount-helpers';

/** Opens the picked section's Style tab. */
async function openStyleTab() {
    await pickSection(/Selamat datang/);
    fireEvent.click(await screen.findByRole('tab', { name: 'Style' }));
}

function styleDevice(name: string) {
    fireEvent.click(
        within(screen.getByRole('radiogroup', { name: 'Style for' })).getByRole(
            'radio',
            { name },
        ),
    );
}

describe('the style panel of a section', () => {
    it('writes a phone value into style.phone, and reset takes it out again', async () => {
        const { builder } = mountBuilder();

        await openStyleTab();
        styleDevice('Phone');
        fireEvent.change(screen.getByLabelText('Space inside, top'), {
            target: { value: '12' },
        });

        expect(firstSection(builder).data.style).toEqual({
            phone: { padding_top: '12px' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Reset Space inside, top' }));

        expect('style' in firstSection(builder).data).toBe(false);
    });

    it('marks a phone value that differs from the laptop one', async () => {
        mountBuilder({
            value: {
                version: 2,
                sections: [
                    {
                        id: 'hero0001',
                        type: 'rich',
                        data: {
                            layout: 'hero',
                            document: [
                                {
                                    type: 'heading',
                                    props: { level: 1 },
                                    content: 'Selamat datang',
                                },
                            ],
                            style: {
                                desktop: { padding_top: '24px', gap: '8px' },
                                phone: { padding_top: '12px', gap: '8px' },
                            },
                        },
                    },
                ],
            },
        });

        await openStyleTab();
        styleDevice('Phone');

        expect(screen.getByLabelText('Space inside, top').closest('[data-style-key]'))
            .toHaveProperty('dataset.changed', 'true');
        expect(screen.getByLabelText('Gap between items').closest('[data-style-key]'))
            .toHaveProperty('dataset.changed', 'false');
    });

    it('offers the kit colours first, and stores them as kit:<key>', async () => {
        const { builder } = mountBuilder();

        await openStyleTab();
        fireEvent.click(
            within(screen.getByRole('radiogroup', { name: 'Text colour' })).getByRole(
                'radio',
                { name: 'Primary' },
            ),
        );

        expect(firstSection(builder).data.style).toEqual({
            desktop: { color: 'kit:primary' },
        });
    });

    it('under Hover shows only the keys hover allows', async () => {
        mountBuilder();

        await openStyleTab();
        styleDevice('Hover');

        expect(screen.queryByLabelText('Space inside, top')).toBeNull();
        expect(screen.getByRole('radiogroup', { name: 'Background colour' })).toBeTruthy();
    });
});

describe('the advanced tab of a section', () => {
    async function openAdvancedTab() {
        await pickSection(/Selamat datang/);
        fireEvent.click(await screen.findByRole('tab', { name: 'Advanced' }));
    }

    it('writes class names and the devices to hide on', async () => {
        const { builder } = mountBuilder();

        await openAdvancedTab();
        fireEvent.change(screen.getByLabelText('Class names'), {
            target: { value: 'price-card 9bad wide' },
        });
        fireEvent.click(screen.getByRole('switch', { name: 'Hide on phones' }));

        expect(firstSection(builder).data.advanced).toEqual({
            class: 'price-card wide',
            hide_on: ['phone'],
        });
        expect(screen.getByText('Only these are kept: price-card wide')).toBeTruthy();
    });

    it('shows custom CSS to developers only, and never writes CSS that breaks a rule', async () => {
        const { builder } = mountBuilder({ developer: true });

        await openAdvancedTab();

        const css = screen.getByLabelText('Custom CSS');

        fireEvent.change(css, { target: { value: 'selector { color: red; }' } });
        expect(firstSection(builder).data.advanced).toEqual({
            css: 'selector { color: red; }',
        });

        fireEvent.change(css, { target: { value: 'selector { } </style>' } });
        expect('advanced' in firstSection(builder).data).toBe(false);
        expect(screen.getByText(/This CSS is not saved/)).toBeTruthy();
    });

    it('says why custom CSS is not saved', async () => {
        mountBuilder({ developer: true });

        await openAdvancedTab();

        const css = screen.getByLabelText('Custom CSS');

        fireEvent.change(css, {
            target: { value: 'selector { background: url(https://a.test/x.png) }' },
        });
        expect(screen.getByText(/url\(\) may only hold a path on this site/)).toBeTruthy();

        fireEvent.change(css, { target: { value: '.other { color: red }' } });
        expect(screen.getByText(/every selector must start with selector/)).toBeTruthy();
    });

    it('has no custom CSS for others', async () => {
        mountBuilder();

        await openAdvancedTab();

        expect(screen.queryByLabelText('Custom CSS')).toBeNull();
    });
});

describe('the style panel of a picked item', () => {
    const withButton = {
        version: 2,
        sections: [
            {
                id: 'hero0001',
                type: 'rich',
                data: {
                    layout: 'hero',
                    document: [
                        { id: 'head0001', type: 'heading', props: { level: 1 }, content: 'Selamat datang' },
                        { id: 'btn00001', type: 'button', props: { text: 'Beli', url: '#beli' } },
                    ],
                },
            },
        ],
    };

    async function openButtonSettings() {
        await pickSection(/Selamat datang/);
        fireEvent.click(await screen.findByRole('button', { name: 'Change link' }));
    }

    function buttonLook(builder: Parameters<typeof firstSection>[0]): unknown {
        const button = firstSection(builder).data.document.find(
            (block) => block.id === 'btn00001',
        ) as { props: { look: string } };

        return button.props.look === '' ? '' : JSON.parse(button.props.look);
    }

    it('writes the style into the block’s look prop, per device', async () => {
        const { builder } = mountBuilder({ value: withButton });

        await openButtonSettings();
        fireEvent.click(await screen.findByRole('tab', { name: 'Style' }));
        styleDevice('Tablet');
        fireEvent.change(screen.getByLabelText('Space inside, top'), {
            target: { value: '8' },
        });

        expect(buttonLook(builder)).toEqual({
            style: { tablet: { padding_top: '8px' } },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Reset Space inside, top' }));

        expect(buttonLook(builder)).toBe('');
    });

    it('has no Style and Advanced tabs in a style-locked section, for everyone but developers', async () => {
        const locked = {
            ...withButton,
            sections: [{ ...withButton.sections[0], lock: { style: true } }],
        };

        mountBuilder({ value: locked });
        await openButtonSettings();

        expect(await screen.findByRole('tab', { name: 'Settings' })).toBeTruthy();
        expect(screen.queryByRole('tab', { name: 'Style' })).toBeNull();
        expect(screen.queryByRole('tab', { name: 'Advanced' })).toBeNull();
    });

    it('keeps the Style and Advanced tabs of a style-locked section for developers', async () => {
        mountBuilder({
            developer: true,
            value: { ...withButton, sections: [{ ...withButton.sections[0], lock: { style: true } }] },
        });
        await openButtonSettings();

        expect(await screen.findByRole('tab', { name: 'Style' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'Advanced' })).toBeTruthy();
    });

    it('writes advanced settings into the look prop too', async () => {
        const { builder } = mountBuilder({ value: withButton });

        await openButtonSettings();
        fireEvent.click(await screen.findByRole('tab', { name: 'Advanced' }));
        fireEvent.click(screen.getByRole('switch', { name: 'Hide on laptops' }));

        expect(buttonLook(builder)).toEqual({
            advanced: { hide_on: ['desktop'] },
        });
    });
});
