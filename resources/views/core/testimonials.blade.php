{{-- The core testimonials block (Blocks\CoreBlocks): quotes with stars, a name, a role and a photo. --}}
<div class="fbe-testimonials">
    @foreach ($values['items'] as $item)
        @php($rating = (int) $item['rating'])
        <figure class="fbe-testimonial">
            @if ($rating > 0)
                <p class="fbe-stars" aria-label="{{ __('filament-block-editor::core.testimonials.stars', ['count' => $rating]) }}">{{ str_repeat('★', $rating) }}<span aria-hidden="true">{{ str_repeat('★', 5 - $rating) }}</span></p>
            @endif
            <blockquote>{!! nl2br(e($item['quote']), false) !!}</blockquote>
            @if (filled($item['name']) || $item['photo'] !== null)
                <figcaption class="fbe-testimonial-by">
                    @if ($item['photo'] !== null)
                        <img src="{{ $item['photo'] }}" alt="" loading="lazy" decoding="async">
                    @endif
                    <span><strong>{{ $item['name'] }}</strong>@if (filled($item['role']))<small>{{ $item['role'] }}</small>@endif</span>
                </figcaption>
            @endif
        </figure>
    @endforeach
</div>
