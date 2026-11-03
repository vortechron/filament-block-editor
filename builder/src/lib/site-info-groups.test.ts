import { describe, expect, it } from 'vitest';
import type { DynamicValueDefinition, OwnBlockDefinition } from '@/types';
import { siteInfoUsesFor } from './site-info-groups';

const VALUES: DynamicValueDefinition[] = [
    { key: 'site.phone', label: 'Phone', type: 'text', settings: 'contact' },
    { key: 'site.hours', label: 'Hours', type: 'text', settings: 'hours' },
    { key: 'site.email', label: 'Email', type: 'text', settings: 'contact' },
    { key: 'site.address', label: 'Address', type: 'text', settings: 'contact' },
    { key: 'site.whatsapp', label: 'WhatsApp', type: 'link', settings: 'contact' },
    { key: 'site.whatsapp_number', label: 'WhatsApp number', type: 'text', settings: 'contact' },
    { key: 'site.facebook', label: 'Facebook', type: 'link', settings: 'social' },
    { key: 'site.logo', label: 'Logo', type: 'image', settings: 'business' },
    { key: 'site.name', label: 'Shop name', type: 'text', settings: 'business' },
    { key: 'page.title', label: 'Page title', type: 'text' },
];

const OWN_BLOCKS: OwnBlockDefinition[] = [
    { kind: 'opening-hours', label: 'Opening hours', fields: [], siteInfo: ['hours', 'contact'] },
    {
        kind: 'map',
        label: 'Map',
        fields: [{ name: 'address', type: 'text' }],
        siteInfo: ['contact'],
        showsValues: ['site.address'],
    },
    { kind: 'old-map', label: 'Old map', fields: [], siteInfo: ['contact'], showsValues: ['site.gone'] },
    {
        kind: 'team',
        label: 'Team',
        fields: [
            { name: 'heading', type: 'text' },
            { name: 'intro', type: 'textarea' },
            { name: 'link', type: 'link' },
            {
                name: 'people',
                type: 'list',
                fields: [
                    { name: 'name', type: 'text' },
                    { name: 'photo', type: 'image' },
                ],
            },
        ],
    },
];

const usesOf = (source: Parameters<typeof siteInfoUsesFor>[0]) =>
    siteInfoUsesFor(source, OWN_BLOCKS, VALUES);

const chip = (key: string) => ({ type: 'dynamic', props: { key } });

describe('the shop info an item uses', () => {
    it('is the values an own block shows, before the groups it names', () => {
        expect(usesOf({ type: 'ownBlock', props: { kind: 'map', values: '{}' } })).toEqual([
            { key: 'site.address' },
        ]);
    });

    it('is the groups an own block names, when none of its values covers them', () => {
        expect(usesOf({ type: 'ownBlock', props: { kind: 'opening-hours', values: '{}' } })).toEqual([
            { group: 'hours' },
            { group: 'contact' },
        ]);
        // The site has no such value, so the group shows instead.
        expect(usesOf({ type: 'ownBlock', props: { kind: 'old-map', values: '{}' } })).toEqual([
            { group: 'contact' },
        ]);
    });

    it('is the shop info chips in its words, not values from elsewhere like the page title', () => {
        expect(
            usesOf({
                type: 'paragraph',
                props: {},
                content: [{ type: 'text', text: 'Call ', styles: {} }, chip('site.phone'), chip('page.title')],
            }),
        ).toEqual([{ key: 'site.phone' }]);
    });

    it('is a shop link in a button, a photo or an inline link', () => {
        expect(usesOf({ type: 'button', props: { text: 'Chat', url: '@site.whatsapp' } })).toEqual([
            { key: 'site.whatsapp' },
        ]);
        expect(usesOf({ type: 'image', props: { url: '@site.logo' } })).toEqual([{ key: 'site.logo' }]);
        expect(
            usesOf({
                type: 'paragraph',
                content: [{ type: 'link', href: '@site.facebook', content: [{ type: 'text', text: 'Facebook' }] }],
            }),
        ).toEqual([{ key: 'site.facebook' }]);
        expect(usesOf({ type: 'button', props: { url: 'https://example.com' } })).toEqual([]);
    });

    it('is an own block’s links, pictures and short codes, inside lists too, each once', () => {
        const values = JSON.stringify({
            heading: 'Call {site.phone} or {site.phone}. Not @site.email or {nama}',
            intro: 'Open:\n{site.hours}{page.title}',
            link: '@site.facebook',
            people: [
                { name: 'Aminah at {site.name}', photo: '@site.logo' },
                { name: '{site.phone}', photo: '' },
            ],
        });

        expect(usesOf({ type: 'ownBlock', props: { kind: 'team', values } })).toEqual([
            { key: 'site.phone' },
            { key: 'site.hours' },
            { key: 'site.facebook' },
            { key: 'site.name' },
            { key: 'site.logo' },
        ]);
    });

    it('is a form’s email and WhatsApp actions', () => {
        const form = JSON.stringify({
            fields: [],
            actions: [
                { type: 'email', to: '@site.email', subject: '' },
                { type: 'whatsapp', to: '@site.whatsapp_number', message: '' },
            ],
        });

        expect(usesOf({ type: 'form', props: { form } })).toEqual([
            { key: 'site.email' },
            { key: 'site.whatsapp_number' },
        ]);
        expect(
            usesOf({ type: 'form', props: { form: JSON.stringify({ actions: [{ type: 'email', to: 'me@kedai.my' }] }) } }),
        ).toEqual([]);
    });

    it('is everything inside it, like the items of a column, in page order', () => {
        expect(
            usesOf({
                type: 'column',
                props: {},
                children: [
                    { type: 'button', props: { url: '@site.facebook' }, children: [] },
                    { type: 'ownBlock', props: { kind: 'opening-hours' }, children: [] },
                    { type: 'paragraph', props: {}, content: [chip('site.phone'), chip('site.facebook')], children: [] },
                ],
            }),
        ).toEqual([{ key: 'site.facebook' }, { group: 'hours' }, { key: 'site.phone' }]);
    });

    it('is nothing for a broken item', () => {
        expect(usesOf({ type: 'ownBlock', props: { kind: 'gone', values: 'not json' } })).toEqual([]);
        expect(usesOf({ type: 'ownBlock', props: { kind: 'team', values: '[1' } })).toEqual([]);
        expect(usesOf({ type: 'form', props: { form: '{' } })).toEqual([]);
        expect(usesOf(null)).toEqual([]);
        expect(
            siteInfoUsesFor(
                { type: 'ownBlock', props: { kind: 'odd' } },
                [
                    {
                        kind: 'odd',
                        label: 'Odd',
                        fields: [],
                        siteInfo: [3, '', 'hours'] as unknown as string[],
                        showsValues: [4, '', 'Site.Phone', 'site.email'] as unknown as string[],
                    },
                ],
                VALUES,
            ),
        ).toEqual([{ key: 'site.email' }, { group: 'hours' }]);
    });
});
