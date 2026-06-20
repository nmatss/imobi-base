/**
 * Sitemap Routes - SEO Optimization
 * Generates dynamic sitemap.xml with all public pages and properties
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlset = urls.map(url => {
    const parts = [
      `  <url>`,
      `    <loc>${url.loc}</loc>`,
    ];

    if (url.lastmod) {
      parts.push(`    <lastmod>${url.lastmod}</lastmod>`);
    }

    if (url.changefreq) {
      parts.push(`    <changefreq>${url.changefreq}</changefreq>`);
    }

    if (url.priority !== undefined) {
      parts.push(`    <priority>${url.priority.toFixed(1)}</priority>`);
    }

    parts.push(`  </url>`);
    return parts.join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;
}

export function registerSitemapRoutes(app: Express): void {
  const baseUrl = (process.env.BASE_URL || process.env.SITE_URL || 'https://imobibase.com.br').replace(/\/$/, '');

  const dynamicSitemapHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
      const urls: SitemapUrl[] = [];

      // Páginas estáticas
      urls.push(
        {
          loc: baseUrl,
          changefreq: 'daily',
          priority: 1.0,
          lastmod: new Date().toISOString().split('T')[0],
        },
        {
          loc: `${baseUrl}/sistema-imobiliario-completo`,
          changefreq: 'weekly',
          priority: 0.95,
        },
        {
          loc: `${baseUrl}/crm-imobiliario`,
          changefreq: 'weekly',
          priority: 0.95,
        },
        {
          loc: `${baseUrl}/software-de-agendamento-imobiliario`,
          changefreq: 'weekly',
          priority: 0.95,
        },
        {
          loc: `${baseUrl}/site-para-imobiliaria`,
          changefreq: 'weekly',
          priority: 0.9,
        },
        {
          loc: `${baseUrl}/crm-imobiliario-com-ia`,
          changefreq: 'weekly',
          priority: 0.9,
        },
        {
          loc: `${baseUrl}/pricing`,
          changefreq: 'weekly',
          priority: 0.85,
        },
        {
          loc: `${baseUrl}/contato`,
          changefreq: 'monthly',
          priority: 0.6,
        }
      );

      // Buscar imóveis públicos (disponíveis para venda/aluguel)
      const properties = await storage.getPropertiesForSitemap();
      const tenantUrls = new Map<string, string>();

      for (const property of properties) {
        const tenantBase = `${baseUrl}/e/${property.tenantSlug}`;
        tenantUrls.set(property.tenantSlug, tenantBase);
        urls.push({
          loc: `${tenantBase}/imovel/${property.id}`,
          lastmod: property.updatedAt
            ? new Date(property.updatedAt).toISOString().split('T')[0]
            : new Date(property.createdAt).toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: 0.8,
        });
      }

      for (const tenantBase of tenantUrls.values()) {
        urls.push(
          {
            loc: tenantBase,
            changefreq: 'weekly',
            priority: 0.75,
          },
          {
            loc: `${tenantBase}/imoveis`,
            changefreq: 'daily',
            priority: 0.8,
          },
        );
      }

      const xml = generateSitemapXml(urls);

      res.header('Content-Type', 'application/xml');
      res.header('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
      res.send(xml);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Internal Server Error');
    }
  };

  app.get('/sitemap.xml', dynamicSitemapHandler);
  app.get('/sitemap-dynamic.xml', dynamicSitemapHandler);

  // Sitemap index para múltiplos sitemaps (se necessário no futuro)
  app.get('/sitemap-index.xml', async (req, res) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache por 24 horas
    res.send(xml);
  });

  console.log('✅ Sitemap routes registered');
}
