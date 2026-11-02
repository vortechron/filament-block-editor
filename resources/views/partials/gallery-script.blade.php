{{-- Arrows and dots for the photo slideshow blocks. Without it the photos still swipe. --}}
<script>
(function () {
    function start(gallery) {
        var track = gallery.querySelector('[data-gallery-track]');
        var controls = gallery.querySelector('[data-gallery-controls]');
        if (!track || !controls || controls.dataset.ready) return;
        controls.dataset.ready = '1';
        controls.hidden = false;
        function width() { return track.clientWidth || 1; }
        function current() { return Math.round(track.scrollLeft / width()); }
        function show(index) {
            var count = track.children.length;
            track.scrollTo({ left: ((index + count) % count) * width(), behavior: 'smooth' });
        }
        controls.addEventListener('click', function (event) {
            var button = event.target.closest('[data-gallery-step], [data-gallery-dot]');
            if (!button) return;
            show(button.dataset.galleryDot !== undefined ? Number(button.dataset.galleryDot) : current() + Number(button.dataset.galleryStep));
        });
        var frame = 0;
        track.addEventListener('scroll', function () {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(function () {
                gallery.querySelectorAll('[data-gallery-dot]').forEach(function (dot) {
                    if (Number(dot.dataset.galleryDot) === current()) dot.setAttribute('aria-current', 'true');
                    else dot.removeAttribute('aria-current');
                });
            });
        }, { passive: true });
    }
    function init() { document.querySelectorAll('[data-gallery]').forEach(start); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
</script>
