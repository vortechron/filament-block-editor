<?php

namespace Vortechron\FilamentBlockEditor\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Vortechron\FilamentBlockEditor\Models\MediaAsset;

/**
 * @extends Factory<MediaAsset>
 */
class MediaAssetFactory extends Factory
{
    protected $model = MediaAsset::class;

    public function definition(): array
    {
        return [
            'name' => fake()->word().'.jpg',
            'disk' => 'public',
            'path' => 'block-editor/shared/'.fake()->uuid().'.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
        ];
    }

    public function video(): static
    {
        return $this->state([
            'name' => fake()->word().'.mp4',
            'path' => 'block-editor/shared/'.fake()->uuid().'.mp4',
            'mime_type' => 'video/mp4',
        ]);
    }

    public function pdf(): static
    {
        return $this->state([
            'name' => fake()->word().'.pdf',
            'path' => 'block-editor/shared/'.fake()->uuid().'.pdf',
            'mime_type' => 'application/pdf',
        ]);
    }
}
