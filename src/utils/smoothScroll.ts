'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom smooth scroll implementation with configurable duration and easing.
 * Provides more control than native CSS scroll-behavior.
 */

// Easing functions
const easingFunctions = {
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
} as const;

type EasingType = keyof typeof easingFunctions;

interface SmoothScrollOptions {
  duration?: number;        // Scroll duration in ms (default: 800ms - slightly slower)
  easing?: EasingType;      // Easing function (default: 'easeOutCubic')
  offset?: number;          // Additional offset from top (default: 80px for navbar)
  callback?: () => void;    // Called when scroll completes
}

/**
 * Smoothly scroll to a target position
 */
export function smoothScrollTo(
  targetY: number,
  options: SmoothScrollOptions = {}
): Promise<void> {
  const {
    duration = 800,
    easing = 'easeOutCubic',
    offset = 80,
    callback,
  } = options;

  const startY = window.scrollY;
  const target = Math.max(0, targetY - offset);
  const distance = target - startY;
  const startTime = performance.now();

  // Don't animate if already at target or distance is negligible
  if (Math.abs(distance) < 1) {
    callback?.();
    return Promise.resolve();
  }

  const easingFn = easingFunctions[easing];

  return new Promise((resolve) => {
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);
      
      const currentY = startY + distance * easedProgress;
      window.scrollTo(0, currentY);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        window.scrollTo(0, target);
        callback?.();
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

/**
 * Smoothly scroll to an element by ID
 */
export function scrollToElement(
  elementId: string,
  options: SmoothScrollOptions = {}
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with id "${elementId}" not found`);
    return Promise.resolve();
  }

  const targetY = element.getBoundingClientRect().top + window.scrollY;
  return smoothScrollTo(targetY, options);
}

/**
 * Smoothly scroll to top of page
 */
export function scrollToTop(options: SmoothScrollOptions = {}): Promise<void> {
  return smoothScrollTo(0, { ...options, offset: 0 });
}

/**
 * Hook for manual scroll control
 */
export function useSmoothScroll() {
  const isScrollingRef = useRef(false);

  const scrollTo = useCallback(async (targetY: number, options: SmoothScrollOptions = {}) => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    try {
      await smoothScrollTo(targetY, options);
    } finally {
      isScrollingRef.current = false;
    }
  }, []);

  const scrollToTop = useCallback(async (options: SmoothScrollOptions = {}) => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    try {
      await smoothScrollTo(0, { ...options, offset: 0 });
    } finally {
      isScrollingRef.current = false;
    }
  }, []);

  const scrollToId = useCallback(async (id: string, options: SmoothScrollOptions = {}) => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    try {
      await scrollToElement(id, options);
    } finally {
      isScrollingRef.current = false;
    }
  }, []);

  return { scrollTo, scrollToTop, scrollToId, isScrolling: isScrollingRef.current };
}

/**
 * Component to enable enhanced smooth scrolling for anchor links
 * Add this to your app root to intercept anchor clicks
 */
export function EnhancedSmoothScroll() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const targetId = href.slice(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        event.preventDefault();
        scrollToElement(targetId, { duration: 800, easing: 'easeOutCubic' });
        
        // Update URL without triggering navigation
        history.pushState(null, '', href);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}