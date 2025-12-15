import { useState, useEffect } from "react";
import { SettingsCard } from "../components/SettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  FileText,
  TrendingUp,
  Zap,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WhatsAppTemplate,
  TemplateCategory,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  loadTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  getPreviewText,
} from "@/lib/whatsapp-templates";
import { TemplateEditor } from "@/components/whatsapp/TemplateEditor";

type ViewMode = "list" | "editor";

export function WhatsAppTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | undefined>();
  const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null);

  useEffect(() => {
    loadTemplatesData();
  }, []);

  const loadTemplatesData = () => {
    const loadedTemplates = loadTemplates();
    setTemplates(loadedTemplates);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(undefined);
    setViewMode("editor");
  };

  const handleEditTemplate = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setViewMode("editor");
  };

  const handleSaveTemplate = (templateData: Omit<WhatsAppTemplate, "id" | "createdAt" | "usageCount">) => {
    try {
      if (editingTemplate) {
        // Update existing template
        updateTemplate(editingTemplate.id, templateData);
        toast({
          title: "Template atualizado",
          description: "O template foi atualizado com sucesso.",
        });
      } else {
        // Create new template
        addTemplate({ ...templateData, usageCount: 0 });
        toast({
          title: "Template criado",
          description: "O template foi criado com sucesso.",
        });
      }
      loadTemplatesData();
      setViewMode("list");
      setEditingTemplate(undefined);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o template.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTemplate = (template: WhatsAppTemplate) => {
    try {
      duplicateTemplate(template.id);
      loadTemplatesData();
      toast({
        title: "Template duplicado",
        description: "O template foi duplicado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível duplicar o template.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = (template: WhatsAppTemplate) => {
    setTemplateToDelete(template);
  };

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      try {
        deleteTemplate(templateToDelete.id);
        loadTemplatesData();
        toast({
          title: "Template excluído",
          description: "O template foi excluído com sucesso.",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível excluir o template.",
          variant: "destructive",
        });
      } finally {
        setTemplateToDelete(null);
      }
    }
  };

  const handleCancelEdit = () => {
    setViewMode("list");
    setEditingTemplate(undefined);
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group templates by category
  const templatesByCategory = Object.entries(CATEGORY_LABELS).reduce(
    (acc, [key, label]) => {
      acc[key as TemplateCategory] = filteredTemplates.filter(
        (t) => t.category === key
      );
      return acc;
    },
    {} as Record<TemplateCategory, WhatsAppTemplate[]>
  );

  // Statistics
  const stats = {
    total: templates.length,
    byCategory: Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
      category: label,
      count: templates.filter((t) => t.category === key).length,
    })),
    mostUsed: [...templates].sort((a, b) => b.usageCount - a.usageCount).slice(0, 3),
  };

  if (viewMode === "editor") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {editingTemplate
                ? "Modifique o template existente"
                : "Crie um novo template de mensagem"}
            </p>
          </div>
        </div>

        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={handleCancelEdit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <SettingsCard
        title="Templates de WhatsApp"
        description="Gerencie suas mensagens prontas para agilizar o atendimento"
        showSaveButton={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Total de Templates</span>
            </div>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>

          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium">Mais Usado</span>
            </div>
            <p className="text-lg font-semibold truncate">
              {stats.mostUsed[0]?.name || "Nenhum"}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.mostUsed[0]?.usageCount || 0} vezes
            </p>
          </div>

          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium">Categorias</span>
            </div>
            <p className="text-3xl font-bold">{Object.keys(CATEGORY_LABELS).length}</p>
          </div>
        </div>

        {/* Search and actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button onClick={handleCreateTemplate} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Novo Template
          </Button>
        </div>

        {/* Category tabs */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
            <TabsTrigger value="all" className="gap-2">
              Todos
              <Badge variant="secondary" className="ml-1">
                {templates.length}
              </Badge>
            </TabsTrigger>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const count = templates.filter((t) => t.category === key).length;
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  {label}
                  <Badge variant="secondary" className="ml-1">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* All templates */}
          <TabsContent value="all" className="mt-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold mb-1">Nenhum template encontrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery
                    ? "Tente ajustar sua busca"
                    : "Comece criando seu primeiro template"}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreateTemplate} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Primeiro Template
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => {
                  if (categoryTemplates.length === 0) return null;
                  return (
                    <div key={category}>
                      <div className="mb-3">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                          {CATEGORY_LABELS[category as TemplateCategory]}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {CATEGORY_DESCRIPTIONS[category as TemplateCategory]}
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {categoryTemplates.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            onEdit={() => handleEditTemplate(template)}
                            onDuplicate={() => handleDuplicateTemplate(template)}
                            onDelete={() => handleDeleteTemplate(template)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Category-specific tabs */}
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <div className="mb-4 p-4 rounded-lg bg-muted/30 border">
                <h3 className="font-semibold mb-1">{label}</h3>
                <p className="text-sm text-muted-foreground">
                  {CATEGORY_DESCRIPTIONS[key as TemplateCategory]}
                </p>
              </div>
              {templatesByCategory[key as TemplateCategory].length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold mb-1">
                    Nenhum template em {label}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie templates para esta categoria
                  </p>
                  <Button onClick={handleCreateTemplate} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Template
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {templatesByCategory[key as TemplateCategory].map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={() => handleEditTemplate(template)}
                      onDuplicate={() => handleDuplicateTemplate(template)}
                      onDelete={() => handleDeleteTemplate(template)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </SettingsCard>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTemplate} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Template card component
interface TemplateCardProps {
  template: WhatsAppTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
  return (
    <div className="p-4 rounded-lg border hover:border-primary transition-colors bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold truncate">{template.name}</h4>
            {template.isDefault && (
              <Badge variant="outline" className="shrink-0 text-xs">
                Padrão
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {getPreviewText(template.content, 150)}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{template.usageCount} usos</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {CATEGORY_LABELS[template.category]}
            </Badge>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Edit className="w-4 h-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} className="gap-2">
              <Copy className="w-4 h-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
