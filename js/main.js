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
        return `https://www.youtube.com/embed/${youtubeId(src)}?${params}`;
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

    const renderProject = (trigger) => {
      const card = trigger.closest('.project-card');
      const projectTitle = card.querySelector('h3').textContent;
      const copy = card.querySelector('.project-card__description');
      const slides = parseSlides(trigger);
      const videos = slides.filter(isVideoSlide);
      const images = slides.filter((slide) => !isVideoSlide(slide));
      const isPhotography = !videos.length;
      const isMixed = videos.length > 0 && images.length > 0;
      const features = videos.length ? videos : images.slice(0, 1);
      const stills = videos.length ? images : images.slice(1);

      lightbox.classList.toggle('is-photography', isPhotography);
      lightbox.classList.toggle('is-mixed', isMixed);
      featureContainer.replaceChildren();
      stillsContainer.replaceChildren();
      features.forEach((slide, index) => {
        featureContainer.append(createMedia(slide, projectTitle, index === 0 && slide.type === 'youtube'));
      });

      if (isPhotography) {
        featureContainer.querySelector('img')?.addEventListener('click', () => openStillViewer(0));
      }

      stills.forEach((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lightbox__still';
        button.setAttribute('aria-label', slide.caption ? `${slide.caption} vergrössern` : 'Still vergrössern');
        button.append(createMedia(slide, projectTitle, false));
        button.addEventListener('click', () => openStillViewer(isPhotography ? index + 1 : index));
        stillsContainer.append(button);
      });
      stillsContainer.hidden = !stills.length;
      activeStills = isPhotography ? images : stills;
      stillIndex = 0;

      titleElement.textContent = projectTitle;
      const descriptionHtml = copy?.innerHTML.trim() || '';
      const descriptionText = copy?.textContent.trim() || features[0]?.caption || '';
      if (copy?.querySelector('p')) descriptionElement.innerHTML = descriptionHtml;
      else descriptionElement.textContent = descriptionText;
      descriptionElement.hidden = !descriptionText;
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
    const cloudinaryVideo = (file, version, title, handle) => ({
      title,
      handle,
      poster: `https://res.cloudinary.com/zl2rykvk/video/upload/so_0,w_540,h_960,c_fill,f_jpg,q_auto/${file}.jpg`,
      src: `https://res.cloudinary.com/zl2rykvk/video/upload/q_auto,w_720,f_mp4/v${version}/${file}.mp4`
    });

    const reelFeeds = {
      'embassy-kirchhofer': {
        title: 'Embassy Kirchhofer Group',
        handle: '@embassy_jewel_ag',
        handles: '@embassy_jewel_ag · @kirchhofer_official',
        items: [
          cloudinaryVideo('video_26', '1789981743', 'Blancpain'),
          cloudinaryVideo('video_25', '1789981744', 'Atelier'),
          cloudinaryVideo('video_24', '1789981743', 'Van Cleef & Arpels'),
          cloudinaryVideo('video', '1789981742', 'Boutique'),
          cloudinaryVideo('video_20', '1789981739', 'Winter am See'),
          cloudinaryVideo('video_16', '1789981740', 'Bvlgari'),
          cloudinaryVideo('video_21', '1789981739', 'TAG Heuer'),
          cloudinaryVideo('video_23', '1789981740', 'Unboxing'),
          cloudinaryVideo('video_22', '1789981740', 'KKL Luzern'),
          cloudinaryVideo('video_19', '1789981739', 'Afternoon Tea'),
          cloudinaryVideo('video_17', '1789981738', 'Back to Basics'),
          cloudinaryVideo('video_1', '1789981733', 'Bentley'),
          cloudinaryVideo('video_3', '1789981734', 'Paris'),
          cloudinaryVideo('video_2', '1789981735', 'Unterwegs'),
          cloudinaryVideo('video_4', '1789981735', 'Café'),
          cloudinaryVideo('video_5', '1789981735', 'Am Wasser'),
          cloudinaryVideo('video_7', '1789981735', 'Serpenti'),
          cloudinaryVideo('video_9', '1789981736', 'Apéro'),
          cloudinaryVideo('video_8', '1789981736', 'Festtage'),
          cloudinaryVideo('video_13', '1789981737', 'Schwanenplatz'),
          cloudinaryVideo('video_11', '1789981736', 'Auf dem See'),
          cloudinaryVideo('video_14', '1789981737', 'Zenith'),
          cloudinaryVideo('video_18', '1789981739', 'Zenith Box'),
          cloudinaryVideo('video_15', '1789981738', 'Bentayga'),
          cloudinaryVideo('video_12', '1789981737', 'Nationalquai'),
          cloudinaryVideo('video_10', '1789981736', 'Selection'),
          cloudinaryVideo('video_6', '1789981735', 'Franck Muller'),
          cloudinaryVideo('video_27', '1789982401', 'Hublot', '@kirchhofer_official')
        ]
      }
    };

    const titleNode = reelFeed.querySelector('#reel-feed-title');
    const handleNode = reelFeed.querySelector('[data-reel-handle]');
    const closeButton = reelFeed.querySelector('[data-reel-close]');
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    let reelObserver;

    const createMutedVideo = (src, poster) => {
      const video = document.createElement('video');
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
          video.preload = 'none';
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
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
      if (video.preload === 'none') video.preload = 'auto';
      video.play().catch(() => {});
    };

    const stopMuted = (video) => {
      if (!video) return;
      video.pause();
      video.currentTime = 0;
    };

    const bindHoverPlayback = (host, video) => {
      if (!video || !canHover.matches) return;
      host.addEventListener('mouseenter', () => playMuted(video));
      host.addEventListener('mouseleave', () => stopMuted(video));
    };

    const stopReels = () => {
      reelGrid.querySelectorAll('video').forEach(stopMuted);
    };

    const closeReelFeed = () => {
      reelFeed.classList.remove('is-open');
      reelFeed.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-reel-feed-open');
      stopReels();
      reelObserver?.disconnect();
    };

    const renderReelFeed = (feedId) => {
      const feed = reelFeeds[feedId];
      if (!feed) return;
      if (titleNode) titleNode.textContent = feed.title;
      if (handleNode) handleNode.textContent = feed.handles || feed.handle;
      reelGrid.replaceChildren();

      feed.items.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'reel-card';
        const media = document.createElement('div');
        media.className = 'reel-card__media';
        const poster = document.createElement('img');
        poster.src = item.poster;
        poster.alt = item.title || feed.title;
        poster.loading = 'lazy';
        media.append(poster);

        if (item.src) {
          const video = createMutedVideo(item.src, item.poster);
          media.append(video);
          bindHoverPlayback(card, video);
        }

        const shade = document.createElement('div');
        shade.className = 'reel-card__shade';
        const handle = document.createElement('span');
        handle.className = 'reel-card__handle';
        handle.textContent = item.handle || feed.handle;
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
      reelFeed.classList.add('is-open');
      reelFeed.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-reel-feed-open');
      closeButton?.focus();
      reelObserver?.disconnect();
      if (canHover.matches) return;
      reelObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const video = entry.target.querySelector('video');
          if (entry.isIntersecting) playMuted(video);
          else stopMuted(video);
        });
      }, { threshold: 0.45 });
      reelGrid.querySelectorAll('.reel-card').forEach((card) => reelObserver.observe(card));
    };

    document.querySelectorAll('[data-reel-feed]').forEach((trigger) => {
      const feed = reelFeeds[trigger.getAttribute('data-reel-feed')];
      const preview = feed?.items?.[0];
      if (preview?.src) {
        const video = createMutedVideo(preview.src, preview.poster);
        trigger.append(video);
        bindHoverPlayback(trigger, video);
      }
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openReelFeed(trigger.getAttribute('data-reel-feed'));
      });
    });

    closeButton?.addEventListener('click', closeReelFeed);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && reelFeed.classList.contains('is-open')) closeReelFeed();
    });
  }
});
