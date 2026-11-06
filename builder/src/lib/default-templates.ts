import type { Locale } from '@/lib/i18n';
import type { RichDocument, SectionTemplateInput } from '@/types';

/**
 * A few ready-made sections for when the host sends none, like the demo
 * page. The PHP side sends the full set (Templates\SectionTemplates).
 * Plain JSON-able data, the same shape the host sends.
 */

const text = (words: string, styles: Record<string, boolean> = {}) =>
    words === '' ? [] : [{ type: 'text', text: words, styles }];

const block = (
    type: string,
    props: Record<string, unknown>,
    content: unknown[] = [],
    children: unknown[] = [],
) => ({ type, props, content, children });

const heading = (words: string, level = 2, textAlignment = 'left') =>
    block('heading', { level, textAlignment }, text(words));

const paragraph = (words: string, textAlignment = 'left') =>
    block('paragraph', { textAlignment }, text(words));

const toggle = (title: string, answer: string) =>
    block('toggleListItem', {}, text(title, { bold: true }), [
        paragraph(answer),
    ]);

const image = () => block('image', { url: '', caption: '' });

const button = (words: string, url = '#') =>
    block('button', { text: words, url, variant: 'solid' });

type Copy = {
    hero: [string, string, string];
    text: [string, string];
    cards: [string, [string, string][]];
    faq: [string, [string, string][]];
    banner: [string, string, string];
    labels: Record<'hero' | 'text' | 'cards' | 'faq' | 'banner' | 'blank', [string, string]>;
};

const COPY: Record<Locale, Copy> = {
    ms: {
        hero: [
            'Tajuk besar halaman anda',
            'Satu ayat pendek tentang apa yang pelawat dapat di sini.',
            'Ketahui lagi',
        ],
        text: ['Tajuk seksyen ini', 'Tulis perenggan anda di sini.'],
        cards: [
            'Apa yang kami tawarkan',
            [
                ['Perkara pertama', 'Terangkan perkara ini dalam satu dua ayat.'],
                ['Perkara kedua', 'Terangkan perkara ini dalam satu dua ayat.'],
                ['Perkara ketiga', 'Terangkan perkara ini dalam satu dua ayat.'],
            ],
        ],
        faq: [
            'Soalan lazim',
            [
                ['Soalan pertama?', 'Tulis jawapannya di sini.'],
                ['Soalan kedua?', 'Tulis jawapannya di sini.'],
            ],
        ],
        banner: [
            'Sedia untuk bermula?',
            'Satu ayat yang mengajak pelawat mengambil langkah seterusnya.',
            'Hubungi kami',
        ],
        labels: {
            hero: ['Hero', 'Tajuk besar di sebelah gambar, dengan butang.'],
            text: ['Teks', 'Satu tajuk dan satu perenggan.'],
            cards: ['Kad', 'Satu kad untuk setiap perkara.'],
            faq: ['Soalan lazim', 'Soalan yang dibuka untuk menunjukkan jawapan.'],
            banner: ['Ajakan', 'Jalur berwarna dengan satu butang.'],
            blank: ['Kosong', 'Seksyen kosong untuk anda susun sendiri.'],
        },
    },
    en: {
        hero: [
            'The big headline of your page',
            'One short sentence about what visitors find here.',
            'Learn more',
        ],
        text: ['The title of this section', 'Write your paragraph here.'],
        cards: [
            'What we offer',
            [
                ['First thing', 'Explain it in a sentence or two.'],
                ['Second thing', 'Explain it in a sentence or two.'],
                ['Third thing', 'Explain it in a sentence or two.'],
            ],
        ],
        faq: [
            'Questions people ask',
            [
                ['A first question?', 'Write the answer here.'],
                ['A second question?', 'Write the answer here.'],
            ],
        ],
        banner: [
            'Ready to start?',
            'One sentence that invites visitors to take the next step.',
            'Contact us',
        ],
        labels: {
            hero: ['Hero', 'A big headline beside your photo, with a button.'],
            text: ['Text', 'A heading and a paragraph.'],
            cards: ['Cards', 'A card for each point.'],
            faq: ['FAQ', 'Questions that open to show the answer.'],
            banner: ['Call to action', 'A coloured band with one button.'],
            blank: ['Blank', 'An empty section to lay out yourself.'],
        },
    },
};

export function defaultTemplates(locale: Locale, contentLocale: Locale = locale): SectionTemplateInput[] {
    const copy = COPY[contentLocale];
    const labels = COPY[locale].labels;
    const make = (
        key: keyof Copy['labels'],
        category: string,
        data: Record<string, unknown> & { document: RichDocument },
    ): SectionTemplateInput => ({
        key,
        label: labels[key][0],
        description: labels[key][1],
        category,
        section: { type: 'rich', data },
    });

    return [
        make('hero', 'opening', {
            layout: 'hero',
            align: 'left',
            document: [
                heading(copy.hero[0], 1),
                paragraph(copy.hero[1]),
                image(),
                button(copy.hero[2]),
            ],
        }),
        make('cards', 'selling', {
            layout: 'cards',
            document: [
                heading(copy.cards[0], 2, 'center'),
                ...copy.cards[1].flatMap(([title, body]) => [
                    heading(title, 3),
                    paragraph(body),
                ]),
            ],
        }),
        make('banner', 'offer', {
            layout: 'banner',
            document: [
                heading(copy.banner[0], 2, 'center'),
                paragraph(copy.banner[1], 'center'),
                button(copy.banner[2]),
            ],
        }),
        make('faq', 'help', {
            layout: 'faq',
            document: [
                heading(copy.faq[0]),
                ...copy.faq[1].map(([question, answer]) =>
                    toggle(question, answer),
                ),
            ],
        }),
        make('text', 'basic', {
            layout: 'plain',
            document: [heading(copy.text[0]), paragraph(copy.text[1])],
        }),
        make('blank', 'basic', { layout: 'plain', document: [] }),
    ];
}

export const DEFAULT_TEMPLATES: Record<Locale, SectionTemplateInput[]> = {
    ms: defaultTemplates('ms'),
    en: defaultTemplates('en'),
};
