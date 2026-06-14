(function () {
  function activatePanel(root, key) {
    const tablist = root.querySelector('[data-bb-sg-tablist]');
    if (!tablist) return;

    const tabs = tablist.querySelectorAll('[data-bb-sg-tab]');
    const panels = root.querySelectorAll('[data-bb-sg-panel]');

    tabs.forEach((btn) => {
      const on = btn.getAttribute('data-bb-sg-tab') === key;
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.classList.toggle('bb-sg-tab--active', on);
    });
    panels.forEach((panel) => {
      const on = panel.getAttribute('data-bb-sg-panel') === key;
      panel.toggleAttribute('hidden', !on);
    });
    syncTopsTypeVisibility(root);
    applyMeasure(root);
  }

  function syncTopsTypeVisibility(root) {
    const typeSel = root.querySelector('select.bb-sg-select--type');
    const topsPanel = root.querySelector('[data-bb-sg-panel="tops"]');
    if (!topsPanel || !typeSel) return;
    const mode = typeSel.value === 'underwire' ? 'underwire' : 'general';
    topsPanel.querySelectorAll('[data-bb-sg-tops-type]').forEach((wrap) => {
      const on = wrap.getAttribute('data-bb-sg-tops-type') === mode;
      wrap.toggleAttribute('hidden', !on);
    });
  }

  function defaultTabKey(root) {
    const t = root.querySelector('[data-bb-sg-tab][aria-selected="true"]');
    return t ? t.getAttribute('data-bb-sg-tab') : 'tops';
  }

  function fmtCmFromInch(n) {
    const v = Math.round(parseFloat(n) * 2.54 * 10) / 10;
    if (Number.isNaN(v)) return String(n);
    if (Math.abs(v - Math.round(v)) < 1e-6) return String(Math.round(v));
    return v.toFixed(1);
  }

  function applyMeasure(root) {
    const sel = root.querySelector('select.bb-sg-select--measure');
    if (!sel) return;
    const unit = sel.value;
    root.querySelectorAll('td[data-bb-in]').forEach((td) => {
      const inchText = td.getAttribute('data-bb-in');
      if (!inchText) return;
      if (unit === 'inch') {
        td.textContent = inchText;
        return;
      }
      const m = inchText.trim().match(/^([\d.]+)\s*-\s*([\d.]+)$/);
      if (!m) {
        td.textContent = inchText;
        return;
      }
      const lo = parseFloat(m[1]);
      const hi = parseFloat(m[2]);
      if (Number.isNaN(lo) || Number.isNaN(hi)) {
        td.textContent = inchText;
        return;
      }
      td.textContent = `${fmtCmFromInch(lo)} - ${fmtCmFromInch(hi)}`;
    });
  }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-bb-sg-tablist] [data-bb-sg-tab]');
    if (!tab) return;
    const tablist = tab.closest('[data-bb-sg-tablist]');
    const root = tablist && tablist.closest('modal-dialog.bb-size-guide-modal');
    if (!root) return;
    e.preventDefault();
    activatePanel(root, tab.getAttribute('data-bb-sg-tab'));
  });

  document.addEventListener('change', (e) => {
    const root = e.target && e.target.closest('modal-dialog.bb-size-guide-modal');
    if (!root) return;
    if (e.target.matches('select.bb-sg-select--measure')) {
      applyMeasure(root);
      return;
    }
    if (e.target.matches('select.bb-sg-select--type')) {
      syncTopsTypeVisibility(root);
      applyMeasure(root);
    }
  });

  document.addEventListener('keydown', (e) => {
    const tab = document.activeElement;
    if (!tab || !tab.matches('[data-bb-sg-tablist] [data-bb-sg-tab]')) return;
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (keys.indexOf(e.key) === -1) return;
    const tablist = tab.closest('[data-bb-sg-tablist]');
    const root = tablist && tablist.closest('modal-dialog.bb-size-guide-modal');
    if (!root) return;
    const list = Array.from(tablist.querySelectorAll('[data-bb-sg-tab]'));
    const i = list.indexOf(tab);
    if (i === -1) return;
    e.preventDefault();
    let n = i;
    if (e.key === 'ArrowLeft') n = (i + list.length - 1) % list.length;
    if (e.key === 'ArrowRight') n = (i + 1) % list.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = list.length - 1;
    list[n].focus();
    activatePanel(root, list[n].getAttribute('data-bb-sg-tab'));
  });

  function boot() {
    document.querySelectorAll('modal-dialog.bb-size-guide-modal').forEach((root) => {
      activatePanel(root, defaultTabKey(root));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', (ev) => {
    ev.target.querySelectorAll?.('modal-dialog.bb-size-guide-modal').forEach((root) => {
      activatePanel(root, defaultTabKey(root));
    });
  });
})();
