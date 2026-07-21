const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableElements(root) {
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
    return !element.hidden && element.getAttribute('aria-hidden') !== 'true';
  });
}

function blockBackground(dialog) {
  return [...document.body.children]
    .filter((element) => element !== dialog && element.tagName !== 'SCRIPT')
    .map((element) => {
      const state = {
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute('aria-hidden'),
      };

      if ('inert' in element) {
        element.inert = true;
      } else {
        element.setAttribute('aria-hidden', 'true');
      }
      return state;
    });
}

function restoreBackground(states) {
  states.forEach(({ element, inert, ariaHidden }) => {
    if ('inert' in element) {
      element.inert = inert;
    }
    if (ariaHidden === null) {
      element.removeAttribute('aria-hidden');
    } else {
      element.setAttribute('aria-hidden', ariaHidden);
    }
  });
}

export function wireImageLightbox(dialog, openerRoot = document) {
  if (!dialog) return () => {};

  const controller = new AbortController();
  const { signal } = controller;
  const root = openerRoot?.querySelectorAll && openerRoot?.addEventListener
    ? openerRoot
    : document;
  const image = dialog.querySelector('[data-lightbox-image]');
  const caption = dialog.querySelector('[data-lightbox-caption]');
  const closeButton = dialog.querySelector('[data-lightbox-close-button]');
  const previousButton = dialog.querySelector('[data-lightbox-prev]');
  const nextButton = dialog.querySelector('[data-lightbox-next]');

  let activeItems = [];
  let activeGroupId = null;
  let activeIndex = -1;
  let activeOpener = null;
  let activeSummary = null;
  let activeFallback = null;
  let backgroundStates = [];
  let savedBodyOverflow = '';
  let savedScrollX = 0;
  let savedScrollY = 0;
  let imageRequestToken = 0;

  document.body.append(dialog);

  function groupIdFor(opener) {
    return opener.getAttribute('data-lightbox-group')?.trim() || '__legacy-default__';
  }

  function itemFor(opener) {
    const src = opener.getAttribute('data-lightbox-src')?.trim();
    if (!src) return null;
    return {
      opener,
      mediaId: opener.getAttribute('data-media-id')?.trim() || null,
      src,
      alt: opener.getAttribute('data-lightbox-alt')?.trim() || '页面图',
    };
  }

  function collectGroupItems(groupId) {
    const openers = [];
    if (root.matches?.('[data-lightbox-src]')) openers.push(root);
    openers.push(...root.querySelectorAll('[data-lightbox-src]'));

    const seenMediaIds = new Set();
    const seenSources = new Set();
    return openers.reduce((items, opener) => {
      if (groupIdFor(opener) !== groupId) return items;
      const item = itemFor(opener);
      if (!item) return items;
      if ((item.mediaId && seenMediaIds.has(item.mediaId)) || seenSources.has(item.src)) {
        return items;
      }
      if (item.mediaId) seenMediaIds.add(item.mediaId);
      seenSources.add(item.src);
      items.push(item);
      return items;
    }, []);
  }

  function directDetailsSummary(opener) {
    const details = opener?.closest?.('details');
    if (!details) return null;
    return [...details.children].find((child) => child.tagName === 'SUMMARY') || null;
  }

  function routeFocusFallback() {
    const scopedHeading = root.querySelector?.('[data-route-heading]');
    if (scopedHeading?.isConnected) return scopedHeading;
    return document.querySelector('[data-route-heading]') || document.getElementById('main-content');
  }

  function focusWithoutScroll(element) {
    if (!element?.isConnected || typeof element.focus !== 'function') return false;
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
    return true;
  }

  function resetRenderedMedia() {
    imageRequestToken += 1;
    if (image) {
      image.removeAttribute('src');
      image.alt = '';
      image.hidden = true;
    }
    if (caption) caption.textContent = '';
    if (previousButton) previousButton.disabled = true;
    if (nextButton) nextButton.disabled = true;
  }

  function show(index) {
    if (!activeItems.length || activeGroupId === null) return;
    activeIndex = (index + activeItems.length) % activeItems.length;
    const item = activeItems[activeIndex];
    const position = `第 ${activeIndex + 1} 张，共 ${activeItems.length} 张`;
    if (caption) caption.textContent = `${item.alt} · ${position}`;
    const disableNavigation = activeItems.length < 2;
    if (previousButton) previousButton.disabled = disableNavigation;
    if (nextButton) nextButton.disabled = disableNavigation;
    if (!image) return;

    const requestToken = ++imageRequestToken;
    image.hidden = true;
    image.removeAttribute('src');
    image.alt = item.alt;
    image.setAttribute('src', item.src);

    const reveal = () => {
      if (requestToken !== imageRequestToken) return;
      if (image.getAttribute('src') !== item.src) return;
      image.hidden = false;
    };

    if (typeof image.decode !== 'function') {
      reveal();
      return;
    }
    try {
      Promise.resolve(image.decode()).catch(() => undefined).then(reveal);
    } catch {
      reveal();
    }
  }

  function close({ restoreFocus = true } = {}) {
    const wasOpen = !dialog.hidden;
    dialog.hidden = true;
    if (wasOpen) {
      document.body.classList.remove('lightbox-open');
      document.body.style.overflow = savedBodyOverflow;
      window.scrollTo(savedScrollX, savedScrollY);
    }
    if (backgroundStates.length) restoreBackground(backgroundStates);
    backgroundStates = [];
    resetRenderedMedia();
    if (restoreFocus && wasOpen) {
      if (activeOpener?.isConnected) {
        try {
          activeOpener.focus({ preventScroll: true });
        } catch {
          activeOpener.focus();
        }
      } else {
        focusWithoutScroll(activeSummary) || focusWithoutScroll(activeFallback) || focusWithoutScroll(routeFocusFallback());
      }
    }
    activeItems = [];
    activeGroupId = null;
    activeIndex = -1;
    activeOpener = null;
    activeSummary = null;
    activeFallback = null;
  }

  function open(items, index, opener, groupId) {
    if (!items.length || !dialog.hidden) return;
    activeItems = items;
    activeGroupId = groupId;
    activeOpener = opener;
    activeSummary = directDetailsSummary(opener);
    activeFallback = routeFocusFallback();
    savedBodyOverflow = document.body.style.overflow;
    savedScrollX = window.scrollX;
    savedScrollY = window.scrollY;
    dialog.hidden = false;
    show(index);
    document.body.classList.add('lightbox-open');
    document.body.style.overflow = 'hidden';
    backgroundStates = blockBackground(dialog);
    requestAnimationFrame(() => closeButton?.focus());
  }

  function onOpenerClick(event) {
    const opener = event.target?.closest?.('[data-lightbox-src]');
    if (!opener) return;
    if (root !== document && opener !== root && !root.contains?.(opener)) return;

    const groupId = groupIdFor(opener);
    const items = collectGroupItems(groupId);
    const clickedItem = itemFor(opener);
    if (!clickedItem || !items.length) return;
    const index = items.findIndex((item) => {
      if (item.opener === opener) return true;
      if (clickedItem.mediaId && item.mediaId === clickedItem.mediaId) return true;
      return item.src === clickedItem.src;
    });
    open(items, Math.max(0, index), opener, groupId);
  }

  function onKeydown(event) {
    if (dialog.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(activeIndex - 1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(activeIndex + 1);
      return;
    }
    if (event.key !== 'Tab') return;

    const focusables = focusableElements(dialog);
    if (!focusables.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  dialog.hidden = true;
  resetRenderedMedia();
  root.addEventListener('click', onOpenerClick, { signal });
  dialog.querySelectorAll('[data-lightbox-close]').forEach((button) => {
    button.addEventListener('click', () => close(), { signal });
  });
  previousButton?.addEventListener('click', () => show(activeIndex - 1), { signal });
  nextButton?.addEventListener('click', () => show(activeIndex + 1), { signal });
  dialog.addEventListener('keydown', onKeydown, { signal });

  return () => {
    close({ restoreFocus: false });
    controller.abort();
    dialog.remove();
  };
}
