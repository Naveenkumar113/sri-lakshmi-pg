import { useEffect, useRef } from 'react';
import { smartScrollTo, scrollToFirstError } from '../utils/scrollHelper';

/**
 * React hook that automatically scrolls a referenced form or container into view when a trigger state changes.
 * 
 * @param {any} trigger - Dependency value (e.g. showModal, activeTab, error, success)
 * @param {Object} options
 * @param {number} [options.offset] - Custom pixel offset
 * @param {boolean} [options.onlyIfHidden=true] - Only scroll if not already in view
 * @param {boolean} [options.focusFirstInput=false] - Auto focus the first input field
 * @param {number} [options.delay=80] - Wait duration in ms for DOM layout updates
 * @returns {React.RefObject} - Ref to attach to the target element
 */
export function useAutoScroll(trigger, options = {}) {
  const ref = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // If trigger is falsy (e.g. null, false, undefined), do not scroll
    if (!trigger) {
      isFirstRender.current = false;
      return;
    }

    // Skip initial mount if trigger is simply the default state
    if (isFirstRender.current && (options.skipMount ?? true)) {
      isFirstRender.current = false;
      return;
    }
    isFirstRender.current = false;

    if (ref.current) {
      smartScrollTo(ref.current, options);
    }
  }, [trigger]);

  return ref;
}

/**
 * Hook to scroll to validation error when error state is updated
 */
export function useScrollOnError(errorState, formRef) {
  useEffect(() => {
    if (errorState) {
      scrollToFirstError(formRef?.current || document);
    }
  }, [errorState]);
}
