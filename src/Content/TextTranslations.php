<?php

namespace Vortechron\FilamentBlockEditor\Content;

use InvalidArgumentException;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Enums\SectionFont;
use Vortechron\FilamentBlockEditor\Enums\SectionLayout;
use Vortechron\FilamentBlockEditor\Forms\FormDefinition;
use Vortechron\FilamentBlockEditor\Rendering\ContentLocale;

/** Shared structure with stable visitor text fields and complete locale inline values. */
final class TextTranslations
{
    public static function ensureIds(array $base): array
    {
        $value = PageValue::upgrade($base);
        $value = ['version' => 2, 'sections' => PageContent::normalize($value['sections'] ?? [])];
        foreach ($value['sections'] as &$section) {
            if ($section['type'] === 'rich') {
                $section['data']['document'] = self::ids($section['data']['document']);
            }
        }

        return $value;
    }

    /** Throws when the translated document changes anything except declared words. */
    public static function extract(array $base, array $translated): array
    {
        self::assertKnown($base);
        self::assertKnown($translated);
        $base = self::ensureIds($base);
        $translated = PageValue::upgrade($translated);
        $translated['sections'] = self::alignIds($base['sections'], $translated['sections'] ?? []);
        $translated = self::ensureIds($translated);
        $words = [];
        $mask = fn (string $key, string $text): string => '';
        $baseShape = self::walk($base, $mask, [], true);
        $translatedShape = self::walk($translated, function (string $key, string $text) use (&$words): string {
            $words[$key] = $text;

            return '';
        }, [], true);
        if (! self::sameShape($baseShape, $translatedShape)) {
            throw new InvalidArgumentException('The translation changes shared structure, style, media or action data.');
        }
        $explicit = self::explicitBlankKeys($translated);
        foreach (self::fallbackKeys($base) as $key) {
            if (($words[$key] ?? null) === '' && ! in_array($key, $explicit, true)) {
                $words[$key.'/_empty_fallback'] = '1';
            }
        }

        return self::normalizeOverrides($base, $words);
    }

    /** Ordinary locale edits freeze unavailable fields and retain unchanged fallback presence. */
    public static function extractForEdit(array $base, array $translated, array $storedOverrides): array
    {
        self::assertKnown($base, true);
        self::assertKnown($translated, true);
        $base = self::ensureIds($base);
        $translated = PageValue::upgrade($translated);
        $translated['sections'] = self::alignIds($base['sections'], $translated['sections'] ?? []);
        $translated = self::ensureIds(MissingBlockData::restore($translated, $base));
        $mask = fn (string $key, string $text): string => '';
        if (! self::sameShape(self::walk($base, $mask, [], true), self::walk($translated, $mask, [], true))) {
            throw new InvalidArgumentException('The translation changes shared structure, style, media or action data.');
        }
        $overrides = self::normalizeOverrides($base, $storedOverrides);
        $resolved = self::apply($base, $overrides);
        $baseline = self::textFields($resolved);
        $explicitBlank = array_diff(self::explicitBlankKeys($translated), self::explicitBlankKeys($resolved));
        foreach (self::textFields($translated) as $key => $text) {
            if (array_key_exists($key, $overrides) || $text !== ($baseline[$key] ?? null) || in_array($key, $explicitBlank, true)) {
                if ($text !== ($baseline[$key] ?? null) || in_array($key, $explicitBlank, true)) {
                    unset($overrides[$key.'/_empty_fallback']);
                }
                $overrides[$key] = $text;
            }
        }

        return self::normalizeOverrides($base, $overrides);
    }

    public static function isExplicitlyBlank(array $block, string $field): bool
    {
        return in_array($field, OwnTextPresence::blankFields($block), true);
    }

    /** Restore exact understood key presence while unavailable words keep their current trusted state. */
    public static function restoreOverrides(array $base, array $desiredOverrides, array $storedOverrides): array
    {
        $base = self::ensureIds($base);
        $desired = self::normalizeOverrides($base, $desiredOverrides);
        $known = array_diff_key($desired, MissingBlockData::overrides($base, $desired));

        return self::normalizeOverrides($base, [...$known, ...MissingBlockData::overrides($base, $storedOverrides)]);
    }

    public static function apply(array $base, array $overrides): array
    {
        $overrides = self::normalizeOverrides($base, $overrides);

        $automatic = array_values(array_filter(self::fallbackKeys(self::ensureIds($base)), fn (string $key): bool => ($overrides[$key.'/_empty_fallback'] ?? null) === '1'));
        $blank = array_values(array_diff(array_keys(array_filter($overrides, fn ($value) => $value === '')), $automatic));

        return self::walk(self::ensureIds($base), fn (string $key, string $text): string => is_string($overrides[$key] ?? null) ? $overrides[$key] : $text, $blank, false, $automatic);
    }

    /** Known fields are validated; missing custom blocks retain opaque maps for a stored-data guard. */
    public static function normalizeOverrides(array $base, array $overrides): array
    {
        $base = self::ensureIds($base);
        $opaque = MissingBlockData::overrides($base, $overrides);
        $allowed = [];
        self::walk($base, function (string $key, string $text) use (&$allowed, $overrides): string {
            if (array_key_exists($key, $overrides) && self::isRichKey($key) && ! is_string($overrides[$key])) {
                throw new InvalidArgumentException(__('filament-block-editor::builder.errors.rich_invalid', [], ContentLocale::panel()));
            }
            if (array_key_exists($key, $overrides) && is_string($overrides[$key])) {
                $allowed[$key] = self::isRichKey($key) ? RichText::encode(RichText::decode($overrides[$key], RichText::keys(json_decode($text, true)['content'] ?? []))) : mb_substr($overrides[$key], 0, 100000);
            }

            return $text;
        });
        foreach (self::fallbackKeys($base) as $key) {
            if (($allowed[$key] ?? null) === '' && ($overrides[$key.'/_empty_fallback'] ?? null) === '1') {
                $allowed[$key.'/_empty_fallback'] = '1';
            }
        }

        $ids = [];
        foreach (self::ensureIds($base)['sections'] as $section) {
            if ($section['type'] === 'rich') {
                self::blockTypes($section['data']['document'], $ids);
            }
        }
        foreach ($overrides as $key => $_) {
            if (array_key_exists($key, $opaque)) {
                continue;
            }
            if (preg_match('~^block:([^/]+)/content(?:/|$)~', (string) $key, $match) && isset($ids[$match[1]])) {
                throw new InvalidArgumentException(__('filament-block-editor::builder.errors.rich_legacy', [], ContentLocale::panel()));
            }
            if (preg_match('~^block:([^/]+)/rich-cell:~', (string) $key, $match) && isset($ids[$match[1]]) && ! array_key_exists($key, $allowed)) {
                throw new InvalidArgumentException(__('filament-block-editor::builder.errors.rich_table', [], ContentLocale::panel()));
            }
        }

        return [...$opaque, ...$allowed];
    }

    /** The currently understood fields, without conversion's raw-layout checks. */
    public static function textFields(array $base): array
    {
        $fields = [];
        self::walk(self::ensureIds($base), function (string $key, string $text) use (&$fields): string {
            $fields[$key] = $text;

            return $text;
        });

        return $fields;
    }

    public static function permissionProbe(array $base): array
    {
        $words = self::textFields($base);
        foreach ($words as $key => &$value) {
            $value = self::isRichKey($key) ? RichText::probe($value) : '__translation_permission_probe__';
        }

        return $words;
    }

    private static function isRichKey(string $key): bool
    {
        return str_ends_with($key, '/rich') || str_contains($key, '/rich-cell:');
    }

    private static function blockTypes(array $blocks, array &$ids): void
    {
        foreach ($blocks as $block) {
            $ids[$block['id']] = $block['type'];
            self::blockTypes($block['children'] ?? [], $ids);
        }
    }

    private static function ids(array $blocks): array
    {
        foreach ($blocks as &$block) {
            $block['id'] = BlockNoteDocument::blockId($block['id'] ?? null) ?? PageContent::newId();
            if (isset($block['children'])) {
                $block['children'] = self::ids($block['children']);
            }
            if (($block['type'] ?? '') === 'table') {
                $seen = [];
                foreach ($block['content']['rows'] ?? [] as $i => $row) {
                    foreach ($row['cells'] ?? [] as $j => $cell) {
                        $cell = array_is_list($cell) ? ['type' => 'tableCell', 'content' => $cell] : $cell;
                        $id = $cell['_id'] ?? null;
                        $cell['_id'] = is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,40}$/D', $id) && ! isset($seen[$id]) ? $id : PageContent::newId();
                        $seen[$cell['_id']] = true;
                        $block['content']['rows'][$i]['cells'][$j] = $cell;
                    }
                }
            }
            if (($block['type'] ?? '') === 'ownBlock' && ! MissingBlockData::isMissing($block)) {
                $values = self::decode($block['props']['values'] ?? '');
                $fields = app(BlockRegistry::class)->get($block['props']['kind'] ?? '')?->toArray()['fields'] ?? [];
                $block['props']['values'] = FormDefinition::encode(self::rowIds($values, $fields));
            }
            if (($block['type'] ?? '') === 'form') {
                $form = self::decode($block['props']['form'] ?? '');
                foreach ($form['fields'] ?? [] as $i => $field) {
                    if (isset($field['options'])) {
                        $seen = [];
                        foreach ($field['options'] as $j => $_) {
                            $id = $field['option_ids'][$j] ?? null;
                            $id = is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,40}$/D', $id) && ! isset($seen[$id]) ? $id : PageContent::newId();
                            $form['fields'][$i]['option_ids'][$j] = $id;
                            $seen[$id] = true;
                        }
                    }
                }
                $block['props']['form'] = FormDefinition::encode($form);
            }
        }

        return $blocks;
    }

    private static function rowIds(array $values, array $fields): array
    {
        foreach ($fields as $field) {
            if ($field['type'] !== 'list' || ! is_array($values[$field['name']] ?? null)) {
                continue;
            }
            $seen = [];
            foreach ($values[$field['name']] as &$row) {
                $id = $row['_id'] ?? null;
                $row['_id'] = is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,40}$/D', $id) && ! isset($seen[$id]) ? $id : PageContent::newId();
                $seen[$row['_id']] = true;
                $row = self::rowIds($row, $field['fields'] ?? []);
            }
            unset($row);
        }

        return $values;
    }

    private static function alignIds(array $base, array $other): array
    {
        foreach ($other as $i => &$item) {
            if (! is_array($item) || ! isset($base[$i])) {
                continue;
            }
            foreach (['id', '_id', 'option_ids'] as $key) {
                if (! isset($item[$key]) && isset($base[$i][$key])) {
                    $item[$key] = $base[$i][$key];
                }
            }
            foreach ($item as $key => &$value) {
                if (is_array($value) && is_array($base[$i][$key] ?? null)) {
                    // Wrap maps to use the same positional walk as lists.
                    $value = array_is_list($value) ? self::alignIds($base[$i][$key], $value) : self::alignIds([$base[$i][$key]], [$value])[0];
                } elseif (in_array($key, ['form', 'values'], true) && is_string($value) && is_string($base[$i][$key] ?? null)) {
                    $value = FormDefinition::encode(self::alignIds([self::decode($base[$i][$key])], [self::decode($value)])[0]);
                }
            }
            unset($value);
        }

        return $other;
    }

    /** Walk the allow-list, not arbitrary string fields. */
    private static function walk(array $value, callable $text, array $blankKeys = [], bool $shape = false, array $automatic = []): array
    {
        foreach ($value['sections'] as &$section) {
            if ($section['type'] === 'rich') {
                $section['data']['document'] = self::blocks($section['data']['document'], $text, $blankKeys, $shape, $automatic);
            }
        }

        return $value;
    }

    private static function blocks(array $blocks, callable $text, array $blankKeys, bool $shape, array $automatic): array
    {
        foreach ($blocks as &$block) {
            if (MissingBlockData::isMissing($block)) {
                continue;
            }
            $key = 'block:'.$block['id'];
            if (($block['type'] ?? '') === 'table') {
                foreach ($block['content']['rows'] ?? [] as $i => $row) {
                    foreach ($row['cells'] ?? [] as $j => $cell) {
                        $content = $cell['content'] ?? [];
                        $encoded = $text($key.'/rich-cell:'.$cell['_id'], RichText::encode($content));
                        $block['content']['rows'][$i]['cells'][$j]['content'] = $shape ? [] : RichText::decode($encoded, RichText::keys($content));
                    }
                }
            } elseif (array_key_exists('content', $block) || in_array($block['type'] ?? '', ['paragraph', 'heading', 'quote', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'card'], true)) {
                $content = $block['content'] ?? [];
                $encoded = $text($key.'/rich', RichText::encode($content));
                $block['content'] = $shape ? [] : RichText::decode($encoded, RichText::keys($content));
            }
            foreach (match ($block['type'] ?? '') {
                'button' => ['text'], 'image', 'video', 'audio', 'file' => ['caption', 'name'], default => []
            } as $prop) {
                if (is_string($block['props'][$prop] ?? null)) {
                    $block['props'][$prop] = $text($key.'/props/'.$prop, $block['props'][$prop]);
                }
            }
            if (($block['type'] ?? '') === 'ownBlock') {
                $fields = app(BlockRegistry::class)->get($block['props']['kind'] ?? '')?->toArray()['fields'] ?? [];
                $block['props']['values'] = FormDefinition::encode(self::fields(self::decode($block['props']['values'] ?? ''), $fields, $key.'/values', $text));
                if ($shape) {
                    unset($block['_translated_empty']);
                } else {
                    $prefix = $key.'/values/';
                    $relative = fn (array $keys): array => array_map(fn (string $field): string => substr($field, strlen($prefix)), array_values(array_filter($keys, fn (string $field): bool => str_starts_with($field, $prefix))));
                    $block = OwnTextPresence::mark($block, $relative($blankKeys), $relative($automatic));
                }
            }
            if (($block['type'] ?? '') === 'form') {
                $form = self::decode($block['props']['form'] ?? '');
                $form['success'] = $text($key.'/form/success', $form['success'] ?? '');
                $form['submit']['text'] = $text($key.'/form/submit', $form['submit']['text'] ?? '');
                if ($shape) {
                    unset($form['_translated_empty']);
                } else {
                    $form['_translated_empty'] = array_values(array_filter($form['_translated_empty'] ?? [], fn (string $part): bool => ! in_array($key.'/form/'.$part, $automatic, true)));
                    if ($form['_translated_empty'] === []) {
                        unset($form['_translated_empty']);
                    }
                }
                foreach (['submit', 'success'] as $part) {
                    if (in_array($key.'/form/'.$part, $blankKeys, true)) {
                        $form['_translated_empty'][] = $part;
                    }
                }
                $form['fields'] = array_map(function (array $field) use ($key, $text): array {
                    foreach (['label', 'placeholder'] as $prop) {
                        $field[$prop] = $text($key.'/field:'.$field['id'].'/'.$prop, $field[$prop] ?? '');
                    }
                    foreach ($field['options'] ?? [] as $i => $option) {
                        $field['options'][$i] = $text($key.'/field:'.$field['id'].'/option:'.$field['option_ids'][$i], $option);
                    }

                    return $field;
                }, $form['fields'] ?? []);
                foreach ($form['actions'] ?? [] as $i => $action) {
                    if (($action['type'] ?? '') === 'whatsapp') {
                        $form['actions'][$i]['message'] = $text($key.'/action:whatsapp/message', $action['message'] ?? '');
                    }
                }
                $block['props']['form'] = FormDefinition::encode($form);
            }
            if (isset($block['children'])) {
                $block['children'] = self::blocks($block['children'], $text, $blankKeys, $shape, $automatic);
            }
        }

        return $blocks;
    }

    private static function fields(array $values, array $fields, string $key, callable $text): array
    {
        foreach ($fields as $field) {
            $name = $field['name'];
            if (($field['translatable'] ?? false) && is_string($values[$name] ?? null)) {
                $values[$name] = $text($key.'/'.$name, $values[$name]);
            }
            if ($field['type'] === 'list' && is_array($values[$name] ?? null)) {
                foreach ($values[$name] as &$row) {
                    $row = self::fields($row, $field['fields'] ?? [], $key.'/'.$name.'/row:'.$row['_id'], $text);
                }
                unset($row);
            }
        }

        return $values;
    }

    private static function decode(string $json): array
    {
        $value = json_decode($json, true);

        return is_array($value) ? $value : [];
    }

    private static function explicitBlankKeys(array $value): array
    {
        $keys = [];
        foreach (DeveloperData::storedBlocks($value['sections']) as $id => $block) {
            foreach (OwnTextPresence::blankFields($block) as $field) {
                $keys[] = 'block:'.$id.'/values/'.$field;
            }
            if (($block['type'] ?? '') === 'form') {
                foreach (self::decode($block['props']['form'] ?? '')['_translated_empty'] ?? [] as $part) {
                    $keys[] = 'block:'.$id.'/form/'.$part;
                }
            }
        }

        return $keys;
    }

    private static function fallbackKeys(array $value): array
    {
        $keys = [];
        foreach (DeveloperData::storedBlocks($value['sections']) as $id => $block) {
            foreach (OwnTextPresence::fallbackFields($block) as $field) {
                $keys[] = 'block:'.$id.'/values/'.$field;
            }
            if (($block['type'] ?? '') === 'form') {
                $keys[] = 'block:'.$id.'/form/submit';
                $keys[] = 'block:'.$id.'/form/success';
            }
        }

        return $keys;
    }

    /** Conversion must never silently discard unknown custom content or props. */
    private static function assertKnown(array $value, bool $allowMissing = false): void
    {
        $value = PageValue::upgrade($value);
        $check = function (array $blocks) use (&$check, $allowMissing): void {
            foreach ($blocks as $block) {
                if ($allowMissing && MissingBlockData::isMissing($block)) {
                    continue;
                }
                if (($block['type'] ?? '') === 'ownBlock') {
                    $definition = app(BlockRegistry::class)->get($block['props']['kind'] ?? '');
                    if ($definition === null) {
                        throw new InvalidArgumentException('Unknown custom block cannot be converted.');
                    }
                    $values = self::decode($block['props']['values'] ?? '');
                    self::assertFields($values, $definition->toArray()['fields']);
                }
                if (($block['type'] ?? '') === 'form') {
                    $form = self::decode($block['props']['form'] ?? '');
                    self::assertKeys($form, ['name', 'fields', 'submit', 'success', 'actions', '_translated_empty']);
                    self::assertKeys($form['submit'] ?? [], ['text', 'align']);
                    foreach ($form['fields'] ?? [] as $field) {
                        self::assertKeys($field, ['id', 'type', 'name', 'label', 'placeholder', 'required', 'width', 'options', 'option_ids', 'rows']);
                    }
                    foreach ($form['actions'] ?? [] as $action) {
                        self::assertKeys($action, match ($action['type'] ?? '') {
                            'email' => ['type', 'to', 'subject'], 'whatsapp' => ['type', 'to', 'message'], 'redirect', 'webhook' => ['type', 'url'], default => []
                        });
                    }
                }
                $check($block['children'] ?? []);
            }
        };
        self::assertKeys($value, ['version', 'sections', 'translations']);
        $dataKeys = array_keys(PageContent::normalize([['id' => 'shape', 'type' => 'rich', 'data' => []]])[0]['data']);
        foreach ($value['sections'] ?? [] as $section) {
            if (! in_array($section['type'] ?? null, PageContent::types(), true)) {
                throw new InvalidArgumentException('Unknown section type cannot be converted.');
            }
            self::assertKeys($section, $section['type'] === 'ref' ? ['id', 'type', 'ref', 'hidden'] : ['id', 'type', 'data', 'hidden', 'lock']);
            $data = $section['data'] ?? [];
            self::assertKeys($data, [...$dataKeys, 'style', 'advanced']);
            foreach (['layout' => array_column(SectionLayout::cases(), 'value'), 'font' => array_column(SectionFont::cases(), 'value'), 'background' => ['none', 'color', 'image'], 'padding' => ['none', 'sm', 'md', 'lg', 'xl'], 'align' => ['auto', 'left', 'center'], 'corners' => ['theme', 'square', 'soft', 'round'], 'button' => ['theme', 'solid', 'outline', 'pill', 'shadow'], 'width' => ['normal', 'full']] as $key => $allowed) {
                if (array_key_exists($key, $data) && ! in_array($data[$key], $allowed, true)) {
                    throw new InvalidArgumentException('Unknown section layout value cannot be converted.');
                }
            }
            $check($section['data']['document'] ?? []);
        }
    }

    private static function assertKeys(array $value, array $keys): void
    {
        if (array_diff(array_keys($value), $keys)) {
            throw new InvalidArgumentException('Unknown content data cannot be converted.');
        }
    }

    private static function assertFields(array $values, array $fields, bool $row = false): void
    {
        self::assertKeys($values, [...array_column($fields, 'name'), ...($row ? ['_id'] : [])]);
        foreach ($fields as $field) {
            if ($field['type'] === 'list') {
                foreach ($values[$field['name']] ?? [] as $item) {
                    self::assertFields($item, $field['fields'] ?? [], true);
                }
            }
        }
    }

    private static function sameShape(mixed $base, mixed $translated): bool
    {
        if (! is_array($base) || ! is_array($translated)) {
            return $base === $translated;
        }
        if (count($base) !== count($translated) || array_is_list($base) !== array_is_list($translated)) {
            return false;
        }
        foreach ($base as $key => $value) {
            if (! array_key_exists($key, $translated) || ! self::sameShape($value, $translated[$key])) {
                return false;
            }
        }

        return true;
    }
}
