{{-- Pages a visitor flips through with ‹ › (Rendering\Pager). One hidden radio button per page picks the page pager.css shows, so no script is needed. One page is drawn on its own, with no buttons. --}}
@php
    /**
     * @var string $name  Pager::name() of the block
     * @var list<string> $pages  the HTML of each page
     */
    $group = 'fbe-pager-'.$name;
    $total = count($pages);
@endphp
@if ($total <= 1)
{!! $pages[0] ?? '' !!}
@else
<div class="fbe-pager">
    @foreach ($pages as $index => $page)
        <input class="fbe-pager__state" type="radio" name="{{ $group }}" id="{{ $group }}-{{ $index + 1 }}" aria-label="{{ __('filament-block-editor::page.pager.page', ['page' => $index + 1, 'total' => $total]) }}" @checked($index === 0)>
    @endforeach
    @foreach ($pages as $index => $page)
        <div class="fbe-pager__page">
            {!! $page !!}
            <div class="fbe-pager__nav">
                @if ($index > 0)
                    <label class="fbe-pager__step" for="{{ $group }}-{{ $index }}" aria-label="{{ __('filament-block-editor::page.pager.previous') }}">&lsaquo;</label>
                @else
                    <span class="fbe-pager__step" aria-hidden="true">&lsaquo;</span>
                @endif
                <span class="fbe-pager__count">{{ $index + 1 }} / {{ $total }}</span>
                @if ($index + 1 < $total)
                    <label class="fbe-pager__step" for="{{ $group }}-{{ $index + 2 }}" aria-label="{{ __('filament-block-editor::page.pager.next') }}">&rsaquo;</label>
                @else
                    <span class="fbe-pager__step" aria-hidden="true">&rsaquo;</span>
                @endif
            </div>
        </div>
    @endforeach
</div>
@endif
