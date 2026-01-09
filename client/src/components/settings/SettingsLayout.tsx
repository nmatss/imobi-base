import { useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, LucideIcon } from "lucide-react";

export interface SettingsSection {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType;
  description?: string;
}

interface SettingsLayoutProps {
  sections: SettingsSection[];
  defaultSection?: string;
  onSectionChange?: (sectionId: string) => void;
}

export function SettingsLayout({
  sections,
  defaultSection,
  onSectionChange,
}: SettingsLayoutProps) {
  const [activeSection, setActiveSection] = useState(
    defaultSection || sections[0]?.id
  );

  useEffect(() => {
    if (defaultSection) {
      setActiveSection(defaultSection);
    }
  }, [defaultSection]);

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    onSectionChange?.(sectionId);

    // Scroll to top on section change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ActiveComponent = sections.find(
    (section) => section.id === activeSection
  )?.component;

  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-8">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <Button
                  key={section.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-auto py-3 px-3",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                  )}
                  onClick={() => handleSectionChange(section.id)}
                >
                  <Icon className="mr-3 h-4 w-4 shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-sm">{section.label}</div>
                    {section.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {section.description}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0" />
                  )}
                </Button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Tabs - Mobile */}
      <div className="lg:hidden border-b mb-6">
        <Tabs value={activeSection} onValueChange={handleSectionChange}>
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-auto h-auto p-1 bg-transparent">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{section.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Content */}
      <main className="flex-1 min-w-0">
        {ActiveComponent ? <ActiveComponent /> : <div>Seção não encontrada</div>}
      </main>
    </div>
  );
}
