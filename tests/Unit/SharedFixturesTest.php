<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use Vortechron\FilamentBlockEditor\Forms\FormDefinition;
use Vortechron\FilamentBlockEditor\Styling\Advanced;
use Vortechron\FilamentBlockEditor\Styling\CustomCss;
use Vortechron\FilamentBlockEditor\Styling\StyleBag;
use Vortechron\FilamentBlockEditor\Support\Urls;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

/**
 * The cases in tests/fixtures/shared, which builder/tests/shared-fixtures.test.ts
 * runs too: the builder and the server must clean each input to the same
 * output, for the rules a table of limits can not hold.
 */
class SharedFixturesTest extends TestCase
{
    private const DIRECTORY = __DIR__.'/../fixtures/shared';

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    public static function styleValues(): array
    {
        return self::cases('style-values.json');
    }

    /**
     * @param  array<string, mixed>  $case
     */
    #[DataProvider('styleValues')]
    public function test_a_style_value_cleans_the_same_on_both_sides(array $case): void
    {
        $clean = StyleBag::clean(['desktop' => [$case['key'] => $case['input']]]);

        $this->assertSame($case['output'], $clean['desktop'][$case['key']] ?? null);
    }

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    public static function classNames(): array
    {
        return self::cases('class-names.json');
    }

    /**
     * @param  array<string, mixed>  $case
     */
    #[DataProvider('classNames')]
    public function test_class_names_clean_the_same_on_both_sides(array $case): void
    {
        $this->assertSame($case['output'], Advanced::clean(['class' => $case['input']])['class'] ?? null);
    }

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    public static function customCss(): array
    {
        return self::cases('custom-css.json');
    }

    /**
     * @param  array<string, mixed>  $case
     */
    #[DataProvider('customCss')]
    public function test_custom_css_cleans_the_same_on_both_sides(array $case): void
    {
        $this->assertSame($case['output'], CustomCss::clean($case['input']));
    }

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    public static function links(): array
    {
        return self::cases('links.json');
    }

    /**
     * @param  array<string, mixed>  $case
     */
    #[DataProvider('links')]
    public function test_a_link_or_a_dynamic_value_cleans_the_same_on_both_sides(array $case): void
    {
        $this->assertSame($case['output'], Urls::linkOrReference($case['input']));
    }

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    public static function forms(): array
    {
        return self::cases('forms.json');
    }

    /**
     * @param  array<string, mixed>  $case
     */
    #[DataProvider('forms')]
    public function test_a_form_cleans_the_same_on_both_sides(array $case): void
    {
        $form = FormDefinition::normalize($case['input']);

        $this->assertHolds($case['output'], $form);

        if ($case['unique_field_ids'] ?? false) {
            $ids = array_column($form['fields'], 'id');
            $this->assertSame(array_values(array_unique($ids)), $ids);
            $this->assertNotContains('', $ids);
        }
    }

    /**
     * Every key of `$expected` is in `$actual` with the same value; lists
     * have the same length. Like Vitest's toMatchObject().
     */
    private function assertHolds(mixed $expected, mixed $actual, string $path = 'form'): void
    {
        if (! is_array($expected)) {
            $this->assertSame($expected, $actual, $path);

            return;
        }

        $this->assertIsArray($actual, $path);

        if (array_is_list($expected)) {
            $this->assertCount(count($expected), $actual, $path);
        }

        foreach ($expected as $key => $value) {
            $this->assertArrayHasKey($key, $actual, "{$path}.{$key}");
            $this->assertHolds($value, $actual[$key], "{$path}.{$key}");
        }
    }

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    private static function cases(string $file): array
    {
        $fixture = json_decode((string) file_get_contents(self::DIRECTORY.'/'.$file), true, flags: JSON_THROW_ON_ERROR);
        $cases = [];

        foreach ($fixture['cases'] as $case) {
            $cases[$case['name']] = [$case];
        }

        return $cases;
    }
}
