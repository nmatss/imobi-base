import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Instagram,
  Mail,
  Globe,
  Copy,
  Send,
  RefreshCw,
  Eye,
  Loader2,
  Check,
  Trash2,
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type Property = {
  id: string;
  title: string;
  type: string;
  category: string;
  price: string;
  address: string;
  city: string;
  state: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  features: string | null;
  images: string | null;
  status: string;
};

type MarketingContent = {
  id: string;
  tenantId: string;
  propertyId: string;
  description: string | null;
  descriptionTone: string | null;
  socialMediaPost: string | null;
  socialMediaHashtags: string | null;
  emailSubject: string | null;
  emailHtml: string | null;
  micrositeContent: string | null;
  status: string;
  generatedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type Template = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Publicado</Badge>;
  }
  if (status === "draft") {
    return <Badge variant="secondary">Rascunho</Badge>;
  }
  if (status === "scheduled") {
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Agendado</Badge>;
  }
  return <Badge variant="outline">Sem conteudo</Badge>;
}

export default function AutoMarketingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [contents, setContents] = useState<MarketingContent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedContent, setSelectedContent] = useState<MarketingContent | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>("professional");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentResult, setEmailSentResult] = useState<{ message: string; recipientCount: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Editable fields
  const [editDescription, setEditDescription] = useState("");
  const [editSocialPost, setEditSocialPost] = useState("");
  const [editEmailSubject, setEditEmailSubject] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [propsRes, contentsRes, templatesRes] = await Promise.all([
        fetch("/api/properties", { credentials: "include" }),
        fetch("/api/auto-marketing/all", { credentials: "include" }),
        fetch("/api/auto-marketing/templates", { credentials: "include" }),
      ]);

      if (propsRes.ok) {
        const propsData = await propsRes.json();
        setProperties(propsData);
      }
      if (contentsRes.ok) {
        const contentsData = await contentsRes.json();
        setContents(contentsData);
      }
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When selected content changes, update editable fields
  useEffect(() => {
    if (selectedContent) {
      setEditDescription(selectedContent.description || "");
      setEditSocialPost(selectedContent.socialMediaPost || "");
      setEditEmailSubject(selectedContent.emailSubject || "");
      setSelectedTone(selectedContent.descriptionTone || "professional");
    }
  }, [selectedContent]);

  const getContentForProperty = (propertyId: string) => {
    return contents.find((c) => c.propertyId === propertyId);
  };

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    const content = getContentForProperty(property.id);
    setSelectedContent(content || null);
    setEmailSentResult(null);
  };

  const handleGenerate = async () => {
    if (!selectedProperty) return;

    try {
      setGenerating(true);
      const res = await fetch(`/api/auto-marketing/generate/${selectedProperty.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tone: selectedTone }),
      });

      if (res.ok) {
        const newContent = await res.json();
        setSelectedContent(newContent);
        // Update contents list
        setContents((prev) => {
          const idx = prev.findIndex((c) => c.propertyId === selectedProperty.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = newContent;
            return updated;
          }
          return [...prev, newContent];
        });
      }
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedContent) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/auto-marketing/${selectedContent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: editDescription,
          socialMediaPost: editSocialPost,
          emailSubject: editEmailSubject,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedContent(updated);
        setContents((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    } catch (error) {
      console.error("Error saving content:", error);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedContent) return;

    try {
      const res = await fetch(`/api/auto-marketing/${selectedContent.id}/publish`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedContent(updated);
        setContents((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    } catch (error) {
      console.error("Error publishing content:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedContent) return;

    try {
      const res = await fetch(`/api/auto-marketing/${selectedContent.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setContents((prev) => prev.filter((c) => c.id !== selectedContent.id));
        setSelectedContent(null);
      }
    } catch (error) {
      console.error("Error deleting content:", error);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedContent) return;

    try {
      setSendingEmail(true);
      const res = await fetch(`/api/auto-marketing/${selectedContent.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const result = await res.json();
        setEmailSentResult(result);
      }
    } catch (error) {
      console.error("Error sending email:", error);
    } finally {
      setSendingEmail(false);
    }
  };

  const parseHashtags = (hashtagsStr: string | null): string[] => {
    if (!hashtagsStr) return [];
    try {
      return JSON.parse(hashtagsStr);
    } catch {
      return [];
    }
  };

  const filteredProperties = properties.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Marketing IA</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Marketing IA
          </h1>
          <p className="text-muted-foreground">
            Gere automaticamente conteudo de marketing para seus imoveis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {contents.length} conteudo(s) gerado(s)
          </Badge>
          <Badge variant="outline" className="text-sm">
            {contents.filter((c) => c.status === "published").length} publicado(s)
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Properties List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Imoveis</CardTitle>
              <CardDescription>Selecione um imovel para gerar conteudo</CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar imovel..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto divide-y">
                {filteredProperties.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    {searchQuery ? "Nenhum imovel encontrado" : "Nenhum imovel cadastrado"}
                  </div>
                ) : (
                  filteredProperties.map((property) => {
                    const content = getContentForProperty(property.id);
                    const isSelected = selectedProperty?.id === property.id;

                    return (
                      <button
                        key={property.id}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                          isSelected ? "bg-primary/5 border-l-4 border-primary" : ""
                        }`}
                        onClick={() => handleSelectProperty(property)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{property.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {property.city} - {property.state}
                            </p>
                            <p className="text-xs font-medium text-primary mt-1">
                              {formatPrice(property.price)}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {content ? (
                              <StatusBadge status={content.status} />
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Pendente
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-2">
          {!selectedProperty ? (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Selecione um imovel</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Escolha um imovel na lista ao lado para gerar ou visualizar conteudo de marketing
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Property Info + Actions */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{selectedProperty.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedProperty.city} - {formatPrice(selectedProperty.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={selectedTone} onValueChange={setSelectedTone}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Tom" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="gap-2"
                      >
                        {generating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {generating ? "Gerando..." : selectedContent ? "Regerar" : "Gerar Conteudo"}
                      </Button>

                      {selectedContent && (
                        <>
                          {selectedContent.status !== "published" && (
                            <Button variant="outline" onClick={handlePublish} className="gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Publicar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDelete}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Content Tabs */}
              {selectedContent ? (
                <Card>
                  <Tabs defaultValue="description" className="w-full">
                    <CardHeader className="pb-0">
                      <TabsList className="w-full grid grid-cols-4">
                        <TabsTrigger value="description" className="gap-1.5 text-xs sm:text-sm">
                          <FileText className="h-4 w-4 hidden sm:block" />
                          Descricao
                        </TabsTrigger>
                        <TabsTrigger value="social" className="gap-1.5 text-xs sm:text-sm">
                          <Instagram className="h-4 w-4 hidden sm:block" />
                          Social
                        </TabsTrigger>
                        <TabsTrigger value="email" className="gap-1.5 text-xs sm:text-sm">
                          <Mail className="h-4 w-4 hidden sm:block" />
                          Email
                        </TabsTrigger>
                        <TabsTrigger value="microsite" className="gap-1.5 text-xs sm:text-sm">
                          <Globe className="h-4 w-4 hidden sm:block" />
                          Microsite
                        </TabsTrigger>
                      </TabsList>
                    </CardHeader>

                    <CardContent className="pt-6">
                      {/* Description Tab */}
                      <TabsContent value="description" className="mt-0 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Descricao do Imovel ({
                              templates.find((t) => t.id === (selectedContent.descriptionTone || "professional"))?.name || "Profissional"
                            })
                          </h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyToClipboard(editDescription)}
                              className="gap-1.5"
                            >
                              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              {copied ? "Copiado!" : "Copiar"}
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="min-h-[300px] font-mono text-sm"
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="sm"
                            className="gap-1.5"
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Salvar Alteracoes
                          </Button>
                        </div>
                      </TabsContent>

                      {/* Social Media Tab */}
                      <TabsContent value="social" className="mt-0 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Post para Redes Sociais
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const hashtags = parseHashtags(selectedContent.socialMediaHashtags);
                              const fullPost = editSocialPost + "\n\n" + hashtags.join(" ");
                              handleCopyToClipboard(fullPost);
                            }}
                            className="gap-1.5"
                          >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? "Copiado!" : "Copiar Tudo"}
                          </Button>
                        </div>

                        <Textarea
                          value={editSocialPost}
                          onChange={(e) => setEditSocialPost(e.target.value)}
                          className="min-h-[200px] text-sm"
                        />

                        {/* Hashtags */}
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-muted-foreground">Hashtags</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {parseHashtags(selectedContent.socialMediaHashtags).map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/20" onClick={() => handleCopyToClipboard(tag)}>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="sm"
                            className="gap-1.5"
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Salvar Alteracoes
                          </Button>
                        </div>
                      </TabsContent>

                      {/* Email Tab */}
                      <TabsContent value="email" className="mt-0 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Email Marketing
                          </h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEmailPreviewOpen(true)}
                              className="gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Visualizar
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleSendEmail}
                              disabled={sendingEmail}
                              className="gap-1.5"
                            >
                              {sendingEmail ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Enviar para Leads
                            </Button>
                          </div>
                        </div>

                        {emailSentResult && (
                          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {emailSentResult.message}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Assunto do Email</label>
                          <Input
                            value={editEmailSubject}
                            onChange={(e) => setEditEmailSubject(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Preview do HTML</label>
                          <div className="border rounded-lg p-4 bg-muted/30 max-h-[300px] overflow-y-auto">
                            <div
                              className="text-xs font-mono whitespace-pre-wrap break-all"
                              style={{ maxHeight: "280px" }}
                            >
                              {selectedContent.emailHtml
                                ? selectedContent.emailHtml.substring(0, 500) + "..."
                                : "Sem conteudo de email"}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="sm"
                            className="gap-1.5"
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Salvar Alteracoes
                          </Button>
                        </div>
                      </TabsContent>

                      {/* Microsite Tab */}
                      <TabsContent value="microsite" className="mt-0 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Conteudo do Microsite
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (selectedContent.micrositeContent) {
                                handleCopyToClipboard(selectedContent.micrositeContent);
                              }
                            }}
                            className="gap-1.5"
                          >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? "Copiado!" : "Copiar JSON"}
                          </Button>
                        </div>

                        {selectedContent.micrositeContent ? (
                          <div className="space-y-4">
                            {(() => {
                              try {
                                const data = JSON.parse(selectedContent.micrositeContent);
                                return (
                                  <>
                                    <Card className="bg-muted/30">
                                      <CardContent className="p-4 space-y-3">
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Titulo</label>
                                          <p className="font-semibold text-lg">{data.headline}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subtitulo</label>
                                          <p className="text-sm">{data.subheadline}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preco</label>
                                          <p className="text-xl font-bold text-primary">{data.price}</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                          {data.specs?.bedrooms > 0 && (
                                            <div className="text-center p-2 bg-background rounded-lg">
                                              <p className="text-lg font-bold">{data.specs.bedrooms}</p>
                                              <p className="text-xs text-muted-foreground">Quartos</p>
                                            </div>
                                          )}
                                          {data.specs?.bathrooms > 0 && (
                                            <div className="text-center p-2 bg-background rounded-lg">
                                              <p className="text-lg font-bold">{data.specs.bathrooms}</p>
                                              <p className="text-xs text-muted-foreground">Banheiros</p>
                                            </div>
                                          )}
                                          {data.specs?.area > 0 && (
                                            <div className="text-center p-2 bg-background rounded-lg">
                                              <p className="text-lg font-bold">{data.specs.area}m2</p>
                                              <p className="text-xs text-muted-foreground">Area</p>
                                            </div>
                                          )}
                                        </div>
                                        {data.features && data.features.length > 0 && (
                                          <div>
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Diferenciais</label>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                              {data.features.map((f: string, i: number) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                  {f}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CTA</label>
                                          <Button className="w-full mt-1" disabled>
                                            {data.cta?.text || "Agendar Visita"}
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </>
                                );
                              } catch {
                                return (
                                  <div className="text-sm text-muted-foreground">
                                    Erro ao exibir conteudo do microsite
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-8">
                            Conteudo do microsite nao gerado
                          </div>
                        )}
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>
              ) : (
                <Card className="min-h-[400px] flex items-center justify-center">
                  <CardContent className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                      <AlertCircle className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Nenhum conteudo gerado</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Selecione o tom desejado e clique em "Gerar Conteudo" para criar materiais de marketing para este imovel
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {templates.map((t) => (
                        <div
                          key={t.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all text-center w-28 ${
                            selectedTone === t.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "hover:border-muted-foreground/30"
                          }`}
                          onClick={() => setSelectedTone(t.id)}
                        >
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {generating ? "Gerando..." : "Gerar Conteudo"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Email Preview Dialog */}
      <Dialog open={emailPreviewOpen} onOpenChange={setEmailPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview do Email</DialogTitle>
            <DialogDescription>
              Assunto: {selectedContent?.emailSubject || "Sem assunto"}
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            {selectedContent?.emailHtml ? (
              <iframe
                srcDoc={selectedContent.emailHtml}
                className="w-full min-h-[500px] border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                Sem conteudo de email para visualizar
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
