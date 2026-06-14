function getSelectedOptionsByPositionFromPicker(picker) {
  const byPos = {};
  if (!picker) return byPos;
  picker.querySelectorAll('fieldset[data-option-position]').forEach((fieldset) => {
    const pos = parseInt(fieldset.dataset.optionPosition, 10);
    if (!pos) return;
    const checked = fieldset.querySelector('input[type="radio"]:checked');
    if (checked) byPos[pos] = checked.value;
  });
  picker.querySelectorAll('select[data-option-position]').forEach((select) => {
    const pos = parseInt(select.dataset.optionPosition, 10);
    if (pos) byPos[pos] = select.value;
  });
  return byPos;
}

function variantMatchesByPosition(variant, byPos) {
  for (let i = 1; i <= 3; i++) {
    if (byPos[i] == null || byPos[i] === '') continue;
    const selected = String(byPos[i]).trim().toLowerCase();
    const variantOpt = String(variant[`option${i}`] || '').trim().toLowerCase();
    if (variantOpt !== selected) return false;
  }
  return true;
}

function pickBestVariantMatch(matches, picker) {
  if (!matches || !matches.length) return null;
  if (matches.length === 1) return matches[0];
  const available = matches.filter((v) => v.available);
  const pool = available.length ? available : matches;
  if (picker && picker.currentVariant) {
    const current = pool.find((v) => String(v.id) === String(picker.currentVariant.id));
    if (current) return current;
  }
  return pool[0];
}

function getVariantFromPicker(sectionId) {
  const picker = document.getElementById(`variant-selects-${sectionId}`);
  if (!picker) return null;
  const jsonEl = picker.querySelector('script[type="application/json"]');
  if (!jsonEl) return null;
  let variants;
  try {
    variants = JSON.parse(jsonEl.textContent);
  } catch (e) {
    return null;
  }
  const byPos = getSelectedOptionsByPositionFromPicker(picker);
  if (Object.keys(byPos).length) {
    const matches = variants.filter((v) => variantMatchesByPosition(v, byPos));
    return pickBestVariantMatch(matches, picker);
  }
  const options = [];
  if (picker.querySelector('select')) {
    return (
      variants.find((v) => {
        const selects = Array.from(picker.querySelectorAll('select'), (s) => s.value);
        return !v.options.map((opt, i) => selects[i] === opt).includes(false);
      }) || null
    );
  }
  picker.querySelectorAll('fieldset').forEach((fieldset) => {
    const checked = fieldset.querySelector('input:checked');
    if (checked) options.push(checked.value);
  });
  return (
    variants.find((v) => !v.options.map((opt, i) => options[i] === opt).includes(false)) || null
  );
}

function getProductCartFormId(formEl) {
  if (!formEl || typeof formEl.getAttribute !== 'function') return '';
  const id = formEl.getAttribute('id');
  return id != null ? String(id) : '';
}

function syncVariantIdFromPicker(formEl) {
  if (!formEl || formEl.tagName !== 'FORM') return;
  const formId = getProductCartFormId(formEl);
  if (!formId.startsWith('product-form-')) return;
  const sectionId = formId.slice('product-form-'.length);
  const variant = getVariantFromPicker(sectionId);
  if (variant) {
    const input = formEl.querySelector('input[name="id"]');
    if (input) input.value = String(variant.id);
  }
}
window.getVariantFromPicker = getVariantFromPicker;
window.syncVariantIdFromPicker = syncVariantIdFromPicker;

function getCartRoutes() {
  return window.routes || (typeof routes !== 'undefined' ? routes : null);
}

if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();
        this.hideErrors = this.dataset.hideErrors === 'true';
        this._onSubmitBound = this.onSubmitHandler.bind(this);
      }

      connectedCallback() {
        if (this._submitReady) return;
        this._submitReady = true;
        this.cartForm = this.querySelector('form[data-type="add-to-cart-form"], form');
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton =
          this.querySelector('[type="submit"][name="add"]') || this.querySelector('[type="submit"]');
        if (this.cartForm) {
          this.cartForm.removeEventListener('submit', this._onSubmitBound);
          this.cartForm.addEventListener('submit', this._onSubmitBound);
        }
      }

      disconnectedCallback() {
        if (this.cartForm) {
          this.cartForm.removeEventListener('submit', this._onSubmitBound);
        }
        this._submitReady = false;
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        const cartForm =
          evt.currentTarget && evt.currentTarget.tagName === 'FORM'
            ? evt.currentTarget
            : this.cartForm;
        if (!cartForm) return;
        if (!this.submitButton) return;
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        syncVariantIdFromPicker(cartForm);

        const cartRoutes = getCartRoutes();
        if (!cartRoutes || !cartRoutes.cart_add_url) {
          console.error('Cart routes are not available');
          return;
        }

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        const spinner = this.querySelector('.loading-overlay__spinner');
        if (spinner) spinner.classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(cartForm);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${cartRoutes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              }
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              const cartRoutesDone = getCartRoutes();
              window.location = cartRoutesDone ? cartRoutesDone.cart_url : '/cart';
              return;
            }

            if (!this.error && typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            }
            this.error = false;
            if (this.cart && typeof this.cart.renderContents === 'function') {
              this.cart.renderContents(response);
            } else if (this.cart && typeof this.cart.open === 'function') {
              this.cart.open();
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            const spinner = this.querySelector('.loading-overlay__spinner');
            if (spinner) spinner.classList.add('hidden');
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }
    }
  );
}

class stickyCartModal extends HTMLElement {
  constructor() {
    super();
    this.isThemeEditor = !!window.Shopify && !!window.Shopify.designMode;
    this.boundUpdate = this.update.bind(this);
    if (!this.isThemeEditor) {
      window.addEventListener('scroll', this.boundUpdate);
    }
    this.update();
    const stickyButton = this.querySelector('.sticky-cart-button');
    if (stickyButton) {
      stickyButton.addEventListener('click', this.onClickHandler.bind(this));
      stickyButton.addEventListener('keydown', this.onClickKeydownHandler.bind(this));
    }
  }
  disconnectedCallback() {
    if (this.boundUpdate) window.removeEventListener('scroll', this.boundUpdate);
  }
  update(){
    if (this.isThemeEditor) {
      this.classList.remove('show-modal');
      document.body.classList.remove('modal__sticky-cart');
      const footerInEditor = document.querySelector('.footer__content');
      if (footerInEditor) footerInEditor.classList.remove('sticky-cart-modal_bottom_padding');
      return;
    }
    var button = document.getElementById(`product-form-${this.dataset.section}`);
    var sect = this.closest('.shopify-section')||this.closest('.popup-modal__content__data');
    if (!button || !sect) return;
    var addButton = sect.querySelector('select-option-js')?button.querySelector('.select-options-button'):button.querySelector('[name="add"]');
    if (!addButton) return;
    const rangeToShowModal = this.getTop(addButton) + addButton.clientHeight;

    if(rangeToShowModal <= 0) return false;
    if(window.scrollY >= rangeToShowModal && !this.classList.contains('show-modal')){
      this.classList.add('show-modal');
      document.querySelector('body').classList.add('modal__sticky-cart');
      const footer = document.querySelector('.footer__content');
      if (footer) footer.classList.add('sticky-cart-modal_bottom_padding');
    }
    if(window.scrollY < rangeToShowModal && this.classList.contains('show-modal')){
      this.classList.remove('show-modal');
      document.querySelector('body').classList.remove('modal__sticky-cart');
      const footer = document.querySelector('.footer__content');
      if (footer) footer.classList.remove('sticky-cart-modal_bottom_padding');
    }
  }
  onClickKeydownHandler(event){
    if(event.code.toUpperCase() !== 'ENTER') return false;
    this.onClickHandler();
  }
  onClickHandler(){
    var item = document.querySelector(`.product__column__content [id*="variant-selects-"]`),
        btn_item = document.getElementById("product-container"),
        _y = (item ? this.getTop(item) : this.getTop(btn_item)) - 20;
    this.scrollTo(_y,700);
  }
  getTop(el) {
    return el.offsetTop + (el.offsetParent && this.getTop(el.offsetParent));
  }
  scrollTo(to, duration) {
    const element = document.scrollingElement || document.documentElement,
          start = element.scrollTop,
          change = to - start,
    animateScroll = function() {
      element.scrollTop = to;
    };
    animateScroll();
  }
}
customElements.define('sticky-cart-modal', stickyCartModal);
