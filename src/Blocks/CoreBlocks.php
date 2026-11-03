<?php

namespace Vortechron\FilamentBlockEditor\Blocks;

use Vortechron\FilamentBlockEditor\Support\Icons;

/**
 * The ready-made blocks every site gets, registered as own blocks, so the
 * builder needs no new code: a FAQ, a map, an icon list, pricing and
 * testimonials. Drawn by the `filament-block-editor::core.*` views and
 * styled by resources/css/page/core.css with the kit's variables.
 *
 * The service provider registers them unless
 * `config('filament-block-editor.core_blocks')` is false. Labels and the
 * words a new block starts with are in the app's language at that time.
 */
final class CoreBlocks
{
    public const KINDS = ['fbe-faq', 'fbe-map', 'fbe-icon-list', 'fbe-pricing', 'fbe-testimonials'];

    public static function register(BlockRegistry $registry): void
    {
        foreach ([self::faq(), self::map(), self::iconList(), self::pricing(), self::testimonials()] as $block) {
            $registry->register($block);
        }
    }

    private static function faq(): OwnBlock
    {
        return OwnBlock::make('fbe-faq')
            ->label(self::t('faq.label'))
            ->icon('circle-help')
            ->description(self::t('faq.description'))
            ->fields([
                Field::text('heading')->label(self::t('faq.heading'))->default(self::t('faq.default_heading')),
                Field::list('items')->label(self::t('faq.items'))->maxItems(20)->fields([
                    Field::text('question')->label(self::t('faq.question')),
                    Field::textarea('answer')->label(self::t('faq.answer')),
                ])->default([
                    ['question' => self::t('faq.default_question_1'), 'answer' => self::t('faq.default_answer_1')],
                    ['question' => self::t('faq.default_question_2'), 'answer' => self::t('faq.default_answer_2')],
                ]),
                Field::toggle('open_first')->label(self::t('faq.open_first'))->default(true),
            ])
            ->view('filament-block-editor::core.faq');
    }

    private static function map(): OwnBlock
    {
        return OwnBlock::make('fbe-map')
            ->label(self::t('map.label'))
            ->icon('map-pin')
            ->description(self::t('map.description'))
            ->fields([
                Field::text('address')->label(self::t('map.address')),
                Field::link('embed_url')->label(self::t('map.embed_url')),
                Field::select('height')->label(self::t('map.height'))->options([
                    'sm' => self::t('map.small'), 'md' => self::t('map.medium'), 'lg' => self::t('map.large'),
                ])->default('md'),
            ])
            ->usesSiteInfo('contact')
            ->showsValues('site.address')
            ->view('filament-block-editor::core.map');
    }

    private static function iconList(): OwnBlock
    {
        $item = fn (string $icon, int $number): array => ['icon' => $icon, 'title' => self::t("icon_list.default_title_{$number}"), 'text' => self::t("icon_list.default_text_{$number}")];

        return OwnBlock::make('fbe-icon-list')
            ->label(self::t('icon_list.label'))
            ->icon('list-checks')
            ->description(self::t('icon_list.description'))
            ->fields([
                Field::list('items')->label(self::t('icon_list.items'))->maxItems(12)->fields([
                    Field::select('icon')->label(self::t('icon_list.icon'))->options(Icons::names())->default('check'),
                    Field::text('title')->label(self::t('icon_list.title')),
                    Field::textarea('text')->label(self::t('icon_list.text')),
                ])->default([$item('zap', 1), $item('shield-check', 2), $item('message-circle', 3)]),
                Field::select('columns')->label(self::t('icon_list.columns'))->options(['1', '2', '3', '4'])->default('3'),
                Field::select('style')->label(self::t('icon_list.style'))->options(['plain' => self::t('icon_list.plain'), 'boxed' => self::t('icon_list.boxed')])->default('plain'),
            ])
            ->view('filament-block-editor::core.icon-list');
    }

    private static function pricing(): OwnBlock
    {
        $plan = fn (int $number, bool $highlight): array => [
            'name' => self::t("pricing.default_name_{$number}"),
            'price' => self::t("pricing.default_price_{$number}"),
            'period' => self::t('pricing.default_period'),
            'features' => self::t("pricing.default_features_{$number}"),
            'button_text' => self::t('pricing.default_button'),
            'highlight' => $highlight,
        ];

        return OwnBlock::make('fbe-pricing')
            ->label(self::t('pricing.label'))
            ->icon('tag')
            ->description(self::t('pricing.description'))
            ->fields([
                Field::list('plans')->label(self::t('pricing.plans'))->maxItems(6)->fields([
                    Field::text('name')->label(self::t('pricing.name')),
                    Field::text('price')->label(self::t('pricing.price')),
                    Field::text('period')->label(self::t('pricing.period')),
                    Field::textarea('features')->label(self::t('pricing.features')),
                    Field::text('button_text')->label(self::t('pricing.button_text')),
                    Field::link('button_link')->label(self::t('pricing.button_link')),
                    Field::toggle('highlight')->label(self::t('pricing.highlight')),
                ])->default([$plan(1, false), $plan(2, true)]),
                Field::textarea('note')->label(self::t('pricing.note')),
            ])
            ->view('filament-block-editor::core.pricing');
    }

    private static function testimonials(): OwnBlock
    {
        $item = fn (int $number): array => ['quote' => self::t("testimonials.default_quote_{$number}"), 'name' => self::t("testimonials.default_name_{$number}"), 'role' => self::t('testimonials.default_role'), 'rating' => '5'];

        return OwnBlock::make('fbe-testimonials')
            ->label(self::t('testimonials.label'))
            ->icon('message-circle')
            ->description(self::t('testimonials.description'))
            ->fields([
                Field::list('items')->label(self::t('testimonials.items'))->maxItems(12)->fields([
                    Field::textarea('quote')->label(self::t('testimonials.quote')),
                    Field::text('name')->label(self::t('testimonials.name')),
                    Field::text('role')->label(self::t('testimonials.role')),
                    Field::image('photo')->label(self::t('testimonials.photo')),
                    Field::select('rating')->label(self::t('testimonials.rating'))->options(['0', '1', '2', '3', '4', '5'])->default('5'),
                ])->default([$item(1), $item(2)]),
            ])
            ->view('filament-block-editor::core.testimonials');
    }

    private static function t(string $key): string
    {
        return (string) __('filament-block-editor::core.'.$key);
    }
}
