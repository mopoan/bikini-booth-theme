(function () {
  function openAccordionItem(root, item) {
    if (!item) return;
    root.querySelectorAll('.bb-content-accordion__item.is-open').forEach(function (openItem) {
      openItem.classList.remove('is-open');
      openItem.querySelector('.bb-content-accordion__trigger')?.setAttribute('aria-expanded', 'false');
    });
    item.classList.add('is-open');
    item.querySelector('.bb-content-accordion__trigger')?.setAttribute('aria-expanded', 'true');
  }

  function initContentPage(root) {
    if (!root || root.dataset.bbContentInit === 'true') return;
    root.dataset.bbContentInit = 'true';

    root.querySelectorAll('.bb-content-accordion__trigger').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.bb-content-accordion__item');
        if (!item) return;
        var isOpen = item.classList.contains('is-open');
        root.querySelectorAll('.bb-content-accordion__item.is-open').forEach(function (openItem) {
          openItem.classList.remove('is-open');
          openItem.querySelector('.bb-content-accordion__trigger')?.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    root.querySelectorAll('a[href^="#bb-section-"], a[href^="#bb-accordion-"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href').slice(1);
        var accordionTarget = document.getElementById(id);
        if (!accordionTarget) return;

        if (accordionTarget.classList.contains('bb-content-accordion__item')) {
          e.preventDefault();
          openAccordionItem(root, accordionTarget);
          accordionTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        var desktopTarget = document.getElementById(id);
        if (desktopTarget && desktopTarget.offsetParent !== null) {
          e.preventDefault();
          desktopTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  document.querySelectorAll('.bb-content-page').forEach(initContentPage);

  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('.bb-content-page');
    if (root) initContentPage(root);
  });
})();
