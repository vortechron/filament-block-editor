<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use Illuminate\Support\Facades\Validator;
use Vortechron\FilamentBlockEditor\Content\PageValue;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class PageValueTest extends TestCase
{
    protected function tearDown(): void
    {
        PageValue::forgetUpgrades();

        parent::tearDown();
    }

    /**
     * @return array<string, mixed>
     */
    private function section(string $id = 'a1'): array
    {
        return ['id' => $id, 'type' => 'rich', 'data' => ['document' => []]];
    }

    public function test_a_bare_list_of_sections_is_format_one_and_upgrades_with_no_other_change(): void
    {
        $this->assertSame(['version' => 2, 'sections' => [$this->section()]], PageValue::upgrade([$this->section()]));
    }

    public function test_a_value_with_sections_and_no_version_is_format_one(): void
    {
        $this->assertSame(['sections' => [$this->section()], 'version' => 2], PageValue::upgrade(['sections' => [$this->section()]]));
    }

    public function test_a_format_two_value_is_left_as_it_is(): void
    {
        $value = ['version' => 2, 'sections' => [$this->section()]];

        $this->assertSame($value, PageValue::upgrade($value));
    }

    public function test_a_json_string_is_read_and_anything_else_is_an_empty_page(): void
    {
        $this->assertSame(['sections' => [$this->section()], 'version' => 2], PageValue::upgrade(json_encode(['sections' => [$this->section()]])));
        $this->assertSame(['version' => 2, 'sections' => []], PageValue::upgrade('not json'));
        $this->assertSame(['version' => 2, 'sections' => []], PageValue::upgrade(null));
        $this->assertSame(['version' => 2, 'sections' => []], PageValue::upgrade(42));
    }

    public function test_normalize_upgrades_then_cleans_and_keeps_only_the_version_and_the_sections(): void
    {
        $value = PageValue::normalize(['sections' => [
            ['id' => 'a1', 'type' => 'rich', 'data' => ['padding' => 'nonsense', 'evil' => 'x']],
            ['id' => 'b2', 'type' => 'script'],
        ], 'extra' => 'dropped']);

        $this->assertSame(['version', 'sections'], array_keys($value));
        $this->assertSame(PageValue::VERSION, $value['version']);
        $this->assertCount(1, $value['sections']);
        $this->assertSame('md', $value['sections'][0]['data']['padding']);
        $this->assertArrayNotHasKey('evil', $value['sections'][0]['data']);
    }

    public function test_normalize_gives_a_bare_list_and_a_format_one_value_the_same_result(): void
    {
        $sections = [$this->section('x1'), $this->section('x2')];

        $this->assertSame(PageValue::normalize($sections), PageValue::normalize(['sections' => $sections]));
        $this->assertSame(PageValue::normalize($sections), PageValue::normalize(PageValue::normalize($sections)));
    }

    public function test_a_registered_upgrade_step_runs_on_older_values(): void
    {
        PageValue::registerUpgrade(1, fn (array $value): array => [
            'version' => 2,
            'sections' => array_map(fn (array $section): array => [...$section, 'type' => 'rich'], $value['sections'] ?? []),
        ]);

        $value = PageValue::normalize(['sections' => [['id' => 'old', 'type' => 'legacy', 'data' => []]]]);

        $this->assertSame(['old'], array_column($value['sections'], 'id'));
    }

    public function test_a_version_below_one_or_not_a_number_counts_as_one(): void
    {
        $ran = 0;
        PageValue::registerUpgrade(1, function (array $value) use (&$ran): array {
            $ran++;

            return $value;
        });

        foreach ([0, -5, PHP_INT_MIN, '1', 1.0, null] as $version) {
            $value = PageValue::upgrade(['version' => $version, 'sections' => [$this->section()]]);

            $this->assertSame(2, $value['version']);
            $this->assertSame([$this->section()], $value['sections']);
        }

        $this->assertSame(6, $ran);
    }

    public function test_a_huge_negative_version_upgrades_at_once(): void
    {
        $started = microtime(true);

        $value = PageValue::normalize(['version' => PHP_INT_MIN, 'sections' => [$this->section()]]);

        $this->assertLessThan(1.0, microtime(true) - $started);
        $this->assertSame(['version' => 2, 'sections' => PageValue::normalize([$this->section()])['sections']], $value);
    }

    public function test_a_value_from_a_newer_version_is_treated_as_the_current_one_and_cleaned(): void
    {
        $ran = false;
        PageValue::registerUpgrade(1, function (array $value) use (&$ran): array {
            $ran = true;

            return $value;
        });

        foreach ([3, 9, PHP_INT_MAX] as $version) {
            $value = PageValue::normalize(['version' => $version, 'sections' => [['id' => 'a1', 'type' => 'rich', 'data' => ['padding' => 'huge']]]]);

            $this->assertSame(2, $value['version']);
            $this->assertSame('md', $value['sections'][0]['data']['padding']);
        }

        $this->assertFalse($ran);
    }

    public function test_a_block_id_seen_twice_on_a_page_gets_a_new_id_and_the_first_keeps_its_own(): void
    {
        $block = fn (string $id, array $children = []): array => ['id' => $id, 'type' => 'paragraph', 'props' => ['look' => '{"style":{"desktop":{"color":"#ff0000"}}}'], 'content' => [], 'children' => $children];

        $value = PageValue::normalize(['version' => 2, 'sections' => [
            ['id' => 's1', 'type' => 'rich', 'data' => ['document' => [$block('b1'), $block('cols', [$block('b2')])]]],
            ['id' => 's2', 'type' => 'rich', 'data' => ['document' => [$block('b1'), $block('b3', [$block('b2')])]]],
        ]]);

        [$first, $second] = $value['sections'];
        $copy = $second['data']['document'];

        $this->assertSame(['b1', 'cols', 'b2'], [$first['data']['document'][0]['id'], $first['data']['document'][1]['id'], $first['data']['document'][1]['children'][0]['id']]);
        $this->assertSame('b3', $copy[1]['id']);
        $this->assertNotContains($copy[0]['id'], ['b1', 'cols', 'b2', 'b3']);
        $this->assertNotContains($copy[1]['children'][0]['id'], ['b1', 'cols', 'b2', 'b3', $copy[0]['id']]);
        $this->assertSame($value, PageValue::normalize($value));
    }

    public function test_the_rules_accept_a_format_two_value_with_rich_and_ref_sections(): void
    {
        $value = ['version' => 2, 'sections' => [$this->section(), ['id' => 'r1', 'type' => 'ref', 'ref' => 12]]];

        $this->assertTrue(Validator::make(['value' => $value], PageValue::rules())->passes());
        $this->assertTrue(Validator::make(['page' => ['sections' => []]], PageValue::rules('page'))->passes());
    }

    public function test_the_rules_refuse_a_wrong_outer_shape(): void
    {
        $tooMany = ['version' => 2, 'sections' => array_fill(0, 31, $this->section())];
        $badType = ['version' => 2, 'sections' => [['id' => 'x', 'type' => 'script']]];
        $badRef = ['version' => 2, 'sections' => [['id' => 'x', 'type' => 'ref', 'ref' => '<b>']]];
        $future = ['version' => 3, 'sections' => []];

        foreach ([$tooMany, $badType, $badRef, $future, 'text'] as $value) {
            $this->assertTrue(Validator::make(['value' => $value], PageValue::rules())->fails(), json_encode($value));
        }
    }
}
