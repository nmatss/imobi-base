import React from "react";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary';
  };
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  badge,
  actions
}: PageHeaderProps) {
  return (
    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            {title}
          </h1>
          {badge && (
            <Badge variant={badge.variant}>{badge.label}</Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
