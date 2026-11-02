import { describe, expect, it, vi } from 'vitest';
import type { PageBuilderAdapter } from '@/types';
import { uploadKindOf, uploadWith } from './upload';

function adapterReturning(url: unknown) {
    const upload = vi.fn(async () => ({ url }) as { url: string });
    const adapter: PageBuilderAdapter = {
        save: vi.fn(async () => ({ ok: true }) as const),
        preview: vi.fn(async () => '<html></html>'),
        upload,
    };

    return { adapter, upload };
}

const t = (text: string) => text;

describe('uploading through the adapter', () => {
    it('sends a photo as an image and returns its address', async () => {
        const { adapter, upload } = adapterReturning('/storage/a.jpg');
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

        await expect(uploadWith(adapter, t)(file)).resolves.toBe(
            '/storage/a.jpg',
        );
        expect(upload).toHaveBeenCalledWith(file, 'image');
    });

    it('names the kind by the file type', () => {
        expect(uploadKindOf(new File([''], 'a.mp4', { type: 'video/mp4' }))).toBe(
            'video',
        );
        expect(
            uploadKindOf(new File([''], 'a.pdf', { type: 'application/pdf' })),
        ).toBe('file');
        expect(uploadKindOf(new File([''], 'a.png', { type: 'image/png' }))).toBe(
            'image',
        );
    });

    it('asks for the kind the field needs', async () => {
        const { adapter, upload } = adapterReturning('https://cdn.test/a.png');
        const file = new File(['x'], 'a.png', { type: 'image/png' });

        await uploadWith(adapter, t)(file, 'image');

        expect(upload).toHaveBeenCalledWith(file, 'image');
    });

    it('refuses a file that is not a photo where a photo is needed', async () => {
        const { adapter, upload } = adapterReturning('/a.pdf');
        const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });

        await expect(uploadWith(adapter, t)(file, 'image')).rejects.toThrow(
            'Please choose a photo.',
        );
        expect(upload).not.toHaveBeenCalled();
    });

    it('fails with a clear message when the host returns no usable address', async () => {
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

        await expect(
            uploadWith(adapterReturning('').adapter, t)(file),
        ).rejects.toThrow('The upload did not work. Please try again.');
        await expect(
            uploadWith(adapterReturning('javascript:alert(1)').adapter, t)(file),
        ).rejects.toThrow('The upload did not work. Please try again.');
    });
});
