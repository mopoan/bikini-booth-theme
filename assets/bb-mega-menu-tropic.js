/**
 * Bikini Booth — Tropic-style mega menu: swap 3 product images by hovered collection link.
 */
(function () {
  var megaTopRaf = null;

  /**
   * Align fixed mega panels under the full sticky header strip (announcement + main header).
   * Using only `.section-header` missed the announcement bar and caused wrong `top` / perceived drift.
   */
  function syncMegaMenuTop() {
    var sectionHeader =
      document.querySelector('.fixed-header-group .section-header') ||
      document.querySelector('fixed-headergroup .section-header') ||
      document.querySelector('.section-header');
    var announcement = document.querySelector('[data-section-name="announcement-bar-header"]');
    if (!sectionHeader) return;
    var bottom = sectionHeader.getBoundingClientRect().bottom;
    if (announcement) {
      bottom = Math.max(bottom, announcement.getBoundingClientRect().bottom);
    }
    document.documentElement.style.setProperty('--bb-mega-top', Math.round(bottom + 4) + 'px');
  }

  function scheduleMegaMenuTop() {
    if (megaTopRaf != null) {
      cancelAnimationFrame(megaTopRaf);
    }
    megaTopRaf = requestAnimationFrame(function () {
      megaTopRaf = null;
      syncMegaMenuTop();
    });
  }

  window.addEventListener('resize', scheduleMegaMenuTop, { passive: true });
  window.addEventListener('scroll', scheduleMegaMenuTop, { passive: true });
  document.addEventListener('shopify:section:load', syncMegaMenuTop);

  function padImages(arr) {
    var out = (arr || []).slice();
    if (!out.length) return [];
    while (out.length < 3) {
      out.push(out[out.length - 1] || out[0]);
    }
    return out.slice(0, 3);
  }

  function renderShots(container, images) {
    var list = padImages(images);
    if (!list.length) {
      var ph =
        '<span class="bb-mega-tropic__shot bb-mega-tropic__shot--placeholder" aria-hidden="true"><span class="bb-mega-tropic__shot-inner"></span></span>';
      container.innerHTML = ph + ph + ph;
      return;
    }
    container.innerHTML = list
      .map(function (item) {
        var title = (item.title || '').replace(/</g, '&lt;');
        return (
          '<a href="' +
          (item.url || '#') +
          '" class="bb-mega-tropic__shot">' +
          '<span class="bb-mega-tropic__shot-inner">' +
          '<img src="' +
          (item.src || '') +
          '" alt="' +
          title +
          '" loading="lazy" width="600" height="800" />' +
          '</span></a>'
        );
      })
      .join('');
  }

  function parseMap(root) {
    var el = root.querySelector('script.bb-mega-json[type="application/json"]');
    if (!el) return {};
    try {
      return JSON.parse(el.textContent.trim());
    } catch (e) {
      return {};
    }
  }

  function initRoot(root) {
    if (root.getAttribute('data-bb-mega-inited') === '1') {
      return;
    }
    root.setAttribute('data-bb-mega-inited', '1');
    var map = parseMap(root);
    var shots = root.querySelector('[data-bb-mega-shots]');
    if (!shots) return;

    var links = root.querySelectorAll('[data-bb-collection]');
    if (!links.length) return;

    function setActive(el) {
      links.forEach(function (a) {
        a.classList.toggle('is-bb-mega-active', a === el);
      });
    }

    function showKey(key) {
      var imgs = map[key];
      if (!imgs || !imgs.length) {
        imgs = map[Object.keys(map)[0]] || [];
      }
      renderShots(shots, imgs);
    }

    var first = links[0];
    var firstKey = first && first.getAttribute('data-bb-collection');
    if (first) {
      setActive(first);
      if (firstKey) {
        showKey(firstKey);
      }
    }

    links.forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        var key = link.getAttribute('data-bb-collection');
        setActive(link);
        showKey(key);
      });
      link.addEventListener('focus', function () {
        var key = link.getAttribute('data-bb-collection');
        setActive(link);
        showKey(key);
      });
    });

    var container = root.closest('.submenu-container');
    if (container) {
      container.addEventListener('mouseenter', function () {
        if (firstKey) {
          setActive(first);
          showKey(firstKey);
        }
      });
    }
  }

  document.addEventListener('shopify:section:load', init);

  function init() {
    syncMegaMenuTop();
    document.querySelectorAll('[data-bb-mega-root]').forEach(initRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
