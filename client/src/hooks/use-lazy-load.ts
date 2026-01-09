import { useState, useEffect, useRef } from "react";

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useLazyLoad(options: UseLazyLoadOptions = {}) {
  const { threshold = 0.1, rootMargin = "50px" } = options;
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return { ref, isVisible };
}
