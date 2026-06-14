var elementName = 'swiper-slider-container';
if (!customElements.get(elementName)) {
  class swiperSliderContainer extends HTMLElement {
    constructor() {
      super();
      this.querySelectorAll('.swiper-thumb').forEach((item) => {
        item.addEventListener("click", this.clickHandler.bind(this));
      });
      if(this.isTouchDevice()===false) {
        this.querySelectorAll('.swiper-thumb__container--horizontal').forEach((item) => {
          var _this = this;
          item.addEventListener("mouseenter", function(){
            if(window.innerWidth <= 1024) return false;
            if(item.scrollWidth <= _this.offsetWidth) return false;
            document.body.style.paddingRight = window.innerWidth > 1024 ? _this.getScrollbarWidth() + 'px' : '';
            document.body.classList.add('overflow-hidden');
          });
          item.addEventListener("mouseleave", function(){
            if(window.innerWidth <= 1024) return false;
            if(item.scrollWidth <= _this.offsetWidth) return false;
            document.body.classList.remove('overflow-hidden');
            document.body.style.paddingRight = '';
          });
        });
      }
      
      this.swiperthumbcontainer = this.querySelector('.swiper-thumb__container');
      this.swiper = this.querySelector('.swiper');
      this.duration = 100;
      this.swiper.addEventListener('slide_inited', this.slideInitedCustom.bind(this), false);
      this.swiper.addEventListener('slide_changed_custom', this.slideChangedCustom.bind(this), false);

      this.closest('.product--thumbnail_slider__mobile') && this.mobileThumbSize();
    }
    isTouchDevice(){
      return true == ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);
    }
    mobileThumbSize(){
      var swiper__thumb__container = this.querySelector('.swiper-thumb__container');
      if(window.innerWidth > 576 || !swiper__thumb__container) return false;
      window.addEventListener("resize", this.resizeHandler.bind(this), false);
      var self = this;
      this.resizeHandler(0);
      requestAnimationFrame(function () { self.resizeHandler(0); });
      setTimeout(function () { self.resizeHandler(0); }, 150);
      setTimeout(function () { self.resizeHandler(0); }, 500);
    }
    resizeHandler(attempt){
      attempt = attempt || 0;
      var swiper__thumb__container = this.querySelector('.swiper-thumb__container');
      if (!swiper__thumb__container || window.innerWidth > 576) return;
      var w = swiper__thumb__container.offsetWidth;
      if (w < 12 && attempt < 24) {
        var self = this;
        requestAnimationFrame(function () { self.resizeHandler(attempt + 1); });
        return;
      }
      var gap = 10;
      var slots = 5;
      var item_w = (Math.max(w, 12) - gap * (slots - 1)) / slots;
      if (!isFinite(item_w) || item_w < 44) item_w = 56;
      item_w = Math.min(92, item_w);
      swiper__thumb__container.style.setProperty('--thumb-width', `${Math.round(item_w * 10) / 10}px`);
    }
    slideInitedCustom(){
      var sect = this.closest('.shopify-section')||this.closest('.popup-modal__content__data');
      if(sect.querySelector('select-option-js.active')){
        return false;
      }
      var default_media_id = this.getAttribute('data-current-media-id');
      this.changeSlideSwiper(default_media_id, 0);
    }
    resetInactiveDeferredMedia(activeSlide) {
      this.querySelectorAll('.swiper-slide').forEach(function (slide) {
        if (activeSlide && slide === activeSlide) return;
        slide.querySelectorAll('deferred-media[loaded], product-model[loaded]').forEach(function (dm) {
          dm.querySelectorAll('video, iframe').forEach(function (el) {
            el.remove();
          });
          dm.removeAttribute('loaded');
        });
      });
    }
    slideChangedCustom(){
      document.body.classList.remove('overflow-hidden');
      document.body.style.removeProperty('padding-right');
      if(!this.querySelector('.swiper-slide-active [data-media-id]')) return false;
      if (typeof window.pauseAllMedia === 'function') {
        window.pauseAllMedia();
      }
      var activeSlide = this.querySelector('.swiper-slide-active');
      this.resetInactiveDeferredMedia(activeSlide);
      var _this = this;
      if(this.querySelector('.swiper-thumb__container--horizontal') || window.innerWidth <= 1024){
        setTimeout(function(){
          var _id = _this.querySelector('.swiper-slide-active [data-media-id]').getAttribute('data-media-id');
          _this.horizontaldesign(_id);
        },0);
      }
      else{
        setTimeout(function(){
          var _id = _this.querySelector('.swiper-slide-active [data-media-id]').getAttribute('data-media-id');
          _this.verticaldesign(_id);
        },0);
      }
      setTimeout(function(){
        _this.playActiveMedia(_this.querySelector('.swiper-slide-active [data-media-id]'));
      },100);
      try {
        var swHost = _this.querySelector('swiper-slider.swiper');
        if (swHost && swHost.swiper) {
          if (typeof swHost.swiper.allowTouchMove !== 'undefined') swHost.swiper.allowTouchMove = true;
          if (typeof swHost.swiper.enable === 'function') swHost.swiper.enable();
          if (typeof swHost.swiper.update === 'function') swHost.swiper.update();
        }
      } catch (e) {}
    }
    clickHandler(e){
      this.querySelector('.active').classList.remove('active');
      e.currentTarget.classList.add('active');

      var _id = e.currentTarget.getAttribute('data-media-id');
      this.changeSlideSwiper(_id);
    }
    changeSlideSwiper(_id, delay){
      delay = delay === undefined || delay === null ? 300 : delay;
      var swiperslider = this.querySelector('swiper-slider');

      if(!swiperslider.querySelector(`[data-media-id="${_id}"]`)) return;
      var item_img = swiperslider.querySelector(`[data-media-id="${_id}"]`).closest('.swiper-slide');
      if(!item_img) return;
      const nodes = Array.prototype.slice.call( item_img.parentNode.childNodes );
      var index = nodes.indexOf(item_img);

      var sw = swiperslider.querySelectorAll(`.swiper-slide`)[0];
      const sw_nodes = Array.prototype.slice.call( sw.parentNode.childNodes );
      const sw_index = nodes.indexOf(sw);
      index = index - sw_index;

      this.querySelector('.swiper').selectSlide(index, delay);
      //this.playActiveMedia(item_img);
    }
    changeSlide(_id){
      if(this.querySelector('.swiper-thumb__container--horizontal') || window.innerWidth <= 1024){
        this.horizontaldesign(_id);
      }
      else{
        this.verticaldesign(_id);
      }
      this.changeSlideSwiper(_id);
    }
    verticaldesign(...args){
      if(!this.swiperthumbcontainer) return false;
      var _id = args[0],
          item = this.swiperthumbcontainer.querySelector(`[data-media-id="${_id}"]`),
          temp = 0;
      this.swiperthumbcontainer.querySelector('.active').classList.remove('active');
      item.classList.add('active');

      var _y = item.offsetTop-this.swiperthumbcontainer.offsetTop,
          _h = this.swiperthumbcontainer.offsetHeight,
          main_scrolltop = this.swiperthumbcontainer.scrollTop,
          item_y = _y-main_scrolltop+item.offsetHeight;

      if(item_y > _h){
        temp = main_scrolltop + (item_y-_h);
        this.scrollTo(this.swiperthumbcontainer, temp, this.duration, 'scrollTop');
      }
      else if(_y < main_scrolltop){
        temp = this.swiperthumbcontainer.scrollTop - (main_scrolltop - _y);
        this.scrollTo(this.swiperthumbcontainer, temp, this.duration, 'scrollTop');
      }
    }
    horizontaldesign(...args){
      if(!this.swiperthumbcontainer) return false;
      var _id = args[0],
          item = this.swiperthumbcontainer.querySelector(`[data-media-id="${_id}"]`),
          temp = 0;
      this.swiperthumbcontainer.querySelector('.active').classList.remove('active');
      item.classList.add('active');
    
      var _x = item.offsetLeft-this.swiperthumbcontainer.offsetLeft,
          _w = this.swiperthumbcontainer.offsetWidth,
          main_scrollleft = this.swiperthumbcontainer.scrollLeft,
          item_x = _x-main_scrollleft+item.offsetWidth;

      var delta = window.innerWidth <= 576 ? 15 : 0;
      if(item_x > _w){
        temp = main_scrollleft + (item_x-_w) + delta;
        this.scrollTo(this.swiperthumbcontainer, temp, this.duration, 'scrollLeft');
      }
      else if(_x < main_scrollleft){
        temp = this.swiperthumbcontainer.scrollLeft - (main_scrollleft - _x) + delta;
        this.scrollTo(this.swiperthumbcontainer, temp, this.duration, 'scrollLeft');
      }
    }
    playActiveMedia(activeItem) {
      const deferredMedia = activeItem.parentNode.querySelector('.deferred-media');
      if (deferredMedia) {
        var tpl = deferredMedia.querySelector('template');
        var tplVideo = tpl && tpl.content && tpl.content.querySelector('video');
        var tplIframe = tpl && tpl.content && tpl.content.querySelector('iframe');
        var isIOS =
          /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        var isNarrow = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1024px)').matches;
        if (!((tplVideo || tplIframe) && isIOS && isNarrow)) {
          deferredMedia.loadContent(false);
        }
      }
      var host = this.querySelector('swiper-slider.swiper');
      if (!host || !host.swiper) return;
      var bump = function () {
        try {
          if (typeof host.swiper.allowTouchMove !== 'undefined') host.swiper.allowTouchMove = true;
          if (typeof host.swiper.enable === 'function') host.swiper.enable();
          host.swiper.update();
          if (typeof host.swiper.updateAutoHeight === 'function') host.swiper.updateAutoHeight(0);
          if (typeof host.swiper.updateSlides === 'function') host.swiper.updateSlides();
        } catch (err) {}
      };
      bump();
      setTimeout(bump, 120);
      setTimeout(bump, 400);
    }
    scrollTo(el, to, duration, option) {
      Math.easeInOutQuad = function (t, b, c, d) {
        t /= d/2;
        if (t < 1) return c/2*t*t + b;
        t--;
        return -c/2 * (t*(t-2) - 1) + b;
      };

      const element = el;
      const start = element[option],
            change = to - start,
            increment = 20;
      var currentTime = 0;
      
      const animateScroll = function(){
        currentTime += increment;
        const val = Math.easeInOutQuad(currentTime, start, change, duration);
        element[option] = val;
        if(currentTime < duration) {
          window.setTimeout(animateScroll, increment);
        }
      };
      animateScroll();
    }
    getScrollbarWidth() {
      return window.innerWidth - document.documentElement.clientWidth;
    }
  }
  customElements.define('swiper-slider-container', swiperSliderContainer);
}

elementName = 'theme-lightbox';
if (!customElements.get(elementName)) {
  class themeLightbox extends HTMLElement {
    constructor() {
      super();
      window.addEventListener("resize", this.resizeHandler.bind(this), false);
      this.resizeHandler();
      this.querySelector('.theme-lightbox__toggle').addEventListener("click", this.close.bind(this), false);
    }
    resizeHandler(){
      var isMobile = window.innerWidth <= 576;
      var ww = isMobile ? window.innerWidth - 28 : window.innerWidth - 218,
          wh = isMobile ? window.innerHeight - 80 : window.innerHeight - 136;
      this.querySelectorAll('.theme-lightbox__image').forEach((item) => {
        var iw = item.naturalWidth,
            ih = item.naturalHeight;
        if (!iw || !ih) return;
        var wr = ww/iw;
        if(iw > ih ){
          if(ih*wr >= wh){
            item.classList.remove('theme-lightbox__image--wide');
          }
          else{
            item.classList.add('theme-lightbox__image--wide');
          }
        }
      });
    }
    open(data_media_id){
      this.classList.add('active');
      setTimeout(() => {
        this.classList.add('animate');
      });
      document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
      document.body.classList.add('overflow-hidden');

      
      var item_img = this.querySelector(`[data-media-id="${data_media_id}"]`).closest('.swiper-slide');
      const nodes = Array.prototype.slice.call( item_img.parentNode.childNodes );
      const index = nodes.indexOf(item_img);
      this.querySelector('.swiper').selectSlide(index);
      this.resizeHandler();
      this.bindLightboxSlideZoomReset();
      var _this = this;
      setTimeout(function () {
        _this.loadActiveSlideMedia();
        if (window.innerWidth <= 576) {
          _this.initMobileLightboxZoom();
        }
      }, 40);
    }
    loadActiveSlideMedia() {
      var slide = this.querySelector('.swiper-slide-active');
      if (!slide) return;
      var dm = slide.querySelector('deferred-media');
      if (!dm || typeof dm.loadContent !== 'function') return;
      if (!dm.getAttribute('loaded')) {
        dm.loadContent(false);
        return;
      }
      var video = dm.querySelector('video');
      if (video) {
        video.play().catch(function () {});
      }
    }
    clearLightboxZoom() {
      this.querySelectorAll('.theme-lightbox__image.bb-lightbox-image--zoomed').forEach(function (img) {
        img.classList.remove('bb-lightbox-image--zoomed');
        img.style.transformOrigin = '';
      });
      this.querySelectorAll('.bb-pdp-lightbox-zoom-tooltip').forEach(function (tip) {
        tip.classList.remove('is-hidden');
      });
    }
    syncLightboxZoomTooltips() {
      this.querySelectorAll('.bb-pdp-lightbox-zoom-tooltip').forEach(function (tip) {
        tip.classList.remove('is-hidden');
      });
    }
    bindLightboxSlideZoomReset() {
      if (this._bbLbSlideBound) return;
      var sw = this.querySelector('swiper-slider.swiper');
      if (!sw) return;
      this._bbLbSlideBound = true;
      var self = this;
      sw.addEventListener('slide_changed_custom', function () {
        self.clearLightboxZoom();
        self.loadActiveSlideMedia();
        self.syncLightboxZoomTooltips();
      });
    }
    initMobileLightboxZoom() {
      if (this._bbLbTouchBound) return;
      this._bbLbTouchBound = true;
      this._bbLastTap = 0;
      var self = this;
      var dialog = this.querySelector('.theme-lightbox__dialog') || this;
      dialog.addEventListener('touchend', function (e) {
        var box = e.target.closest('.theme-lightbox__image__box');
        if (!box || !self.contains(box)) return;
        if (!e.changedTouches || !e.changedTouches.length) return;
        var img = box.querySelector('.theme-lightbox__image');
        if (!img) return;
        var now = Date.now();
        if (now - self._bbLastTap < 320) {
          e.preventDefault();
          var t = e.changedTouches[0];
          var rect = box.getBoundingClientRect();
          var x = rect.width ? ((t.clientX - rect.left) / rect.width) * 100 : 50;
          var y = rect.height ? ((t.clientY - rect.top) / rect.height) * 100 : 50;
          img.style.transformOrigin = Math.max(0, Math.min(100, x)) + '% ' + Math.max(0, Math.min(100, y)) + '%';
          img.classList.toggle('bb-lightbox-image--zoomed');
          if (!img.classList.contains('bb-lightbox-image--zoomed')) {
            img.style.transformOrigin = '';
          }
          var tip = box.querySelector('.bb-pdp-lightbox-zoom-tooltip');
          if (tip) {
            tip.classList.toggle('is-hidden', img.classList.contains('bb-lightbox-image--zoomed'));
          }
        }
        self._bbLastTap = now;
      }, { passive: false });
    }
    close() {
      this.classList.remove('animate');
      setTimeout(() => {
        this.classList.remove('active');
      }, 500);
      document.body.classList.remove('overflow-hidden');
      document.body.style.paddingRight = '';
      window.pauseAllMedia();
      this.querySelectorAll('.theme-lightbox__image.bb-lightbox-image--zoomed').forEach((img) => {
        img.classList.remove('bb-lightbox-image--zoomed');
        img.style.transformOrigin = '';
      });
    }
    getScrollbarWidth() {
      return window.innerWidth - document.documentElement.clientWidth;
    }
  }
  customElements.define('theme-lightbox', themeLightbox);
}

elementName = 'lightbox-opener';
if (!customElements.get(elementName)) {
  class lightboxOpener extends HTMLElement {
    constructor() {
      super();
      this.addEventListener("click", this.clickHandler.bind(this));
    }
    clickHandler(e){
      var id = this.getAttribute('data-id'),
          item = document.getElementById(id),
          data_media_id = this.getAttribute('data-media-id');
      item.open(data_media_id);
    }
  }
  customElements.define('lightbox-opener', lightboxOpener);
}