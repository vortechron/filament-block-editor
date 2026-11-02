<section class="board">
    <h2>{{ $values['heading'] }}</h2>
    @if ($values['link'])<a href="{{ $values['link'] }}">go</a>@endif
    <ul>@foreach ($values['items'] as $item)<li>{{ $item['name'] }}</li>@endforeach</ul>
    <i data-for-builder="{{ $context->forBuilder ? 'yes' : 'no' }}" data-block-type="{{ $block['type'] ?? 'none' }}"></i>
</section>
