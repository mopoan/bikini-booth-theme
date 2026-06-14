class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.cart_icon = document.querySelector('#cart-icon-bubble-short')?'cart-icon-bubble-short':'cart-icon-bubble';
    this.cart_icon_mobile = document.querySelector('#cart-icon-bubble--mobile-short')?'cart-icon-bubble--mobile-short':'cart-icon-bubble--mobile';
    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    document.querySelectorAll(`[id*="cart-icon-bubble"]`).forEach((cartLink) => {
      cartLink.setAttribute('role', 'button');
      cartLink.setAttribute('aria-haspopup', 'dialog');
      cartLink.addEventListener('click', (event) => {
        event.preventDefault();
        this.open(cartLink);
      });
      cartLink.addEventListener('keydown', (event) => {
        if (event.code.toUpperCase() === 'SPACE') {
          event.preventDefault();
          this.open(cartLink);
        }
      });
    })
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    setTimeout(() => {
      this.classList.add('active');
      this.classList.add('animate');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    if(document.querySelectorAll('.popup-modal.active').length == 0){
      document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
      document.body.classList.add('overflow-hidden');
    }
  }

  close() {
    this.classList.remove('animate');
    setTimeout(() => {
      this.classList.remove('active');
      if(document.querySelectorAll('.popup-modal.active').length == 0){
        document.body.classList.remove('overflow-hidden');
        document.body.style.paddingRight = '';
      }
    }, 500);
    removeTrapFocus(this.activeElement);
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    if (!parsedState || !parsedState.sections) {
      this.open();
      return;
    }
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector ? document.querySelector(section.selector) : document.getElementById(section.id);
      const html = parsedState.sections[section.id];
      const sectionContent = this.getSectionInnerHTML(html, section.selector);
      if(sectionElement && sectionContent !== null) sectionElement.innerHTML = sectionContent;
      if(section.id == 'cart-free-delivery' && document.querySelector('#product-page-free-delivery')){
        if (sectionContent !== null) document.querySelector('#product-page-free-delivery').innerHTML = sectionContent;
      }
      if(section.id == this.cart_icon && sectionContent !== null && document.querySelector('.footer-sticky-nav__item__icon .cart-count-bubble')){
        const parser = new DOMParser();
        const bubble = parser.parseFromString(sectionContent, 'text/html');
        var ib = bubble.querySelector('.cart-count-bubble')?bubble.querySelector('.cart-count-bubble').innerHTML : '' ;
        document.querySelector('.footer-sticky-nav__item__icon .cart-count-bubble').innerHTML = ib;
      }
    });

    setTimeout(() => {
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    if (!html) return null;
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const target = parsed.querySelector(selector);
    return target ? target.innerHTML : null;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: this.cart_icon,
      },
      {
        id: this.cart_icon_mobile
      },
      {
        id: 'cart-free-delivery'
      }
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
  getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    this.cart_icon = document.querySelector('#cart-icon-bubble-short')?'cart-icon-bubble-short':'cart-icon-bubble';
    this.cart_icon_mobile = document.querySelector('#cart-icon-bubble--mobile-short')?'cart-icon-bubble--mobile-short':'cart-icon-bubble--mobile';
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: this.cart_icon,
        section: this.cart_icon,
        selector: '.shopify-section',
      },
      {
        id: this.cart_icon_mobile,
        section: this.cart_icon_mobile,
        selector: '.shopify-section'
      }
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);