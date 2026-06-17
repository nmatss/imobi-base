import { Helmet } from "react-helmet";

export interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  siteName?: string;
  twitterSite?: string;
  canonical?: string;
  imageAlt?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://imobibase.com.br"
).replace(/\/$/, "");
const DEFAULT_IMAGE = "/opengraph.png";

export function siteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function absoluteUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return siteUrl(url);
}

export function SeoHead({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
  siteName = "ImobiBase",
  twitterSite = "@imobibase",
  canonical,
  imageAlt,
  structuredData,
}: SeoHeadProps) {
  const fullUrl = canonical || siteUrl(path);
  const fullImage = absoluteUrl(image);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={fullImage} />
      {imageAlt && <meta property="og:image:alt" content={imageAlt} />}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="pt_BR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(structuredData)
              ? {
                  "@context": "https://schema.org",
                  "@graph": structuredData,
                }
              : structuredData,
          )}
        </script>
      )}
    </Helmet>
  );
}

/**
 * Dados reutilizaveis de Organization (JSON-LD).
 * Use em combinacao com structuredData em SeoHead passando um array.
 */
export const OrganizationSchema = {
  "@type": "Organization",
  name: "ImobiBase",
  url: SITE_URL,
  logo: siteUrl("/icon-512.png"),
  sameAs: [
    "https://instagram.com/imobibase",
    "https://linkedin.com/company/imobibase",
    "https://youtube.com/@imobibase",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "contato@imobibase.com.br",
    contactType: "customer support",
    areaServed: "BR",
    availableLanguage: ["Portuguese"],
  },
};

/**
 * Helper para gerar breadcrumbs a partir de uma lista de paginas.
 */
export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>,
  origin = SITE_URL,
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${origin.replace(/\/$/, "")}${item.path}`,
    })),
  };
}
