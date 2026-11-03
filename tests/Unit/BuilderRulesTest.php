<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use Vortechron\FilamentBlockEditor\Support\BuilderRules;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class BuilderRulesTest extends TestCase
{
    private const GENERATED = __DIR__.'/../../builder/src/generated';

    public function test_the_builder_has_the_rules_php_exports_now(): void
    {
        $this->assertSame(
            BuilderRules::json(),
            (string) file_get_contents(self::GENERATED.'/rules.json'),
            'builder/src/generated/rules.json is out of date. Run: php84 bin/export-rules.php',
        );
        $this->assertSame(
            BuilderRules::typeDeclaration(),
            (string) file_get_contents(self::GENERATED.'/rules.d.json.ts'),
            'builder/src/generated/rules.d.json.ts is out of date. Run: php84 bin/export-rules.php',
        );
    }

    public function test_the_rules_hold_the_limits_both_sides_check(): void
    {
        $rules = BuilderRules::all();

        $this->assertSame(['px' => 2000, 'rem' => 200, 'em' => 200, '%' => 100, 'vw' => 100, 'vh' => 100], $rules['style']['length_units']);
        $this->assertSame('length', $rules['style']['keys']['font_size']);
        $this->assertContains('font_size', $rules['style']['non_negative']);
        $this->assertNotContains('margin_top', $rules['style']['non_negative']);
        $this->assertSame(['color', 'background_color', 'border_color', 'shadow', 'opacity'], $rules['style']['hover_keys']);
        $this->assertSame(5, $rules['advanced']['max_classes']);
        $this->assertSame('fbe-', $rules['advanced']['reserved_class_prefix']);
        $this->assertSame(['move', 'remove', 'content', 'style'], $rules['locks']);
        $this->assertSame(['page', 'header', 'footer', 'section', 'card', 'single'], $rules['document_kinds']);
        $this->assertSame('#475569', $rules['kit']['defaults']['colors']['text']);
    }

    public function test_the_type_declaration_keeps_every_word_as_a_literal(): void
    {
        $declaration = BuilderRules::typeDeclaration();

        $this->assertStringContainsString('readonly "document_kinds": readonly ["page", "header", "footer", "section", "card", "single"];', $declaration);
        $this->assertStringContainsString('readonly "max_classes": 5;', $declaration);
    }
}
