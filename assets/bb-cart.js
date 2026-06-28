/* ============================================================
   Bikini Booth — cart enhancements (Stage 2)
   ------------------------------------------------------------
   • "Complete the Look": auto Top<->Bottom pairing from /products.json
       title convention  "[Style] [Piece] in [Colour]".
   • "Add a Finishing Touch": server-rendered (metafield) — revealed here
       unless it duplicates the auto pick.
   • Size selection, add-to-cart, and the image popover for both blocks.
   The note accordion is native <details> and needs no JS.
   ============================================================ */
(function () {
  'use strict';
  window.BB = window.BB || {};

  var CATALOG_KEY = 'bb_all_products';
  var CATALOG_TTL = 1000 * 60 * 30;            // 30 min session cache
  var ZOOM_SVG = '<svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L20 20M8 10.5h5M10.5 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var PLUS_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* ---------- helpers ---------- */
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }

  function imgUrl(src, w){ if(!src) return ''; return src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=' + w; }

  // "[Style] [Piece] in [Colour]" -> {style, piece:'top'|'bottom', color}
  function parseTitle(t){
    if(!t) return null;
    var low = t.toLowerCase();
    var at = low.lastIndexOf(' in ');
    if(at < 0) return null;
    var left = t.slice(0, at), color = t.slice(at + 4).trim().toLowerCase();
    var ll = left.toLowerCase(), piece = null;
    if(/\bbottom(s)?\b/.test(ll)) piece = 'bottom';
    else if(/\btop(s)?\b/.test(ll)) piece = 'top';
    if(!piece || !color) return null;
    var style = left.replace(/\bbottoms?\b/i, '').replace(/\btops?\b/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
    return { style: style, color: color, piece: piece };
  }

  function formatMoney(cents, fmt){
    fmt = fmt || window.BB.moneyFormat || '${{amount}}';
    function fmtNum(num, precision, thousands, decimal){
      precision = (precision == null) ? 2 : precision;
      thousands = thousands || ','; decimal = decimal || '.';
      if(isNaN(num) || num == null) return '0';
      num = (num / 100).toFixed(precision);
      var parts = num.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      return dollars + (parts[1] ? decimal + parts[1] : '');
    }
    var m = fmt.match(/\{\{\s*(\w+)\s*\}\}/), value;
    switch(m && m[1]){
      case 'amount_no_decimals': value = fmtNum(cents, 0); break;
      case 'amount_with_comma_separator': value = fmtNum(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = fmtNum(cents, 0, '.', ','); break;
      case 'amount_with_space_separator': value = fmtNum(cents, 2, ' ', ','); break;
      default: value = fmtNum(cents, 2);
    }
    return fmt.replace(/\{\{\s*\w+\s*\}\}/, value);
  }

  /* ---------- catalogue (/products.json, cached) ---------- */
  function getCatalog(){
    try {
      var cached = JSON.parse(sessionStorage.getItem(CATALOG_KEY) || 'null');
      if(cached && cached.ts && (Date.now() - cached.ts) < CATALOG_TTL && cached.items)
        return Promise.resolve(cached.items);
    } catch(e){}
    var all = [];
    function page(p){
      return fetch('/products.json?limit=250&page=' + p, { headers: { 'Accept': 'application/json' } })
        .then(function(r){ return r.ok ? r.json() : { products: [] }; })
        .then(function(d){
          var items = (d && d.products) || [];
          all = all.concat(items);
          if(items.length === 250 && p < 20) return page(p + 1);
          try { sessionStorage.setItem(CATALOG_KEY, JSON.stringify({ ts: Date.now(), items: all })); } catch(e){}
          return all;
        });
    }
    return page(1).catch(function(){ return []; });
  }

  // Live cart contents, refreshed after AJAX add / theme cartUpdate.
  // Falls back to the server-rendered context JSON on first load.
  var liveCart = null;
  function mapCart(items){
    return (items || []).map(function(i){
      return { id: i.product_id, handle: i.handle, title: i.product_title, type: i.product_type };
    });
  }
  function cartContext(){
    if(liveCart) return liveCart;
    var el = document.querySelector('[data-bb-cart-context]');
    if(!el) return [];
    try { return JSON.parse(el.textContent) || []; } catch(e){ return []; }
  }

  /* ---------- build the "Complete the Look" product card ---------- */
  function pairedCardHTML(product, shownPiece){
    var avail = product.variants.filter(function(v){ return v.available; });
    var def = avail[0] || product.variants[0];
    var src = (product.images && product.images[0] && product.images[0].src) || '';
    var single = product.variants.length === 1 && /default/i.test(product.variants[0].title || '');
    var cents = Math.round(parseFloat(def.price) * 100);

    var sizes = '';
    if(!single){
      sizes = '<div class="bb-rec__sizes" role="group" aria-label="Size">' + product.variants.map(function(v){
        var cls = 'bb-rec__size' + (v.id === def.id ? ' is-active' : '') + (v.available ? '' : ' is-soldout');
        return '<button type="button" class="' + cls + '" data-variant-id="' + v.id + '"' +
               (v.available ? '' : ' aria-disabled="true" data-tip="' + esc(window.BB.soldOutLabel || 'Out of stock') + '"') +
               '>' + esc(v.title) + '</button>';
      }).join('') + '</div>';
    }

    var price = formatMoney(cents) + (single ? ' &middot; ' + esc(window.BB.oneSizeLabel || 'One Size') : '');
    var addLabel = esc(window.BB.addLabel || 'Add');

    return '' +
      '<div class="bb-rec__row">' +
        '<a class="bb-rec__thumb bb-rec__thumb--' + (shownPiece === 'bottom' ? 'bottom' : 'top') + '" href="/products/' + esc(product.handle) + '"' +
           ' data-bb-zoom data-full="' + esc(imgUrl(src, 720)) + '" role="button" aria-label="View full image of ' + esc(product.title) + '">' +
          (src ? '<img src="' + esc(imgUrl(src, 300)) + '" loading="lazy" alt="' + esc(product.title) + '">' : '') +
          '<span class="bb-rec__zoom" aria-hidden="true">' + ZOOM_SVG + '</span>' +
        '</a>' +
        '<div class="bb-rec__meta">' +
          (product.vendor ? '<p class="bb-rec__brand">' + esc(product.vendor) + '</p>' : '') +
          '<a class="bb-rec__name" href="/products/' + esc(product.handle) + '">' + esc(product.title) + '</a>' +
          '<p class="bb-rec__price">' + price + '</p>' +
          sizes +
        '</div>' +
        '<div class="bb-rec__cta">' +
          '<button class="bb-rec__add" type="button" data-bb-add data-variant-id="' + def.id + '" data-title="' + esc(product.title) + '"' +
            (avail.length ? '' : ' disabled') + '>' + PLUS_SVG + '<span>' + addLabel + '</span></button>' +
        '</div>' +
      '</div>';
  }

  /* ---------- engine ---------- */
  function runEngine(){
    var pairAside = document.querySelector('[data-bb-rec="pair"]');
    var compAside = document.querySelector('[data-bb-rec="comp"]');
    if(!pairAside && !compAside) return;

    var ctx = cartContext();
    var cartIds = ctx.map(function(i){ return i.id; });

    getCatalog().then(function(catalog){
      // index catalogue by "style|colour" -> { top, bottom }
      var index = {};
      catalog.forEach(function(p){
        var info = parseTitle(p.title);
        if(!info) return;
        var key = info.style + '|' + info.color;
        index[key] = index[key] || {};
        if(!index[key][info.piece]) index[key][info.piece] = p;   // first wins
      });

      // first eligible swimwear line in the cart
      var match = null, wantPiece = null;
      for(var i = 0; i < ctx.length; i++){
        var info = parseTitle(ctx[i].title);
        if(!info) continue;
        wantPiece = info.piece === 'top' ? 'bottom' : 'top';
        var cand = (index[info.style + '|' + info.color] || {})[wantPiece];
        if(cand && cartIds.indexOf(cand.id) === -1 && cand.variants.some(function(v){ return v.available; })){
          match = cand; break;
        }
        wantPiece = null;
      }

      var pairedId = null;
      if(pairAside){
        var slot = pairAside.querySelector('[data-bb-rec-slot]');
        if(match){
          slot.innerHTML = pairedCardHTML(match, wantPiece);
          pairedId = match.id;
          pairAside.hidden = false;
        } else {
          slot.innerHTML = '';
          pairAside.hidden = true;
        }
      }

      // reveal the complementary block unless it duplicates the auto pick
      if(compAside){
        var compId = Number(compAside.getAttribute('data-product-id'));
        compAside.hidden = (pairedId && compId === pairedId) ? true : false;
      }

      window.BB.productData = catalog;
      document.dispatchEvent(new CustomEvent('bb:productDataReady', { detail: { count: catalog.length } }));
    });
  }

  /* ---------- size pills + add-to-cart (delegated) ---------- */
  document.addEventListener('click', function(e){
    var pill = e.target.closest && e.target.closest('.bb-rec__size');
    if(pill && !pill.classList.contains('is-soldout')){
      var group = pill.parentNode, card = pill.closest('.bb-rec__row') || pill.closest('.bb-rec');
      group.querySelectorAll('.bb-rec__size').forEach(function(b){ b.classList.remove('is-active'); });
      pill.classList.add('is-active');
      var add = card && card.querySelector('[data-bb-add]');
      if(add) add.setAttribute('data-variant-id', pill.getAttribute('data-variant-id'));
      return;
    }
    var add = e.target.closest && e.target.closest('[data-bb-add]');
    if(add){ e.preventDefault(); addToCart(add); }
  });

  // Section list the theme's cart.js patches (mirror getSectionsToRender()).
  function cartSections(){
    var items = document.getElementById('main-cart-items');
    var footer = document.getElementById('main-cart-footer');
    var iconA = document.getElementById('cart-icon-bubble-short') ? 'cart-icon-bubble-short' : 'cart-icon-bubble';
    var iconB = document.getElementById('cart-icon-bubble--mobile-short') ? 'cart-icon-bubble--mobile-short' : 'cart-icon-bubble--mobile';
    return [
      { id: 'main-cart-items', section: items && items.dataset.id, selector: '.js-contents' },
      { id: iconA, section: iconA, selector: '.shopify-section' },
      { id: iconB, section: iconB, selector: '.shopify-section' },
      { id: 'cart-live-region-text', section: 'cart-live-region-text', selector: '.shopify-section' },
      { id: 'main-cart-footer', section: footer && footer.dataset.id, selector: '.js-contents' }
    ].filter(function(s){ return s.section; });
  }

  function sectionInnerHTML(html, selector){
    if(!html) return null;
    var t = new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
    return t ? t.innerHTML : null;
  }

  function addToCart(btn){
    var id = Number(btn.getAttribute('data-variant-id'));
    if(!id) return;
    btn.disabled = true; btn.classList.add('is-loading');
    var sections = cartSections();
    fetch((window.BB.cartAddUrl || '/cart/add') + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        items: [{ id: id, quantity: 1 }],
        sections: sections.map(function(s){ return s.section; }),
        sections_url: window.location.pathname
      })
    })
    .then(function(r){ if(!r.ok) throw new Error('add failed'); return r.json(); })
    .then(function(data){
      // No sections in the response (older API/theme) → fall back to reload.
      if(!data || !data.sections){ window.location.reload(); return; }
      // Patch each section exactly like the theme's updateQuantity() does.
      sections.forEach(function(s){
        var root = document.getElementById(s.id);
        if(!root) return;
        var target = root.querySelector(s.selector) || root;
        var content = sectionInnerHTML(data.sections[s.section], s.selector);
        if(content !== null) target.innerHTML = content;
      });
      // Refresh the free-shipping bar (it sits outside .js-contents). Parse the
      // returned items section robustly rather than the theme's string-split.
      var itemsSec = sections[0] && data.sections[sections[0].section];
      var liveShip = document.getElementById('cart-page-free-delivery');
      if(itemsSec && liveShip){
        var freshShip = new DOMParser().parseFromString(itemsSec, 'text/html').querySelector('#cart-page-free-delivery');
        if(freshShip) liveShip.innerHTML = freshShip.innerHTML;
      }
      // Pull fresh cart contents so the engine re-pairs against the new cart.
      fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(cart){ if(cart) liveCart = mapCart(cart.items); })
        .catch(function(){})
        .then(function(){ runEngine(); alignSummary(); });
    })
    .catch(function(){ btn.disabled = false; btn.classList.remove('is-loading'); });
  }

  /* ---------- image popover (image only, anchored) ---------- */
  var open = null, lastFocus = null;
  var X_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function closeZoom(){ if(!open) return; open.scrim.remove(); open = null; document.body.style.overflow = '';
    if(lastFocus && lastFocus.focus) lastFocus.focus(); }

  function placeZoom(card, thumb){
    if(window.matchMedia('(max-width:560px)').matches) return;   // CSS centres
    var r = thumb.getBoundingClientRect(), cw = card.offsetWidth, ch = card.offsetHeight,
        gap = 14, vw = innerWidth, vh = innerHeight, pad = 8;
    var left = r.right + gap;
    if(left + cw > vw - pad) left = r.left - gap - cw;
    if(left < pad) left = Math.max(pad, (vw - cw) / 2);
    var top = r.top + r.height / 2 - ch / 2;
    top = Math.min(Math.max(pad, top), vh - ch - pad);
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }

  function openZoom(thumb){
    var full = thumb.getAttribute('data-full'); if(!full) return;
    closeZoom(); lastFocus = thumb;
    var scrim = document.createElement('div'); scrim.className = 'bb-zoom-scrim';
    var card = document.createElement('div'); card.className = 'bb-zoom';
    card.innerHTML = '<button class="bb-zoom__x" aria-label="Close image">' + X_SVG + '</button>' +
                     '<div class="bb-zoom__img" role="img" aria-label="Full product image"></div>';
    card.querySelector('.bb-zoom__img').style.backgroundImage = 'url("' + full + '")';
    scrim.appendChild(card); document.body.appendChild(scrim);
    placeZoom(card, thumb); document.body.style.overflow = 'hidden'; open = { scrim: scrim };
    card.addEventListener('click', function(e){ e.stopPropagation(); });
    card.querySelector('.bb-zoom__x').addEventListener('click', closeZoom);
    scrim.addEventListener('click', closeZoom);
    card.querySelector('.bb-zoom__x').focus();
  }

  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('[data-bb-zoom]');
    if(t){ e.preventDefault(); e.stopPropagation(); openZoom(t); }
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ closeZoom(); return; }
    var a = document.activeElement;
    if((e.key === 'Enter' || e.key === ' ') && a && a.hasAttribute && a.hasAttribute('data-bb-zoom')){ e.preventDefault(); openZoom(a); }
  });
  addEventListener('resize', closeZoom);

  /* ---------- align the sticky summary top with the items column ----------
     The "Your Cart" heading lives in the left column, so the right column would
     otherwise start at the title. Measure where the items actually begin (the
     #cart form) and offset the summary section to match. Desktop only. */
  function alignSummary(){
    var footer = document.querySelector('[id^="shopify-section"][id$="__cart-footer"]');
    if(!footer) return;
    if(!window.matchMedia('(min-width: 990px)').matches){ footer.style.marginTop = ''; return; }
    var heading = document.querySelector('.bb-cart__heading');
    var anchor = document.getElementById('cart-page-free-delivery')
              || document.getElementById('cart')
              || (heading && heading.nextElementSibling);
    if(!anchor) return;
    footer.style.marginTop = '0px';
    var delta = anchor.getBoundingClientRect().top - footer.getBoundingClientRect().top;
    footer.style.marginTop = (delta > 0 ? Math.round(delta) : 0) + 'px';
  }
  var _alignT;
  function scheduleAlign(){ clearTimeout(_alignT); _alignT = setTimeout(alignSummary, 60); }
  addEventListener('resize', scheduleAlign);
  addEventListener('load', alignSummary);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(alignSummary);

  /* ---------- init + re-run when the cart re-renders ---------- */
  function init(){
    runEngine();
    alignSummary();
    setTimeout(alignSummary, 400);
    var host = document.getElementById('main-cart-items');
    if(host && window.MutationObserver){
      var t;
      new MutationObserver(function(){ clearTimeout(t); t = setTimeout(function(){ runEngine(); alignSummary(); }, 120); })
        .observe(host, { childList: true, subtree: true });
    }
    // Keep recs correct after theme-driven changes (qty change, remove).
    try {
      if(typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined' && PUB_SUB_EVENTS.cartUpdate){
        subscribe(PUB_SUB_EVENTS.cartUpdate, function(event){
          if(event && event.cartData && event.cartData.items) liveCart = mapCart(event.cartData.items);
          setTimeout(function(){ runEngine(); alignSummary(); }, 60);
        });
      }
    } catch(e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
