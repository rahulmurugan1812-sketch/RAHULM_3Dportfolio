'use client';

import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop component that handles scroll position on navigation.
 * Ensures pages start at the top on:
 * - New navigation (link clicks, programmatic navigation)
 * - Browser back/forward navigation
 * - Page refresh
 * 
 * Uses native scrollTo with smooth behavior for consistent UX.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Skip scroll reset for hash-based navigation (anchor links within page)
    if (hash) {
      return;
    }

    // For PUSH (new navigation) and REPLACE - scroll to top immediately
    // For POP (back/forward) - also scroll to top for consistent UX
    // We use a small timeout to ensure the new page content has rendered
    const timeoutId = setTimeout(() => {
      // Use native smooth scroll for consistent behavior
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth',
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [pathname, hash, navigationType]);

  return null;
}

/**
 * Hook to manually trigger scroll to top with smooth behavior
 */
export function useScrollToTop() {
  const scrollToTop = (options?: ScrollToOptions) => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
      ...options,
    });
  };

  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return { scrollToTop, scrollToElement };
}