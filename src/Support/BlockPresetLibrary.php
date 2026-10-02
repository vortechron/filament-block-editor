<?php

namespace Vortechron\FilamentBlockEditor\Support;

/**
 * Ready-made block designs the user can drop straight into a page, the way a
 * website builder offers hero, feature and call-to-action sections. Each
 * preset returns a full set of block attributes: the BlockNote document plus
 * the appearance settings that make the section look right.
 *
 * Add your own from a service provider:
 *
 *     BlockPresetLibrary::register('pricing', 'Pricing table', 'Content sections', [
 *         'content' => [BlockPresetLibrary::heading(2, 'Pricing')],
 *         'padding_size' => 'lg',
 *     ]);
 */
class BlockPresetLibrary
{
    /**
     * Presets added by the app, keyed by preset key.
     *
     * @var array<string, array{label: string, category: string, attributes: array<string, mixed>}>
     */
    private static array $registered = [];

    /**
     * Add a ready-made design, or replace a built-in one with the same key.
     *
     * @param  array<string, mixed>  $attributes  `content` plus any appearance column
     */
    public static function register(string $key, string $label, string $category, array $attributes): void
    {
        static::$registered[$key] = ['label' => $label, 'category' => $category, 'attributes' => $attributes];
    }

    /**
     * Drop every design added with register(). For tests.
     */
    public static function flushRegistered(): void
    {
        static::$registered = [];
    }

    /**
     * Grouped options for a Filament Select.
     *
     * @return array<string, array<string, string>>
     */
    public static function options(): array
    {
        $options = [
            'Opening sections' => [
                'hero' => 'Full-screen hero',
                'hero_split' => 'Split hero (text + space for an image)',
                'cover' => 'Cover & welcome',
            ],
            'Content sections' => [
                'about' => 'About us',
                'features' => 'Three features',
                'stats' => 'Key numbers',
                'process' => 'How it works',
                'testimonial' => 'Customer quote',
            ],
            'Closing sections' => [
                'cta' => 'Call to action',
                'terms' => 'Terms & conditions',
                'next_steps' => 'Thank you & next steps',
            ],
        ];

        foreach (static::$registered as $key => $preset) {
            foreach ($options as $category => $presets) {
                unset($options[$category][$key]);
            }

            $options[$preset['category']][$key] = $preset['label'];
        }

        return array_filter($options);
    }

    public static function exists(string $preset): bool
    {
        return array_key_exists($preset, static::all());
    }

    /**
     * Block attributes for one preset, or an empty blank block when the key
     * is unknown.
     *
     * @return array<string, mixed>
     */
    public static function attributes(string $preset): array
    {
        return static::all()[$preset] ?? ['content' => []];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private static function all(): array
    {
        return [
            ...static::builtIn(),
            ...array_map(fn (array $preset): array => $preset['attributes'], static::$registered),
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private static function builtIn(): array
    {
        return [
            'hero' => [
                'content' => [
                    static::heading(1, 'A headline that says what you do', 'center'),
                    static::paragraph('One or two sentences about the result your visitor gets. Keep it short and clear.', 'center'),
                    static::spacer('md'),
                    static::paragraph('Scroll down to begin', 'center'),
                ],
                'full_height' => true,
                'padding_size' => 'xl',
                'content_width' => 'wide',
                'spacing_top' => 'none',
                'spacing_bottom' => 'none',
            ],

            'hero_split' => [
                'content' => [
                    static::columns([
                        [
                            static::heading(1, 'Built around what your customers need'),
                            static::paragraph('A short line about the outcome your visitor gets. Keep it to one or two sentences.'),
                        ],
                        [
                            static::paragraph('Drop an image or a video here using the "/" menu.'),
                        ],
                    ]),
                ],
                'padding_size' => 'xl',
                'content_width' => 'wide',
                'spacing_top' => 'none',
                'spacing_bottom' => 'lg',
            ],

            'cover' => [
                'content' => [
                    static::heading(1, 'Welcome', 'center'),
                    static::paragraph('Thank you for visiting. Here is a short introduction to who we are and what you will find on this page.', 'center'),
                ],
                'padding_size' => 'lg',
            ],

            'about' => [
                'content' => [
                    static::columns([
                        [static::heading(2, 'About us')],
                        [static::paragraph('Tell your visitor who you are, how long you have been in business and why they can trust you with their project.')],
                    ], [1, 2]),
                ],
                'padding_size' => 'lg',
            ],

            'features' => [
                'content' => [
                    static::heading(2, 'What you get', 'center'),
                    static::spacer('sm'),
                    static::columns([
                        [
                            static::heading(3, 'Fast turnaround'),
                            static::paragraph('Explain the first thing that makes your offer worth choosing.'),
                        ],
                        [
                            static::heading(3, 'Fixed pricing'),
                            static::paragraph('Explain the second thing. Keep every column about the same length.'),
                        ],
                        [
                            static::heading(3, 'Full warranty'),
                            static::paragraph('Explain the third thing, and what happens after the work is done.'),
                        ],
                    ]),
                ],
                'padding_size' => 'lg',
                'content_width' => 'wide',
            ],

            'stats' => [
                'content' => [
                    static::columns([
                        [
                            static::heading(1, '15+', 'center'),
                            static::paragraph('Years in business', 'center'),
                        ],
                        [
                            static::heading(1, '480', 'center'),
                            static::paragraph('Projects delivered', 'center'),
                        ],
                        [
                            static::heading(1, '4.9', 'center'),
                            static::paragraph('Average customer rating', 'center'),
                        ],
                    ]),
                ],
                'padding_size' => 'lg',
                'content_width' => 'wide',
            ],

            'process' => [
                'content' => [
                    static::heading(2, 'How it works'),
                    ...static::numbered([
                        'You tell us what you need.',
                        'We plan the work and agree on a date with you.',
                        'We deliver and walk you through the result.',
                    ]),
                ],
                'padding_size' => 'lg',
            ],

            'testimonial' => [
                'content' => [
                    static::quote('They kept us informed the whole way through and finished ahead of schedule. We would use them again without hesitating.'),
                    static::paragraph('— Add the customer name and company here', 'center'),
                ],
                'padding_size' => 'lg',
                'content_width' => 'narrow',
            ],

            'cta' => [
                'content' => [
                    static::heading(2, 'Ready to get started?', 'center'),
                    static::paragraph('Get in touch today and we will reply within one business day.', 'center'),
                ],
                'padding_size' => 'lg',
                'content_width' => 'narrow',
            ],

            'terms' => [
                'content' => [
                    static::heading(2, 'Terms & conditions'),
                    ...static::bullets([
                        'Prices are valid for 30 days.',
                        'A deposit is required before work starts.',
                        'Any change to the scope is quoted separately.',
                    ]),
                ],
            ],

            'next_steps' => [
                'content' => [
                    static::heading(2, 'What happens next?'),
                    ...static::bullets([
                        'Send us a message with what you need.',
                        'We reply with a plan and a price.',
                        'We schedule the work at a time that suits you.',
                    ]),
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function heading(int $level, string $text, ?string $alignment = null): array
    {
        return [
            'type' => 'heading',
            'props' => array_filter([
                'level' => $level,
                'textAlignment' => $alignment,
            ], fn (mixed $value): bool => $value !== null),
            'content' => [['type' => 'text', 'text' => $text, 'styles' => []]],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function paragraph(string $text, ?string $alignment = null): array
    {
        return [
            'type' => 'paragraph',
            'props' => $alignment === null ? [] : ['textAlignment' => $alignment],
            'content' => [['type' => 'text', 'text' => $text, 'styles' => []]],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function quote(string $text): array
    {
        return [
            'type' => 'quote',
            'props' => ['textAlignment' => 'center'],
            'content' => [['type' => 'text', 'text' => $text, 'styles' => []]],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function spacer(string $size): array
    {
        return [
            'type' => 'spacer',
            'props' => ['size' => $size],
        ];
    }

    /**
     * @param  array<int, string>  $lines
     * @return array<int, array<string, mixed>>
     */
    private static function bullets(array $lines): array
    {
        return static::listItems('bulletListItem', $lines);
    }

    /**
     * @param  array<int, string>  $lines
     * @return array<int, array<string, mixed>>
     */
    private static function numbered(array $lines): array
    {
        return static::listItems('numberedListItem', $lines);
    }

    /**
     * @param  array<int, string>  $lines
     * @return array<int, array<string, mixed>>
     */
    private static function listItems(string $type, array $lines): array
    {
        return array_map(
            fn (string $line): array => [
                'type' => $type,
                'props' => [],
                'content' => [['type' => 'text', 'text' => $line, 'styles' => []]],
            ],
            $lines,
        );
    }

    /**
     * A multi-column row. Each entry in $columns is that column's blocks;
     * $widths are relative flex weights, defaulting to equal columns.
     *
     * @param  array<int, array<int, array<string, mixed>>>  $columns
     * @param  array<int, int|float>  $widths
     * @return array<string, mixed>
     */
    private static function columns(array $columns, array $widths = []): array
    {
        return [
            'type' => 'columnList',
            'props' => [],
            'children' => array_map(
                fn (array $blocks, int $index): array => [
                    'type' => 'column',
                    'props' => ['width' => $widths[$index] ?? 1],
                    'children' => $blocks,
                ],
                $columns,
                array_keys($columns),
            ),
        ];
    }
}
