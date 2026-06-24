(function () {
  function getWishlistHandles(reverse) {
    var raw = localStorage.getItem('productDataWishlist');
    if (!raw) return [];
    var map = JSON.parse(raw);
    var handles = [];
    for (var key in map) {
      if (Object.prototype.hasOwnProperty.call(map, key)) handles.push(map[key]);
    }
    if (reverse) handles.reverse();
    return handles;
  }

  function updateCounts(root) {
    if (!root) return;
    var handles = getWishlistHandles(false);
    var count = handles.length;
    root.querySelectorAll('[data-bb-wishlist-count]').forEach(function (el) {
      el.textContent = String(count);
    });
    root.querySelectorAll('[data-bb-wishlist-count-label]').forEach(function (el) {
      var text = count === 1 ? '1 item saved' : count + ' items saved';
      var textEl = el.querySelector('.bb-wishlist-toolbar__count-text');
      if (textEl) {
        textEl.textContent = text;
      } else {
        el.textContent = text;
      }
    });
    var cta = root.querySelector('[data-bb-wishlist-cta]');
    if (cta) {
      if (count > 0) cta.classList.remove('hide');
      else cta.classList.add('hide');
    }
    var page = root.querySelector('wishlist-page[data-view="wishlist_tropic"]');
    if (page) {
      var inlineEmpty = page.querySelector('[data-bb-wishlist-empty]');
      var grid = page.querySelector('.wishlist-ajax-content');
      if (inlineEmpty) {
        if (count > 0) inlineEmpty.classList.add('hide');
        else inlineEmpty.classList.remove('hide');
      }
      if (count === 0 && grid) grid.innerHTML = '';
    }
  }

  function reloadWishlist(page, reverse) {
    var handles = getWishlistHandles(reverse);
    if (!handles.length) return;
    var handleStr = handles.join('||') + '||';
    var settings = page.getAttribute('data-settings') || '';
    var view = page.getAttribute('data-view') || 'wishlist_ajax';
    fetch(window.routes.all_products_collection_url + '?view=' + view + '&sort_by=' + handleStr + settings)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var target = page.querySelector('.wishlist-ajax-content');
        if (target) target.innerHTML = html;
        updateCounts(page.closest('.bb-wishlist-page') || page);
      });
  }

  function initPage(page) {
    if (!page || page.dataset.bbWishlistInit === 'true') return;
    page.dataset.bbWishlistInit = 'true';
    var root = page.closest('.bb-wishlist-page') || page;

    updateCounts(root);

    var ajaxTarget = page.querySelector('.wishlist-ajax-content');
    if (ajaxTarget) {
      new MutationObserver(function () {
        updateCounts(root);
      }).observe(ajaxTarget, { childList: true });
    }

    var sort = root.querySelector('[data-bb-wishlist-sort]');
    if (sort) {
      sort.addEventListener('change', function () {
        reloadWishlist(page, sort.value === 'oldest');
      });
    }

    window.addEventListener('wishlistUpdated', function () {
      updateCounts(root);
    });

    setTimeout(function () {
      updateCounts(root);
    }, 800);
  }

  document.querySelectorAll('wishlist-page[data-view="wishlist_tropic"]').forEach(initPage);

  document.addEventListener('shopify:section:load', function (event) {
    var page = event.target.querySelector('wishlist-page[data-view="wishlist_tropic"]');
    if (page) initPage(page);
  });
})();
