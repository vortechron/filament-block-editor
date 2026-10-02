<?php

namespace Vortechron\FilamentBlockEditor\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;

/**
 * Give every block a page: ContentBlock::factory()->for($page, 'blockable').
 *
 * @extends Factory<ContentBlock>
 */
class ContentBlockFactory extends Factory
{
    protected $model = ContentBlock::class;

    public function definition(): array
    {
        return [
            'collection' => ContentBlock::DEFAULT_COLLECTION,
            'kind' => ContentBlock::KIND_CONTENT,
            'sort_order' => fake()->numberBetween(0, 10),
            'content' => [
                [
                    'type' => 'heading',
                    'props' => ['level' => 1],
                    'content' => [['type' => 'text', 'text' => fake()->words(3, true)]],
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => fake()->sentences(2, true)]],
                ],
            ],
        ];
    }

    public function section(string $kind): static
    {
        return $this->state(['kind' => $kind, 'content' => null]);
    }

    public function fullHeight(): static
    {
        return $this->state(['full_height' => true, 'padding_size' => 'xl']);
    }
}
