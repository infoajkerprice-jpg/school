import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toBnDigits } from '../i18n';

export type SliderDotTheme = 'green' | 'navy' | 'orange' | 'sky' | 'light';

export interface MobileCardSliderProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey?: (item: T, index: number) => string;
  ariaLabel: string;
  intervalMs?: number;
  transitionMs?: number;
  pauseAfterInteractionMs?: number;
  autoPlay?: boolean;
  showDots?: boolean;
  showArrows?: boolean;
  showCounter?: boolean;
  dotTheme?: SliderDotTheme;
  className?: string;
  slideClassName?: string;
  controlsClassName?: string;
  onSlideChange?: (activeIndex: number) => void;
}

const DOT_THEME_STYLES: Record<
  SliderDotTheme,
  { active: string; inactive: string; arrow: string; counter: string }
> = {
  green: {
    active: 'bg-[#087F5B] w-6',
    inactive: 'bg-[#087F5B]/20 w-2 hover:bg-[#087F5B]/40',
    arrow:
      'bg-white border border-slate-200 text-[#123B67] active:bg-[#E7F5EF] active:border-[#087F5B]/40',
    counter: 'text-[#123B67]/75',
  },
  navy: {
    active: 'bg-[#123B67] w-6',
    inactive: 'bg-[#123B67]/20 w-2 hover:bg-[#123B67]/40',
    arrow:
      'bg-white border border-slate-200 text-[#123B67] active:bg-slate-100',
    counter: 'text-[#123B67]/75',
  },
  orange: {
    active: 'bg-[#F4A62A] w-6',
    inactive: 'bg-[#123B67]/20 w-2 hover:bg-[#F4A62A]/50',
    arrow:
      'bg-white border border-slate-200 text-[#123B67] active:bg-amber-50',
    counter: 'text-[#123B67]/75',
  },
  sky: {
    active: 'bg-[#21A9D6] w-6',
    inactive: 'bg-[#123B67]/20 w-2 hover:bg-[#21A9D6]/50',
    arrow:
      'bg-white border border-slate-200 text-[#123B67] active:bg-sky-50',
    counter: 'text-[#123B67]/75',
  },
  light: {
    active: 'bg-[#F4A62A] w-6',
    inactive: 'bg-white/35 w-2 hover:bg-white/60',
    arrow:
      'bg-white/15 border border-white/20 text-white active:bg-white/25',
    counter: 'text-white/85',
  },
};

const SWIPE_THRESHOLD_PX = 40;
const HORIZONTAL_LOCK_PX = 8;

export function MobileCardSlider<T>({
  items,
  renderItem,
  getKey,
  ariaLabel,
  intervalMs = 3000,
  transitionMs = 500,
  pauseAfterInteractionMs = 6000,
  autoPlay = true,
  showDots = true,
  showArrows = true,
  showCounter = false,
  dotTheme = 'green',
  className = '',
  slideClassName = '',
  controlsClassName = '',
  onSlideChange,
}: MobileCardSliderProps<T>) {
  const count = items.length;

  const [trackIndex, setTrackIndex] = useState<number>(count > 1 ? 1 : 0);
  const [isAnimated, setIsAnimated] = useState<boolean>(true);
  const [dragOffsetPx, setDragOffsetPx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isPausedByInteraction, setIsPausedByInteraction] = useState<boolean>(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.hidden : false
  );
  const [isInViewport, setIsInViewport] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const snapFallbackTimerRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchAxisRef = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const didSwipeRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<number>(0);
  const trackIndexRef = useRef<number>(trackIndex);

  useEffect(() => {
    trackIndexRef.current = trackIndex;
  }, [trackIndex]);

  // Respect prefers-reduced-motion dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mq.matches);
    handleChange();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
    mq.addListener(handleChange);
    return () => mq.removeListener(handleChange);
  }, []);

  // Pause when tab/window is backgrounded
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => setIsDocumentHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Pause auto-slide when offscreen so sliders start fresh when scrolled into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsInViewport(entry.isIntersecting);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);

  // Stable signature to detect when items change (e.g. category filter switched)
  const itemsSignature = useMemo(() => {
    if (count === 0) return '0';
    const firstKey = getKey ? getKey(items[0], 0) : '0';
    const lastKey = getKey ? getKey(items[count - 1], count - 1) : String(count - 1);
    return `${count}:${firstKey}:${lastKey}`;
  }, [count, items, getKey]);

  useEffect(() => {
    if (snapFallbackTimerRef.current) {
      window.clearTimeout(snapFallbackTimerRef.current);
      snapFallbackTimerRef.current = null;
    }
    setIsAnimated(false);
    setDragOffsetPx(0);
    dragOffsetRef.current = 0;
    setIsDragging(false);
    setTrackIndex(count > 1 ? 1 : 0);
  }, [itemsSignature, count]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
      if (snapFallbackTimerRef.current) window.clearTimeout(snapFallbackTimerRef.current);
    };
  }, []);

  const extendedItems = useMemo(() => {
    if (count <= 1) return items;
    return [items[count - 1], ...items, items[0]];
  }, [items, count]);

  const activeIndex = useMemo(() => {
    if (count <= 1) return 0;
    if (trackIndex === 0) return count - 1;
    if (trackIndex === count + 1) return 0;
    return Math.max(0, Math.min(count - 1, trackIndex - 1));
  }, [trackIndex, count]);

  useEffect(() => {
    onSlideChange?.(activeIndex);
  }, [activeIndex, onSlideChange]);

  const triggerInteractionPause = useCallback(() => {
    setIsPausedByInteraction(true);
    if (pauseTimerRef.current) {
      window.clearTimeout(pauseTimerRef.current);
    }
    pauseTimerRef.current = window.setTimeout(() => {
      setIsPausedByInteraction(false);
      pauseTimerRef.current = null;
    }, pauseAfterInteractionMs);
  }, [pauseAfterInteractionMs]);

  const normalizeBoundaryIfNeeded = useCallback(
    (currentIdx: number) => {
      if (count <= 1) return;
      if (currentIdx === count + 1) {
        setIsAnimated(false);
        setTrackIndex(1);
      } else if (currentIdx === 0) {
        setIsAnimated(false);
        setTrackIndex(count);
      }
    },
    [count]
  );

  const scheduleBoundaryFallback = useCallback(
    (targetIdx: number) => {
      if (snapFallbackTimerRef.current) {
        window.clearTimeout(snapFallbackTimerRef.current);
        snapFallbackTimerRef.current = null;
      }
      if (targetIdx === 0 || targetIdx === count + 1) {
        const delay = prefersReducedMotion ? 16 : transitionMs + 45;
        snapFallbackTimerRef.current = window.setTimeout(() => {
          snapFallbackTimerRef.current = null;
          normalizeBoundaryIfNeeded(targetIdx);
        }, delay);
      }
    },
    [count, normalizeBoundaryIfNeeded, prefersReducedMotion, transitionMs]
  );

  const moveStep = useCallback(
    (delta: 1 | -1, userInitiated: boolean) => {
      if (count <= 1) return;
      if (userInitiated) {
        triggerInteractionPause();
      }

      const current = trackIndexRef.current;

      // If currently sitting on a clone boundary due to rapid taps/swipes, normalize first
      if (current === count + 1) {
        const normalized = 1;
        const next = delta === 1 ? 2 : 0;
        setIsAnimated(false);
        setTrackIndex(normalized);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsAnimated(!prefersReducedMotion);
            setTrackIndex(next);
            scheduleBoundaryFallback(next);
          });
        });
        return;
      }

      if (current === 0) {
        const normalized = count;
        const next = delta === 1 ? count + 1 : count - 1;
        setIsAnimated(false);
        setTrackIndex(normalized);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsAnimated(!prefersReducedMotion);
            setTrackIndex(next);
            scheduleBoundaryFallback(next);
          });
        });
        return;
      }

      const next = Math.max(0, Math.min(count + 1, current + delta));
      setIsAnimated(!prefersReducedMotion);
      setTrackIndex(next);
      scheduleBoundaryFallback(next);
    },
    [count, prefersReducedMotion, scheduleBoundaryFallback, triggerInteractionPause]
  );

  const goToIndex = useCallback(
    (targetRealIndex: number) => {
      if (count <= 1) return;
      const clamped = Math.max(0, Math.min(count - 1, targetRealIndex));
      triggerInteractionPause();
      if (snapFallbackTimerRef.current) {
        window.clearTimeout(snapFallbackTimerRef.current);
        snapFallbackTimerRef.current = null;
      }
      setIsAnimated(!prefersReducedMotion);
      setTrackIndex(clamped + 1);
    },
    [count, prefersReducedMotion, triggerInteractionPause]
  );

  // Auto-slide timer (3000ms default)
  useEffect(() => {
    if (
      !autoPlay ||
      count <= 1 ||
      prefersReducedMotion ||
      isDragging ||
      isPausedByInteraction ||
      isDocumentHidden ||
      !isInViewport
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      moveStep(1, false);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    autoPlay,
    count,
    prefersReducedMotion,
    isDragging,
    isPausedByInteraction,
    isDocumentHidden,
    isInViewport,
    intervalMs,
    moveStep,
  ]);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
    if (snapFallbackTimerRef.current) {
      window.clearTimeout(snapFallbackTimerRef.current);
      snapFallbackTimerRef.current = null;
    }
    normalizeBoundaryIfNeeded(trackIndexRef.current);
  };

  // Touch gesture handlers (horizontal swipe with vertical scroll preservation)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (count <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchAxisRef.current = 'none';
    didSwipeRef.current = false;
    dragOffsetRef.current = 0;

    // If starting drag while sitting on a clone index, silently normalize immediately
    if (trackIndexRef.current === count + 1) {
      setIsAnimated(false);
      setTrackIndex(1);
    } else if (trackIndexRef.current === 0) {
      setIsAnimated(false);
      setTrackIndex(count);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (count <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartXRef.current;
    const dy = touch.clientY - touchStartYRef.current;

    if (touchAxisRef.current === 'none') {
      if (Math.abs(dx) < HORIZONTAL_LOCK_PX && Math.abs(dy) < HORIZONTAL_LOCK_PX) {
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        touchAxisRef.current = 'horizontal';
        setIsDragging(true);
        setIsAnimated(false);
      } else {
        touchAxisRef.current = 'vertical';
        return;
      }
    }

    if (touchAxisRef.current === 'horizontal') {
      didSwipeRef.current = true;
      dragOffsetRef.current = dx;
      setDragOffsetPx(dx);
    }
  };

  const finalizeTouch = () => {
    if (touchAxisRef.current !== 'horizontal') {
      touchAxisRef.current = 'none';
      return;
    }

    const dx = dragOffsetRef.current;
    touchAxisRef.current = 'none';
    dragOffsetRef.current = 0;
    setIsDragging(false);
    setDragOffsetPx(0);

    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
      moveStep(dx < 0 ? 1 : -1, true);
    } else {
      setIsAnimated(!prefersReducedMotion);
      triggerInteractionPause();
    }

    window.setTimeout(() => {
      didSwipeRef.current = false;
    }, 80);
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didSwipeRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (count === 0) return null;

  if (count === 1) {
    return (
      <div className={`w-full overflow-hidden ${className}`}>
        <div className={`w-full min-w-0 ${slideClassName}`}>{renderItem(items[0], 0)}</div>
      </div>
    );
  }

  const theme = DOT_THEME_STYLES[dotTheme];
  const effectiveDuration = isAnimated && !isDragging && !prefersReducedMotion ? transitionMs : 0;

  // Compute compact dot window if there are many items (> 7) so dots never wrap on 320px
  const maxVisibleDots = 7;
  const visibleDotIndices = useMemo(() => {
    if (count <= maxVisibleDots) {
      return Array.from({ length: count }, (_, i) => i);
    }
    const half = Math.floor(maxVisibleDots / 2);
    let start = activeIndex - half;
    let end = activeIndex + half;
    if (start < 0) {
      end += -start;
      start = 0;
    }
    if (end >= count) {
      start = Math.max(0, start - (end - count + 1));
      end = count - 1;
    }
    const arr: number[] = [];
    for (let i = start; i <= end; i += 1) arr.push(i);
    return arr;
  }, [count, activeIndex]);

  const showControlsRow = showDots || showArrows || showCounter;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={`w-full select-none ${className}`}
    >
      {/* Strict single-card viewport: 100% width, zero adjacent card peek */}
      <div
        className="w-full overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finalizeTouch}
        onTouchCancel={finalizeTouch}
        onClickCapture={handleClickCapture}
      >
        <div
          onTransitionEnd={handleTransitionEnd}
          className="flex w-full items-stretch will-change-transform"
          style={{
            transform: `translate3d(calc(${-trackIndex * 100}% + ${dragOffsetPx}px), 0, 0)`,
            transitionProperty: effectiveDuration > 0 ? 'transform' : 'none',
            transitionDuration: `${effectiveDuration}ms`,
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {extendedItems.map((item, extIdx) => {
            const realIndex =
              extIdx === 0 ? count - 1 : extIdx === count + 1 ? 0 : extIdx - 1;
            const isClone = extIdx === 0 || extIdx === count + 1;
            const itemKey = getKey ? getKey(item, realIndex) : String(realIndex);
            const slideKey = isClone ? `clone-${extIdx}-${itemKey}` : `slide-${itemKey}`;

            return (
              <div
                key={slideKey}
                aria-hidden={isClone || realIndex !== activeIndex}
                className={`w-full shrink-0 grow-0 basis-full min-w-0 flex flex-col ${slideClassName}`}
              >
                {renderItem(item, realIndex)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact Pagination & Touch Controls */}
      {showControlsRow && (
        <div
          className={`mt-3 flex items-center justify-between gap-2 px-0.5 ${controlsClassName}`}
        >
          {showArrows ? (
            <button
              type="button"
              onClick={() => moveStep(-1, true)}
              aria-label="পূর্ববর্তী কার্ড"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-xs transition-colors ${theme.arrow}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <span className="w-2 shrink-0" aria-hidden="true" />
          )}

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            {showDots && (
              <div
                className="flex items-center justify-center gap-1.5"
                role="tablist"
                aria-label={`${ariaLabel} স্লাইড ইন্ডিকেটর`}
              >
                {visibleDotIndices.map((dotIdx) => {
                  const isActive = dotIdx === activeIndex;
                  return (
                    <button
                      key={dotIdx}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`স্লাইড ${toBnDigits(dotIdx + 1)}`}
                      onClick={() => goToIndex(dotIdx)}
                      className="flex h-6 items-center justify-center px-0.5"
                    >
                      <span
                        className={`block h-2 rounded-full transition-all duration-300 ${
                          isActive ? theme.active : theme.inactive
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {(showCounter || count > maxVisibleDots) && (
              <span
                className={`shrink-0 text-[11px] font-bold tabular-nums ${theme.counter}`}
              >
                {toBnDigits(activeIndex + 1)}/{toBnDigits(count)}
              </span>
            )}
          </div>

          {showArrows ? (
            <button
              type="button"
              onClick={() => moveStep(1, true)}
              aria-label="পরবর্তী কার্ড"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-xs transition-colors ${theme.arrow}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="w-2 shrink-0" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  );
}
