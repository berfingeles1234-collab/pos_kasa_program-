/**
 * Input focus ve klavye kısayolu yardımcıları
 */
const InputHelpers = (function () {
  const USER_INTERACTION_GUARD_MS = 2000;

  let lastUserInputInteractionAt = 0;
  let trackingInitialized = false;

  function isEditableElement(el) {
    return el && (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable
    );
  }

  function shouldIgnoreShortcut(e) {
    return isEditableElement(e.target) || isEditableElement(document.activeElement);
  }

  function markUserInteraction() {
    lastUserInputInteractionAt = Date.now();
  }

  function isModalOpen(el) {
    if (!el) {
      return false;
    }
    return el.classList.contains('is-open');
  }

  function isElementInOpenModal(el) {
    if (!el) {
      return false;
    }

    const overlay = el.closest('.modal-overlay');
    if (overlay) {
      return isModalOpen(overlay);
    }

    const kasaModal = el.closest('#urunEkleModal, #fiyatPanel');
    if (kasaModal) {
      return isModalOpen(kasaModal);
    }

    return true;
  }

  function setModalOpen(el, open) {
    if (!el) {
      return;
    }

    if (open) {
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
    } else {
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function closeAllOverlays(selectors) {
    const list = selectors || [
      '#changePasswordModal',
      '#saleDetailModal',
      '#urunEkleModal',
      '#fiyatPanel',
    ];

    list.forEach(function (selector) {
      const el = document.querySelector(selector);
      if (el) {
        setModalOpen(el, false);
      }
    });
  }

  function canAutoFocus(el, force, options) {
    if (!force) {
      return false;
    }

    if (document.hidden) {
      return false;
    }

    if (!document.hasFocus()) {
      return false;
    }

    if (!options || !options.skipGuard) {
      if (Date.now() - lastUserInputInteractionAt < USER_INTERACTION_GUARD_MS) {
        return false;
      }
    }

    const active = document.activeElement;
    if (isEditableElement(active) && active !== el) {
      return false;
    }

    if (!isElementInOpenModal(el)) {
      return false;
    }

    return true;
  }

  function safeFocus(el, caller, force, options) {
    if (!el || typeof el.focus !== 'function') {
      return false;
    }

    if (!canAutoFocus(el, force, options)) {
      return false;
    }

    el.focus({ preventScroll: true });
    return true;
  }

  function focusBarcode(el, caller) {
    return safeFocus(el, caller || 'focusBarcode', true, { skipGuard: true });
  }

  function initUserInteractionTracking() {
    if (trackingInitialized) {
      return;
    }

    trackingInitialized = true;

    document.addEventListener('mousedown', function () {
      markUserInteraction();
    }, true);

    document.addEventListener('pointerdown', function () {
      markUserInteraction();
    }, true);

    document.addEventListener('focusin', function (e) {
      if (isEditableElement(e.target)) {
        markUserInteraction();
      }
    }, true);
  }

  function init() {
    initUserInteractionTracking();
  }

  return {
    isEditableElement,
    shouldIgnoreShortcut,
    isModalOpen,
    setModalOpen,
    closeAllOverlays,
    safeFocus,
    focusBarcode,
    init,
    initUserInteractionTracking,
  };
})();

if (typeof window !== 'undefined') {
  window.InputHelpers = InputHelpers;
}
