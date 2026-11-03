{{-- The core FAQ block (Blocks\CoreBlocks): questions that open one by one, native <details>, no script. --}}
<div class="fbe-faq">
    @if (filled($values['heading']))
        <h2 class="fbe-core-heading">{{ $values['heading'] }}</h2>
    @endif
    <div class="fbe-faq-items">
        @foreach ($values['items'] as $index => $item)
            @if (filled($item['question']))
                <details class="fbe-faq-item" @if ($index === 0 && $values['open_first']) open @endif>
                    <summary>{{ $item['question'] }}</summary>
                    <div class="fbe-faq-answer">{!! nl2br(e($item['answer']), false) !!}</div>
                </details>
            @endif
        @endforeach
    </div>
</div>
