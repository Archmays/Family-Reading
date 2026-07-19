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

export function wireImageLightbox(dialog, openers) {
  if (!dialog) return () => {};

  const controller = new AbortController();
  const { signal } = controller;
  const image = dialog.querySelector('[data-lightbox-image]');
  const caption = dialog.querySelector('[data-lightbox-caption]');
  const closeButton = dialog.querySelector('[data-lightbox-close-button]');
  const previousButton = dialog.querySelector('[data-lightbox-prev]');
  const nextButton = dialog.querySelector('[data-lightbox-next]');
  const items = openers.map((opener) => ({
    opener,
    src: opener.dataset.lightboxSrc,
    alt: opener.dataset.lightboxAlt || '页面图',
  }));

  let activeIndex = 0;
  let activeOpener = null;
  let backgroundStates = [];
  let savedBodyOverflow = '';
  let savedScrollX = 0;
  let savedScrollY = 0;

  document.body.append(dialog);

  function show(index) {
    if (!items.length || !image || !caption) return;
    activeIndex = (index + items.length) % items.length;
    const item = items[activeIndex];
    image.src = item.src;
    image.alt = item.alt;
    caption.textContent = item.alt;
    previousButton.disabled = items.length < 2;
    nextButton.disabled = items.length < 2;
  }

  function close({ restoreFocus = true } = {}) {
    if (dialog.hidden) return;
    dialog.hidden = true;
    document.body.classList.remove('lightbox-open');
    document.body.style.overflow = savedBodyOverflow;
    restoreBackground(backgroundStates);
    backgroundStates = [];
    window.scrollTo(savedScrollX, savedScrollY);
    if (restoreFocus && activeOpener?.isConnected) {
      activeOpener.focus({ preventScroll: true });
    }
    activeOpener = null;
  }

  function open(index, opener) {
    activeOpener = opener;
    savedBodyOverflow = document.body.style.overflow;
    savedScrollX = window.scrollX;
    savedScrollY = window.scrollY;
    show(index);
    dialog.hidden = false;
    document.body.classList.add('lightbox-open');
    document.body.style.overflow = 'hidden';
    backgroundStates = blockBackground(dialog);
    requestAnimationFrame(() => closeButton?.focus());
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

  openers.forEach((opener, index) => {
    opener.addEventListener('click', () => open(index, opener), { signal });
  });
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
