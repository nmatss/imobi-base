import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  onSave?: () => void;
  isSaving?: boolean;
  showSaveButton?: boolean;
  footerContent?: ReactNode;
  hasUnsavedChanges?: boolean;
}

export function SettingsCard({
  title,
  description,
  children,
  onSave,
  isSaving = false,
  showSaveButton = true,
  footerContent,
  hasUnsavedChanges = false,
}: SettingsCardProps) {
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar when scrolled down on mobile
      setShowStickyBar(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
          {description && <CardDescription className="text-sm">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">{children}</CardContent>
        {(showSaveButton || footerContent) && (
          <CardFooter className="border-t p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row justify-between gap-2 sm:gap-3">
            {footerContent}
            {showSaveButton && onSave && (
              <Button
                onClick={onSave}
                disabled={isSaving}
                className="w-full sm:w-auto sm:ml-auto gap-2 h-11 sm:h-10"
                size="default"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden xs:inline">Salvar Alterações</span>
                <span className="xs:hidden">Salvar</span>
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Sticky Save Bar for Mobile */}
      {showSaveButton && onSave && showStickyBar && (
        <div className={cn(
          "fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50 sm:hidden transition-transform duration-200",
          showStickyBar ? "translate-y-0" : "translate-y-full"
        )}>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="w-full gap-2 h-12"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
                {hasUnsavedChanges && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-orange-500" />
                )}
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
