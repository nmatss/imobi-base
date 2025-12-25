/**
 * Sitemap Routes - SEO Optimization
 * Generates dynamic sitemap.xml with all public pages and properties
 */

import type { Express } from "express";
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
  const baseUrl = process.env.BASE_URL || 'https://imobibase.com';

  app.get('/sitemap.xml', async (req, res) => {
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
          loc: `${baseUrl}/properties`,
          changefreq: 'hourly',
          priority: 0.9,
          lastmod: new Date().toISOString().split('T')[0],
        },
        {
          loc: `${baseUrl}/sobre`,
          changefreq: 'monthly',
          priority: 0.5,
        },
        {
          loc: `${baseUrl}/contato`,
          changefreq: 'monthly',
          priority: 0.5,
        }
      );

      // Buscar imóveis públicos (disponíveis para venda/aluguel)
      const properties = await storage.getPropertiesForSitemap();

      for (const property of properties) {
        urls.push({
          loc: `${baseUrl}/properties/${property.id}`,
          lastmod: property.updatedAt
            ? new Date(property.updatedAt).toISOString().split('T')[0]
            : new Date(property.createdAt).toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: 0.8,
        });
      }

      const xml = generateSitemapXml(urls);

      res.header('Content-Type', 'application/xml');
      res.header('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
      res.send(xml);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Internal Server Error');
    }
  });

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
