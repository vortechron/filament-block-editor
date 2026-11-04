<?php

namespace Vortechron\FilamentBlockEditor\Blocks;

use Closure;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * A block the host app defines and draws. The builder shows it in its add
 * panel and edits its fields with a generated form; the page draws it with
 * the Blade view named here.
 *
 *     app(BlockRegistry::class)->register(
 *         OwnBlock::make('stationery-board')
 *             ->label('Stationery board')
 *             ->icon('pencil')
 *             ->fields([Field::text('heading')->default('Stationery')])
 *             ->view('blocks.stationery-board'),
 *     );
 */
final class OwnBlock
{
    private string $label;

    private string $icon = 'puzzle';

    private string $description = '';

    /**
     * @var list<Field>
     */
    private array $fields = [];

    private ?string $view = null;

    private bool $retired = false;

    /**
     * @var list<string>
     */
    private array $siteInfo = [];

    /**
     * @var list<string>
     */
    private array $showsValues = [];

    private ?string $editedAtLabel = null;

    /**
     * @var string|(Closure(): ?string)|null
     */
    private string|Closure|null $editedAtUrl = null;

    private function __construct(public readonly string $kind)
    {
        if (preg_match('/^[A-Za-z0-9_-]{1,60}$/', $kind) !== 1) {
            throw new InvalidArgumentException("An own block kind may only hold letters, digits, dashes and underscores (60 at most). Got [{$kind}].");
        }

        $this->label = Str::headline($kind);
    }

    public static function make(string $kind): self
    {
        return new self($kind);
    }

    /**
     * A block kept only so pages that hold it still draw and edit: the
     * builder no longer offers it in Add or the "/" menu. Retire a block
     * when a better one replaces it, so old versions still restore.
     */
    public function retired(bool $retired = true): self
    {
        $this->retired = $retired;

        return $this;
    }

    public function isRetired(): bool
    {
        return $this->retired;
    }

    public function label(string $label): self
    {
        $this->label = $label;

        return $this;
    }

    /**
     * A lucide icon name, such as "pencil".
     */
    public function icon(string $icon): self
    {
        $this->icon = $icon;

        return $this;
    }

    public function description(string $description): self
    {
        $this->description = $description;

        return $this;
    }

    /**
     * @param  list<Field>  $fields
     */
    public function fields(array $fields): self
    {
        $this->fields = array_values($fields);

        return $this;
    }

    /**
     * The Blade view that draws the block. It gets `$values` (the cleaned
     * fields, defaults applied), `$block` (the raw BlockNote block) and
     * `$context` (the RenderContext).
     */
    public function view(string $view): self
    {
        $this->view = $view;

        return $this;
    }

    /**
     * The shop info groups the view reads, by settings group key (such as
     * `'contact'` or `'hours'`). The builder then shows those groups of the
     * shop info form in the block's panel, so the owner can change the
     * phone or the hours where the block shows them.
     */
    public function usesSiteInfo(string ...$groups): self
    {
        $this->siteInfo = array_values(array_unique(array_filter($groups, fn (string $group): bool => $group !== '')));

        return $this;
    }

    /**
     * The shop values the view shows, by dynamic value key (such as
     * `'site.phone'`). The builder lists each one in the block's panel with
     * its current value, and a tap opens the shop info group it comes from.
     * Prefer it to usesSiteInfo(): the owner sees the values themselves.
     *
     * @throws InvalidArgumentException when a key is not a dynamic value key
     */
    public function showsValues(string ...$keys): self
    {
        foreach ($keys as $key) {
            if (! DynamicValues::isKey($key)) {
                throw new InvalidArgumentException("A shop value key is a lowercase name and one to three dotted parts, such as site.phone. Got [{$key}].");
            }
        }

        $this->showsValues = array_values(array_unique($keys));

        return $this;
    }

    /**
     * The screen where the data this block shows is changed, such as the
     * Items screen for a list of items. The builder shows a button to it in
     * the block's settings, so the owner is never left with nothing to
     * change. Pass a closure when the address needs the routes, which are
     * not ready while the app boots.
     *
     * @param  string|(Closure(): ?string)  $url
     */
    public function editedAt(string $label, string|Closure $url): self
    {
        $this->editedAtLabel = $label;
        $this->editedAtUrl = $url;

        return $this;
    }

    /**
     * The button to the screen where the block's data is changed, or null.
     *
     * @return array{label: string, url: string}|null
     */
    public function getEditedAt(): ?array
    {
        $url = $this->editedAtUrl instanceof Closure ? ($this->editedAtUrl)() : $this->editedAtUrl;
        $url = Urls::link($url);

        return $this->editedAtLabel === null || $url === null ? null : ['label' => $this->editedAtLabel, 'url' => $url];
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function getIcon(): string
    {
        return $this->icon;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    /**
     * @return list<Field>
     */
    public function getFields(): array
    {
        return $this->fields;
    }

    public function getView(): ?string
    {
        return $this->view;
    }

    /**
     * @return list<string>
     */
    public function getSiteInfo(): array
    {
        return $this->siteInfo;
    }

    /**
     * @return list<string>
     */
    public function getShowsValues(): array
    {
        return $this->showsValues;
    }

    /**
     * The definition the builder gets, as JSON.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'kind' => $this->kind,
            'label' => $this->label,
            'icon' => $this->icon,
            'description' => $this->description,
            'fields' => array_map(fn (Field $field): array => $field->toArray(), $this->fields),
            'defaults' => $this->defaults(),
            ...($this->siteInfo === [] ? [] : ['siteInfo' => $this->siteInfo]),
            ...($this->showsValues === [] ? [] : ['showsValues' => $this->showsValues]),
            ...($this->retired ? ['retired' => true] : []),
            ...(($editedAt = $this->getEditedAt()) === null ? [] : ['editedAt' => $editedAt]),
        ];
    }

    /**
     * The values of a new block.
     *
     * @return array<string, mixed>
     */
    public function defaults(): array
    {
        return Field::cleanFields($this->fields, []);
    }

    /**
     * Stored values cleaned by the definition: only the declared fields, in
     * their order, each of its type, links and pictures through the address
     * rules, defaults where a value is missing or invalid.
     *
     * @param  array<mixed>  $values
     * @return array<string, mixed>
     */
    public function clean(array $values): array
    {
        return Field::cleanFields($this->fields, $values);
    }

    /**
     * The block's HTML from its view. Pass cleaned values.
     *
     * @param  array<string, mixed>  $values
     * @param  array<mixed>  $block
     */
    public function render(array $values, array $block, RenderContext $context): string
    {
        if ($this->view === null) {
            return '';
        }

        return view($this->view, ['values' => $values, 'block' => $block, 'context' => $context])->render();
    }
}
