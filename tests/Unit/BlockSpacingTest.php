<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Vortechron\FilamentBlockEditor\Enums\BlockSpacing;

class BlockSpacingTest extends TestCase
{
    private const ROOT_FONT_PX = 16;

    /**
     * What a fluidCss() value measures, in pixels, on a screen this wide.
     */
    private function pixelsAt(BlockSpacing $spacing, int $screenWidth): float
    {
        $css = $spacing->fluidCss();

        if (preg_match('/^clamp\(([\d.]+)rem, ([\d.]+)vw, ([\d.]+)rem\)$/', $css, $match) === 1) {
            $floor = (float) $match[1] * self::ROOT_FONT_PX;
            $fluid = (float) $match[2] * $screenWidth / 100;
            $cap = (float) $match[3] * self::ROOT_FONT_PX;

            return min(max($floor, $fluid), $cap);
        }

        return $css === '0' ? 0.0 : (float) rtrim($css, 'rem') * self::ROOT_FONT_PX;
    }

    public function test_none_and_small_are_the_same_on_every_screen(): void
    {
        $this->assertSame('0', BlockSpacing::None->fluidCss());
        $this->assertSame('1rem', BlockSpacing::Small->fluidCss());
    }

    public function test_bigger_sizes_shrink_on_a_small_screen_but_never_grow_past_the_desktop_size(): void
    {
        foreach ([BlockSpacing::Medium, BlockSpacing::Large, BlockSpacing::ExtraLarge] as $spacing) {
            $this->assertMatchesRegularExpression('/^clamp\([\d.]+rem, [\d.]+vw, [\d.]+rem\)$/', $spacing->fluidCss());
            $this->assertStringEndsWith(", {$spacing->css()})", $spacing->fluidCss());
            $this->assertSame((float) rtrim($spacing->css(), 'rem') * self::ROOT_FONT_PX, $this->pixelsAt($spacing, 1600));
        }
    }

    public function test_extra_large_leaves_room_for_the_text_on_a_phone(): void
    {
        // A 390px phone used to lose 96px on each side, leaving 198px for text.
        $this->assertLessThanOrEqual(32, $this->pixelsAt(BlockSpacing::ExtraLarge, 390));
        $this->assertLessThan(96, $this->pixelsAt(BlockSpacing::ExtraLarge, 834));
    }

    public function test_a_bigger_size_is_never_smaller_than_the_one_below_it(): void
    {
        $ordered = BlockSpacing::cases();

        foreach (range(320, 1600, 10) as $screenWidth) {
            foreach (array_slice($ordered, 1) as $index => $spacing) {
                $this->assertGreaterThanOrEqual(
                    $this->pixelsAt($ordered[$index], $screenWidth),
                    $this->pixelsAt($spacing, $screenWidth),
                    "{$spacing->name} at {$screenWidth}px",
                );
            }
        }
    }
}
