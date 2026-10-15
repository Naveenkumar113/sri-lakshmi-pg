/**
 * Smart Scrolling Utility for Sri Lakshmi Srinivasa Gents PG Management System
 * 
 * Provides:
 * - smartScrollTo(target, options): smooth, accessible scrolling with sticky header offset
 * - scrollToFirstError(container): finds invalid fields or alert banners and focuses them
 * - scrollModalIntoView(modalElement): ensures modals/dialogs are properly positioned and focused
 * - Global event listener for declarative scrolling via data-scroll-to or custom events
 */

/**
 * Check if the user has requested reduced motion
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Calculate the sticky header offset dynamically
 * Accounts for admin header, user header, public navbar, or fixed banners
 */
export function getStickyHeaderOffset() {
  if (typeof document === 'undefined') return 80;
  
  // Check for common header elements in the DOM
  const stickyHeader = document.querySelector('header.sticky-top, nav.navbar.fixed-top, nav.sticky-top');
  if (stickyHeader) {
    const rect = stickyHeader.getBoundingClientRect();
    return Math.max(rect.height + 20, 80);
  }
  return 85;
}

/**
 * Determine the scrollable parent container for an element
 */
export function getScrollParent(element) {
  if (!element || typeof window === 'undefined') return window;
  
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY || style.overflow;
    
    // Check if parent is scrollable
    if (['auto', 'scroll'].includes(overflowY) && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return window;
}

/**
 * Smartly scroll to a target element or selector
 * 
 * @param {HTMLElement|string} target - DOM Element or CSS selector string
 * @param {Object} options
 * @param {number} [options.offset] - Custom top offset in pixels (defaults to dynamic sticky header + padding)
 * @param {'smooth'|'auto'} [options.behavior] - Scroll behavior (smooth by default, auto for reduced motion)
 * @param {boolean} [options.onlyIfHidden=true] - Only scroll if element is not comfortably in view
 * @param {boolean} [options.focusFirstInput=false] - Whether to auto-focus the first input field
 * @param {number} [options.delay=50] - Delay in ms to wait for React DOM render/transitions
 */
export function smartScrollTo(target, options = {}) {
  if (typeof window === 'undefined') return;

  const {
    offset = getStickyHeaderOffset(),
    behavior = prefersReducedMotion() ? 'auto' : 'smooth',
    onlyIfHidden = true,
    focusFirstInput = false,
    delay = 60,
  } = options;

  setTimeout(() => {
    let el = null;
    if (typeof target === 'string') {
      el = document.querySelector(target);
    } else if (target && target.current) {
      el = target.current;
    } else if (target instanceof HTMLElement) {
      el = target;
    }

    if (!el) return;

    // Special handling for Bootstrap modals:
    // If the element is or is inside a modal, do NOT scroll the background page!
    // Instead ensure modal dialog is focused and centered/scrolled internally.
    const modalParent = el.closest('.modal');
    if (modalParent) {
      const modalDialog = modalParent.querySelector('.modal-dialog') || modalParent;
      // Focus modal dialog or first input
      if (focusFirstInput) {
        const firstInput = el.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
        if (firstInput) {
          firstInput.focus();
        }
      }
      return;
    }

    const scrollContainer = getScrollParent(el);
    const rect = el.getBoundingClientRect();

    // Check if element is already comfortably in viewport
    if (onlyIfHidden) {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const isVisibleInWindow = rect.top >= offset - 20 && rect.top <= viewportHeight * 0.7;
      
      if (scrollContainer === window && isVisibleInWindow) {
        if (focusFirstInput) {
          const firstInput = el.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
          if (firstInput) firstInput.focus();
        }
        return; // Already in view, no sudden jump needed
      }
    }

    if (scrollContainer === window) {
      const targetY = window.pageYOffset + rect.top - offset;
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior,
      });
    } else {
      // Nested scrollable container (e.g. admin panel overflow container)
      const containerRect = scrollContainer.getBoundingClientRect();
      const relativeTop = rect.top - containerRect.top + scrollContainer.scrollTop;
      scrollContainer.scrollTo({
        top: Math.max(0, relativeTop - 30),
        behavior,
      });
    }

    // Auto focus first interactive field if requested
    if (focusFirstInput) {
      setTimeout(() => {
        const firstInput = el.querySelector(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
        );
        if (firstInput) {
          firstInput.focus({ preventScroll: true });
        }
      }, 350);
    }
  }, delay);
}

/**
 * Scroll to the first validation error or invalid field in a form
 */
export function scrollToFirstError(containerOrForm) {
  if (typeof document === 'undefined') return;

  setTimeout(() => {
    let container = containerOrForm;
    if (typeof container === 'string') {
      container = document.querySelector(container);
    } else if (container && container.current) {
      container = container.current;
    } else if (!container) {
      container = document;
    }

    // Look for error alerts or invalid inputs
    const errorAlert = container.querySelector('.alert-danger, .alert-warning, [role="alert"]');
    const invalidField = container.querySelector(
      ':invalid, .is-invalid, [aria-invalid="true"]'
    );

    const target = errorAlert || invalidField;
    if (target) {
      smartScrollTo(target, {
        offset: getStickyHeaderOffset() + 20,
        onlyIfHidden: false,
        focusFirstInput: false,
      });

      if (invalidField && typeof invalidField.focus === 'function') {
        setTimeout(() => {
          invalidField.focus({ preventScroll: true });
        }, 300);
      }
    }
  }, 60);
}

/**
 * Setup global click listener for automatic scrolling
 * Detects elements with data-scroll-to="#selector" or buttons targeting forms/sections
 */
export function initGlobalAutoScroll() {
  if (typeof window === 'undefined' || window.__PG_AUTO_SCROLL_INITIALIZED__) return;
  window.__PG_AUTO_SCROLL_INITIALIZED__ = true;

  document.addEventListener('click', (event) => {
    // 1. Check data-scroll-to attribute
    const trigger = event.target.closest('[data-scroll-to]');
    if (trigger) {
      const targetSelector = trigger.getAttribute('data-scroll-to');
      if (targetSelector) {
        smartScrollTo(targetSelector, {
          delay: 100,
          onlyIfHidden: false,
          focusFirstInput: trigger.hasAttribute('data-scroll-focus'),
        });
      }
    }
  });

  // 2. Custom window event for programmatically triggering scroll from anywhere
  window.addEventListener('pg:scroll-to', (event) => {
    if (event.detail && event.detail.target) {
      smartScrollTo(event.detail.target, event.detail.options || {});
    }
  });
}
