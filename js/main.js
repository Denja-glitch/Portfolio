document.addEventListener('DOMContentLoaded', () => {
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

  const contactClock = document.querySelector('[data-contact-clock]');
  if (contactClock) {
    const days = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
    const pad = (value) => String(value).padStart(2, '0');
    const dayNode = contactClock.querySelector('[data-clock-day]');
    const hoursNode = contactClock.querySelector('[data-clock-hours]');
    const minutesNode = contactClock.querySelector('[data-clock-minutes]');
    const secondsNode = contactClock.querySelector('[data-clock-seconds]');
    const tick = () => {
      const now = new Date();
      dayNode.textContent = days[now.getDay()];
      hoursNode.textContent = pad(now.getHours());
      minutesNode.textContent = pad(now.getMinutes());
      secondsNode.textContent = pad(now.getSeconds());
    };
    tick();
    window.setInterval(tick, 1000);
  }

  const lightbox = document.querySelector('[data-lightbox-dialog]');
  const lightboxTriggers = document.querySelectorAll('[data-lightbox]');
  if (lightbox && lightboxTriggers.length) {
    const featureContainer = lightbox.querySelector('[data-lightbox-feature]');
    const stillsContainer = lightbox.querySelector('[data-lightbox-stills]');
    const titleElement = lightbox.querySelector('[data-lightbox-title]');
    const descriptionElement = lightbox.querySelector('[data-lightbox-description]');
    const stillViewer = lightbox.querySelector('[data-still-viewer]');
    const stillImage = lightbox.querySelector('[data-still-image]');
    let activeTrigger;
    let activeStills = [];
    let stillIndex = 0;
    let closeTimer;

    const youtubeId = (src) => {
      const match = src.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
      return match ? match[1] : null;
    };

    const detectType = (src) => {
      if (youtubeId(src)) return 'youtube';
      if (/\.(mp4|webm|mov)(\?|$)/i.test(src)) return 'video';
      return 'image';
    };

    const mediaUrl = (src, type, autoplay = false) => {
      if (type !== 'youtube') return src;
      const params = new URLSearchParams({ mute: '1' });
      if (autoplay) params.set('autoplay', '1');
      return `https://www.youtube.com/embed/${youtubeId(src)}?${params}`;
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

    const isVideoSlide = (slide) => slide.type === 'youtube' || slide.type === 'video';

    const createMedia = (slide, projectTitle, autoplay) => {
      const isEmbeddedVideo = slide.type === 'youtube';
      const isVideo = slide.type === 'video';
      const media = document.createElement(isEmbeddedVideo ? 'iframe' : (isVideo ? 'video' : 'img'));
      media.src = mediaUrl(slide.src, slide.type, autoplay);
      if (isEmbeddedVideo) {
        media.title = `${projectTitle} abspielen`;
        media.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
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

    const renderProject = (trigger) => {
      const card = trigger.closest('.project-card');
      const projectTitle = card.querySelector('h3').textContent;
      const copy = card.querySelector('.project-card__description');
      const slides = parseSlides(trigger);
      const videos = slides.filter(isVideoSlide);
      const images = slides.filter((slide) => !isVideoSlide(slide));
      const features = videos.length ? videos : images.slice(0, 1);
      const stills = videos.length ? images : images.slice(1);

      featureContainer.replaceChildren();
      stillsContainer.replaceChildren();
      features.forEach((slide, index) => {
        featureContainer.append(createMedia(slide, projectTitle, index === 0));
      });

      stills.forEach((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lightbox__still';
        button.setAttribute('aria-label', slide.caption ? `${slide.caption} vergrößern` : 'Still vergrößern');
        button.append(createMedia(slide, projectTitle, false));
        button.addEventListener('click', () => openStillViewer(index));
        stillsContainer.append(button);
      });
      stillsContainer.hidden = !stills.length;
      activeStills = stills;
      stillIndex = 0;

      titleElement.textContent = projectTitle;
      const description = copy?.textContent.trim() || features[0]?.caption || '';
      descriptionElement.textContent = description;
      descriptionElement.hidden = !description;
      lightbox.querySelector('.lightbox__panel').scrollTop = 0;
    };

    const showStill = (index) => {
      if (!activeStills.length) return;
      stillIndex = (index + activeStills.length) % activeStills.length;
      const slide = activeStills[stillIndex];
      stillImage.src = slide.src;
      stillImage.alt = slide.caption || titleElement.textContent;
    };

    const openStillViewer = (index) => {
      showStill(index);
      stillViewer.classList.add('is-open');
      stillViewer.setAttribute('aria-hidden', 'false');
      stillViewer.querySelector('[data-still-close]').focus();
    };

    const closeStillViewer = () => {
      stillViewer.classList.remove('is-open');
      stillViewer.setAttribute('aria-hidden', 'true');
    };

    const openLightbox = (trigger) => {
      window.clearTimeout(closeTimer);
      closeStillViewer();
      activeTrigger = trigger;
      renderProject(trigger);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-lightbox-open');
      lightbox.querySelector('.lightbox__close').focus();
    };

    const closeLightbox = () => {
      closeStillViewer();
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-lightbox-open');
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        if (lightbox.classList.contains('is-open')) return;
        featureContainer.replaceChildren();
        stillsContainer.replaceChildren();
        stillImage.removeAttribute('src');
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
    stillViewer.querySelector('[data-still-close]').addEventListener('click', (event) => {
      event.stopPropagation();
      closeStillViewer();
    });
    stillImage.addEventListener('click', () => showStill(stillIndex + 1));
    document.addEventListener('keydown', (event) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        if (stillViewer.classList.contains('is-open')) closeStillViewer();
        else closeLightbox();
        return;
      }
      if (!stillViewer.classList.contains('is-open')) return;
      if (event.key === 'ArrowRight') showStill(stillIndex + 1);
      if (event.key === 'ArrowLeft') showStill(stillIndex - 1);
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
