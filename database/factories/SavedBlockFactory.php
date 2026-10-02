<?php

namespace Vortechron\FilamentBlockEditor\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;

/**
 * @extends Factory<SavedBlock>
 */
class SavedBlockFactory extends Factory
{
    protected $model = SavedBlock::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
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

    public function archived(): static
    {
        return $this->state(['archived_at' => now()]);
    }
}
