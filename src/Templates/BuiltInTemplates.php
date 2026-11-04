<?php

namespace Vortechron\FilamentBlockEditor\Templates;

use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Content\PageContent;
use Vortechron\FilamentBlockEditor\Enums\SectionLayout;

/**
 * The built-in templates: for each, its group, layout and look, and the copy
 * in Malay and English. The copy names no products, prices or orders, so it
 * fits any page.
 *
 * Buttons start without a link. They draw as a plain label until the author
 * gives them one.
 */
final class BuiltInTemplates
{
    /**
     * The groups, in menu order, with their names by language.
     *
     * @var array<string, array{ms: string, en: string}>
     */
    private const CATEGORIES = [
        'opening' => ['ms' => 'Skrin pertama', 'en' => 'First screen'],
        'proof' => ['ms' => 'Kepercayaan', 'en' => 'Trust'],
        'content' => ['ms' => 'Kandungan', 'en' => 'Content'],
        'action' => ['ms' => 'Ajakan', 'en' => 'Call to action'],
        'help' => ['ms' => 'Soalan dan hubungan', 'en' => 'Questions and contact'],
        'basic' => ['ms' => 'Asas', 'en' => 'Basic'],
    ];

    /**
     * Each template: its group, layout and look. The look keys are a
     * section's own style (Content\PageContent); `color` is the background
     * colour.
     *
     * @var array<string, array{0: string, 1: SectionLayout, 2: array<string, string>}>
     */
    private const SECTIONS = [
        'hero' => ['opening', SectionLayout::Hero, ['align' => 'left']],
        'feature' => ['opening', SectionLayout::Product, ['align' => 'left', 'button' => 'pill']],
        'cover' => ['opening', SectionLayout::Poster, ['align' => 'left', 'padding' => 'lg']],
        'big_headline' => ['opening', SectionLayout::Poster, ['font' => 'poster', 'padding' => 'xl']],
        'testimonials' => ['proof', SectionLayout::Reviews, []],
        'stats' => ['proof', SectionLayout::Stats, ['align' => 'center']],
        'ticker' => ['proof', SectionLayout::Marquee, ['color' => '#0f172a']],
        'problems' => ['content', SectionLayout::Ticks, []],
        'benefits' => ['content', SectionLayout::Bento, ['align' => 'left']],
        'checklist' => ['content', SectionLayout::Ticks, []],
        'compare' => ['content', SectionLayout::Compare, []],
        'steps' => ['content', SectionLayout::Steps, ['align' => 'left']],
        'cards' => ['content', SectionLayout::Cards, []],
        'story' => ['content', SectionLayout::Editorial, ['padding' => 'lg']],
        'video' => ['content', SectionLayout::Plain, ['align' => 'center']],
        'gallery' => ['content', SectionLayout::Plain, ['align' => 'center']],
        'highlight' => ['action', SectionLayout::Highlight, []],
        'banner' => ['action', SectionLayout::Banner, []],
        'promise' => ['action', SectionLayout::Highlight, []],
        'cta' => ['action', SectionLayout::Banner, []],
        'faq' => ['help', SectionLayout::Faq, []],
        'contact' => ['help', SectionLayout::Plain, ['align' => 'center']],
        'text' => ['basic', SectionLayout::Plain, []],
        'blank' => ['basic', SectionLayout::Plain, []],
    ];

    /**
     * @return list<array{key: string, label: string, category: string, description: string, section: array{id: string, type: string, data: array<string, mixed>}}>
     */
    public static function all(string $locale, ?string $contentLocale = null): array
    {
        $copy = self::copy($locale);
        $content = self::copy($contentLocale ?? $locale);

        return array_map(function (string $key) use ($copy, $content, $locale): array {
            [$category, $layout, $look] = self::SECTIONS[$key];
            [$label, $description] = $copy[$key];
            $document = $content[$key][2];

            return [
                'key' => $key,
                'label' => $label,
                'category' => self::CATEGORIES[$category][$locale],
                'description' => $description,
                'section' => PageContent::normalize([[
                    'id' => PageContent::newId(),
                    'type' => PageContent::TYPE,
                    'data' => self::data($document, $layout, $look),
                ]])[0],
            ];
        }, array_keys(self::SECTIONS));
    }

    /**
     * @return array<string, array{0: string, 1: string, 2: list<array<string, mixed>>}>
     */
    private static function copy(string $locale): array
    {
        return $locale === 'ms' ? self::malay() : self::english();
    }

    /**
     * @param  list<array<string, mixed>>  $document
     * @param  array<string, string>  $look
     * @return array<string, mixed>
     */
    private static function data(array $document, SectionLayout $layout, array $look): array
    {
        $color = $look['color'] ?? null;

        return [
            'document' => $document,
            'layout' => $layout->value,
            'background' => $color === null ? 'none' : 'color',
            'background_color' => $color,
            'padding' => $look['padding'] ?? 'md',
            'font' => $look['font'] ?? 'theme',
            'align' => $look['align'] ?? 'auto',
            'corners' => $look['corners'] ?? 'theme',
            'button' => $look['button'] ?? 'theme',
        ];
    }

    /**
     * @return array<string, array{0: string, 1: string, 2: list<array<string, mixed>>}>
     */
    private static function english(): array
    {
        return [
            'hero' => ['Hero', 'A big headline beside your photo, with a button.', [
                Blocks::heading(1, 'A headline that says what you do'),
                Blocks::paragraph('Explain in one sentence what visitors get and why it matters to them.'),
                Blocks::image(''),
                Blocks::button('Get in touch', ''),
            ]],
            'feature' => ['Feature', 'Your photo, then the title, key points and a button.', [
                Blocks::image(''),
                Blocks::heading(1, 'Your title here'),
                Blocks::paragraph('Write one sentence that makes people want to read on.'),
                Blocks::bullet('✅ The first key point'),
                Blocks::bullet('✅ What is included'),
                Blocks::bullet('✅ Why it is worth it'),
                Blocks::button('Learn more', ''),
            ]],
            'cover' => ['Photo cover', 'Your photo fills the screen and big words sit on it.', [
                Blocks::image(''),
                Blocks::heading(1, 'A big headline that stops the scroll'),
                Blocks::paragraph('One short sentence about what people get.'),
                Blocks::button('Get started', ''),
            ]],
            'big_headline' => ['Big headline', 'Huge words and no photo, like a poster.', [
                Blocks::paragraph('Your name', 'center'),
                Blocks::heading(1, 'Try it once. You will be hooked.', 'center'),
                Blocks::paragraph('One short sentence about what people get.', 'center'),
                Blocks::button('Get started', ''),
            ]],
            'testimonials' => ['Reviews', 'Review cards with stars and names.', [
                Blocks::heading(2, 'What people say about us', 'center'),
                Blocks::quote('Paste a real testimonial from one of your customers here.'),
                Blocks::paragraph('★★★★★ — Customer name'),
                Blocks::quote('Paste a second testimonial here.'),
                Blocks::paragraph('★★★★★ — Customer name'),
                Blocks::quote('Paste a third testimonial here.'),
                Blocks::paragraph('★★★★★ — Customer name'),
            ]],
            'stats' => ['Big numbers', 'Your best facts as big numbers.', [
                Blocks::heading(2, 'Why people trust us', 'center'),
                Blocks::paragraph('Change the numbers below to real facts about you.', 'center'),
                Blocks::heading(3, '1,000+'),
                Blocks::paragraph('customers'),
                Blocks::heading(3, '4.9★'),
                Blocks::paragraph('average rating'),
                Blocks::heading(3, '24 hours'),
                Blocks::paragraph('to reply'),
                Blocks::heading(3, '100%'),
                Blocks::paragraph('satisfaction'),
            ]],
            'ticker' => ['Ticker', 'Short promises that scroll past in a dark band.', [
                Blocks::bullet('Friendly support'),
                Blocks::bullet('Clear answers'),
                Blocks::bullet('Neat work'),
                Blocks::bullet('Ask us on WhatsApp'),
                Blocks::bullet('Satisfaction promised'),
            ]],
            'problems' => ['Problems', 'The problems people have, with crosses.', [
                Blocks::heading(2, 'Does this sound familiar?'),
                Blocks::bullet('❌ The first problem people have'),
                Blocks::bullet('❌ A second problem that keeps coming back'),
                Blocks::bullet('❌ A third problem that lets them down'),
            ]],
            'benefits' => ['Benefits grid', 'Tiles of mixed sizes. The first one holds a photo.', [
                Blocks::heading(2, 'Why people choose us'),
                Blocks::heading(3, 'First benefit'),
                Blocks::image(''),
                Blocks::heading(3, 'Second benefit'),
                Blocks::paragraph('Explain why it is better than the other options.'),
                Blocks::heading(3, 'Third benefit'),
                Blocks::paragraph('Explain a reason to act today.'),
                Blocks::heading(3, 'Easy to use'),
                Blocks::paragraph('Explain the result people feel.'),
            ]],
            'checklist' => ['Checklist', 'What people get, with ticks.', [
                Blocks::heading(2, 'What you get'),
                Blocks::bullet('✅ The first thing that is included'),
                Blocks::bullet('✅ The second thing that is included'),
                Blocks::bullet('✅ An extra bonus'),
            ]],
            'compare' => ['Comparison', 'Two columns: the usual way with crosses, yours with ticks.', [
                Blocks::heading(2, 'Why we are different', 'center'),
                Blocks::heading(3, 'The usual way'),
                Blocks::bullet('❌ A weakness people know from other options'),
                Blocks::bullet('❌ Another weakness'),
                Blocks::bullet('❌ A third weakness'),
                Blocks::heading(3, 'Our way'),
                Blocks::bullet('✅ How you solve that problem'),
                Blocks::bullet('✅ Your second strength'),
                Blocks::bullet('✅ Your third strength'),
            ]],
            'steps' => ['Steps', 'Three numbered steps: 01, 02, 03.', [
                Blocks::heading(2, 'How it works'),
                Blocks::heading(3, 'Get in touch'),
                Blocks::paragraph('Send us a message and tell us what you need.'),
                Blocks::heading(3, 'We plan it together'),
                Blocks::paragraph('We talk through the options and agree on the next step.'),
                Blocks::heading(3, 'Done'),
                Blocks::paragraph('We do the work and make sure you are happy.'),
            ]],
            'cards' => ['Feature cards', 'A card for each feature.', [
                Blocks::heading(2, 'What makes us special', 'center'),
                Blocks::heading(3, 'First feature'),
                Blocks::paragraph('Explain this feature and why it matters.'),
                Blocks::heading(3, 'Second feature'),
                Blocks::paragraph('Explain this feature and why it matters.'),
                Blocks::heading(3, 'Third feature'),
                Blocks::paragraph('Explain this feature and why it matters.'),
            ]],
            'story' => ['Our story', 'A magazine spread about you and your work.', [
                Blocks::paragraph('Our story'),
                Blocks::heading(2, 'Why we started'),
                Blocks::paragraph('Tell how it all started. People like to know who is behind the work.'),
                Blocks::paragraph('Explain what makes you different. Who does the work, and how.'),
                Blocks::quote('One sentence you want people to remember.'),
            ]],
            'video' => ['Video', 'A heading and your video.', [
                Blocks::heading(2, 'See for yourself', 'center'),
                Blocks::paragraph('Add your video in the video spot below.', 'center'),
                Blocks::video(''),
            ]],
            'gallery' => ['Gallery', 'A heading and a photo slideshow.', [
                Blocks::heading(2, 'A closer look', 'center'),
                Blocks::gallery([]),
            ]],
            'highlight' => ['Highlight', 'One message on a raised card.', [
                Blocks::heading(2, 'Something worth knowing', 'center'),
                Blocks::paragraph('Describe the most important thing here in a sentence or two.', 'center'),
                Blocks::button('Find out more', ''),
            ]],
            'banner' => ['Banner', 'A bold band in the accent colour with news and a button.', [
                Blocks::heading(2, 'Big news', 'center'),
                Blocks::paragraph('Say what is happening and when.', 'center'),
                Blocks::button('Find out more', ''),
            ]],
            'promise' => ['Promise', 'Your promise or guarantee on a raised card.', [
                Blocks::heading(2, 'Our promise', 'center'),
                Blocks::paragraph('Explain your guarantee or promise here.', 'center'),
            ]],
            'cta' => ['Call to action', 'A final push with a button.', [
                Blocks::heading(2, 'Ready to start?', 'center'),
                Blocks::paragraph('Send us a message today. We reply fast.', 'center'),
                Blocks::button('Message us', ''),
            ]],
            'faq' => ['FAQ', 'Questions that open to show the answer.', [
                Blocks::heading(2, 'Frequently asked questions'),
                Blocks::toggle('First question?', [Blocks::paragraph('Write the answer here.')]),
                Blocks::toggle('Second question?', [Blocks::paragraph('Write the answer here.')]),
                Blocks::toggle('Third question?', [Blocks::paragraph('Write the answer here.')]),
            ]],
            'contact' => ['Contact', 'How to reach you, with two buttons.', [
                Blocks::heading(2, 'Get in touch', 'center'),
                Blocks::paragraph('Tell us what you need and we will reply as soon as we can.', 'center'),
                Blocks::button('Send an email', ''),
                Blocks::button('Call us', '', 'outline'),
            ]],
            'text' => ['Text', 'A heading and a paragraph.', [
                Blocks::heading(2, 'A heading'),
                Blocks::paragraph('Write your paragraph here.'),
            ]],
            'blank' => ['Blank', 'An empty section to lay out yourself.', []],
        ];
    }

    /**
     * @return array<string, array{0: string, 1: string, 2: list<array<string, mixed>>}>
     */
    private static function malay(): array
    {
        return [
            'hero' => ['Hero', 'Tajuk besar di sebelah gambar anda, dengan butang.', [
                Blocks::heading(1, 'Satu tajuk yang menerangkan apa yang anda buat'),
                Blocks::paragraph('Terangkan dalam satu ayat apa yang pelawat dapat, dan kenapa ia penting untuk mereka.'),
                Blocks::image(''),
                Blocks::button('Hubungi kami', ''),
            ]],
            'feature' => ['Ciri utama', 'Gambar anda, kemudian tajuk, mata penting dan butang.', [
                Blocks::image(''),
                Blocks::heading(1, 'Tajuk anda di sini'),
                Blocks::paragraph('Tulis satu ayat yang buat orang teringin membaca.'),
                Blocks::bullet('✅ Mata penting yang pertama'),
                Blocks::bullet('✅ Apa yang termasuk'),
                Blocks::bullet('✅ Kenapa ia berbaloi'),
                Blocks::button('Ketahui lebih lanjut', ''),
            ]],
            'cover' => ['Kulit bergambar', 'Gambar anda memenuhi skrin dan tulisan besar berada di atasnya.', [
                Blocks::image(''),
                Blocks::heading(1, 'Tajuk besar yang buat orang berhenti scroll'),
                Blocks::paragraph('Satu ayat pendek tentang apa yang orang dapat.'),
                Blocks::button('Mulakan', ''),
            ]],
            'big_headline' => ['Tajuk besar', 'Tulisan yang sangat besar tanpa gambar, seperti poster.', [
                Blocks::paragraph('Nama anda', 'center'),
                Blocks::heading(1, 'Sekali cuba. Terus jatuh hati.', 'center'),
                Blocks::paragraph('Satu ayat pendek tentang apa yang orang dapat.', 'center'),
                Blocks::button('Mulakan', ''),
            ]],
            'testimonials' => ['Ulasan', 'Kad ulasan dengan bintang dan nama.', [
                Blocks::heading(2, 'Apa kata pelanggan kami', 'center'),
                Blocks::quote('Tampal testimoni sebenar pelanggan anda di sini.'),
                Blocks::paragraph('★★★★★ — Nama pelanggan'),
                Blocks::quote('Tampal testimoni kedua di sini.'),
                Blocks::paragraph('★★★★★ — Nama pelanggan'),
                Blocks::quote('Tampal testimoni ketiga di sini.'),
                Blocks::paragraph('★★★★★ — Nama pelanggan'),
            ]],
            'stats' => ['Nombor besar', 'Fakta terbaik anda sebagai nombor besar.', [
                Blocks::heading(2, 'Kenapa ramai percaya kami', 'center'),
                Blocks::paragraph('Tukar nombor di bawah kepada fakta sebenar tentang anda.', 'center'),
                Blocks::heading(3, '1,000+'),
                Blocks::paragraph('pelanggan'),
                Blocks::heading(3, '4.9★'),
                Blocks::paragraph('purata penilaian'),
                Blocks::heading(3, '24 jam'),
                Blocks::paragraph('masa membalas'),
                Blocks::heading(3, '100%'),
                Blocks::paragraph('kepuasan'),
            ]],
            'ticker' => ['Jalur berjalan', 'Janji-janji pendek yang bergerak dalam jalur gelap.', [
                Blocks::bullet('Sokongan yang mesra'),
                Blocks::bullet('Jawapan yang jelas'),
                Blocks::bullet('Kerja yang kemas'),
                Blocks::bullet('Tanya kami di WhatsApp'),
                Blocks::bullet('Jaminan puas hati'),
            ]],
            'problems' => ['Masalah', 'Masalah yang orang hadapi, dengan tanda silang.', [
                Blocks::heading(2, 'Pernah rasa begini?'),
                Blocks::bullet('❌ Masalah pertama yang orang hadapi'),
                Blocks::bullet('❌ Masalah kedua yang selalu berulang'),
                Blocks::bullet('❌ Masalah ketiga yang mengecewakan mereka'),
            ]],
            'benefits' => ['Kelebihan', 'Jubin pelbagai saiz. Yang pertama memuatkan gambar.', [
                Blocks::heading(2, 'Kenapa ramai pilih kami'),
                Blocks::heading(3, 'Kelebihan pertama'),
                Blocks::image(''),
                Blocks::heading(3, 'Kelebihan kedua'),
                Blocks::paragraph('Terangkan kenapa ia lebih baik daripada pilihan lain.'),
                Blocks::heading(3, 'Kelebihan ketiga'),
                Blocks::paragraph('Terangkan sebab untuk bertindak hari ini.'),
                Blocks::heading(3, 'Mudah digunakan'),
                Blocks::paragraph('Terangkan hasil yang orang rasa.'),
            ]],
            'checklist' => ['Senarai semak', 'Apa yang orang dapat, dengan tanda betul.', [
                Blocks::heading(2, 'Apa yang anda dapat'),
                Blocks::bullet('✅ Perkara pertama yang termasuk'),
                Blocks::bullet('✅ Perkara kedua yang termasuk'),
                Blocks::bullet('✅ Bonus tambahan'),
            ]],
            'compare' => ['Perbandingan', 'Dua lajur: cara biasa dengan tanda silang, cara anda dengan tanda betul.', [
                Blocks::heading(2, 'Kenapa kami berbeza', 'center'),
                Blocks::heading(3, 'Cara biasa'),
                Blocks::bullet('❌ Kelemahan yang orang kenal pada pilihan lain'),
                Blocks::bullet('❌ Satu lagi kelemahan'),
                Blocks::bullet('❌ Kelemahan ketiga'),
                Blocks::heading(3, 'Cara kami'),
                Blocks::bullet('✅ Bagaimana anda selesaikan masalah itu'),
                Blocks::bullet('✅ Kekuatan kedua anda'),
                Blocks::bullet('✅ Kekuatan ketiga anda'),
            ]],
            'steps' => ['Langkah', 'Tiga langkah bernombor: 01, 02, 03.', [
                Blocks::heading(2, 'Bagaimana ia berfungsi'),
                Blocks::heading(3, 'Hubungi kami'),
                Blocks::paragraph('Hantar mesej dan beritahu apa yang anda perlukan.'),
                Blocks::heading(3, 'Kita rancang bersama'),
                Blocks::paragraph('Kami bincang pilihan yang ada dan setuju dengan langkah seterusnya.'),
                Blocks::heading(3, 'Siap'),
                Blocks::paragraph('Kami buat kerja itu dan pastikan anda berpuas hati.'),
            ]],
            'cards' => ['Kad ciri', 'Satu kad untuk setiap ciri.', [
                Blocks::heading(2, 'Apa yang istimewa', 'center'),
                Blocks::heading(3, 'Ciri pertama'),
                Blocks::paragraph('Terangkan ciri ini dan kenapa ia penting.'),
                Blocks::heading(3, 'Ciri kedua'),
                Blocks::paragraph('Terangkan ciri ini dan kenapa ia penting.'),
                Blocks::heading(3, 'Ciri ketiga'),
                Blocks::paragraph('Terangkan ciri ini dan kenapa ia penting.'),
            ]],
            'story' => ['Kisah kami', 'Helaian seperti majalah tentang anda dan kerja anda.', [
                Blocks::paragraph('Kisah kami'),
                Blocks::heading(2, 'Kenapa kami bermula'),
                Blocks::paragraph('Ceritakan bagaimana semuanya bermula. Orang suka mengenali manusia di sebalik kerja itu.'),
                Blocks::paragraph('Terangkan apa yang membezakan anda. Siapa yang membuatnya, dan bagaimana.'),
                Blocks::quote('Satu ayat yang anda mahu orang ingat.'),
            ]],
            'video' => ['Video', 'Satu tajuk dan video anda.', [
                Blocks::heading(2, 'Tengok sendiri', 'center'),
                Blocks::paragraph('Tambah video anda pada ruang video di bawah.', 'center'),
                Blocks::video(''),
            ]],
            'gallery' => ['Galeri', 'Satu tajuk dan tayangan gambar.', [
                Blocks::heading(2, 'Lihat dengan lebih dekat', 'center'),
                Blocks::gallery([]),
            ]],
            'highlight' => ['Sorotan', 'Satu mesej pada kad yang timbul.', [
                Blocks::heading(2, 'Perkara yang patut anda tahu', 'center'),
                Blocks::paragraph('Terangkan perkara paling penting di sini dalam satu atau dua ayat.', 'center'),
                Blocks::button('Ketahui lebih lanjut', ''),
            ]],
            'banner' => ['Sepanduk', 'Jalur tebal berwarna aksen dengan berita dan butang.', [
                Blocks::heading(2, 'Berita besar', 'center'),
                Blocks::paragraph('Beritahu apa yang berlaku dan bila.', 'center'),
                Blocks::button('Ketahui lebih lanjut', ''),
            ]],
            'promise' => ['Janji', 'Janji atau jaminan anda pada kad yang timbul.', [
                Blocks::heading(2, 'Janji kami', 'center'),
                Blocks::paragraph('Terangkan jaminan atau janji anda di sini.', 'center'),
            ]],
            'cta' => ['Seruan tindakan', 'Dorongan terakhir dengan butang.', [
                Blocks::heading(2, 'Bersedia untuk bermula?', 'center'),
                Blocks::paragraph('Hantar mesej kepada kami hari ini. Kami membalas dengan cepat.', 'center'),
                Blocks::button('Mesej kami', ''),
            ]],
            'faq' => ['Soalan lazim', 'Soalan yang terbuka untuk menunjukkan jawapan.', [
                Blocks::heading(2, 'Soalan lazim'),
                Blocks::toggle('Soalan pertama?', [Blocks::paragraph('Tulis jawapan di sini.')]),
                Blocks::toggle('Soalan kedua?', [Blocks::paragraph('Tulis jawapan di sini.')]),
                Blocks::toggle('Soalan ketiga?', [Blocks::paragraph('Tulis jawapan di sini.')]),
            ]],
            'contact' => ['Hubungan', 'Cara menghubungi anda, dengan dua butang.', [
                Blocks::heading(2, 'Hubungi kami', 'center'),
                Blocks::paragraph('Beritahu apa yang anda perlukan dan kami akan membalas secepat mungkin.', 'center'),
                Blocks::button('Hantar e-mel', ''),
                Blocks::button('Telefon kami', '', 'outline'),
            ]],
            'text' => ['Teks', 'Satu tajuk dan satu perenggan.', [
                Blocks::heading(2, 'Satu tajuk'),
                Blocks::paragraph('Tulis perenggan anda di sini.'),
            ]],
            'blank' => ['Kosong', 'Bahagian kosong untuk anda susun sendiri.', []],
        ];
    }
}
