<?php

namespace Vortechron\FilamentBlockEditor\Tests\Filament;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Vortechron\FilamentBlockEditor\Content\PageContent;
use Workbench\App\Filament\Pages\DemoBuilder;

class PageBuilderPageTest extends FilamentTestCase
{
    public function test_the_builder_page_loads_the_builder_full_screen(): void
    {
        $this->signIn();

        $this->get(DemoBuilder::getUrl())
            ->assertOk()
            ->assertSee('page-builder.js', false)
            ->assertSee('page-builder.css', false)
            ->assertSee('mountPageBuilder', false)
            ->assertDontSee('fi-sidebar', false);
    }

    public function test_the_builder_gets_the_page_own_blocks_and_templates(): void
    {
        $this->signIn();

        $options = Livewire::test(DemoBuilder::class)->instance()->getPageBuilderOptions();

        $this->assertSame('ms', $options['locale']);
        $this->assertSame('Demo page', $options['title']);
        $this->assertNotEmpty($options['value']['sections']);
        $this->assertContains('notice', array_column($options['blocks'], 'kind'));
        $this->assertNotEmpty($options['templates']);
        $this->assertSame(url('/admin'), $options['backUrl']);
        $this->assertArrayNotHasKey('viewUrl', $options);
    }

    public function test_saving_cleans_the_sections_and_hands_them_to_the_page(): void
    {
        $this->signIn();
        $section = ['id' => 'abc12345', 'type' => 'rich', 'data' => ['document' => [], 'padding' => 'nonsense', 'extra' => 'dropped']];

        Livewire::test(DemoBuilder::class)
            ->call('savePageBuilder', ['sections' => [$section]])
            ->assertReturned(['ok' => true]);

        $this->assertSame(PageContent::normalize([$section]), DemoBuilder::$saved['sections']);
        $this->assertSame('md', DemoBuilder::$saved['sections'][0]['data']['padding']);
        $this->assertArrayNotHasKey('extra', DemoBuilder::$saved['sections'][0]['data']);
    }

    /**
     * @return array<string, mixed>
     */
    private function storedWithDeveloperData(): array
    {
        return ['version' => 2, 'sections' => [
            ['id' => 'lockme', 'type' => 'rich', 'lock' => ['move' => true], 'data' => ['document' => [], 'advanced' => ['css' => 'selector { color: red; }']]],
            ['id' => 'other1', 'type' => 'rich', 'data' => ['document' => []]],
        ]];
    }

    public function test_a_non_developer_save_keeps_the_stored_locks_and_custom_css(): void
    {
        $this->signIn();
        DemoBuilder::$saved = $this->storedWithDeveloperData();

        Livewire::test(DemoBuilder::class)
            ->call('savePageBuilder', ['version' => 2, 'sections' => [
                ['id' => 'other1', 'type' => 'rich', 'lock' => ['remove' => true], 'data' => ['document' => [], 'advanced' => ['css' => 'selector { display: none; }']]],
                ['id' => 'lockme', 'type' => 'rich', 'data' => ['document' => []]],
                ['id' => 'added1', 'type' => 'rich', 'lock' => ['content' => true], 'data' => ['document' => [], 'advanced' => ['css' => 'selector { display: none; }']]],
            ]])
            ->assertReturned(['ok' => true]);

        [$locked, $other, $added] = DemoBuilder::$saved['sections'];

        $this->assertSame(2, DemoBuilder::$saved['version']);
        $this->assertSame(['lockme', 'other1', 'added1'], array_column(DemoBuilder::$saved['sections'], 'id'));
        $this->assertSame(['move' => true], $locked['lock']);
        $this->assertSame(['css' => 'selector { color: red; }'], $locked['data']['advanced']);
        $this->assertArrayNotHasKey('lock', $other);
        $this->assertArrayNotHasKey('advanced', $other['data']);
        $this->assertArrayNotHasKey('lock', $added);
        $this->assertArrayNotHasKey('advanced', $added['data']);
    }

    public function test_a_developer_save_keeps_the_new_locks_and_custom_css(): void
    {
        $this->signIn();
        DemoBuilder::$saved = $this->storedWithDeveloperData();
        DemoBuilder::$developer = true;

        Livewire::test(DemoBuilder::class)
            ->call('savePageBuilder', ['version' => 2, 'sections' => [
                ['id' => 'added1', 'type' => 'rich', 'lock' => ['content' => true], 'data' => ['document' => [], 'advanced' => ['css' => 'selector { display: none; }']]],
            ]])
            ->assertReturned(['ok' => true]);

        $this->assertSame(['content' => true], DemoBuilder::$saved['sections'][0]['lock']);
        $this->assertSame(['css' => 'selector { display: none; }'], DemoBuilder::$saved['sections'][0]['data']['advanced']);
    }

    public function test_saving_too_many_sections_is_refused_with_a_reason(): void
    {
        $this->signIn();
        $sections = array_fill(0, PageContent::MAX_SECTIONS + 1, ['type' => 'rich', 'data' => []]);

        $component = Livewire::test(DemoBuilder::class)->call('savePageBuilder', ['sections' => $sections]);

        $this->assertFalse($component->effects['returns'][0]['ok']);
        $this->assertArrayHasKey('sections', $component->effects['returns'][0]['errors']);
        $this->assertNull(DemoBuilder::$saved);
    }

    public function test_the_preview_is_the_page_drawn_for_the_builder(): void
    {
        $this->signIn();
        $section = ['id' => 'prev1234', 'type' => 'rich', 'data' => ['document' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Hello builder', 'styles' => []]]]]]];

        $html = Livewire::test(DemoBuilder::class)->call('previewPageBuilder', ['sections' => [$section]])->effects['returns'][0];

        $this->assertStringContainsString('data-block-id="prev1234"', $html);
        $this->assertStringContainsString('Hello builder', $html);
    }

    public function test_an_uploaded_photo_is_stored_and_its_address_returned(): void
    {
        Storage::fake('public');
        $this->signIn();

        $component = Livewire::test(DemoBuilder::class)
            ->set('pageBuilderUpload', UploadedFile::fake()->image('kedai.jpg', 400, 300))
            ->call('storePageBuilderUpload', 'image');

        $result = $component->effects['returns'][0];
        $this->assertSame('kedai.jpg', $result['name']);
        $this->assertStringStartsWith('/storage/block-editor/', $result['url']);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $result['url']));
    }

    public function test_an_svg_cannot_be_uploaded_as_a_photo(): void
    {
        Storage::fake('public');
        $this->signIn();

        Livewire::test(DemoBuilder::class)
            ->set('pageBuilderUpload', UploadedFile::fake()->createWithContent('x.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))
            ->call('storePageBuilderUpload', 'image')
            ->assertHasErrors(['pageBuilderUpload']);
    }

    public function test_every_builder_call_checks_access_first(): void
    {
        $this->signIn();
        $component = Livewire::test(DemoBuilder::class);
        DemoBuilder::$denied = true;

        $component->call('savePageBuilder', ['sections' => []])->assertForbidden();
        $this->assertNull(DemoBuilder::$saved);

        DemoBuilder::$denied = false;
    }
}
