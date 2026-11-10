document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Zeilenmaske: Display-Schrift steigt aus dem Schnitt, Buchstaben im Fliesstext färben sich ein.
  document.querySelectorAll('.split-title > span, .split-title > em, .section-heading h2').forEach((line) => {
    if (line.querySelector('.line-rise')) return;
    const rise = document.createElement('span');
    rise.className = 'line-rise';
    while (line.firstChild) rise.appendChild(line.firstChild);
    const mask = document.createElement('span');
    mask.className = 'line-mask';
    mask.appendChild(rise);
    line.appendChild(mask);
  });

  document.querySelectorAll('.ink-letters').forEach((root) => {
    const clone = root.cloneNode(true);
    clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    const plain = clone.textContent;
    const live = document.createElement('span');
    live.setAttribute('aria-hidden', 'true');
    while (root.firstChild) live.appendChild(root.firstChild);
    const readable = document.createElement('span');
    readable.className = 'sr-only';
    readable.textContent = plain;
    root.append(live, readable);
    const texts = [];
    const walker = document.createTreeWalker(live, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    while (walker.nextNode()) texts.push(walker.currentNode);
    let index = 0;
    texts.forEach((node) => {
      const fragment = document.createDocumentFragment();
      for (const char of node.textContent) {
        if (char === ' ' || char === '\n') {
          fragment.appendChild(document.createTextNode(char));
          continue;
        }
        const span = document.createElement('span');
        span.className = 'ink-char';
        span.style.setProperty('--i', String(index));
        span.textContent = char;
        fragment.appendChild(span);
        index += 1;
      }
      node.parentNode.replaceChild(fragment, node);
    });
  });

  // Seite hinter Overlays festsetzen (Menü, Lightbox, Reel-Feed), auch auf dem Handy.
  let scrollLocks = 0;
  let lockedScrollY = 0;
  const lockScroll = () => {
    if (scrollLocks++ > 0) return;
    lockedScrollY = window.scrollY || window.pageYOffset;
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.classList.add('is-scroll-locked');
  };
  const unlockScroll = () => {
    if (scrollLocks === 0 || --scrollLocks > 0) return;
    document.body.classList.remove('is-scroll-locked');
    document.body.style.top = '';
    window.scrollTo({ top: lockedScrollY, behavior: 'instant' });
  };

  // Animiert Elemente erst dann, wenn sie in den sichtbaren Bereich kommen.
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: window.matchMedia('(max-width: 700px)').matches ? '0px 0px -32px 0px' : '0px 0px -200px 0px', threshold: 0 });

  revealElements.forEach((element) => revealObserver.observe(element));

  const menuToggles = document.querySelectorAll('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  if (menuToggles.length && mobileMenu) {
    let menuLocked = false;
    const setMenuOpen = (open) => {
      if (open && !menuLocked) { lockScroll(); menuLocked = true; }
      document.body.classList.toggle('is-menu-open', open);
      mobileMenu.classList.toggle('is-open', open);
      mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
      menuToggles.forEach((toggle) => toggle.setAttribute('aria-expanded', open ? 'true' : 'false'));
      if (!open && menuLocked) { unlockScroll(); menuLocked = false; }
    };
    menuToggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        setMenuOpen(!document.body.classList.contains('is-menu-open'));
      });
    });
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuOpen(false));
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('is-menu-open')) {
        setMenuOpen(false);
        menuToggles[0]?.focus();
      }
    });
    window.matchMedia('(min-width: 701px)').addEventListener('change', (event) => {
      if (event.matches) setMenuOpen(false);
    });
  }

  // Eigenes Dropdown (ersetzt die native Auswahlliste, behält das <select> für das Formular)
  document.querySelectorAll('select[data-custom-select]').forEach((select) => {
    const wrap = document.createElement('div');
    wrap.className = 'select';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'select__button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-labelledby', select.getAttribute('aria-labelledby'));
    const list = document.createElement('ul');
    list.className = 'select__list';
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    const items = [...select.options].map((option) => {
      const item = document.createElement('li');
      item.className = 'select__option';
      item.setAttribute('role', 'option');
      item.textContent = option.textContent;
      item.dataset.value = option.value || option.textContent;
      if (!option.value && option === select.options[0]) item.dataset.value = '';
      list.append(item);
      return item;
    });
    const sync = () => {
      const index = select.selectedIndex;
      button.textContent = select.options[index].textContent;
      button.classList.toggle('is-placeholder', !select.value);
      items.forEach((item, i) => item.setAttribute('aria-selected', String(i === index)));
    };
    const setOpen = (open) => {
      wrap.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
    };
    button.addEventListener('click', () => setOpen(!wrap.classList.contains('is-open')));
    items.forEach((item, i) => item.addEventListener('click', () => {
      select.selectedIndex = i;
      sync();
      setOpen(false);
      button.focus();
    }));
    document.addEventListener('click', (event) => { if (!wrap.contains(event.target)) setOpen(false); });
    wrap.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { setOpen(false); button.focus(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next = Math.max(0, Math.min(items.length - 1, select.selectedIndex + (event.key === 'ArrowDown' ? 1 : -1)));
        select.selectedIndex = next;
        sync();
      }
    });
    select.addEventListener('change', sync);
    select.hidden = true;
    wrap.append(button, list);
    select.after(wrap);
    sync();
  });

  // Desktop: Beim Scrollen verwandelt sich die Navigation in eine kleine, schwebende Lightbox
  const siteHeader = document.querySelector('.site-header');
  const desktopQuery = window.matchMedia('(min-width: 701px)');
  if (siteHeader && !document.body.matches('.about-page, .kontakt-page')) {
    const links = siteHeader.querySelectorAll('.main-nav .nav-link, .header-contact');
    const floatNav = document.createElement('nav');
    floatNav.className = 'float-nav';
    floatNav.setAttribute('aria-label', 'Schnellnavigation');
    floatNav.setAttribute('aria-hidden', 'true');
    const home = siteHeader.querySelector('.wordmark');
    const items = [];
    if (home) items.push({ href: home.getAttribute('href'), text: 'DA.', cls: 'float-nav__home', label: 'Startseite' });
    links.forEach((link) => {
      const isContact = link.classList.contains('header-contact');
      items.push({
        href: link.getAttribute('href'),
        text: isContact ? "Let's Talk" : link.textContent.trim(),
        cls: isContact ? 'float-nav__cta' : '',
        active: link.classList.contains('is-active')
      });
    });
    items.forEach((item) => {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.text;
      a.className = `float-nav__link ${item.cls}`.trim();
      a.tabIndex = -1;
      if (item.label) a.setAttribute('aria-label', item.label);
      if (item.active) a.classList.add('is-active');
      floatNav.append(a);
    });
    document.body.append(floatNav);
    const floatLinks = [...floatNav.querySelectorAll('a')];
    const updateFloatNav = () => {
      const overlayOpen = document.body.classList.contains('is-scroll-locked');
      const show = desktopQuery.matches && !overlayOpen && window.scrollY > siteHeader.offsetHeight + 80;
      floatNav.classList.toggle('is-visible', show);
      floatNav.setAttribute('aria-hidden', String(!show));
      floatLinks.forEach((a) => { a.tabIndex = show ? 0 : -1; });
    };
    window.addEventListener('scroll', updateFloatNav, { passive: true });
    window.addEventListener('resize', updateFloatNav);
    new MutationObserver(updateFloatNav).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    updateFloatNav();
  }

  // Unterschrift: wird entlang der Tinte geschrieben (Füllung breitet sich vom Anfang der Schrift aus)
  const signatureUrl = new URL('../assets/images/Unterschrift_Denja.svg', document.querySelector('script[src*="main.js"]')?.src || document.baseURI).href;
  let signaturePromise = null;
  const loadSignature = (width) => {
    signaturePromise = signaturePromise || fetch(signatureUrl)
      .then((response) => response.text())
      .then((text) => {
        const svg = text.replace(/\.cls-2\s*\{[^}]*\}/, '.cls-2 { fill: #000; stroke: none; }');
        const viewBox = svg.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/);
        const ratio = viewBox ? Number(viewBox[2]) / Number(viewBox[1]) : 0.75;
        const height = Math.round(width * ratio);
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            const buffer = document.createElement('canvas');
            buffer.width = width;
            buffer.height = height;
            const ctx = buffer.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(image, 0, 0, width, height);
            URL.revokeObjectURL(url);
            const pixels = ctx.getImageData(0, 0, width, height).data;
            const total = width * height;
            const cover = new Uint8Array(total);
            let start = -1;
            let startX = width;
            for (let i = 0; i < total; i += 1) {
              const value = 255 - pixels[i * 4];
              cover[i] = value;
              if (value > 140) {
                const x = i % width;
                if (x < startX) { startX = x; start = i; }
              }
            }
            const dist = new Int32Array(total).fill(-1);
            const queue = new Int32Array(total);
            let head = 0;
            let tail = 0;
            let max = 0;
            if (start >= 0) { dist[start] = 0; queue[tail++] = start; }
            while (head < tail) {
              const index = queue[head++];
              const x = index % width;
              const next = dist[index] + 1;
              const around = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, index - width, index + width];
              for (let k = 0; k < 4; k += 1) {
                const n = around[k];
                if (n < 0 || n >= total || dist[n] !== -1 || cover[n] < 60) continue;
                dist[n] = next;
                if (next > max) max = next;
                queue[tail++] = n;
              }
            }
            // Getrennte Teile (z. B. der Punkt auf dem i) erscheinen am Schluss
            for (let i = 0; i < total; i += 1) if (dist[i] === -1 && cover[i] > 0) dist[i] = max + 12;
            resolve({ width, height, cover, dist, max: max + 12 });
          };
          image.onerror = reject;
          image.src = url;
        });
      });
    return signaturePromise;
  };
  const writeSignature = (canvas, isActive) => {
    const width = 560;
    loadSignature(width).then((data) => {
      canvas.width = data.width;
      canvas.height = data.height;
      const ctx = canvas.getContext('2d');
      const image = ctx.createImageData(data.width, data.height);
      const [r, g, b] = [92, 118, 80];
      const paint = (front) => {
        const out = image.data;
        for (let i = 0; i < data.cover.length; i += 1) {
          const k = i * 4;
          const reach = Math.min(1, Math.max(0, (front - data.dist[i]) / 10));
          out[k] = r; out[k + 1] = g; out[k + 2] = b;
          out[k + 3] = data.dist[i] < 0 ? 0 : data.cover[i] * reach;
        }
        ctx.putImageData(image, 0, 0);
      };
      if (reduceMotion) { paint(data.max + 20); return; }
      paint(-20);
      const delay = 1100;
      const duration = 2600;
      const begin = performance.now() + delay;
      const tick = (now) => {
        if (!isActive()) return;
        const t = Math.min(1, Math.max(0, (now - begin) / duration));
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        paint(eased * (data.max + 20));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }).catch(() => {});
  };

  // Danke-Popup nach dem Absenden
  const showThanks = (name) => {
    const first = (name || '').trim().split(/\s+/)[0];
    const overlay = document.createElement('div');
    overlay.className = 'thanks';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'thanks-title');
    overlay.innerHTML = '<div class="thanks__backdrop" data-thanks-close></div>'
      + '<div class="thanks__panel">'
      + '<button class="thanks__close" type="button" data-thanks-close aria-label="Schliessen">&times;</button>'
      + '<p class="thanks__eyebrow">Nachricht gesendet</p>'
      + '<h2 class="thanks__title" id="thanks-title"></h2>'
      + '<p class="thanks__text">Schön, dass du dich meldest. Ich lese deine Nachricht in Ruhe und antworte dir persönlich, meistens innerhalb von zwei Tagen.</p>'
      + '<canvas class="thanks__script" aria-hidden="true"></canvas>'
      + '</div>';
    overlay.querySelector('#thanks-title').textContent = first ? `Danke dir, ${first}.` : 'Danke dir.';
    document.body.append(overlay);
    lockScroll();
    const close = () => {
      overlay.classList.remove('is-open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { overlay.remove(); unlockScroll(); }, 700);
    };
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    overlay.querySelectorAll('[data-thanks-close]').forEach((el) => el.addEventListener('click', close));
    document.addEventListener('keydown', onKey);
    writeSignature(overlay.querySelector('.thanks__script'), () => overlay.isConnected);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      overlay.querySelector('.thanks__close').focus({ preventScroll: true });
    }));
  };

  // Kontaktformular: Anfrage über Formspree senden
  const form = document.querySelector('[data-contact-form]');
  if (form) {
    const status = document.querySelector('[data-contact-status]');
    const submit = form.querySelector('[type="submit"]');
    const fallback = 'Das hat leider nicht geklappt. Schreib mir direkt an <a href="mailto:framesbydenja@gmail.com">framesbydenja@gmail.com</a>.';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      status.textContent = 'Wird gesendet …';
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(String(response.status));
        const senderName = new FormData(form).get('name');
        form.reset();
        form.querySelectorAll('select[data-custom-select]').forEach((select) => select.dispatchEvent(new Event('change')));
        status.textContent = 'Danke dir! Ich melde mich bald bei dir.';
        showThanks(senderName);
      } catch (error) {
        status.innerHTML = fallback;
      } finally {
        submit.disabled = false;
      }
    });
  }

  const footerReveal = document.querySelector('.page-footer--reveal');
  if (footerReveal && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const footerRevealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        footerReveal.classList.toggle('is-revealed', entry.isIntersecting && entry.intersectionRatio > 0.35);
      });
    }, { threshold: [0.2, 0.35, 0.55, 0.75] });
    footerRevealObserver.observe(footerReveal);
  } else if (footerReveal) {
    footerReveal.classList.add('is-revealed');
  }

  const lightbox = document.querySelector('[data-lightbox-dialog]');
  const lightboxTriggers = document.querySelectorAll('[data-lightbox]');
  if (lightbox && lightboxTriggers.length) {
    const featureContainer = lightbox.querySelector('[data-lightbox-feature]');
    const stillsContainer = lightbox.querySelector('[data-lightbox-stills]');
    const titleElement = lightbox.querySelector('[data-lightbox-title]');
    const descriptionElement = lightbox.querySelector('[data-lightbox-description]');
    const stage = lightbox.querySelector('[data-photo-stage]');
    const stageSlides = lightbox.querySelector('[data-stage-slides]');
    const stageSheet = lightbox.querySelector('[data-stage-sheet]');
    const stageInfoButton = lightbox.querySelector('[data-stage-info]');
    let stageImages = [];
    let stageIndex = 0;
    let stageBusy = false;
    let stageWheelLock = 0;
    let activeTrigger;
    let closeTimer;

    const youtubeId = (src) => {
      const match = src.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
      return match ? match[1] : null;
    };

    const vimeoParts = (src) => {
      const idMatch = src.match(/(?:player\.vimeo\.com\/video\/|vimeo\.com\/)(\d+)/);
      if (!idMatch) return null;
      const hash = src.match(/[?&]h=([a-f0-9]+)/i);
      return { id: idMatch[1], hash: hash ? hash[1] : '' };
    };

    const detectType = (src) => {
      if (youtubeId(src)) return 'youtube';
      if (vimeoParts(src)) return 'vimeo';
      if (/\.(mp4|webm|mov)(\?|$)/i.test(src)) return 'video';
      return 'image';
    };

    const mediaUrl = (src, type, autoplay = false) => {
      if (type === 'youtube') {
        const params = new URLSearchParams({ mute: '1' });
        if (autoplay) params.set('autoplay', '1');
        return `https://www.youtube-nocookie.com/embed/${youtubeId(src)}?${params}`;
      }
      if (type === 'vimeo') {
        const { id, hash } = vimeoParts(src);
        const params = new URLSearchParams({ dnt: '1' });
        if (hash) params.set('h', hash);
        if (autoplay) {
          params.set('autoplay', '1');
          params.set('muted', '1');
        }
        return `https://player.vimeo.com/video/${id}?${params}`;
      }
      return src;
    };

    const parseSlides = (trigger) => {
      const gallery = (trigger.dataset.gallery || '').split('|').map((item) => item.trim()).filter(Boolean);
      const captions = (trigger.dataset.captions || '').split('|').map((item) => item.trim());
      const sources = [];

      if (trigger.dataset.mediaSrc) sources.push(trigger.dataset.mediaSrc);
      gallery.forEach((src) => {
        if (src !== trigger.dataset.mediaSrc) sources.push(src);
      });

      return sources.map((src, index) => {
        const type = trigger.dataset.mediaSrc && index === 0 && trigger.dataset.mediaType
          ? trigger.dataset.mediaType
          : detectType(src);
        const caption = captions.some(Boolean)
          ? (captions[index] || '')
          : (index === 0 ? (trigger.dataset.description || '') : '');
        return { src, type, caption };
      });
    };

    const isVideoSlide = (slide) => slide.type === 'youtube' || slide.type === 'vimeo' || slide.type === 'video';

    const createMedia = (slide, projectTitle, autoplay) => {
      const isEmbeddedVideo = slide.type === 'youtube' || slide.type === 'vimeo';
      const isVideo = slide.type === 'video';
      const media = document.createElement(isEmbeddedVideo ? 'iframe' : (isVideo ? 'video' : 'img'));
      media.src = mediaUrl(slide.src, slide.type, autoplay);
      if (isEmbeddedVideo) {
        media.title = `${projectTitle} abspielen`;
        media.allow = 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share';
        media.allowFullscreen = true;
        media.referrerPolicy = 'strict-origin-when-cross-origin';
      } else if (isVideo) {
        media.controls = true;
        media.muted = true;
        media.defaultMuted = true;
        media.setAttribute('muted', '');
        media.autoplay = autoplay;
        media.playsInline = true;
      } else {
        media.alt = slide.caption || projectTitle;
      }
      return media;
    };


    // Fotoprojekte: Bilder schieben sich beim Scrollen von unten übereinander.
    const setStageInfo = (open) => {
      stageSheet.classList.toggle('is-open', open);
      stageSheet.setAttribute('aria-hidden', String(!open));
      stageInfoButton.setAttribute('aria-expanded', String(open));
      stageInfoButton.querySelector('[data-stage-info-label]').textContent = open ? 'Schliessen' : 'Info';
    };

    const makeStageSlide = (slide, projectTitle) => {
      const figure = document.createElement('figure');
      figure.className = 'photo-stage__slide';
      figure.append(createMedia(slide, projectTitle, false));
      return figure;
    };

    const stageStack = [];

    const layoutStack = () => {
      stageStack.forEach((slide, k) => {
        const depth = stageStack.length - 1 - k;
        slide.style.zIndex = String(k + 1);
        slide.style.setProperty('--d', depth);
      });
    };

    const addStageSlide = (index, { entering = false } = {}) => {
      const slide = makeStageSlide(stageImages[index], titleElement.textContent);
      slide.dataset.index = String(index);
      slide.style.setProperty('--ox', `${(((index * 37) % 7) - 3) * 4.5 || 6}%`);
      slide.style.setProperty('--oy', `${(((index * 53) % 5) - 2) * 3 || -4}%`);
      slide.style.setProperty('--r', `${(((index * 29) % 9) - 4) * 0.9 || 2}deg`);
      if (entering) slide.classList.add('is-entering');
      stageSlides.append(slide);
      stageStack.push(slide);
      return slide;
    };

    const showStage = (target, direction) => {
      if (!stageImages.length) return;
      const next = (target + stageImages.length) % stageImages.length;
      if (stageStack.length && (stageBusy || next === stageIndex)) return;
      const wait = reduceMotion ? 0 : 1100;
      if (direction > 0 || !stageStack.length) {
        const slide = addStageSlide(next, { entering: stageStack.length > 0 });
        layoutStack();
        void slide.offsetWidth;
        slide.classList.remove('is-entering');
        if (stageStack.length > 5) {
          const oldest = stageStack.shift();
          oldest.classList.add('is-gone');
          window.setTimeout(() => oldest.remove(), wait);
        }
      } else {
        stageBusy = true;
        const top = stageStack.pop();
        top.classList.add('is-exiting');
        if (!stageStack.length || Number(stageStack[stageStack.length - 1].dataset.index) !== next) {
          addStageSlide(next);
        }
        layoutStack();
        window.setTimeout(() => { top.remove(); stageBusy = false; }, wait);
      }
      stageIndex = next;
      lightbox.querySelector('[data-stage-index]').textContent = String(next + 1).padStart(2, '0');
      [next + 1, next - 1].forEach((n) => {
        const neighbour = stageImages[(n + stageImages.length) % stageImages.length];
        if (neighbour) new Image().src = neighbour.src;
      });
    };

    const renderStage = (projectTitle, copy, images, start = 0, overlay = false) => {
      stageImages = images;
      stageIndex = start;
      stageBusy = false;
      stageSlides.replaceChildren();
      stageStack.length = 0;
      setStageInfo(false);
      lightbox.querySelector('[data-stage-title]').textContent = projectTitle;
      lightbox.querySelector('[data-stage-project]').textContent = projectTitle;
      lightbox.querySelector('[data-stage-total]').textContent = String(images.length).padStart(2, '0');
      lightbox.querySelector('[data-stage-description]').innerHTML = copy ? copy.innerHTML.trim() : '';
      stageInfoButton.hidden = !copy;
      stage.classList.toggle('is-overlay', overlay);
      stage.hidden = false;
      showStage(start, 1);
      if (overlay) {
        void stage.offsetWidth;
        stage.classList.add('is-shown');
        stage.querySelector('[data-stage-close]').focus({ preventScroll: true });
      }
    };

    const closeStageOverlay = () => {
      stage.classList.remove('is-shown');
      window.setTimeout(() => {
        if (stage.classList.contains('is-shown')) return;
        stage.hidden = true;
        stageSlides.replaceChildren();
        stageStack.length = 0;
      }, 900);
    };

    const renderProject = (trigger) => {
      const card = trigger.closest('.project-card');
      const projectTitle = card.querySelector('h3').textContent;
      const copy = card.querySelector('.project-card__description');
      const slides = parseSlides(trigger);
      const videos = slides.filter(isVideoSlide);
      const images = slides.filter((slide) => !isVideoSlide(slide));
      const isPhotography = !videos.length;
      const isMixed = videos.length > 0 && images.length > 0;

      lightbox.classList.toggle('is-photography', isPhotography);
      lightbox.classList.toggle('is-mixed', isMixed);
      featureContainer.replaceChildren();
      stillsContainer.replaceChildren();
      stage.classList.remove('is-shown', 'is-overlay');
      stage.hidden = true;
      stageSlides.replaceChildren();
      stageStack.length = 0;
      titleElement.textContent = projectTitle;

      if (isPhotography) {
        stillsContainer.hidden = true;
        renderStage(projectTitle, copy, images);
        return;
      }

      videos.forEach((slide, index) => {
        featureContainer.append(createMedia(slide, projectTitle, index === 0 && slide.type === 'youtube'));
      });
      images.forEach((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lightbox__still';
        button.setAttribute('aria-label', slide.caption ? `${slide.caption} vergrössern` : 'Still vergrössern');
        button.append(createMedia(slide, projectTitle, false));
        button.addEventListener('click', () => renderStage(projectTitle, copy, images, index, true));
        stillsContainer.append(button);
      });
      stillsContainer.hidden = !images.length;

      const descriptionHtml = copy?.innerHTML.trim() || '';
      const descriptionText = copy?.textContent.trim() || videos[0]?.caption || '';
      if (copy?.querySelector('p')) descriptionElement.innerHTML = descriptionHtml;
      else descriptionElement.textContent = descriptionText;
      descriptionElement.hidden = !descriptionText;
      lightbox.querySelector('.lightbox__panel').scrollTop = 0;
    };

    const openLightbox = (trigger) => {
      window.clearTimeout(closeTimer);
      activeTrigger = trigger;
      renderProject(trigger);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      if (!document.body.classList.contains('is-lightbox-open')) lockScroll();
      document.body.classList.add('is-lightbox-open');
      (lightbox.classList.contains('is-photography') ? stage.querySelector('[data-stage-close]') : lightbox.querySelector('.lightbox__close')).focus({ preventScroll: true });
    };

    const closeLightbox = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      if (document.body.classList.contains('is-lightbox-open')) unlockScroll();
      document.body.classList.remove('is-lightbox-open');
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        if (lightbox.classList.contains('is-open')) return;
        featureContainer.replaceChildren();
        stillsContainer.replaceChildren();
        stage.classList.remove('is-shown');
        stage.hidden = true;
        stageSlides.replaceChildren();
        stageStack.length = 0;
        activeTrigger?.focus();
      }, 850);
    };

    lightboxTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openLightbox(trigger);
      });
    });
    lightbox.querySelectorAll('[data-lightbox-close]').forEach((closeButton) => closeButton.addEventListener('click', closeLightbox));
    stage.querySelector('[data-stage-close]').addEventListener('click', () => {
      if (stage.classList.contains('is-overlay')) closeStageOverlay();
      else closeLightbox();
    });
    stageInfoButton.addEventListener('click', () => setStageInfo(!stageSheet.classList.contains('is-open')));
    lightbox.querySelector('[data-stage-next]').addEventListener('click', () => showStage(stageIndex + 1, 1));
    lightbox.querySelector('[data-stage-prev]').addEventListener('click', () => showStage(stageIndex - 1, -1));
    stage.addEventListener('wheel', (event) => {
      event.preventDefault();
      const now = Date.now();
      if (now - stageWheelLock < 1000 || Math.abs(event.deltaY) < 8) return;
      stageWheelLock = now;
      showStage(stageIndex + (event.deltaY > 0 ? 1 : -1), event.deltaY > 0 ? 1 : -1);
    }, { passive: false });
    let stageTouchY = null;
    stage.addEventListener('touchstart', (event) => { stageTouchY = event.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', (event) => {
      if (stageTouchY === null) return;
      const delta = event.changedTouches[0].clientY - stageTouchY;
      stageTouchY = null;
      if (Math.abs(delta) < 48) return;
      showStage(stageIndex + (delta < 0 ? 1 : -1), delta < 0 ? 1 : -1);
    }, { passive: true });
    document.addEventListener('keydown', (event) => {
      if (!lightbox.classList.contains('is-open')) return;
      const stageActive = !stage.hidden;
      if (event.key === 'Escape') {
        if (stageActive && stageSheet.classList.contains('is-open')) setStageInfo(false);
        else if (stageActive && stage.classList.contains('is-overlay')) closeStageOverlay();
        else closeLightbox();
        return;
      }
      if (!stageActive) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') showStage(stageIndex + 1, 1);
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') showStage(stageIndex - 1, -1);
    });
  }

  const backgroundVideo = document.querySelector('.contact-canvas__media video');
  if (backgroundVideo) {
    if (reduceMotion) backgroundVideo.pause();
    else backgroundVideo.play()?.catch(() => {});
  }

  const hero = document.querySelector('.hero');
  if (hero) {
    const video = hero.querySelector('.hero__video');

    const openHero = () => hero.classList.add('is-open');
    if (reduceMotion) {
      openHero();
      video?.pause();
    } else {
      window.requestAnimationFrame(() => window.requestAnimationFrame(openHero));
      video?.play()?.catch(() => {});
    }

    if (!reduceMotion) {
      const updateHeroScroll = () => {
        const rect = hero.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
        hero.style.setProperty('--hero-progress', progress.toFixed(3));
      };
      updateHeroScroll();
      window.addEventListener('scroll', updateHeroScroll, { passive: true });
    }
  }

  const errorPanel = document.querySelector('.error-panel');
  const moka = document.querySelector('[data-moka]');
  if (errorPanel) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const openPanel = () => errorPanel.classList.add('is-open');
    if (reduceMotion) openPanel();
    else window.requestAnimationFrame(() => window.requestAnimationFrame(openPanel));

    if (moka) {
      const status = moka.querySelector('[data-moka-status]');
      const toggle = moka.querySelector('[data-moka-toggle]');
      const windowStart = 5200;
      const windowEnd = 7000;
      const burntAt = 8800;
      let frame = 0;
      let startedAt = 0;
      let brewing = false;

      const setLevel = (elapsed) => {
        let level = 0;
        if (elapsed < 2800) level = (elapsed / 2800) * .12;
        else if (elapsed < windowStart) level = .12 + ((elapsed - 2800) / (windowStart - 2800)) * .7;
        else if (elapsed < windowEnd) level = .82 + ((elapsed - windowStart) / (windowEnd - windowStart)) * .12;
        else level = .94 + ((elapsed - windowEnd) / 1800) * .26;
        moka.style.setProperty('--moka-level', Math.min(level, 1.18).toFixed(3));
      };

      const stopBrew = () => {
        brewing = false;
        window.cancelAnimationFrame(frame);
      };

      const finish = (result) => {
        stopBrew();
        moka.dataset.state = result;
        status.textContent = {
          early: 'Zu früh. Noch zu dünn.',
          good: 'Genau. Der Moment.',
          late: 'Zu spät. Sie ist übergekocht.',
        }[result];
        toggle.textContent = 'Noch einmal';
      };

      const tick = (now) => {
        if (!brewing) return;
        const elapsed = now - startedAt;
        setLevel(elapsed);
        if (elapsed < 2200) {
          moka.dataset.state = 'heat';
          status.textContent = 'Es wird heiss.';
        } else if (elapsed < windowStart) {
          moka.dataset.state = 'rise';
          status.textContent = 'Der Kaffee steigt.';
        } else if (elapsed < windowEnd) {
          moka.dataset.state = 'window';
          status.textContent = 'Jetzt.';
        } else if (elapsed < burntAt) {
          moka.dataset.state = 'overflow';
          status.textContent = 'Sie kocht über.';
        } else {
          finish('late');
          return;
        }
        frame = window.requestAnimationFrame(tick);
      };

      const startBrew = () => {
        stopBrew();
        brewing = true;
        startedAt = performance.now();
        moka.dataset.state = 'heat';
        status.textContent = 'Der Herd ist an.';
        toggle.textContent = 'Herd aus';
        frame = window.requestAnimationFrame(tick);
      };

      toggle.addEventListener('click', () => {
        if (!brewing) {
          startBrew();
          return;
        }
        const elapsed = performance.now() - startedAt;
        if (elapsed < windowStart) finish('early');
        else if (elapsed < windowEnd) finish('good');
        else finish('late');
      });

      if (reduceMotion) {
        moka.dataset.state = 'idle';
        status.textContent = 'Der Herd bleibt aus.';
        toggle.hidden = true;
      } else {
        window.setTimeout(startBrew, 1600);
      }
    }
  }

  const filterButtons = document.querySelectorAll('.filter-button');
  const projectCards = document.querySelectorAll('.project-card');
  const projectGrid = document.querySelector('.project-grid');
  if (filterButtons.length && projectCards.length) {
    let filterTimer;

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const selectedFilter = button.getAttribute('data-filter');

        filterButtons.forEach((filterButton) => {
          const isActive = filterButton === button;
          filterButton.classList.toggle('is-active', isActive);
          filterButton.setAttribute('aria-pressed', isActive);
        });

        projectGrid?.classList.toggle('is-filtered', selectedFilter !== 'all');
        if (projectGrid) projectGrid.dataset.filter = selectedFilter;
        if (projectGrid) projectGrid.dataset.filter = selectedFilter;
        window.clearTimeout(filterTimer);
        projectCards.forEach((card) => card.classList.add('is-filtering'));

        filterTimer = window.setTimeout(() => {
          projectCards.forEach((card) => {
            const categories = (card.getAttribute('data-category') || '').trim().split(/\s+/).filter(Boolean);
            const isReel = categories.includes('reels');
            const shouldShow = selectedFilter === 'all'
              || (selectedFilter === 'social' && (categories.includes('social') || isReel))
              || categories.includes(selectedFilter);
            card.classList.toggle('is-hidden', !shouldShow);
            card.classList.remove('is-filtering');
          });
        }, 300);
      });
    });
  }

  const reelFeed = document.querySelector('.reel-feed');
  const reelGrid = document.querySelector('[data-reel-grid]');
  if (reelFeed && reelGrid) {
    const posterUrl = (file, so, width = 540, height = 960) => (
      `https://res.cloudinary.com/zl2rykvk/video/upload/so_${so},w_${width},h_${height},c_fill,g_auto,f_jpg,q_auto/${file}.jpg`
    );

    const cloudinaryVideo = (file, version, meta) => ({
      title: meta.title,
      alt: meta.alt,
      handle: meta.handle,
      file,
      so: meta.so,
      poster: posterUrl(file, meta.so),
      src: `https://res.cloudinary.com/zl2rykvk/video/upload/q_auto,w_720,f_mp4/v${version}/${file}.mp4`
    });

    const reelFeeds = {
      'embassy-kirchhofer': {
        title: 'Embassy Kirchhofer Group',
        handle: '@embassy_jewel_ag',
        items: [
          cloudinaryVideo('video_26', '1789981743', {
            title: 'Blancpain Unboxing',
            alt: 'Offene Blancpain-Holzkassette mit Uhr, Weinflasche und Gläsern',
            so: 3.6
          }),
          cloudinaryVideo('video_24', '1789981743', {
            title: 'Van Cleef & Arpels Unboxing',
            alt: 'Weisse Van-Cleef-&-Arpels-Schachtel mit hellgrüner Schleife vor einer Schmuckvitrine',
            so: 0.7
          }),
          cloudinaryVideo('video', '1789981742', {
            title: 'Amacord Embassy Event',
            alt: 'Empfang in einer Boutique, Mann im beerenfarbenen Anzug vor einer Schmuckvitrine',
            so: 1.5
          }),
          cloudinaryVideo('video_20', '1789981739', {
            title: 'Winter am See mit Blancpain',
            alt: 'Heisse Schokolade im Schnee am See, Uhr am Handgelenk',
            so: 2.4
          }),
          cloudinaryVideo('video_16', '1789981740', {
            title: 'Bvlgari High Jewelry',
            alt: 'Goldene Bvlgari-Armreifen am Handgelenk',
            so: 5
          }),
          cloudinaryVideo('video_15', '1789981738', {
            title: 'Manufakturbesuch Arnold & Son',
            alt: 'Schwarzer Bentley Bentayga frontal im Abendlicht',
            so: 0.7
          }),
          cloudinaryVideo('video_23', '1789981740', {
            title: 'Van Cleef & Arpels Unboxing',
            alt: 'Geöffnete Van-Cleef-&-Arpels-Box mit weisser Schleife',
            so: 5
          }),
          cloudinaryVideo('video_11', '1789981736', {
            title: 'Auf dem See mit Breitling',
            alt: 'Uhr am Handgelenk, Blick über den See zu den Bergen',
            so: 3.6
          }),
          cloudinaryVideo('video_8', '1789981736', {
            title: 'Zenith Festtage',
            alt: 'Zenith-Uhr in geöffneter Holzkassette neben einem Weihnachtsbaum',
            so: 5
          }),
          cloudinaryVideo('video_1', '1789981733', {
            title: 'Bentley Blancpain',
            alt: 'Hand mit Uhr und Ring am Lenkrad eines Bentley',
            so: 1.5
          }),
          cloudinaryVideo('video_7', '1789981735', {
            title: 'Serpenti Try on',
            alt: 'Mehrere Bvlgari-Armreifen am Handgelenk über einer Boutique-Vitrine',
            so: 5
          }),
          cloudinaryVideo('video_13', '1789981737', {
            title: 'Auf dem See mit Ulysse Nardin',
            alt: 'Drei Uhren in einem orangen Koffer auf einem Tretboot',
            so: 2.4
          }),
          cloudinaryVideo('video_21', '1789981739', {
            title: 'TAG Heuer Unboxing',
            alt: 'Geöffnete TAG-Heuer-Box mit schwarzem Etui auf dem Tisch',
            so: 3.6
          }),
          cloudinaryVideo('video_3', '1789981734', {
            title: 'Bvlgari Serpenti in Paris',
            alt: 'Frau fotografiert den Eiffelturm, Uhr und Armreif am Handgelenk',
            so: 1.5
          }),
          cloudinaryVideo('video_18', '1789981739', {
            title: 'Zenith Unboxing',
            alt: 'Grüne Zenith-Uhr in geöffneter Box, Logo im Deckel',
            so: 2.4
          }),
          cloudinaryVideo('video_19', '1789981739', {
            title: 'Bvlgari Afternoon Tea',
            alt: 'Afternoon-Tea-Menü auf dem Tisch, Uhr am Handgelenk',
            so: 3.6
          }),
          cloudinaryVideo('video_5', '1789981735', {
            title: 'Franck Muller am Wasser',
            alt: 'Frau mit rechteckiger Uhr am Handgelenk vor klarem Seewasser',
            so: 1.5
          }),
          cloudinaryVideo('video_10', '1789981736', {
            title: 'Tray of Watches',
            alt: 'Tablett mit Uhren in der Draufsicht',
            so: 5
          }),
          cloudinaryVideo('video_12', '1789981737', {
            title: 'Auf dem See mit Tudor',
            alt: 'Mann mit Embassy-Tasche am Nationalquai in Luzern, Pedalos am Ufer',
            so: 1.5
          }),
          cloudinaryVideo('video_22', '1789981740', {
            title: 'Bentley Event Luzern',
            alt: 'Uhr in Nahaufnahme neben einer Weinflasche',
            so: 5
          }),
          cloudinaryVideo('video_6', '1789981735', {
            title: 'Franck Muller am See',
            alt: 'Franck-Muller-Uhr am Handgelenk vor dem Geländer am Seeufer',
            so: 2.4
          }),
          cloudinaryVideo('video_14', '1789981737', {
            title: 'Zenith Unboxing',
            alt: 'Zenith-Chronograph in der geöffneten Kassette',
            so: 5
          }),
          cloudinaryVideo('video_4', '1789981735', {
            title: 'Breilting im Café',
            alt: 'Cappuccino und Uhr am Handgelenk an einem Café-Tisch im Sonnenlicht',
            so: 0.7
          }),
          cloudinaryVideo('video_27', '1789982401', {
            title: 'Kirchhofer x Hublot Special Edition',
            handle: '@kirchhofer_official',
            alt: 'Hublot Classic Fusion in eisblau, in der Hublot-Schale',
            so: 2.4
          }),
          cloudinaryVideo('video_17', '1789981738', {
            title: 'TAG Heuer Unboxing',
            alt: 'TAG-Heuer-Uhren auf einem Tablett neben einem aufgeschlagenen Magazin',
            so: 5
          }),
          cloudinaryVideo('video_9', '1789981736', {
            title: 'Hublot & Zenith Event',
            alt: 'Dom-Pérignon-Flaschen im Eiswürfelkübel',
            so: 5
          }),
          cloudinaryVideo('video_25', '1789981744', {
            title: 'Manufakturbesuch Breitling',
            alt: 'Breitling-Chronograph am Handgelenk neben einer mintgrünen Karte',
            so: 3.6
          })
        ]
      }
    };

    const titleNode = reelFeed.querySelector('#reel-feed-title');
    const closeButton = reelFeed.querySelector('.reel-feed__close');
    const reelPanel = reelFeed.querySelector('[data-reel-panel]');
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    let reelObserver;

    const createMutedVideo = (src, poster, label) => {
      const video = document.createElement('video');
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'none';
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      if (label) video.setAttribute('aria-label', label);
      if (poster) video.poster = poster;
      const source = document.createElement('source');
      source.src = src;
      source.type = 'video/mp4';
      video.append(source);
      video.addEventListener('error', () => video.remove());
      return video;
    };

    const playMuted = (video) => {
      if (!video) return;
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute('muted', '');
      if (video.preload === 'none') video.preload = 'auto';
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
    };

    const stopMuted = (video) => {
      if (!video) return;
      video.pause();
      try { video.currentTime = 0; } catch (_) {}
    };

    const setReelPlaying = (card, video, playing) => {
      if (!card) return;
      card.classList.toggle('is-playing', Boolean(playing));
      if (playing) playMuted(video);
      else stopMuted(video);
    };

    const bindHoverPlayback = (host, video) => {
      if (!video || !canHover.matches) return;
      host.addEventListener('mouseenter', () => setReelPlaying(host, video, true));
      host.addEventListener('mouseleave', () => setReelPlaying(host, video, false));
    };

    const stopReels = () => {
      reelGrid.querySelectorAll('.reel-card').forEach((card) => {
        card.classList.remove('is-playing');
        stopMuted(card.querySelector('video'));
      });
    };

    const closeReelFeed = () => {
      reelFeed.classList.remove('is-open');
      reelFeed.setAttribute('aria-hidden', 'true');
      if (document.body.classList.contains('is-reel-feed-open')) unlockScroll();
      document.body.classList.remove('is-reel-feed-open');
      stopReels();
      reelObserver?.disconnect();
    };

    const renderReelFeed = (feedId) => {
      const feed = reelFeeds[feedId];
      if (!feed) return;
      if (titleNode) titleNode.textContent = feed.title;
      reelGrid.replaceChildren();

      feed.items.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'reel-card';
        const media = document.createElement('div');
        media.className = 'reel-card__media';
        const still = item.poster;
        const poster = document.createElement('img');
        poster.src = still;
        poster.alt = item.alt || item.title || feed.title;
        poster.loading = 'lazy';
        media.append(poster);

        if (item.src) {
          const video = createMutedVideo(item.src, still, item.alt || item.title);
          media.append(video);
          bindHoverPlayback(card, video);
        }

        const shade = document.createElement('div');
        shade.className = 'reel-card__shade';
        const handleValue = item.handle || feed.handle;
        const handle = document.createElement('span');
        handle.className = 'reel-card__handle';
        const avatar = document.createElement('span');
        avatar.className = 'reel-card__avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = (handleValue.replace('@', '').trim().charAt(0) || 'D').toUpperCase();
        handle.append(avatar, document.createTextNode(handleValue));
        const meta = document.createElement('div');
        meta.className = 'reel-card__meta';
        const tag = document.createElement('span');
        tag.className = 'reel-card__tag';
        tag.textContent = 'reel';
        const title = document.createElement('span');
        title.className = 'reel-card__title';
        title.textContent = item.title || '';
        meta.append(tag, title);
        card.append(media, shade, handle, meta);
        reelGrid.append(card);
      });
    };

    const openReelFeed = (feedId) => {
      renderReelFeed(feedId);
      const scroller = reelPanel || reelFeed;
      scroller.scrollTop = 0;
      reelFeed.classList.add('is-open');
      reelFeed.setAttribute('aria-hidden', 'false');
      if (!document.body.classList.contains('is-reel-feed-open')) lockScroll();
      document.body.classList.add('is-reel-feed-open');
      closeButton?.focus();
      reelObserver?.disconnect();

      if (canHover.matches) return;

      reelObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const card = entry.target;
          const video = card.querySelector('video');
          setReelPlaying(card, video, entry.isIntersecting && entry.intersectionRatio >= 0.28);
        });
      }, { root: scroller, threshold: [0, 0.28, 0.5, 0.75] });
      reelGrid.querySelectorAll('.reel-card').forEach((card) => reelObserver.observe(card));
    };

    document.querySelectorAll('[data-reel-feed]').forEach((trigger) => {
      const feed = reelFeeds[trigger.getAttribute('data-reel-feed')];
      const preview = feed?.items?.[0];
      if (preview?.src) {
        const video = createMutedVideo(preview.src, preview.poster, preview.alt || preview.title);
        trigger.append(video);
        bindHoverPlayback(trigger, video);
      }
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openReelFeed(trigger.getAttribute('data-reel-feed'));
      });
    });

    reelFeed.querySelectorAll('[data-reel-close]').forEach((el) => {
      el.addEventListener('click', closeReelFeed);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && reelFeed.classList.contains('is-open')) closeReelFeed();
    });
  }

  const canHoverPreview = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll('.home-work__media video').forEach((video) => {
    const card = video.closest('.home-work');
    if (!card || reduceMotion || !canHoverPreview) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    card.addEventListener('mouseenter', () => {
      const attempt = video.play();
      if (attempt) attempt.catch(() => {});
    });
    card.addEventListener('mouseleave', () => {
      video.pause();
      try { video.currentTime = 0; } catch (_) {}
    });
  });

  // Cursor: folgt der Maus und benennt, was ein Klick öffnet.
  if (canHoverPreview) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    const cursorLabel = document.createElement('span');
    cursor.append(cursorLabel);
    document.body.append(cursor);
    const targetSelector = '.home-work, .project-card__media';
    let tx = -100;
    let ty = -100;
    let cx = -100;
    let cy = -100;
    let activeTarget = null;
    let cursorFrame = 0;

    const labelFor = (el) => {
      if (el.hasAttribute('data-reel-feed')) return 'Feed';
      if (el.classList.contains('home-work')) return el.querySelector('video') ? 'Film' : 'Ansehen';
      const gallery = el.getAttribute('data-gallery') || '';
      const isFilm = el.getAttribute('data-media-type') === 'youtube'
        || /youtu\.?be|vimeo/.test(gallery.split('|')[0] || '');
      return isFilm ? 'Film' : 'Ansehen';
    };

    const tickCursor = () => {
      cx += (tx - cx) * 0.25;
      cy += (ty - cy) * 0.25;
      cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -50%)`;
      const settled = Math.abs(tx - cx) < 0.3 && Math.abs(ty - cy) < 0.3;
      cursorFrame = settled ? 0 : window.requestAnimationFrame(tickCursor);
    };
    const wakeCursor = () => { if (!cursorFrame) cursorFrame = window.requestAnimationFrame(tickCursor); };

    const setTarget = (target) => {
      if (target === activeTarget) return;
      activeTarget = target;
      if (target) cursorLabel.textContent = labelFor(target);
      cursor.classList.toggle('is-active', Boolean(target));
      wakeCursor();
    };

    document.addEventListener('mousemove', (event) => {
      if (!document.documentElement.classList.contains('has-custom-cursor')) {
        cx = event.clientX;
        cy = event.clientY;
        document.documentElement.classList.add('has-custom-cursor');
        cursor.classList.add('is-visible');
      }
      tx = event.clientX;
      ty = event.clientY;
      const insideOverlay = event.target.closest?.('.lightbox, .reel-feed');
      setTarget(insideOverlay ? null : (event.target.closest?.(targetSelector) || null));
      wakeCursor();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { setTarget(null); cursor.classList.remove('is-visible'); document.documentElement.classList.remove('has-custom-cursor'); });
  }

  // Magnetische Elemente: ziehen sich leicht zum Cursor.
  if (canHoverPreview && !reduceMotion) {
    document.querySelectorAll('.header-contact, .filter-button, .page-footer__cta, .text-link').forEach((el) => {
      el.classList.add('is-magnetic');
      el.addEventListener('mousemove', (event) => {
        const rect = el.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
        el.classList.add('is-pulling');
        el.style.translate = `${(dx * 14).toFixed(1)}px ${(dy * 10).toFixed(1)}px`;
      });
      el.addEventListener('mouseleave', () => {
        el.classList.remove('is-pulling');
        el.style.translate = '';
      });
    });
  }

  // Scroll-gekoppelt: Tiefe in den Fotos.
  const depthImages = [...document.querySelectorAll('.project-card__media img, .home-work__media img')];

  let scrollQueued = false;
  const updateScrollEffects = () => {
    scrollQueued = false;
    if (!reduceMotion) {
      depthImages.forEach((img) => {
        const box = img.parentElement.getBoundingClientRect();
        if (box.bottom < -80 || box.top > window.innerHeight + 80 || !box.height) return;
        const p = ((box.top + box.height / 2) - window.innerHeight / 2) / (window.innerHeight / 2 + box.height / 2);
        img.style.setProperty('--py', `${(Math.max(-1, Math.min(1, p)) * box.height * 0.045).toFixed(1)}px`);
      });
    }
  };
  const queueScrollEffects = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateScrollEffects);
  };
  window.addEventListener('scroll', queueScrollEffects, { passive: true });
  window.addEventListener('resize', queueScrollEffects);
  updateScrollEffects();
  // Startseite: Arbeiten erscheinen gestapelt in der Mitte, einzeln eingeblendet, und fächern sich dann auf
  const worksGrid = document.querySelector('.home-works__grid');
  if (worksGrid && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && worksGrid.animate) {
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const workCards = [...worksGrid.querySelectorAll('.home-work')].filter((card) => card.offsetParent !== null);
    workCards.forEach((card) => { card.style.opacity = '0'; });
    const playWorksIntro = () => {
      const gridRect = worksGrid.getBoundingClientRect();
      const centerX = gridRect.left + gridRect.width / 2;
      const stackScale = isMobile ? 0.42 : 0.5;
      const appear = 0.12;
      const spreadStart = 0.2 + workCards.length * appear;
      const spreadStep = 0.07;
      const spreadTime = 0.95;
      const total = spreadStart + (workCards.length - 1) * spreadStep + spreadTime;
      workCards.forEach((card, i) => {
        card.classList.add('is-visible');
        const rect = card.getBoundingClientRect();
        const dx = centerX - (rect.left + rect.width / 2);
        const stacked = `translateX(${dx}px) scale(${stackScale})`;
        const appearAt = i * appear;
        const spreadAt = spreadStart + i * spreadStep;
        const frames = [
          { opacity: 0, transform: stacked, offset: 0 },
          { opacity: 0, transform: stacked, offset: appearAt / total },
          { opacity: 1, transform: stacked, offset: (appearAt + 0.06) / total },
          { opacity: 1, transform: stacked, offset: spreadAt / total, easing: 'cubic-bezier(.65, 0, .2, 1)' },
          { opacity: 1, transform: 'none', offset: (spreadAt + spreadTime) / total },
          { opacity: 1, transform: 'none', offset: 1 }
        ];
        const animation = card.animate(frames, { duration: total * 1000, fill: 'both' });
        animation.finished.then(() => { card.style.opacity = ''; animation.cancel(); }).catch(() => {});
      });
    };
    const worksObserver = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      playWorksIntro();
    }, { threshold: 0.45 });
    worksObserver.observe(worksGrid);
  }
  // Desktop: Galerie per Maus ziehen (Karussell ohne sichtbare Scrollleiste)
  if (worksGrid && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let startX = 0;
    let startScroll = 0;
    let dragged = false;
    let pressed = false;
    worksGrid.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || window.innerWidth <= 700) return;
      pressed = true;
      dragged = false;
      startX = event.clientX;
      startScroll = worksGrid.scrollLeft;
    });
    window.addEventListener('pointermove', (event) => {
      if (!pressed) return;
      const delta = event.clientX - startX;
      if (!dragged && Math.abs(delta) > 6) {
        dragged = true;
        worksGrid.classList.add('is-dragging');
      }
      if (dragged) worksGrid.scrollLeft = startScroll - delta;
    });
    window.addEventListener('pointerup', () => {
      pressed = false;
      worksGrid.classList.remove('is-dragging');
    });
    worksGrid.addEventListener('click', (event) => {
      if (dragged) { event.preventDefault(); dragged = false; }
    }, true);
    worksGrid.addEventListener('dragstart', (event) => event.preventDefault());
  }
});
