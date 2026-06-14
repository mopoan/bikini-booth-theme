/**
 * Homepage mobile only: set first-section offset to exact fixed header height (no white gap).
 */
(function () {
  var MOBILE_MAX = 1024;

  function syncIndexHeaderOffset() {
    if (
      !document.body.classList.contains('template-index') &&
      !document.body.classList.contains('template--index')
    ) {
      return;
    }

    var header = document.querySelector('fixed-headergroup.fixed-header-group');
    var firstSection = document.querySelector(
      'fixed-headergroup.fixed-header-group + #MainContent > .shopify-section:first-child'
    );

    if (!header || !firstSection) return;

    if (window.innerWidth > MOBILE_MAX) {
      document.documentElement.style.removeProperty('--bb-index-header-height');
      firstSection.style.marginTop = '';
      return;
    }

    var height = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--bb-index-header-height', height + 'px');
    firstSection.style.marginTop = height + 'px';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncIndexHeaderOffset);
  } else {
    syncIndexHeaderOffset();
  }

  window.addEventListener('resize', syncIndexHeaderOffset);
  window.addEventListener('load', syncIndexHeaderOffset);

  if (typeof ResizeObserver !== 'undefined') {
    var headerEl = document.querySelector('fixed-headergroup.fixed-header-group');
    if (headerEl) {
      new ResizeObserver(syncIndexHeaderOffset).observe(headerEl);
    }
  }
})();
