{{-- An own block with text, a textarea and a list of names, to check short codes like {site.phone}. --}}
<div class="words"><h2>{{ $values['heading'] }}</h2><p>{{ $values['intro'] }}</p><ul>@foreach ($values['items'] as $item)<li>{{ $item['name'] }}</li>@endforeach</ul></div>
