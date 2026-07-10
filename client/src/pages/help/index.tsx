import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, ChevronRight, HelpCircle, Search } from "lucide-react";
import { HELP_CATEGORIES, helpArticles, type HelpArticle } from "./articles";

const iconA11yProps = { "aria-hidden": true, focusable: false } as const;

/** Normaliza texto para busca: minúsculas e sem acentos. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesQuery(article: HelpArticle, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const haystack = normalize(
    [article.title, article.category, ...article.keywords].join(" ")
  );
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

function ArticleView({ article }: { article: HelpArticle }) {
  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/ajuda">
            <ArrowLeft {...iconA11yProps} className="h-4 w-4" />
            Voltar para a Central de Ajuda
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <Badge variant="secondary" className="w-fit">{article.category}</Badge>
          <CardTitle className="text-2xl font-heading">{article.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-foreground/90 max-w-3xl">
            {article.content}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ArticleNotFound() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/ajuda">
          <ArrowLeft {...iconA11yProps} className="h-4 w-4" />
          Voltar para a Central de Ajuda
        </Link>
      </Button>
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <HelpCircle {...iconA11yProps} className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="font-medium">Artigo não encontrado</p>
          <p className="text-sm text-muted-foreground">
            O artigo que você procura não existe ou foi movido.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HelpPage() {
  const [, params] = useRoute("/ajuda/:slug");
  const [query, setQuery] = useState("");

  const selectedArticle = params?.slug
    ? helpArticles.find((a) => a.slug === params.slug)
    : undefined;

  usePageTitle(selectedArticle ? selectedArticle.title : "Ajuda");

  const grouped = useMemo(() => {
    const filtered = helpArticles.filter((a) => matchesQuery(a, query));
    return HELP_CATEGORIES.map((category) => ({
      category,
      articles: filtered.filter((a) => a.category === category),
    })).filter((group) => group.articles.length > 0);
  }, [query]);

  // Rota /ajuda/:slug — exibe o artigo (ou aviso de não encontrado)
  if (params?.slug) {
    return selectedArticle ? (
      <ArticleView article={selectedArticle} />
    ) : (
      <ArticleNotFound />
    );
  }

  // Rota /ajuda — lista com busca, agrupada por categoria
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight flex items-center gap-3">
          <HelpCircle {...iconA11yProps} className="h-7 w-7 text-primary" />
          Central de Ajuda
        </h1>
        <p className="text-muted-foreground">
          Guias rápidos para você aproveitar o ImobiBase ao máximo.
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search
          {...iconA11yProps}
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar artigo... (ex.: imóvel, leads, site, plano)"
          className="pl-9 h-11"
          aria-label="Buscar artigo de ajuda"
          data-testid="input-help-search"
        />
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Search {...iconA11yProps} className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="font-medium">Nenhum artigo encontrado</p>
            <p className="text-sm text-muted-foreground">
              Tente buscar com outras palavras, como "imóvel", "visita" ou "assinatura".
            </p>
          </CardContent>
        </Card>
      ) : (
        grouped.map((group) => (
          <section key={group.category} className="space-y-3" aria-label={group.category}>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {group.category}
              </h2>
              <Badge variant="outline" className="text-xs">
                {group.articles.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.articles.map((article) => (
                <Link key={article.slug} href={`/ajuda/${article.slug}`}>
                  <Card className="cursor-pointer h-full transition-all hover:shadow-md hover:border-primary/40 group">
                    <CardHeader className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <BookOpen
                            {...iconA11yProps}
                            className="h-5 w-5 mt-0.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors"
                          />
                          <div className="min-w-0 space-y-1">
                            <CardTitle className="text-base font-medium leading-snug">
                              {article.title}
                            </CardTitle>
                            <CardDescription className="text-xs line-clamp-1">
                              {article.keywords.slice(0, 4).join(" · ")}
                            </CardDescription>
                          </div>
                        </div>
                        <ChevronRight
                          {...iconA11yProps}
                          className="h-4 w-4 mt-1 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors"
                        />
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
