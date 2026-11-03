{{-- The core pricing block (Blocks\CoreBlocks): plans side by side, features one per line, a highlighted plan, and a note. --}}
@use('Vortechron\FilamentBlockEditor\Support\Icons')
<div class="fbe-pricing">
    <div class="fbe-plans">
        @foreach ($values['plans'] as $plan)
            @php
                $features = array_values(array_filter(array_map(trim(...), explode("\n", (string) $plan['features'])), fn (string $line): bool => $line !== ''));
            @endphp
            <div @class(['fbe-plan', 'fbe-plan-highlight' => $plan['highlight']])>
                @if (filled($plan['name']))
                    <h3 class="fbe-plan-name">{{ $plan['name'] }}</h3>
                @endif
                <p class="fbe-plan-price"><span>{{ $plan['price'] }}</span>@if (filled($plan['period']))<small>{{ $plan['period'] }}</small>@endif</p>
                @if ($features !== [])
                    <ul class="fbe-plan-features">
                        @foreach ($features as $feature)
                            <li>{!! Icons::svg('check') !!}<span>{{ $feature }}</span></li>
                        @endforeach
                    </ul>
                @endif
                @if (filled($plan['button_text']))
                    @if ($plan['button_link'] !== null)
                        <a class="bn-button bn-button-{{ $plan['highlight'] ? 'solid' : 'outline' }}" href="{{ $plan['button_link'] }}">{{ $plan['button_text'] }}</a>
                    @else
                        <span class="bn-button bn-button-{{ $plan['highlight'] ? 'solid' : 'outline' }}">{{ $plan['button_text'] }}</span>
                    @endif
                @endif
            </div>
        @endforeach
    </div>
    @if (filled($values['note']))
        <p class="fbe-pricing-note">{{ $values['note'] }}</p>
    @endif
</div>
