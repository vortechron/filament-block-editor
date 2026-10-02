<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use Vortechron\FilamentBlockEditor\Enums\BlockFont;
use Vortechron\FilamentBlockEditor\Support\BlockNoteRenderer;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class BlockNoteRendererTest extends TestCase
{
    private function render(array $blocks): string
    {
        return app(BlockNoteRenderer::class)->render($blocks);
    }

    public function test_it_renders_paragraphs_headings_and_inline_styles(): void
    {
        $html = $this->render([
            [
                'type' => 'heading',
                'props' => ['level' => 1, 'textAlignment' => 'center'],
                'content' => [['type' => 'text', 'text' => 'Welcome']],
            ],
            [
                'type' => 'paragraph',
                'content' => [
                    ['type' => 'text', 'text' => 'Plain '],
                    ['type' => 'text', 'text' => 'bold', 'styles' => ['bold' => true]],
                    ['type' => 'link', 'href' => 'https://example.com', 'content' => [['type' => 'text', 'text' => 'a link']]],
                ],
            ],
        ]);

        $this->assertStringContainsString('<h1 style="text-align: center', $html);
        $this->assertStringContainsString('Welcome', $html);
        $this->assertStringContainsString('<strong>bold</strong>', $html);
        $this->assertStringContainsString('href="https://example.com"', $html);
        $this->assertStringContainsString('a link', $html);
    }

    public function test_a_line_break_inside_text_is_kept_and_the_text_stays_escaped(): void
    {
        $html = $this->render([
            [
                'type' => 'paragraph',
                'content' => [
                    ['type' => 'text', 'text' => "ABN: 86 650 733 529\nQBCC Licence: 15435925"],
                    ['type' => 'text', 'text' => "\n<b>not bold</b>", 'styles' => ['bold' => true]],
                ],
            ],
        ]);

        $this->assertStringContainsString('ABN: 86 650 733 529<br />', $html);
        $this->assertStringContainsString('QBCC Licence: 15435925', $html);
        $this->assertStringContainsString('<strong><br />', $html);
        $this->assertStringContainsString('&lt;b&gt;not bold&lt;/b&gt;', $html);
    }

    public function test_it_renders_a_font_family_style_and_ignores_unknown_ones(): void
    {
        $html = $this->render([
            [
                'type' => 'paragraph',
                'content' => [
                    ['type' => 'text', 'text' => 'Serif', 'styles' => ['fontFamily' => 'georgia']],
                    ['type' => 'text', 'text' => 'Made up', 'styles' => ['fontFamily' => 'comic-sans']],
                ],
            ],
        ]);

        // The sanitizer escapes the quotes inside the stack; a browser decodes
        // them again before it reads the CSS.
        $this->assertStringContainsString('font-family: Georgia, &#039;Iowan Old Style&#039;', $html);
        $this->assertStringContainsString('Serif', $html);
        $this->assertStringNotContainsString('comic-sans', $html);
        $this->assertStringContainsString('Made up', $html);
    }

    public function test_it_renders_a_self_hosted_web_font(): void
    {
        $html = $this->render([
            [
                'type' => 'paragraph',
                'content' => [['type' => 'text', 'text' => 'Modern', 'styles' => ['fontFamily' => 'poppins']]],
            ],
        ]);

        $this->assertStringContainsString('font-family: &#039;Poppins&#039;, sans-serif;', $html);
    }

    public function test_it_lists_only_the_fonts_a_document_names(): void
    {
        $fonts = BlockNoteRenderer::fontsUsedIn([
            [
                'type' => 'paragraph',
                'content' => [
                    ['type' => 'text', 'text' => 'One', 'styles' => ['fontFamily' => 'poppins']],
                    ['type' => 'text', 'text' => 'Again', 'styles' => ['fontFamily' => 'poppins']],
                    ['type' => 'text', 'text' => 'Plain', 'styles' => []],
                    ['type' => 'text', 'text' => 'Made up', 'styles' => ['fontFamily' => 'comic-sans']],
                ],
            ],
            [
                'type' => 'columnList',
                'children' => [
                    [
                        'type' => 'column',
                        'children' => [
                            [
                                'type' => 'heading',
                                'content' => [['type' => 'text', 'text' => 'Deep', 'styles' => ['fontFamily' => 'georgia']]],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertSame([BlockFont::Poppins, BlockFont::Georgia], $fonts);

        // A device font needs no stylesheet, so only Poppins has an alias.
        $this->assertSame(['poppins'], BlockFont::webFontAliases($fonts));
    }

    public function test_it_escapes_text_content(): void
    {
        $html = $this->render([
            [
                'type' => 'paragraph',
                'content' => [['type' => 'text', 'text' => '<script>alert(1)</script>']],
            ],
        ]);

        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('alert(1)', $html);
    }

    public function test_it_rejects_unsafe_link_and_media_urls(): void
    {
        $html = $this->render([
            [
                'type' => 'paragraph',
                'content' => [
                    ['type' => 'link', 'href' => 'javascript:alert(1)', 'content' => [['type' => 'text', 'text' => 'bad link']]],
                ],
            ],
            ['type' => 'image', 'props' => ['url' => 'javascript:alert(1)']],
        ]);

        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringContainsString('bad link', $html);
        $this->assertStringNotContainsString('<img', $html);
    }

    public function test_it_keeps_paths_on_this_site_and_mail_links_but_rejects_protocol_relative_urls(): void
    {
        $html = $this->render([
            ['type' => 'image', 'props' => ['url' => '/uploads/pool.jpg']],
            ['type' => 'image', 'props' => ['url' => '//evil.example/pool.jpg']],
            [
                'type' => 'paragraph',
                'content' => [
                    ['type' => 'link', 'href' => 'mailto:hello@example.com', 'content' => [['type' => 'text', 'text' => 'Email us']]],
                    ['type' => 'link', 'href' => '//evil.example', 'content' => [['type' => 'text', 'text' => 'Sneaky link']]],
                ],
            ],
        ]);

        $this->assertStringContainsString('<img src="/uploads/pool.jpg"', $html);
        $this->assertStringNotContainsString('evil.example', $html);
        $this->assertSame(1, substr_count($html, '<img'));
        // The sanitizer writes the @ as an HTML entity; a browser reads it back.
        $this->assertStringContainsString('href="mailto:hello&#64;example.com"', $html);
        $this->assertStringContainsString('Sneaky link', $html);
    }

    public function test_it_names_the_block_types_it_would_drop_even_when_nested(): void
    {
        $blocks = [
            ['type' => 'paragraph'],
            ['type' => 'somethingNew'],
            ['type' => 'columnList', 'children' => [
                ['type' => 'column', 'children' => [['type' => 'alienBlock'], ['type' => 'somethingNew']]],
            ]],
            'not a block',
        ];

        $this->assertSame(['somethingNew', 'alienBlock'], BlockNoteRenderer::unsupportedTypesIn($blocks));
        $this->assertSame([], BlockNoteRenderer::unsupportedTypesIn([['type' => 'card'], ['type' => 'spacer']]));
    }

    public function test_it_groups_consecutive_list_items(): void
    {
        $html = $this->render([
            ['type' => 'bulletListItem', 'content' => [['type' => 'text', 'text' => 'First']]],
            ['type' => 'bulletListItem', 'content' => [['type' => 'text', 'text' => 'Second']]],
            ['type' => 'numberedListItem', 'content' => [['type' => 'text', 'text' => 'Step one']]],
        ]);

        $this->assertSame(1, substr_count($html, '<ul'));
        $this->assertSame(1, substr_count($html, '<ol'));
        $this->assertStringContainsString('<li>First</li>', $html);
        $this->assertStringContainsString('<li>Step one</li>', $html);
    }

    public function test_editor_dividers_and_toggle_lists_keep_their_content(): void
    {
        $blocks = [
            ['type' => 'divider'],
            [
                'type' => 'toggleListItem',
                'props' => ['textAlignment' => 'center'],
                'content' => [['type' => 'text', 'text' => 'Excluded work', 'styles' => ['bold' => true]]],
                'children' => [[
                    'type' => 'toggleListItem',
                    'content' => [['type' => 'text', 'text' => 'Roof replacement']],
                    'children' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Quoted separately.']]]],
                ]],
            ],
        ];

        $html = $this->render($blocks);

        $this->assertStringContainsString('<hr', $html);
        $this->assertStringContainsString('<summary style="text-align: center;"><strong>Excluded work</strong></summary>', $html);
        $this->assertStringContainsString('<summary>Roof replacement</summary>', $html);
        $this->assertSame(2, substr_count($html, '<details class="bn-toggle">'));
        $this->assertStringContainsString('<p>Quoted separately.</p></div></details></div></details>', $html);
        $this->assertSame([], BlockNoteRenderer::unsupportedTypesIn($blocks));
    }

    public function test_toggle_heading_children_stay_inside_the_toggle_and_their_column(): void
    {
        $html = $this->render([[
            'type' => 'columnList',
            'children' => [[
                'type' => 'column',
                'children' => [[
                    'type' => 'heading',
                    'props' => ['level' => 2, 'isToggleable' => true],
                    'content' => [['type' => 'text', 'text' => 'Terms']],
                    'children' => [[
                        'type' => 'paragraph',
                        'props' => ['width' => 18],
                        'content' => [['type' => 'text', 'text' => 'A separate quote is required.']],
                    ]],
                ]],
            ]],
        ]]);

        $this->assertStringContainsString('<details class="bn-toggle"><summary><h2>Terms</h2></summary>', $html);
        $this->assertStringContainsString('<p>A separate quote is required.</p></div></details>', $html);
        $this->assertStringNotContainsString('bn-bleed', $html);
    }

    public function test_toggle_titles_and_bodies_are_sanitized(): void
    {
        $html = $this->render([[
            'type' => 'toggleListItem',
            'content' => [
                ['type' => 'text', 'text' => '<img src=x onerror=alert(1)>'],
                ['type' => 'link', 'href' => 'javascript:alert(1)', 'content' => [['type' => 'text', 'text' => 'Unsafe link']]],
            ],
            'children' => [[
                'type' => 'paragraph',
                'content' => [['type' => 'text', 'text' => '<script>alert(2)</script>']],
            ]],
        ]]);

        $this->assertStringContainsString('<details class="bn-toggle">', $html);
        $this->assertStringContainsString('&lt;img src&#61;x onerror&#61;alert(1)&gt;', $html);
        $this->assertStringContainsString('&lt;script&gt;alert(2)&lt;/script&gt;', $html);
        $this->assertStringContainsString('Unsafe link', $html);
        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringNotContainsString('<img', $html);
        $this->assertStringNotContainsString('<script', $html);
    }

    public function test_it_renders_images_with_captions(): void
    {
        $html = $this->render([
            [
                'type' => 'image',
                'props' => ['url' => 'https://example.com/photo.jpg', 'caption' => 'The pool', 'previewWidth' => 480],
            ],
        ]);

        $this->assertStringContainsString('<img src="https://example.com/photo.jpg"', $html);
        $this->assertStringContainsString('<figcaption>The pool</figcaption>', $html);
    }

    public function test_it_renders_youtube_videos_as_embeds_and_files_as_video_tags(): void
    {
        $html = $this->render([
            ['type' => 'video', 'props' => ['url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ']],
            ['type' => 'video', 'props' => ['url' => 'https://example.com/clip.mp4']],
        ]);

        $this->assertStringContainsString('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', $html);
        $this->assertStringContainsString('<iframe', $html);
        $this->assertStringContainsString('<video', $html);
        $this->assertStringContainsString('https://example.com/clip.mp4', $html);
    }

    public function test_video_embed_urls_are_converted_for_known_hosts_only(): void
    {
        $this->assertSame(
            'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
            BlockNoteRenderer::videoEmbedUrl('https://youtu.be/dQw4w9WgXcQ'),
        );
        $this->assertSame(
            'https://player.vimeo.com/video/123456',
            BlockNoteRenderer::videoEmbedUrl('https://vimeo.com/123456'),
        );
        $this->assertSame(
            'https://www.loom.com/embed/abc123def',
            BlockNoteRenderer::videoEmbedUrl('https://www.loom.com/share/abc123def'),
        );
        $this->assertNull(BlockNoteRenderer::videoEmbedUrl('https://evil.example.com/watch?v=x'));
        $this->assertNull(BlockNoteRenderer::videoEmbedUrl(null));
    }

    public function test_it_embeds_every_shape_of_vimeo_link(): void
    {
        foreach ([
            'https://vimeo.com/123456',
            'https://vimeo.com/video/123456',
            'https://player.vimeo.com/video/123456',
            'https://vimeo.com/manage/videos/123456',
            'https://vimeo.com/channels/staffpicks/123456',
            'https://vimeo.com/groups/name/videos/123456',
        ] as $url) {
            $this->assertSame('https://player.vimeo.com/video/123456', BlockNoteRenderer::videoEmbedUrl($url), $url);
        }

        // An unlisted video only plays when the privacy hash comes along.
        foreach ([
            'https://vimeo.com/123456/abc123def4',
            'https://player.vimeo.com/video/123456?h=abc123def4',
        ] as $url) {
            $this->assertSame('https://player.vimeo.com/video/123456?h=abc123def4', BlockNoteRenderer::videoEmbedUrl($url), $url);
        }

        $this->assertSame('https://vimeo.com/event/123456/embed', BlockNoteRenderer::videoEmbedUrl('https://vimeo.com/event/123456'));
        $this->assertNull(BlockNoteRenderer::videoEmbedUrl('https://vimeo.com/someuser/portfolio'));
    }

    public function test_it_embeds_youtube_and_loom_links_that_are_already_player_urls(): void
    {
        foreach ([
            'https://www.youtube.com/embed/dQw4w9WgXcQ',
            'https://www.youtube.com/live/dQw4w9WgXcQ',
            'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        ] as $url) {
            $this->assertSame('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', BlockNoteRenderer::videoEmbedUrl($url), $url);
        }

        $this->assertSame('https://www.loom.com/embed/abc123def', BlockNoteRenderer::videoEmbedUrl('https://www.loom.com/embed/abc123def'));
    }

    public function test_a_vimeo_block_renders_an_iframe_and_a_file_keeps_its_video_class(): void
    {
        $html = $this->render([
            ['type' => 'video', 'props' => ['url' => 'https://vimeo.com/123456/abc123def4']],
            ['type' => 'video', 'props' => ['url' => 'https://example.com/clip.mp4']],
        ]);

        $this->assertStringContainsString('<iframe', $html);
        $this->assertStringContainsString('player.vimeo.com/video/123456', $html);
        // The sanitizer must keep the class the stylesheet sizes the player with.
        $this->assertStringContainsString('<video class="bn-video"', $html);
    }

    public function test_it_renders_tables_in_both_cell_formats(): void
    {
        $html = $this->render([
            [
                'type' => 'table',
                'content' => [
                    'type' => 'tableContent',
                    'rows' => [
                        ['cells' => [[['type' => 'text', 'text' => 'Plain cell']]]],
                        ['cells' => [[
                            'type' => 'tableCell',
                            'content' => [['type' => 'text', 'text' => 'Wrapped cell']],
                            'props' => ['colspan' => 2],
                        ]]],
                    ],
                ],
            ],
        ]);

        $this->assertStringContainsString('<table>', $html);
        $this->assertStringContainsString('Plain cell', $html);
        $this->assertStringContainsString('Wrapped cell', $html);
        $this->assertStringContainsString('colspan="2"', $html);
    }

    public function test_it_renders_column_lists_as_flex_columns(): void
    {
        $html = $this->render([
            [
                'type' => 'columnList',
                'children' => [
                    [
                        'type' => 'column',
                        'props' => ['width' => 1],
                        'children' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Left side']]]],
                    ],
                    [
                        'type' => 'column',
                        'props' => ['width' => 2],
                        'children' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Right side']]]],
                    ],
                ],
            ],
        ]);

        $this->assertStringContainsString('bn-columns', $html);
        $this->assertSame(2, substr_count($html, 'bn-column"') + substr_count($html, "bn-column'"));
        $this->assertStringContainsString('flex-grow: 2', $html);
        $this->assertStringContainsString('Left side', $html);
        $this->assertStringContainsString('Right side', $html);
    }

    public function test_it_narrows_a_block_that_carries_a_width_prop(): void
    {
        $html = $this->render([
            [
                'type' => 'paragraph',
                'props' => ['width' => 6],
                'content' => [['type' => 'text', 'text' => 'Half a row']],
            ],
        ]);

        $this->assertStringContainsString('class="bn-width" style="width: 50%;"', $html);
        $this->assertStringContainsString('Half a row', $html);
    }

    public function test_it_offsets_a_narrowed_block_to_match_its_alignment(): void
    {
        $centered = $this->render([
            [
                'type' => 'heading',
                'props' => ['level' => 2, 'width' => 3, 'textAlignment' => 'center'],
                'content' => [['type' => 'text', 'text' => 'Centered']],
            ],
        ]);

        $this->assertStringContainsString('width: 25%; margin-left: auto; margin-right: auto;', $centered);

        $right = $this->render([
            [
                'type' => 'paragraph',
                'props' => ['width' => 4, 'textAlignment' => 'right'],
                'content' => [['type' => 'text', 'text' => 'Right']],
            ],
        ]);

        $this->assertStringContainsString('margin-left: auto;"', $right);
        $this->assertStringNotContainsString('margin-right: auto', $right);
    }

    public function test_it_stretches_a_block_past_the_block_padding(): void
    {
        $html = $this->render([
            [
                'type' => 'paragraph',
                'props' => ['width' => 15],
                'content' => [['type' => 'text', 'text' => 'Wider than the text column']],
            ],
        ]);

        // 15 is three steps above the 12-column text column.
        $this->assertStringContainsString('class="bn-width bn-bleed-3"', $html);
        $this->assertStringNotContainsString('style=', $html);
        $this->assertStringContainsString('Wider than the text column', $html);
    }

    public function test_it_caps_the_stretch_at_the_block_edge(): void
    {
        foreach ([18, 25, 400] as $width) {
            $html = $this->render([
                [
                    'type' => 'paragraph',
                    'props' => ['width' => $width],
                    'content' => [['type' => 'text', 'text' => 'Edge to edge']],
                ],
            ]);

            $this->assertStringContainsString('bn-bleed-'.BlockNoteRenderer::BLEED_STEPS.'"', $html);
        }
    }

    public function test_it_resizes_a_whole_column_layout(): void
    {
        $layout = fn (int $width): array => [
            [
                'type' => 'columnList',
                'props' => ['width' => $width],
                'children' => [
                    [
                        'type' => 'column',
                        'props' => ['width' => 1],
                        'children' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Left']]]],
                    ],
                    [
                        'type' => 'column',
                        'props' => ['width' => 1],
                        'children' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Right']]]],
                    ],
                ],
            ],
        ];

        $narrow = $this->render($layout(6));
        $this->assertStringContainsString('class="bn-width" style="width: 50%;"', $narrow);
        $this->assertStringContainsString('bn-columns', $narrow);

        $stretched = $this->render($layout(18));
        $this->assertStringContainsString('class="bn-width bn-bleed-6"', $stretched);
        $this->assertStringContainsString('bn-columns', $stretched);

        // A column layout left alone still renders with no wrapper.
        $this->assertStringNotContainsString('bn-width', $this->render($layout(12)));
    }

    public function test_it_does_not_stretch_an_item_that_sits_inside_a_column(): void
    {
        $html = $this->render([
            [
                'type' => 'columnList',
                'children' => [
                    [
                        'type' => 'column',
                        'props' => ['width' => 1],
                        'children' => [
                            [
                                'type' => 'paragraph',
                                'props' => ['width' => 18],
                                'content' => [['type' => 'text', 'text' => 'In a column']],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertStringNotContainsString('bn-bleed', $html);
        $this->assertStringContainsString('In a column', $html);
    }

    public function test_it_leaves_full_width_and_invalid_widths_alone(): void
    {
        foreach ([null, 12, 0, -3] as $width) {
            $html = $this->render([
                [
                    'type' => 'paragraph',
                    'props' => $width === null ? [] : ['width' => $width],
                    'content' => [['type' => 'text', 'text' => 'Full row']],
                ],
            ]);

            $this->assertStringNotContainsString('bn-width', $html);
            $this->assertStringContainsString('Full row', $html);
        }
    }

    public function test_it_renders_spacer_blocks_with_their_size(): void
    {
        $html = $this->render([
            ['type' => 'spacer', 'props' => ['size' => 'xl']],
            ['type' => 'spacer'],
        ]);

        $this->assertStringContainsString('height: 8rem', $html);
        $this->assertStringContainsString('height: 2.5rem', $html);
        $this->assertSame(2, substr_count($html, 'bn-spacer'));
    }

    public function test_it_adds_per_item_spacing_above_and_below(): void
    {
        $html = $this->render([
            [
                'type' => 'paragraph',
                'props' => ['spaceTop' => 'lg', 'spaceBottom' => 'sm'],
                'content' => [['type' => 'text', 'text' => 'Spaced']],
            ],
        ]);

        $this->assertStringContainsString(
            '<div class="bn-item-space" style="padding-top: 3.5rem; padding-bottom: 1rem;">',
            $html,
        );
        $this->assertStringContainsString('Spaced', $html);
    }

    public function test_it_writes_only_the_side_that_was_set(): void
    {
        $top = $this->render([
            [
                'type' => 'paragraph',
                'props' => ['spaceTop' => 'xl'],
                'content' => [['type' => 'text', 'text' => 'Top only']],
            ],
        ]);

        $this->assertStringContainsString('style="padding-top: 6rem;"', $top);
        $this->assertStringNotContainsString('padding-bottom', $top);

        $bottom = $this->render([
            [
                'type' => 'paragraph',
                'props' => ['spaceBottom' => 'md'],
                'content' => [['type' => 'text', 'text' => 'Bottom only']],
            ],
        ]);

        $this->assertStringContainsString('style="padding-bottom: 2rem;"', $bottom);
        $this->assertStringNotContainsString('padding-top', $bottom);
    }

    public function test_it_leaves_items_without_spacing_untouched(): void
    {
        foreach ([[], ['spaceTop' => 'none', 'spaceBottom' => 'none'], ['spaceTop' => 'nonsense']] as $props) {
            $html = $this->render([
                [
                    'type' => 'paragraph',
                    'props' => $props,
                    'content' => [['type' => 'text', 'text' => 'Plain']],
                ],
            ]);

            $this->assertStringNotContainsString('bn-item-space', $html);
        }
    }

    public function test_spacing_wraps_a_narrowed_item_and_a_column_layout(): void
    {
        $narrow = $this->render([
            [
                'type' => 'paragraph',
                'props' => ['width' => 6, 'spaceTop' => 'md'],
                'content' => [['type' => 'text', 'text' => 'Half width']],
            ],
        ]);

        // The spacing wrapper must sit outside the width wrapper, or the
        // padding would eat into the width the user chose.
        $this->assertStringContainsString(
            '<div class="bn-item-space" style="padding-top: 2rem;"><div class="bn-width"',
            $narrow,
        );

        $layout = $this->render([
            [
                'type' => 'columnList',
                'props' => ['spaceBottom' => 'lg'],
                'children' => [
                    [
                        'type' => 'column',
                        'props' => ['width' => 1],
                        'children' => [
                            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'In a column']]],
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertStringContainsString(
            '<div class="bn-item-space" style="padding-bottom: 3.5rem;"><div class="bn-columns">',
            $layout,
        );
    }

    public function test_spacing_works_on_an_item_inside_a_column(): void
    {
        $html = $this->render([
            [
                'type' => 'columnList',
                'children' => [
                    [
                        'type' => 'column',
                        'props' => ['width' => 1],
                        'children' => [
                            [
                                'type' => 'paragraph',
                                'props' => ['spaceTop' => 'sm'],
                                'content' => [['type' => 'text', 'text' => 'Nudged down']],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertStringContainsString('<div class="bn-item-space" style="padding-top: 1rem;">', $html);
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array<string, mixed>
     */
    private function card(array $props = []): array
    {
        return [
            'type' => 'card',
            'props' => $props,
            'content' => [['type' => 'text', 'text' => 'Platinum Tile Range']],
            'children' => [
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Porcelain and travertine.']]],
            ],
        ];
    }

    public function test_a_card_folds_its_body_away_under_a_banner_and_a_show_button(): void
    {
        $html = $this->render([$this->card(['url' => '/storage/media/3/tiles.png'])]);

        $this->assertStringContainsString('<details class="bn-card">', $html);
        $this->assertStringContainsString('<summary class="bn-card-head bn-card-has-image">', $html);
        $this->assertStringContainsString('<img class="bn-card-image" src="/storage/media/3/tiles.png" alt />', $html);
        $this->assertStringContainsString('<span class="bn-card-title">Platinum Tile Range</span>', $html);
        $this->assertStringContainsString('Show', $html);
        $this->assertStringContainsString('Hide', $html);

        // The body lives inside the card, never as an indent after it.
        $this->assertMatchesRegularExpression(
            '~<div class="bn-card-body"><p>Porcelain and travertine\.</p></div>\s*</details>~',
            $html,
        );
        $this->assertStringNotContainsString('bn-indent', $html);
    }

    public function test_a_card_can_start_open(): void
    {
        $this->assertStringContainsString('<details class="bn-card" open>', $this->render([$this->card(['open' => true])]));
        $this->assertStringContainsString('<details class="bn-card">', $this->render([$this->card(['open' => false])]));
    }

    public function test_a_card_without_a_picture_is_a_plain_row(): void
    {
        $html = $this->render([$this->card()]);

        $this->assertStringContainsString('<summary class="bn-card-head">', $html);
        $this->assertStringNotContainsString('<img', $html);
    }

    public function test_a_card_drops_an_unsafe_picture_address(): void
    {
        $html = $this->render([$this->card(['url' => 'javascript:alert(1)'])]);

        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringNotContainsString('<img', $html);
    }

    public function test_the_card_button_colour_keeps_its_text_readable(): void
    {
        $this->assertStringContainsString(
            'style="background-color: #f6c343; color: #111827;"',
            $this->render([$this->card()]),
        );
        $this->assertStringContainsString(
            'style="background-color: #153b59; color: #ffffff;"',
            $this->render([$this->card(['buttonColor' => '#153B59'])]),
        );
        $this->assertStringContainsString(
            'style="background-color: #f6c343; color: #111827;"',
            $this->render([$this->card(['buttonColor' => 'red; background: url(x)'])]),
        );
    }

    public function test_unknown_block_types_are_skipped(): void
    {
        $html = $this->render([
            ['type' => 'somethingNew', 'content' => [['type' => 'text', 'text' => 'Hidden']]],
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Visible']]],
        ]);

        $this->assertStringNotContainsString('Hidden', $html);
        $this->assertStringContainsString('Visible', $html);
    }
}
