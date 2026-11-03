import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KIT } from '../src/lib/kit';
import type { Kit, SaveResult } from '../src/types';
import { makeAdapter, mountBuilder, pickSection } from './mount-helpers';

const KIT: Kit = {
    ...DEFAULT_KIT,
    custom_colors: [{ key: 'gold', label: 'Emas', value: '#c59d6e' }],
};

function kitAdapter(saveKit: () => Promise<SaveResult> = async () => ({ ok: true })) {
    return { ...makeAdapter(), saveKit: vi.fn((_kit: Kit) => saveKit()) };
}

function openDesign() {
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
}

/** The kit sent with the latest preview, if any. */
function lastPreviewKit(adapter: ReturnType<typeof kitAdapter>): Kit | undefined {
    return adapter.preview.mock.calls.at(-1)?.[1]?.kit;
}

describe('the design panel', () => {
    it('shows only when the host gives a kit and can save it', () => {
        mountBuilder({ kit: KIT });

        expect(screen.queryByRole('button', { name: 'Design' })).toBeNull();
    });

    it('previews every change with the kit, before it is saved', async () => {
        const adapter = kitAdapter();

        mountBuilder({ kit: KIT, adapter });
        openDesign();
        fireEvent.change(screen.getByLabelText('Primary colour code'), {
            target: { value: '#ff0000' },
        });

        await waitFor(
            () => expect(lastPreviewKit(adapter)?.colors.primary).toBe('#ff0000'),
            { timeout: 2000 },
        );
        expect(adapter.saveKit).not.toHaveBeenCalled();
    });

    it('saves the kit with saveKit', async () => {
        const adapter = kitAdapter();

        mountBuilder({ kit: KIT, adapter });
        openDesign();
        fireEvent.click(screen.getByRole('radio', { name: 'Pill' }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save design' }));
        });

        expect(adapter.saveKit).toHaveBeenCalledTimes(1);
        expect(adapter.saveKit.mock.calls[0][0].buttons.style).toBe('pill');
        expect(adapter.save).not.toHaveBeenCalled();
    });

    it('shows what the host refused, like a page save', async () => {
        const adapter = kitAdapter(async () => ({
            ok: false,
            errors: { 'colors.primary': 'That colour is not allowed.' },
        }));

        mountBuilder({ kit: KIT, adapter });
        openDesign();
        fireEvent.click(screen.getByRole('radio', { name: 'Pill' }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save design' }));
        });

        expect(await screen.findByText('That colour is not allowed.')).toBeTruthy();
        expect(screen.getByText('Your design was not saved')).toBeTruthy();
    });

    it('asks before leaving with design changes that are not saved', () => {
        mountBuilder({ kit: KIT, adapter: kitAdapter() });
        openDesign();
        fireEvent.click(screen.getByRole('radio', { name: 'Pill' }));

        const leaving = new Event('beforeunload', { cancelable: true });

        window.dispatchEvent(leaving);

        expect(leaving.defaultPrevented).toBe(true);
    });

    it('adds, renames and removes custom colours, which the style panel offers', async () => {
        const adapter = kitAdapter();
        const { builder } = mountBuilder({ kit: KIT, adapter });

        openDesign();
        fireEvent.click(screen.getByRole('button', { name: 'Add colour' }));
        fireEvent.change(screen.getByLabelText('Name of colour 2'), {
            target: { value: 'Hijau' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Remove Emas' }));
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));

        await pickSection(/Selamat datang/);
        fireEvent.click(await screen.findByRole('tab', { name: 'Style' }));

        const picker = screen.getByRole('radiogroup', { name: 'Text colour' });

        expect(within(picker).queryByRole('radio', { name: 'Emas' })).toBeNull();
        fireEvent.click(within(picker).getByRole('radio', { name: 'Hijau' }));
        expect(builder.getValue().sections[0]).toMatchObject({
            data: { style: { desktop: { color: 'kit:colour-2' } } },
        });
    });

    it('allows at most 12 custom colours', () => {
        mountBuilder({
            kit: {
                ...KIT,
                custom_colors: Array.from({ length: 12 }, (_, index) => ({
                    key: `c${index}`,
                    label: `C${index}`,
                    value: '#000000',
                })),
            },
            adapter: kitAdapter(),
        });
        openDesign();

        expect(screen.getByRole('button', { name: 'Add colour' })).toHaveProperty(
            'disabled',
            true,
        );
    });
});
