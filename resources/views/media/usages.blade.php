<div class="fbe-media-usages">
    @if ($usages)
        <p class="fbe-media-usages-title">Used in</p>
        <ul>
            @foreach ($usages as $usage)<li>{{ $usage }}</li>@endforeach
        </ul>
    @else
        <p>This file is not used in saved content.</p>
    @endif
</div>
