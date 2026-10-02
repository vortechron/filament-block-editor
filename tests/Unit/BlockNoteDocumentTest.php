<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use Vortechron\FilamentBlockEditor\Support\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class BlockNoteDocumentTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function table(bool $withType = false): array
    {
        $rows = [
            ['cells' => [[['type' => 'text', 'text' => 'Item', 'styles' => []]], [['type' => 'text', 'text' => 'Price', 'styles' => []]]]],
        ];

        return [
            'type' => 'table',
            'content' => $withType ? ['type' => 'tableContent', 'rows' => $rows] : ['rows' => $rows],
        ];
    }

    public function test_a_table_without_its_content_type_gets_the_one_the_editor_needs(): void
    {
        $normalized = BlockNoteDocument::normalize([$this->table()]);

        $this->assertSame('tableContent', $normalized[0]['content']['type']);
        $this->assertSame($this->table()['content']['rows'], $normalized[0]['content']['rows']);
    }

    public function test_tables_inside_columns_and_nested_children_are_repaired_too(): void
    {
        $normalized = BlockNoteDocument::normalize([
            [
                'type' => 'columnList',
                'children' => [
                    ['type' => 'column', 'props' => ['width' => 1], 'children' => [$this->table()]],
                ],
            ],
            [
                'type' => 'bulletListItem',
                'content' => [['type' => 'text', 'text' => 'Point', 'styles' => []]],
                'children' => [$this->table()],
            ],
        ]);

        $this->assertSame('tableContent', $normalized[0]['children'][0]['children'][0]['content']['type']);
        $this->assertSame('tableContent', $normalized[1]['children'][0]['content']['type']);
    }

    public function test_a_document_that_is_already_valid_is_left_exactly_as_it_was(): void
    {
        $document = [
            $this->table(withType: true),
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Hello', 'styles' => []]]],
            ['type' => 'image', 'props' => ['url' => '/storage/media/1/a.jpg']],
            'not a block',
        ];

        $this->assertSame($document, BlockNoteDocument::normalize($document));
    }

    public function test_a_table_with_no_rows_or_odd_content_is_not_touched(): void
    {
        $document = [
            ['type' => 'table'],
            ['type' => 'table', 'content' => []],
            ['type' => 'table', 'content' => 'text'],
        ];

        $this->assertSame($document, BlockNoteDocument::normalize($document));
    }

    /**
     * @return array<string, mixed>
     */
    private function textBlock(string $type, string $text): array
    {
        return ['type' => $type, 'content' => [['type' => 'text', 'text' => $text, 'styles' => []]]];
    }

    public function test_the_title_is_the_first_heading_even_below_a_paragraph(): void
    {
        $title = BlockNoteDocument::title([
            $this->textBlock('paragraph', 'Thanks for the chat last week.'),
            $this->textBlock('heading', 'Our approach'),
            $this->textBlock('heading', 'Pricing'),
        ]);

        $this->assertSame('Our approach', $title);
    }

    public function test_without_a_heading_the_title_is_the_first_line_of_text(): void
    {
        $title = BlockNoteDocument::title([
            ['type' => 'image', 'props' => ['url' => '/storage/media/1/a.jpg']],
            $this->textBlock('paragraph', '   '),
            ['type' => 'paragraph', 'content' => [
                ['type' => 'link', 'href' => 'https://example.com', 'content' => [['type' => 'text', 'text' => 'Read', 'styles' => []]]],
                ['type' => 'text', 'text' => "  our\n terms", 'styles' => []],
            ]],
        ]);

        $this->assertSame('Read our terms', $title);
    }

    public function test_the_title_is_found_inside_columns(): void
    {
        $title = BlockNoteDocument::title([
            ['type' => 'columnList', 'children' => [
                ['type' => 'column', 'children' => [$this->textBlock('paragraph', 'Left side')]],
                ['type' => 'column', 'children' => [$this->textBlock('heading', 'Meet the team')]],
            ]],
        ]);

        $this->assertSame('Meet the team', $title);
    }

    public function test_a_long_title_is_cut_short(): void
    {
        $title = BlockNoteDocument::title([$this->textBlock('heading', str_repeat('word ', 30))]);

        $this->assertLessThanOrEqual(63, mb_strlen($title));
        $this->assertStringStartsWith('word word', $title);
        $this->assertStringEndsWith('...', $title);
    }

    public function test_a_document_with_no_text_has_no_title(): void
    {
        $this->assertNull(BlockNoteDocument::title([]));
        $this->assertNull(BlockNoteDocument::title(null));
        $this->assertNull(BlockNoteDocument::title([$this->table(withType: true), ['type' => 'image'], 'not a block']));
    }

    public function test_a_document_still_held_as_json_text_has_a_title(): void
    {
        $this->assertSame('Hello', BlockNoteDocument::title(json_encode([$this->textBlock('heading', 'Hello')])));
    }
}
