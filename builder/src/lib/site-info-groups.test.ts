import { describe, expect, it } from 'vitest';
import type { DynamicValueDefinition, OwnBlockDefinition, RichSection } from '@/types';
import { siteInfoGroupsFor } from './site-info-groups';

const VALUES: DynamicValueDefinition[] = [
    { key: 'site.phone', label: 'Phone', type: 'text', settings: 'contact' },
    { key: 'site.hours', label: 'Hours', type: 'text', settings: 'hours' },
    { key: 'site.email', label: 'Email', type: 'text', settings: 'contact' },
    { key: 'site.whatsapp', label: 'WhatsApp', type: 'link', settings: 'contact' },
    { key: 'site.whatsapp_number', label: 'WhatsApp number', type: 'text', settings: 'contact' },
    { key: 'site.facebook', label: 'Facebook', type: 'link', settings: 'social' },
    { key: 'site.logo', label: 'Logo', type: 'image', settings: 'business' },
    { key: 'page.title', label: 'Page title', type: 'text' },
];

const OWN_BLOCKS: OwnBlockDefinition[] = [
    { kind: 'opening-hours', label: 'Opening hours', fields: [], siteInfo: ['hours', 'contact'] },
    {
        kind: 'team',
        label: 'Team',
        fields: [
            { name: 'heading', type: 'text' },
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

const groupsOf = (source: Parameters<typeof siteInfoGroupsFor>[0]) =>
    siteInfoGroupsFor(source, OWN_BLOCKS, VALUES);

const chip = (key: string) => ({ type: 'dynamic', props: { key } });

describe('the shop info groups an item uses', () => {
    it('are the groups an own block names', () => {
        expect(groupsOf({ type: 'ownBlock', props: { kind: 'opening-hours', values: '{}' } })).toEqual([
            'hours',
            'contact',
        ]);
    });

    it('come from the shop info chips in its words, by each value’s settings group', () => {
        expect(
            groupsOf({
                type: 'paragraph',
                props: {},
                content: [{ type: 'text', text: 'Call ', styles: {} }, chip('site.phone'), chip('page.title')],
            }),
        ).toEqual(['contact']);
    });

    it('come from a shop link in a button, a photo or an inline link', () => {
        expect(groupsOf({ type: 'button', props: { text: 'Chat', url: '@site.whatsapp' } })).toEqual(['contact']);
        expect(groupsOf({ type: 'image', props: { url: '@site.logo' } })).toEqual(['business']);
        expect(
            groupsOf({
                type: 'paragraph',
                content: [{ type: 'link', href: '@site.facebook', content: [{ type: 'text', text: 'Facebook' }] }],
            }),
        ).toEqual(['social']);
        expect(groupsOf({ type: 'button', props: { url: 'https://example.com' } })).toEqual([]);
    });

    it('come from an own block’s link and picture fields, inside lists too, not its text fields', () => {
        const values = JSON.stringify({
            heading: '@site.phone',
            link: '@site.facebook',
            people: [{ name: 'Aminah', photo: '@site.logo' }],
        });

        expect(groupsOf({ type: 'ownBlock', props: { kind: 'team', values } })).toEqual(['social', 'business']);
    });

    it('come from a form’s email and WhatsApp actions', () => {
        const form = JSON.stringify({
            fields: [],
            actions: [
                { type: 'email', to: '@site.email', subject: '' },
                { type: 'whatsapp', to: '@site.whatsapp_number', message: '' },
            ],
        });

        expect(groupsOf({ type: 'form', props: { form } })).toEqual(['contact']);
        expect(
            groupsOf({ type: 'form', props: { form: JSON.stringify({ actions: [{ type: 'email', to: 'me@kedai.my' }] }) } }),
        ).toEqual([]);
    });

    it('are none for a broken item', () => {
        expect(groupsOf({ type: 'ownBlock', props: { kind: 'gone', values: 'not json' } })).toEqual([]);
        expect(groupsOf({ type: 'ownBlock', props: { kind: 'team', values: '[1' } })).toEqual([]);
        expect(groupsOf({ type: 'form', props: { form: '{' } })).toEqual([]);
        expect(groupsOf(null)).toEqual([]);
        expect(
            siteInfoGroupsFor(
                { type: 'ownBlock', props: { kind: 'odd' } },
                [{ kind: 'odd', label: 'Odd', fields: [], siteInfo: [3, '', 'hours'] as unknown as string[] }],
                VALUES,
            ),
        ).toEqual(['hours']);
    });
});

describe('the shop info groups a section uses', () => {
    it('are every group used anywhere in it, once each, inside columns too', () => {
        const section: RichSection = {
            id: 'sec00001',
            type: 'rich',
            data: {
                document: [
                    { id: 'p1', type: 'paragraph', props: {}, content: [chip('site.phone')], children: [] },
                    {
                        id: 'cols',
                        type: 'columnList',
                        props: {},
                        children: [
                            {
                                id: 'col1',
                                type: 'column',
                                props: {},
                                children: [
                                    { id: 'b1', type: 'button', props: { url: '@site.facebook' }, children: [] },
                                    { id: 'o1', type: 'ownBlock', props: { kind: 'opening-hours' }, children: [] },
                                ],
                            },
                        ],
                    },
                ],
            } as unknown as RichSection['data'],
        };

        expect(groupsOf(section)).toEqual(['contact', 'social', 'hours']);
    });

    it('are none for a synced section, whose words live elsewhere', () => {
        expect(groupsOf({ id: 'ref00001', type: 'ref', ref: 7 })).toEqual([]);
    });
});
