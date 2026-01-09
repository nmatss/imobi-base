import { ReactNode } from "react";
import { useLazyLoad } from "@/hooks/use-lazy-load";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyWidgetProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

export function LazyWidget({ children, fallback, className }: LazyWidgetProps) {
  const { ref, isVisible } = useLazyLoad();

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback || <Skeleton className="w-full h-64 rounded-lg" />}
    </div>
  );
}
