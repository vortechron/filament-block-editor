{{-- The core icon list block (Blocks\CoreBlocks): items with a lucide icon (Support\Icons), in 1 to 4 columns. --}}
@use('Vortechron\FilamentBlockEditor\Support\Icons')
<div class="fbe-icons fbe-icons-{{ $values['columns'] }} fbe-icons-{{ $values['style'] }}">
    @foreach ($values['items'] as $item)
        <div class="fbe-icons-item">
            <span class="fbe-icons-mark">{!! Icons::svg($item['icon']) !!}</span>
            <div>
                @if (filled($item['title']))
                    <h3>{{ $item['title'] }}</h3>
                @endif
                @if (filled($item['text']))
                    <p>{!! nl2br(e($item['text']), false) !!}</p>
                @endif
            </div>
        </div>
    @endforeach
</div>
