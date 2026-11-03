<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use Vortechron\FilamentBlockEditor\Styling\Advanced;
use Vortechron\FilamentBlockEditor\Styling\CustomCss;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class AdvancedTest extends TestCase
{
    public function test_it_keeps_good_class_names_hide_on_devices_and_clean_css(): void
    {
        $clean = Advanced::clean([
            'class' => '  price-card wide ',
            'css' => 'selector .bn-button { letter-spacing: .1em; }',
            'hide_on' => ['phone', 'desktop'],
        ]);

        $this->assertSame([
            'class' => 'price-card wide',
            'css' => 'selector .bn-button { letter-spacing: .1em; }',
            'hide_on' => ['desktop', 'phone'],
        ], $clean);
    }

    public function test_it_keeps_at_most_five_valid_class_names_and_drops_the_others(): void
    {
        $clean = Advanced::clean(['class' => 'a "><script> 1bad fbe-s-other b_c d-e f g h '.str_repeat('x', 42)]);

        $this->assertSame(['class' => 'a b_c d-e f g'], $clean);
    }

    public function test_empty_and_unknown_keys_are_left_out(): void
    {
        $this->assertSame([], Advanced::clean(['class' => '', 'css' => null, 'hide_on' => [], 'id' => 'x']));
        $this->assertSame([], Advanced::clean(['hide_on' => ['watch', 'print']]));
        $this->assertSame([], Advanced::clean('class'));
        $this->assertSame(['hide_on' => ['tablet']], Advanced::clean(['hide_on' => ['tablet', 'tablet']]));
    }

    public function test_css_that_fails_is_dropped_whole(): void
    {
        $this->assertSame(['class' => 'ok'], Advanced::clean(['class' => 'ok', 'css' => 'selector { color: red } </style>']));
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function goodCss(): array
    {
        return [
            'a rule on the element' => ['selector { color: #fff; }'],
            'a rule inside it' => ['selector .bn-button:hover { letter-spacing: .1em; }'],
            'a media query' => ['@media (max-width: 600px) { selector { display: none; } }'],
            'a supports query' => ['@supports (display: grid) { selector .x, selector .y { display: grid; } }'],
            'a media query inside a supports query' => ['@supports (gap: 1rem) { @media (min-width: 1px) { selector { gap: 1rem; } } }'],
            'a picture on this site' => ["selector { background: url('/storage/a.jpg'); }"],
            'a picture on this site with no quotes' => ['selector { background: url(/storage/a.jpg); }'],
            'just declarations' => ['color: red; padding: 4px'],
            'a selector list' => ['selector:hover, selector:focus-within { color: red; }'],
            'an attribute selector after selector' => ['selector a[href^="/"] { color: red; }'],
            'two rules' => ['selector { color: red; } selector p { margin: 0; }'],
            'an escaped quote mark' => ['selector::before { content: "\201C"; }'],
            'a comma in a string' => ['selector[title="a, b"] { color: red; }'],
            'a tilde inside an attribute selector' => ['selector a[class~="big"] { color: red; }'],
            'a plus inside brackets' => ['selector li:nth-child(2n+1) { color: red; }'],
            'an attribute that is not value' => ['selector input[name="q"], selector [data-value="x"] { color: red; }'],
            'a picture path with symbols' => ['selector { background: url("/storage/a_b-c.d~e/f%20g(1).jpg"); }'],
        ];
    }

    #[DataProvider('goodCss')]
    public function test_custom_css_keeps_ordinary_rules(string $css): void
    {
        $this->assertSame($css, CustomCss::clean($css));
    }

    /**
     * @return array<string, array{0: mixed}>
     */
    public static function badCss(): array
    {
        return [
            'a closing style tag' => ['selector { color: red } </style><script>alert(1)</script>'],
            'any less-than sign' => ['selector > a < b { color: red }'],
            'an escaped less-than sign' => ['selector::after { content: "\3c/style>"; }'],
            'an import' => ['@import url("https://evil.example/x.css");'],
            'an import in capitals' => ['@IMPORT "x.css";'],
            'an expression' => ['selector { width: expression(alert(1)); }'],
            'an expression with a space' => ['selector { width: EXPRESSION (alert(1)); }'],
            'an escaped expression' => ['selector { width: expr\65 ssion(alert(1)); }'],
            'javascript' => ['selector { background: url(javascript:alert(1)); }'],
            'escaped javascript' => ['selector { background: url(java\73 cript:alert(1)); }'],
            'behavior' => ['selector { behavior: url(x.htc); }'],
            'moz binding' => ['selector { -moz-binding: url(https://x.example/x.xml#x); }'],
            'a plain http picture' => ['selector { background: url(http://cdn.example/a.jpg); }'],
            'a web picture' => ['selector { background: url("https://cdn.example/a.jpg"); }'],
            'an image set' => ['selector { background: image-set("https://evil.example/a.png" 1x); }'],
            'a src function' => ['selector { background: src("https://evil.example/a.png"); }'],
            'a font face' => ['@font-face { font-family: x; src: url(/a.woff); }'],
            'keyframes' => ['@keyframes spin { from { opacity: 0; } to { opacity: 1; } }'],
            'a namespace' => ['@namespace svg url(/svg);'],
            'a charset' => ['@charset "utf-8";'],
            'a layer' => ['@layer base { selector { color: red; } }'],
            'a rule that is not on the element' => ['body { display: none; }'],
            'a second selector that is not on the element' => ['selector a, body { display: none; }'],
            'a rule inside a media query that is not on the element' => ['@media (min-width: 1px) { body { display: none; } }'],
            'a word that only starts like selector' => ['selectors { color: red; }'],
            'a nested rule' => ['selector { color: red; & a { color: blue; } }'],
            'a quote hiding a brace' => ['selector::after { content: "}"; } body { display: none; '],
            'a quote hiding an open brace' => ["selector::after { content: '{'; }"],
            'an escape hiding a brace' => ['selector { color: red; \\7d body { display: none; } '],
            'an escaped brace' => ['selector { content: "\\}"; }'],
            'an escape that decodes to a brace' => ['selector { content: "\\7b"; }'],
            'an open quote' => ['selector::after { content: "x; }'],
            'an at sign in plain declarations' => ['color: red; @import "x.css"'],
            'a backslash path that browsers read as another site' => ['selector { background: url(/\\evil.com/x); }'],
            'an escaped slash that makes two slashes' => ['selector { background: url("/\\2f evil.com/x"); }'],
            'a backslash in a picture path' => ['selector { background: url("/a\\\\b.jpg"); }'],
            'whitespace in a picture path' => ['selector { background: url("/a b.jpg"); }'],
            'a tab in a picture path' => ["selector { background: url(\"/a\tb.jpg\"); }"],
            'a control character in a picture path' => ["selector { background: url(/a\x01b.jpg); }"],
            'a quote in a picture path' => ['selector { background: url(/a"b.jpg); }'],
            'a query string in a picture path' => ['selector { background: url(/a.jpg?v=1); }'],
            'a next sibling combinator' => ['selector + p { color: red; }'],
            'a later sibling combinator' => ['selector ~ p { color: red; }'],
            'a sibling combinator deeper in' => ['selector p+p { color: red; }'],
            'root' => ['selector :root { color: red; }'],
            'host' => ['selector:host { color: red; }'],
            'has' => ['selector:has(input) { color: red; }'],
            'has inside is' => ['selector :is(a, :HAS(b)) { color: red; }'],
            'an escaped has' => ['selector :h\\61s(b) { color: red; }'],
            'a value attribute' => ['selector input[value^="a"] { background: url(/leak?a); }'],
            'a value attribute with spaces and capitals' => ['selector [ VALUE ] { color: red; }'],
            'a value attribute with a namespace' => ['selector [*|value] { color: red; }'],
            'a value attribute inside a media query' => ['@media (min-width: 1px) { selector input[value] { color: red; } }'],
            'a protocol-relative picture' => ['selector { background: url(//evil.example/a.jpg); }'],
            'a data picture' => ['selector { background: url(data:image/png;base64,AAAA); }'],
            'a relative picture' => ['selector { background: url(a.jpg); }'],
            'an open url' => ['selector { background: url(https://a.example/a.jpg }'],
            'an open brace' => ['selector { color: red; '],
            'a stray closing brace' => ['selector { color: red; } } body { display: none }'],
            'an open comment' => ['selector { color: red; } /* never closed'],
            'too long' => [str_repeat('a', 5001)],
            'empty' => ['   '],
            'not a string' => [['selector { color: red }']],
        ];
    }

    #[DataProvider('badCss')]
    public function test_custom_css_that_fails_a_rule_is_dropped_whole(mixed $css): void
    {
        $this->assertNull(CustomCss::clean($css));
    }

    public function test_comments_are_removed_from_custom_css(): void
    {
        $this->assertSame('selector { color: red; }', CustomCss::clean('/* brand */selector { color: red; }'));
    }

    public function test_the_word_selector_becomes_the_element_selector(): void
    {
        $this->assertSame(
            '.sf-page .fbe-s-a1 .bn-button{letter-spacing:.1em} .sf-page .fbe-s-a1:hover{color:red}',
            CustomCss::scope('selector .bn-button{letter-spacing:.1em} selector:hover{color:red}', '.sf-page .fbe-s-a1'),
        );
        $this->assertSame('.sf-page .fbe-s-a1{color: red; padding: 4px}', CustomCss::scope('color: red; padding: 4px', '.sf-page .fbe-s-a1'));
        $this->assertSame('.sf-page .fbe-s-a1 .selectors{color:red}', CustomCss::scope('selector .selectors{color:red}', '.sf-page .fbe-s-a1'));
    }
}
