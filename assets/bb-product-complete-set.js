/**
 * Bikini Booth — Complete the set: main + paired variant in one cart/add.js request.
 * Depends: constants.js, pubsub.js, product-form loading state patterns.
 */
(function () {
  function parseVariants(root) {
    var el = root.querySelector('script[data-bb-pair-variants]');
    if (!el) return [];
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      return [];
    }
  }

  function findVariantForSelection(variants, root) {
    var blockId = root.dataset.blockId;
    var selected = {};
    [1, 2, 3].forEach(function (pos) {
      var inp = root.querySelector('input[name="bb-pair-opt-' + blockId + '-' + pos + '"]:checked');
      if (inp) selected['o' + pos] = inp.value;
    });
    return variants.find(function (v) {
      if (selected.o1 != null && v.option1 !== selected.o1) return false;
      if (selected.o2 != null && v.option2 !== selected.o2) return false;
      if (selected.o3 != null && v.option3 !== selected.o3) return false;
      return true;
    });
  }

  function syncSelectsFromRadios(root) {
    root.querySelectorAll('[data-bb-pair-select]').forEach(function (sel) {
      var pos = sel.getAttribute('data-bb-pair-select');
      var blockId = root.dataset.blockId;
      var checked = root.querySelector(
        'input[name="bb-pair-opt-' + blockId + '-' + pos + '"]:checked'
      );
      if (checked && sel.value !== checked.value) sel.value = checked.value;
    });
  }

  function onPairSelectChange(root, sel) {
    var pos = sel.getAttribute('data-bb-pair-select');
    var blockId = root.dataset.blockId;
    var val = sel.value;
    var name = 'bb-pair-opt-' + blockId + '-' + pos;
    var radios = root.querySelectorAll('input[name="' + name + '"]');
    radios.forEach(function (r) {
      r.checked = r.value === val;
    });
    var picked = root.querySelector('input[name="' + name + '"]:checked');
    if (picked) picked.dispatchEvent(new Event('change', { bubbles: true }));
    updatePairState(root);
  }

  function updatePairState(root) {
    var variants = parseVariants(root);
    var hidden = root.querySelector('[data-bb-complete-set-variant-id]');
    var priceEl = root.querySelector('[data-bb-pair-price]');
    var note = root.querySelector('[data-bb-pair-unavailable]');
    var v = findVariantForSelection(variants, root);
    if (!hidden) return;
    if (v && v.available) {
      hidden.value = v.id;
      hidden.removeAttribute('data-unavailable');
      if (note) note.hidden = true;
      if (priceEl && typeof v.price === 'number' && window.BB && typeof window.BB.formatPresentmentMoney === 'function') {
        priceEl.textContent = window.BB.formatPresentmentMoney(v.price);
      } else if (priceEl && typeof v.price === 'number' && window.BB && typeof window.BB.formatMoney === 'function') {
        var fmt = (window.theme && window.theme.moneyFormat) || (window.BB && window.BB.moneyFormat) || '{{amount}}';
        priceEl.textContent = window.BB.formatMoney(v.price, fmt);
      } else if (priceEl && typeof v.price === 'number' && window.Shopify && typeof window.Shopify.formatMoney === 'function') {
        var fmt = (window.theme && window.theme.moneyFormat) || (window.BB && window.BB.moneyFormat) || '{{amount}}';
        priceEl.textContent = window.Shopify.formatMoney(v.price, fmt);
      }
    } else {
      hidden.value = '';
      hidden.setAttribute('data-unavailable', 'true');
      if (note) note.hidden = false;
    }
  }

  function getProductForm(sectionId) {
    return document.getElementById('product-form-' + sectionId);
  }

  function getProductFormComponent(sectionId) {
    var form = getProductForm(sectionId);
    return form ? form.closest('product-form') : null;
  }

  function setButtonLoading(sectionId, loading) {
    var pf = getProductFormComponent(sectionId);
    if (!pf) return;
    var btn = pf.querySelector('[type="submit"][name="add"]');
    var spin = pf.querySelector('.loading-overlay__spinner');
    if (!btn) return;
    if (loading) {
      btn.setAttribute('aria-disabled', 'true');
      btn.classList.add('loading');
      if (spin) spin.classList.remove('hidden');
    } else {
      btn.classList.remove('loading');
      if (spin) spin.classList.add('hidden');
      btn.removeAttribute('aria-disabled');
    }
  }

  function getCartRoutes() {
    return window.routes || null;
  }

  function postCartAddItems(items, withSectionRender) {
    var cartRoutes = getCartRoutes();
    if (!cartRoutes || !cartRoutes.cart_add_url) {
      return Promise.resolve({ ok: false, state: { status: 500, description: 'Cart unavailable' } });
    }
    var cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
    var payload = {
      items: items.map(function (item) {
        return { id: item.id, quantity: item.quantity };
      }),
    };
    if (withSectionRender && cart && typeof cart.getSectionsToRender === 'function') {
      payload.sections = cart.getSectionsToRender().map(function (section) {
        return section.id;
      });
      payload.sections_url = window.location.pathname;
    }
    return fetch(cartRoutes.cart_add_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/javascript',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (state) {
        return { ok: res.ok, state: state };
      });
    });
  }

  function addBundleItems(mainVariantId, mainQty, pairVariantId, pairQty) {
    var items = [{ id: mainVariantId, quantity: mainQty }];
    if (pairVariantId) {
      items.push({ id: pairVariantId, quantity: pairQty });
    }
    return postCartAddItems(items, true);
  }

  function optionValueAt(variant, position) {
    if (!variant || !position) return '';
    var pos = parseInt(position, 10);
    if (pos === 1) return variant.option1 || '';
    if (pos === 2) return variant.option2 || '';
    if (pos === 3) return variant.option3 || '';
    return '';
  }

  function readPickerOptionValue(picker, position) {
    if (!picker || !position) return '';
    var pos = String(position);
    var fieldset = picker.querySelector('fieldset[data-option-position="' + pos + '"]');
    if (fieldset) {
      var valueEl = fieldset.querySelector('.variants-label__value');
      if (valueEl && valueEl.textContent.trim()) return valueEl.textContent.trim();
      var checked = fieldset.querySelector('input[type="radio"]:checked:not(.disabled)');
      if (!checked) {
        checked = fieldset.querySelector('input[type="radio"]:checked');
      }
      if (checked && checked.value) return checked.value;
    }
    var select = picker.querySelector('select[data-option-position="' + pos + '"]');
    if (select && select.value) return select.value;
    return '';
  }

  function pickBestVariantMatch(matches, picker) {
    if (!matches || !matches.length) return null;
    if (matches.length === 1) return matches[0];
    var available = matches.filter(function (v) {
      return v.available;
    });
    var pool = available.length ? available : matches;
    if (picker && picker.currentVariant) {
      var current = pool.find(function (v) {
        return String(v.id) === String(picker.currentVariant.id);
      });
      if (current) return current;
    }
    return pool[0];
  }

  function readPickerColorValue(picker, colorPos) {
    var label = readPickerOptionValue(picker, colorPos);
    if (label || !picker) return label;
    var fieldsets = picker.querySelectorAll('fieldset[data-option-position]');
    for (var i = 0; i < fieldsets.length; i++) {
      var legend = fieldsets[i].querySelector('.variants-label');
      if (!legend || !/color|colour/i.test(legend.textContent)) continue;
      var valueEl = fieldsets[i].querySelector('.variants-label__value');
      if (valueEl && valueEl.textContent.trim()) return valueEl.textContent.trim();
      var checked = fieldsets[i].querySelector('input[type="radio"]:checked');
      if (checked && checked.value) return checked.value;
    }
    return '';
  }

  function titleCaseLabel(value) {
    if (!value) return '';
    return String(value)
      .toLowerCase()
      .replace(/\b\w/g, function (ch) {
        return ch.toUpperCase();
      });
  }

  function complementaryPiece(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v === 'top') return 'bottom';
    if (v === 'bottom') return 'top';
    return '';
  }

  function updateMainRow(root, variant) {
    var sectionId = root.dataset.sectionId;
    var picker = document.getElementById('variant-selects-' + sectionId);
    var sizePos = root.dataset.bbMainSizeOptionPosition;
    var colorPos = root.dataset.bbMainColorOptionPosition;
    var piecePos = root.dataset.bbMainPieceOptionPosition;
    var sizeLabel = picker ? readPickerOptionValue(picker, sizePos) : '';
    var colorLabel = picker ? readPickerColorValue(picker, colorPos) : '';
    var pieceLabel = picker ? readPickerOptionValue(picker, piecePos) : '';

    if (!sizeLabel && variant) sizeLabel = optionValueAt(variant, sizePos);
    if (!colorLabel && variant) colorLabel = optionValueAt(variant, colorPos);
    if (!pieceLabel && variant) pieceLabel = optionValueAt(variant, piecePos);

    var sz = root.querySelector('[data-bb-main-item-size]');
    if (sz && sizeLabel) sz.textContent = titleCaseLabel(sizeLabel);
    var colorEl = root.querySelector('[data-bb-main-item-color]');
    if (colorEl && colorLabel) colorEl.textContent = titleCaseLabel(colorLabel);
    var pieceEl = root.querySelector('[data-bb-main-item-piece]');
    if (pieceEl && pieceLabel) pieceEl.textContent = titleCaseLabel(pieceLabel);

    if (!variant) return;
    var fmt = (window.theme && window.theme.moneyFormat) || '{{amount}}';
    var priceEl = root.querySelector('[data-bb-main-item-price]');
    if (priceEl && typeof variant.price === 'number') {
      if (window.BB && typeof window.BB.formatPresentmentMoney === 'function') {
        priceEl.textContent = window.BB.formatPresentmentMoney(variant.price);
      } else if (window.BB && typeof window.BB.formatMoney === 'function') {
        priceEl.textContent = window.BB.formatMoney(variant.price, fmt);
      } else if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
        priceEl.textContent = window.Shopify.formatMoney(variant.price, fmt);
      }
    }
  }

  function getSelectedOptionsByPosition(picker) {
    var byPos = {};
    if (!picker) return byPos;
    picker.querySelectorAll('fieldset[data-option-position]').forEach(function (fieldset) {
      var pos = parseInt(fieldset.dataset.optionPosition, 10);
      if (!pos) return;
      var checked = fieldset.querySelector('input[type="radio"]:checked');
      if (checked) byPos[pos] = checked.value;
    });
    picker.querySelectorAll('select[data-option-position]').forEach(function (select) {
      var pos = parseInt(select.dataset.optionPosition, 10);
      if (pos) byPos[pos] = select.value;
    });
    return byPos;
  }

  function variantMatchesByPosition(variant, byPos) {
    for (var i = 1; i <= 3; i++) {
      if (byPos[i] == null || byPos[i] === '') continue;
      var selected = String(byPos[i]).trim().toLowerCase();
      var variantOpt = String(variant['option' + i] || '').trim().toLowerCase();
      if (variantOpt !== selected) return false;
    }
    return true;
  }

  function resolveMainVariant(sectionId) {
    var picker = document.getElementById('variant-selects-' + sectionId);
    if (!picker) return null;
    var jsonEl = picker.querySelector('script[type="application/json"]');
    if (!jsonEl) return null;
    var variants;
    try {
      variants = JSON.parse(jsonEl.textContent);
    } catch (e) {
      return null;
    }
    var byPos = getSelectedOptionsByPosition(picker);
    if (Object.keys(byPos).length) {
      var matches = variants.filter(function (v) {
        return variantMatchesByPosition(v, byPos);
      });
      var best = pickBestVariantMatch(matches, picker);
      if (best) return best;
    }
    if (typeof window.getVariantFromPicker === 'function') {
      var fromPicker = window.getVariantFromPicker(sectionId);
      if (fromPicker) return fromPicker;
    }
    var form = getProductForm(sectionId);
    if (form) {
      var idInput = form.querySelector('input[name="id"]');
      if (idInput && idInput.value) {
        var fromId = variants.find(function (v) {
          return String(v.id) === String(idInput.value);
        });
        if (fromId) return fromId;
      }
    }
    return picker.currentVariant || null;
  }

  function syncCompleteSetForSection(sectionId) {
    var picker = document.getElementById('variant-selects-' + sectionId);
    if (!picker) return;
    var resolved = resolveMainVariant(sectionId);
    document.querySelectorAll('[data-bb-complete-set-root]').forEach(function (root) {
      if (String(root.dataset.sectionId) !== String(sectionId)) return;
      updateMainRow(root, resolved);
    });
  }

  function scheduleCompleteSetSync(sectionId) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        syncCompleteSetForSection(sectionId);
      });
    });
  }

  window.bbCompleteSetSyncForSection = syncCompleteSetForSection;

  function bindCompleteSetSubmit(sectionId) {
    var form = getProductForm(sectionId);
    if (!form || form.dataset.bbCompleteSetSubmitBound === 'true') return;
    form.dataset.bbCompleteSetSubmitBound = 'true';

    form.addEventListener(
      'submit',
      function (evt) {
        var roots = document.querySelectorAll(
          '[data-bb-complete-set-root][data-section-id="' + sectionId + '"]'
        );
        var root = roots[0];
        if (!root) return;

        var toggle = root.querySelector('[data-bb-complete-set-toggle]');
        var pairInput = root.querySelector('[data-bb-complete-set-variant-id]');
        if (!toggle || !toggle.checked) return;
        if (!pairInput || !pairInput.value || pairInput.getAttribute('data-unavailable') === 'true') {
          return;
        }

        evt.preventDefault();
        evt.stopImmediatePropagation();

        var pf = getProductFormComponent(sectionId);
        var submitBtn = pf ? pf.querySelector('[type="submit"][name="add"]') : null;
        if (submitBtn && submitBtn.getAttribute('aria-disabled') === 'true') return;

        if (typeof window.syncVariantIdFromPicker === 'function') {
          window.syncVariantIdFromPicker(form);
        }

        var picker = document.getElementById('variant-selects-' + sectionId);
        var idInput = form.querySelector('input[name="id"]');
        var mainId = idInput ? parseInt(idInput.value, 10) : NaN;
        if (!mainId && picker && picker.currentVariant) {
          mainId = parseInt(picker.currentVariant.id, 10);
          if (idInput) idInput.value = String(mainId);
        }
        var pairId = parseInt(pairInput.value, 10);
        if (!mainId || !pairId) {
          if (pf && typeof pf.handleErrorMessage === 'function') {
            pf.handleErrorMessage('Please select all product options.');
          }
          return;
        }

        var qtyInput = form.querySelector('input[name="quantity"]');
        var qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;

        setButtonLoading(sectionId, true);

        addBundleItems(mainId, qty, pairId, qty)
          .then(function (pack) {
            var state = pack.state;
            if (!pack.ok || state.status) {
              var msg =
                (state.description && String(state.description)) ||
                (state.message && String(state.message)) ||
                'Could not add to cart';
              if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
                publish(PUB_SUB_EVENTS.cartError, {
                  source: 'bb-complete-set',
                  errors: msg,
                  message: msg,
                });
              }
              if (pf && typeof pf.handleErrorMessage === 'function') pf.handleErrorMessage(msg);
              return;
            }
            var cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
            if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'bb-complete-set',
                productVariantId: String(mainId),
                cartData: state,
              });
            }
            if (cart && typeof cart.renderContents === 'function' && state.sections) {
              cart.renderContents(state);
            } else if (cart && typeof cart.open === 'function') {
              cart.open();
            }
            if (pf && typeof pf.handleErrorMessage === 'function') pf.handleErrorMessage(false);
          })
          .catch(function (e) {
            console.error(e);
            if (pf && typeof pf.handleErrorMessage === 'function') {
              pf.handleErrorMessage('Could not add to cart. Please try again.');
            }
          })
          .finally(function () {
            setButtonLoading(sectionId, false);
          });
      },
      true
    );
  }

  function initRoot(root) {
    var sectionId = root.dataset.sectionId;
    bindCompleteSetSubmit(sectionId);

    syncCompleteSetForSection(sectionId);

    root.querySelectorAll('.bb-complete-set__radio').forEach(function (r) {
      r.addEventListener('change', function () {
        syncSelectsFromRadios(root);
        updatePairState(root);
      });
    });

    root.querySelectorAll('[data-bb-pair-select]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        onPairSelectChange(root, sel);
      });
    });

    syncSelectsFromRadios(root);
    updatePairState(root);

    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.variantChange, function (payload) {
        var d = payload && payload.data;
        if (!d || String(d.sectionId) !== String(sectionId)) return;
        if (root.dataset.syncFirstOption === 'true') {
          var mainV = d.variant;
          var blockId = root.dataset.blockId;
          var syncPosition = parseInt(root.dataset.syncOptionPosition || '1', 10);
          if (syncPosition < 1 || syncPosition > 3) syncPosition = 1;
          var mainOptionValue = optionValueAt(mainV, syncPosition);
          var radios = root.querySelectorAll('input[name="bb-pair-opt-' + blockId + '-' + syncPosition + '"]');
          if (radios.length && mainOptionValue) {
            radios.forEach(function (r) {
              r.checked = r.value === mainOptionValue;
            });
            syncSelectsFromRadios(root);
            updatePairState(root);
          }
        }
        var piecePos = parseInt(root.dataset.bbMainPieceOptionPosition || '0', 10);
        var pairPiecePos = parseInt(root.dataset.bbPairPieceOptionPosition || '0', 10);
        if (piecePos > 0 && pairPiecePos > 0 && d.variant) {
          var mainPiece = optionValueAt(d.variant, piecePos);
          var targetPiece = complementaryPiece(mainPiece);
          if (targetPiece) {
            var blockIdPiece = root.dataset.blockId;
            var pieceRadios = root.querySelectorAll(
              'input[name="bb-pair-opt-' + blockIdPiece + '-' + pairPiecePos + '"]'
            );
            var matched = false;
            pieceRadios.forEach(function (r) {
              if (String(r.value).toLowerCase() === targetPiece) {
                r.checked = true;
                matched = true;
              }
            });
            if (matched) {
              syncSelectsFromRadios(root);
              updatePairState(root);
            }
          }
        }
        syncCompleteSetForSection(sectionId);
      });
    }

  }

  document.addEventListener('change', function (evt) {
    var picker = evt.target.closest('variant-selects');
    if (!picker || !picker.id || picker.id.indexOf('variant-selects-') !== 0) return;
    var sectionId = picker.dataset.section;
    if (!sectionId) return;
    scheduleCompleteSetSync(sectionId);
  });

  function boot() {
    document.querySelectorAll('[data-bb-complete-set-root]').forEach(initRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
