<?php

namespace Vortechron\FilamentBlockEditor\Blocks;

use Illuminate\Support\Str;
use InvalidArgumentException;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

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
