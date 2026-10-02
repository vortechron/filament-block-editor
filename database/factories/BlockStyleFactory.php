<?php

namespace Vortechron\FilamentBlockEditor\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;

/**
 * @extends Factory<BlockStyle>
 */
class BlockStyleFactory extends Factory
{
    protected $model = BlockStyle::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
        ];
    }

    public function isDefault(): static
    {
        return $this->state(['is_default' => true]);
    }

    public function darkHero(): static
    {
        return $this->state([
            'background_type' => 'color',
            'background_color' => '#1e1b4b',
            'padding_size' => 'xl',
            'full_height' => true,
        ]);
    }

    public function archived(): static
    {
        return $this->state(['archived_at' => now()]);
    }
}
