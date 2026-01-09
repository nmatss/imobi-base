import React, { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: "square" | "video" | "auto";
  objectFit?: "cover" | "contain" | "fill";
  blurhash?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  width?: number;
  height?: number;
  sizes?: string;
}

const OptimizedImageComponent = ({
  src,
  alt,
  className,
  aspectRatio = "auto",
  objectFit = "cover",
  priority = false,
  onLoad,
  onError,
  width,
  height,
  sizes,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    // Use modern IntersectionObserver with rootMargin for early loading
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px", // Load 100px before entering viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  }[aspectRatio];

  const objectFitClass = {
    cover: "object-cover",
    contain: "object-contain",
    fill: "object-fill",
  }[objectFit];

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-muted",
        aspectRatioClass,
        className
      )}
    >
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 animate-pulse" />
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted" role="alert" aria-live="polite">
          <div className="text-center text-muted-foreground">
            <svg
              className="mx-auto h-12 w-12 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium">Imagem não encontrada</p>
          </div>
        </div>
      )}

      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "low"}
          className={cn(
            "w-full h-full transition-opacity duration-300",
            objectFitClass,
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          loading={priority ? "eager" : "lazy"}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const OptimizedImage = memo(OptimizedImageComponent, (prevProps, nextProps) => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.priority === nextProps.priority &&
    prevProps.aspectRatio === nextProps.aspectRatio &&
    prevProps.objectFit === nextProps.objectFit
  );
});
