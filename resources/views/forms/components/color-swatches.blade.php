<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    <div
        x-data="{
            state: {{ $applyStateBindingModifiers("\$wire.\$entangle('{$getStatePath()}')") }},
            presets: @js($getPresets()),
            allowsNone: @js($allowsNone()),
            disabled: @js($isDisabled()),
            isHex(value) {
                return /^#[0-9a-f]{6}$/i.test(value ?? '')
            },
            get pickerValue() {
                return this.isHex(this.state) ? this.state.toLowerCase() : '#ffffff'
            },
            isSelected(colour) {
                return (this.state ?? '').toLowerCase() === colour.toLowerCase()
            },
            isLight(colour) {
                const [red, green, blue] = [1, 3, 5].map((start) => parseInt(colour.slice(start, start + 2), 16))

                return ((red * 299) + (green * 587) + (blue * 114)) / 1000 >= 128
            },
            choose(colour) {
                if (! this.disabled) {
                    this.state = colour
                }
            },
            typed(value) {
                const trimmed = (value ?? '').trim()

                if (trimmed === '') {
                    this.state = null

                    return
                }

                this.state = trimmed.startsWith('#') ? trimmed : '#' + trimmed
            },
        }"
        {{ $getExtraAttributeBag()->class(['fbe-color-swatches']) }}
    >
        <div class="fbe-color-swatches-row" role="radiogroup">
            <template x-if="allowsNone">
                <button
                    type="button"
                    class="fbe-color-swatch is-none"
                    x-bind:class="{ 'is-selected': ! state }"
                    x-bind:disabled="disabled"
                    x-on:click="choose(null)"
                    title="No colour"
                    aria-label="No colour"
                    role="radio"
                    x-bind:aria-checked="! state"
                >
                    <svg x-show="! state" class="fbe-color-swatch-check" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 10.5l3.5 3.5L15 7" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
            </template>

            <template x-for="colour in presets" x-bind:key="colour">
                <button
                    type="button"
                    class="fbe-color-swatch"
                    x-bind:class="{ 'is-selected': isSelected(colour), 'is-light': isLight(colour) }"
                    x-bind:style="{ backgroundColor: colour }"
                    x-bind:disabled="disabled"
                    x-on:click="choose(colour)"
                    x-bind:title="colour"
                    x-bind:aria-label="colour"
                    role="radio"
                    x-bind:aria-checked="isSelected(colour)"
                >
                    <svg x-show="isSelected(colour)" class="fbe-color-swatch-check" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 10.5l3.5 3.5L15 7" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
            </template>
        </div>

        <div
            class="fbe-color-swatches-custom"
            x-bind:class="{ 'is-invalid': @js($errors->has($getStatePath())) }"
        >
            <label class="fbe-color-well" title="Pick any colour">
                <span class="fbe-color-well-fill" x-bind:style="{ backgroundColor: pickerValue }"></span>
                <input
                    type="color"
                    x-bind:value="pickerValue"
                    x-bind:disabled="disabled"
                    x-on:input="choose($event.target.value)"
                    aria-label="Pick any colour"
                />
            </label>
            <input
                id="{{ $getId() }}"
                type="text"
                class="fbe-color-hex"
                x-bind:value="state ?? ''"
                x-bind:disabled="disabled"
                x-on:change="typed($event.target.value)"
                placeholder="#FFFFFF"
                maxlength="7"
                autocomplete="off"
                spellcheck="false"
            />
        </div>
    </div>
</x-dynamic-component>
