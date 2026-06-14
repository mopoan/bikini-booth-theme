/**
 * Bikini Booth — PDP desktop gallery: keep vertical thumb rail in-flow beside the main Swiper.
 * After Swiper init (~100ms) the theme’s absolute thumb rail + stacking often paints the main carousel
 * over the rail (thumbs vanish; only a slice of a video play icon may remain). CSS alone can lose
 * to order/specificity, so we re-apply layout on slide_inited / resize.
 * Also sets --bb-gallery-match-h so rail + main media height track the product column (and each other),
 * capped by the viewport; the rail scrolls when there are many thumbs.
 */
(function () {
  var DESKTOP = '(min-width: 1025px)';

  function isDesktop() {
    return typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP).matches;
  }

  function clearInlineLayout(container, rail, swiperHost) {
    var props = [
      'display',
      'flex-direction',
      'flex-wrap',
      'align-items',
      'gap',
      'overflow',
      'position',
      'left',
      'top',
      'right',
      'width',
      'min-width',
      'flex',
      'height',
      'max-height',
      'z-index',
      'opacity',
      'visibility',
      'transform',
      'order',
      'margin-left',
      'margin-right',
    ];
    props.forEach(function (p) {
      if (container) container.style.removeProperty(p);
      if (rail) rail.style.removeProperty(p);
      if (swiperHost) swiperHost.style.removeProperty(p);
    });
    if (container) container.style.removeProperty('--bb-gallery-match-h');
  }

  /**
   * Cap gallery + thumb rail to the product info column height (so the rail does not trail below),
   * never exceeding the viewport under the header. Sets --bb-gallery-match-h on the swiper container.
   */
  function updateGalleryMatchHeight(container) {
    if (!container) return;
    var section = container.closest('[data-section-name="main-product"]');
    if (!section || !section.classList.contains('bb-main-product--tropic')) {
      return;
    }
    if (!window.matchMedia || !window.matchMedia(DESKTOP).matches) {
      container.style.removeProperty('--bb-gallery-match-h');
      return;
    }
    var rightCol = section.querySelector('.main-product__container .product__column');
    if (!rightCol) {
      container.style.removeProperty('--bb-gallery-match-h');
      return;
    }
    var colH = Math.ceil(rightCol.getBoundingClientRect().height);
    if (colH < 8) {
      return;
    }
    var headerReserve = 112;
    var viewportCap = Math.max(280, window.innerHeight - headerReserve);
    var cap = Math.min(colH, viewportCap);

    function commit(h) {
      container.style.setProperty('--bb-gallery-match-h', Math.max(1, Math.round(h)) + 'px');
    }

    commit(cap);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var swiperHost = container.querySelector('swiper-slider.swiper');
        var media = swiperHost && swiperHost.querySelector('.swiper-slide-active .product-media__item');
        if (!media) return;
        var mh = Math.ceil(media.getBoundingClientRect().height);
        if (mh < 8) return;
        commit(Math.min(cap, mh));
      });
    });
  }

  function applyThumbRail(container) {
    if (!container || !container.closest('.product--thumbnail_slider')) return;
    if (!container.closest('[data-section-name="main-product"].bb-main-product--tropic')) return;
    if (container.classList.contains('swiper-thumb__horizontal')) return;

    var rail = container.querySelector('.swiper-thumb__container--vertical');
    var swiperHost = container.querySelector('swiper-slider.swiper');
    if (!rail || !swiperHost) return;

    if (!isDesktop()) {
      clearInlineLayout(container, rail, swiperHost);
      updateGalleryMatchHeight(container);
      return;
    }

    updateGalleryMatchHeight(container);

    container.style.setProperty('display', 'flex', 'important');
    container.style.setProperty(
      'flex-direction',
      container.closest('.flip-product-content') ? 'row-reverse' : 'row',
      'important'
    );
    container.style.setProperty('flex-wrap', 'nowrap', 'important');
    container.style.setProperty('align-items', 'flex-start', 'important');
    container.style.setProperty('gap', '12px', 'important');
    container.style.setProperty('overflow', 'visible', 'important');

    rail.style.setProperty('position', 'relative', 'important');
    rail.style.setProperty('left', 'auto', 'important');
    rail.style.setProperty('top', 'auto', 'important');
    rail.style.setProperty('right', 'auto', 'important');
    rail.style.setProperty('width', '85px', 'important');
    rail.style.setProperty('min-width', '72px', 'important');
    rail.style.setProperty('flex', '0 0 auto', 'important');
    rail.style.setProperty('height', 'auto', 'important');
    rail.style.setProperty('z-index', '80', 'important');
    rail.style.setProperty('opacity', '1', 'important');
    rail.style.setProperty('visibility', 'visible', 'important');
    rail.style.setProperty('transform', 'none', 'important');
    rail.style.setProperty('order', '0', 'important');

    swiperHost.style.setProperty('position', 'relative', 'important');
    swiperHost.style.setProperty('z-index', '0', 'important');
    swiperHost.style.setProperty('margin-left', '0', 'important');
    swiperHost.style.setProperty('margin-right', '0', 'important');
    swiperHost.style.setProperty('flex', '1 1 0', 'important');
    swiperHost.style.setProperty('min-width', '0', 'important');
    swiperHost.style.setProperty('order', '1', 'important');
  }

  function bindContainer(container) {
    if (!container || container.getAttribute('data-bb-pdp-gallery') === '1') return;
    if (!container.querySelector('.swiper-thumb__container--vertical')) return;

    container.setAttribute('data-bb-pdp-gallery', '1');

    var swiperHost = container.querySelector('swiper-slider.swiper');
    var section = container.closest('[data-section-name="main-product"]');
    var rightCol = section && section.querySelector('.main-product__container .product__column');

    var run = function () {
      applyThumbRail(container);
    };

    if (swiperHost) {
      swiperHost.addEventListener('slide_inited', run);
      swiperHost.addEventListener('slide_changed_custom', run);
    }

    if (rightCol && typeof ResizeObserver !== 'undefined') {
      var roWait;
      var ro = new ResizeObserver(function () {
        clearTimeout(roWait);
        roWait = setTimeout(run, 48);
      });
      ro.observe(rightCol);
      if (section) ro.observe(section);
    }

    var resizeT;
    window.addEventListener(
      'resize',
      function () {
        clearTimeout(resizeT);
        resizeT = setTimeout(run, 120);
      },
      { passive: true }
    );

    run();
    requestAnimationFrame(run);
    setTimeout(run, 0);
    setTimeout(run, 120);
    setTimeout(run, 320);
    setTimeout(run, 700);
  }

  function scan() {
    document
      .querySelectorAll(
        '[data-section-name="main-product"].bb-main-product--tropic .product--thumbnail_slider swiper-slider-container.swiper-slider__container'
      )
      .forEach(bindContainer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  document.addEventListener('shopify:section:load', scan);
})();
