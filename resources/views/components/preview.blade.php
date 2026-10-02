@props(['block'])

<div
    {{ $attributes->class(['fbe-block-preview']) }}
    x-data="{
        observer: null,
        fit() {
            const canvas = this.$refs.canvas;
            const width = this.$el.clientWidth;
            const height = this.$el.clientHeight;
            const scale = Math.min(width / 1200, height / Math.max(canvas.scrollHeight, 1));
            canvas.style.transform = `translate(${(width - 1200 * scale) / 2}px, ${(height - canvas.scrollHeight * scale) / 2}px) scale(${scale})`;
        },
        init() {
            this.observer = new ResizeObserver(() => this.fit());
            this.observer.observe(this.$el);
            this.observer.observe(this.$refs.canvas);
            this.$nextTick(() => this.fit());
        },
        destroy() { this.observer?.disconnect(); }
    }"
>
    <div class="fbe-block-preview-canvas" x-ref="canvas" inert aria-hidden="true">
        <x-filament-block-editor::block :block="$block" :preview="true" />
    </div>
</div>
