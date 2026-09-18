document.addEventListener('DOMContentLoaded', () => {
  // Animiert Elemente erst dann, wenn sie in den sichtbaren Bereich kommen.
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -200px 0px', threshold: 0 });

  revealElements.forEach((element) => revealObserver.observe(element));

  const lightbox = document.querySelector('[data-lightbox-dialog]');
  const lightboxTriggers = document.querySelectorAll('[data-lightbox]');
  if (lightbox && lightboxTriggers.length) {
    const mediaContainer = lightbox.querySelector('[data-lightbox-media]');
    const titleElement = lightbox.querySelector('[data-lightbox-title]');
    const descriptionElement = lightbox.querySelector('[data-lightbox-description]');
    const countElement = lightbox.querySelector('[data-lightbox-count]');
    const previousButton = lightbox.querySelector('[data-lightbox-prev]');
    const nextButton = lightbox.querySelector('[data-lightbox-next]');
    let activeGallery = [];
    let activeIndex = 0;
    let activeTrigger;
    let closeTimer;

    const renderMedia = () => {
      const trigger = activeTrigger;
      const projectTitle = trigger.closest('.project-card').querySelector('h3').textContent;
      const mediaType = trigger.dataset.mediaType;
      const isVideo = mediaType === 'video' && activeIndex === 0;
      const isEmbeddedVideo = mediaType === 'youtube' && activeIndex === 0;
      const source = (isVideo || isEmbeddedVideo) ? trigger.dataset.mediaSrc : activeGallery[activeIndex];
      mediaContainer.replaceChildren();
      const media = document.createElement(isEmbeddedVideo ? 'iframe' : (isVideo ? 'video' : 'img'));
      media.src = source;
      media.alt = `${projectTitle} - ${activeIndex + 1}`;
      if (isEmbeddedVideo) {
        media.title = `${projectTitle} abspielen`;
        media.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        media.allowFullscreen = true;
        media.referrerPolicy = 'strict-origin-when-cross-origin';
      } else if (isVideo) {
        media.controls = true;
        media.autoplay = true;
        media.playsInline = true;
      }
      mediaContainer.append(media);
      titleElement.textContent = projectTitle;
      descriptionElement.textContent = trigger.dataset.description || '';
      countElement.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(activeGallery.length).padStart(2, '0')}`;
      previousButton.disabled = activeGallery.length < 2;
      nextButton.disabled = activeGallery.length < 2;
    };

    const openLightbox = (trigger) => {
      window.clearTimeout(closeTimer);
      activeTrigger = trigger;
      activeGallery = trigger.dataset.gallery.split('|');
      activeIndex = 0;
      renderMedia();
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-lightbox-open');
      lightbox.querySelector('.lightbox__close').focus();
    };

    const closeLightbox = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-lightbox-open');
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        if (lightbox.classList.contains('is-open')) return;
        mediaContainer.replaceChildren();
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
    previousButton.addEventListener('click', () => {
      activeIndex = (activeIndex - 1 + activeGallery.length) % activeGallery.length;
      renderMedia();
    });
    nextButton.addEventListener('click', () => {
      activeIndex = (activeIndex + 1) % activeGallery.length;
      renderMedia();
    });
    document.addEventListener('keydown', (event) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') previousButton.click();
      if (event.key === 'ArrowRight') nextButton.click();
    });
  }

  const hero = document.querySelector('.hero');
  if (hero) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const video = hero.querySelector('.hero__video');
    const timecode = hero.querySelector('[data-hero-timecode]');
    const pad = (value) => String(Math.floor(value)).padStart(2, '0');
    const formatTimecode = (seconds) => {
      const frames = Math.floor((seconds % 1) * 24);
      const total = Math.floor(seconds);
      const s = total % 60;
      const m = Math.floor(total / 60) % 60;
      const h = Math.floor(total / 3600);
      return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
    };

    const openHero = () => hero.classList.add('is-open');
    if (reduceMotion) {
      openHero();
      video?.pause();
    } else {
      window.requestAnimationFrame(() => window.requestAnimationFrame(openHero));
      video?.play()?.catch(() => {});
    }

    if (video && timecode && !reduceMotion) {
      const tickTimecode = () => {
        timecode.textContent = formatTimecode(video.currentTime || 0);
        window.requestAnimationFrame(tickTimecode);
      };
      window.requestAnimationFrame(tickTimecode);
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

  const filterButtons = document.querySelectorAll('.filter-button');
  const projectCards = document.querySelectorAll('.project-card');
  if (!filterButtons.length || !projectCards.length) return;
  let filterTimer;

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selectedFilter = button.dataset.filter;

      filterButtons.forEach((filterButton) => {
        const isActive = filterButton === button;
        filterButton.classList.toggle('is-active', isActive);
        filterButton.setAttribute('aria-pressed', isActive);
      });

      window.clearTimeout(filterTimer);
      projectCards.forEach((card) => card.classList.add('is-filtering'));

      filterTimer = window.setTimeout(() => {
        projectCards.forEach((card) => {
          const shouldShow = selectedFilter === 'all' || card.dataset.category === selectedFilter;
          card.classList.toggle('is-hidden', !shouldShow);
          if (shouldShow) window.requestAnimationFrame(() => card.classList.remove('is-filtering'));
        });
      }, 300);
    });
  });
});
