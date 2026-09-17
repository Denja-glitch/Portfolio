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
      mediaContainer.replaceChildren();
      document.body.classList.remove('is-lightbox-open');
      activeTrigger.focus();
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
