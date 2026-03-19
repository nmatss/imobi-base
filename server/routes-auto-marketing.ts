/**
 * Auto-Marketing Routes
 * AI-powered marketing content generation for properties
 * Generates descriptions, social media posts, email HTML, and microsite content
 */

import type { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from './middleware/auth';
import { storage } from './storage';
import { generateRateLimitKey } from './middleware/rate-limit-key-generator';
import type { Property } from '@shared/schema-sqlite';

// ==================== RATE LIMITERS ====================

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 generations per hour per tenant
  message: { error: 'Limite de gerações excedido. Tente novamente em uma hora.' },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 min
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== CONTENT GENERATOR ====================

type Tone = 'luxury' | 'family' | 'investment' | 'professional';

interface PropertyData {
  title: string;
  description?: string | null;
  type: string;
  category: string;
  price: string;
  address: string;
  city: string;
  state: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  features?: string | null;
  images?: string | null;
  status: string;
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function parseFeatures(features: string | null | undefined): string[] {
  if (!features) return [];
  try {
    return JSON.parse(features);
  } catch {
    return [];
  }
}

function parseImages(images: string | null | undefined): string[] {
  if (!images) return [];
  try {
    return JSON.parse(images);
  } catch {
    return [];
  }
}

function getPropertyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    house: 'casa',
    apartment: 'apartamento',
    commercial: 'sala comercial',
    land: 'terreno',
    farm: 'chacara',
    condo: 'condominio',
    studio: 'studio',
    penthouse: 'cobertura',
    loft: 'loft',
    kitnet: 'kitnet',
  };
  return labels[type] || type;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    sale: 'venda',
    rent: 'aluguel',
    both: 'venda e aluguel',
    seasonal: 'temporada',
  };
  return labels[category] || category;
}

// Tone-specific vocabulary and style
const toneConfig: Record<Tone, {
  adjectives: string[];
  openings: string[];
  closings: string[];
  priceIntro: string[];
  featureIntros: string[];
  ctaText: string;
  socialEmoji: string[];
}> = {
  luxury: {
    adjectives: ['sofisticado', 'exclusivo', 'requintado', 'premium', 'elegante', 'imponente', 'suntuoso', 'magistral', 'nobre', 'distinto'],
    openings: [
      'Descubra o mais alto padrao de moradia',
      'Uma residencia que redefine o conceito de exclusividade',
      'Para quem exige o melhor, apresentamos esta joia imobiliaria',
      'Elegancia e sofisticacao em cada detalhe',
      'Uma oportunidade unica para viver com o maximo requinte',
    ],
    closings: [
      'Uma experiencia de moradia incomparavel aguarda por voce.',
      'Agende sua visita exclusiva e surpreenda-se.',
      'O estilo de vida que voce merece esta aqui.',
      'Exclusividade e conforto em um so endereco.',
    ],
    priceIntro: ['Investimento:', 'Valor exclusivo:', 'Oportunidade premium:'],
    featureIntros: ['Diferenciais exclusivos:', 'Atributos premium:', 'Destaques desta propriedade:'],
    ctaText: 'Agendar Visita Exclusiva',
    socialEmoji: ['\u2728', '\ud83c\udfe0', '\ud83d\udc8e', '\u2b50', '\ud83c\udf1f', '\ud83d\udd11'],
  },
  family: {
    adjectives: ['aconchegante', 'espacoso', 'confortavel', 'acolhedor', 'amplo', 'funcional', 'pratico', 'ideal', 'perfeito', 'seguro'],
    openings: [
      'O lar perfeito para sua familia esta aqui',
      'Espaco, conforto e seguranca para quem voce mais ama',
      'Encontre o cantinho ideal para construir memorias',
      'Sua familia merece um lar assim',
      'O proximo capitulo da sua familia comeca aqui',
    ],
    closings: [
      'O lar dos sonhos da sua familia espera por voce!',
      'Venha conhecer e se apaixone pelo seu novo lar.',
      'Agende uma visita e imagine sua familia aqui.',
      'O espaco perfeito para crescer junto com quem voce ama.',
    ],
    priceIntro: ['Valor:', 'Investimento no seu futuro:', 'Valor acessivel:'],
    featureIntros: ['O que sua familia vai adorar:', 'Diferenciais para o dia a dia:', 'Confortos inclusos:'],
    ctaText: 'Quero Conhecer Meu Novo Lar',
    socialEmoji: ['\ud83c\udfe1', '\u2764\ufe0f', '\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d\udc66', '\u2600\ufe0f', '\ud83c\udf33', '\ud83d\ude0d'],
  },
  investment: {
    adjectives: ['estrategico', 'rentavel', 'valorizado', 'promissor', 'lucrativo', 'solido', 'inteligente', 'consolidado', 'potencial', 'excepcional'],
    openings: [
      'Oportunidade de investimento com alto potencial de retorno',
      'Maximize seu patrimonio com este imovel estrategico',
      'Investimento solido em regiao de alta valorizacao',
      'Rentabilidade e seguranca em um unico ativo',
      'O investimento inteligente que voce procurava',
    ],
    closings: [
      'Nao perca esta oportunidade de investimento.',
      'Consulte-nos para uma analise detalhada de rentabilidade.',
      'Garanta seu lugar em uma das regioes mais valorizadas.',
      'Invista com inteligencia. Fale com nossos especialistas.',
    ],
    priceIntro: ['Valor do investimento:', 'Valor de mercado:', 'Oportunidade por:'],
    featureIntros: ['Diferenciais competitivos:', 'Atributos de valorizacao:', 'Fatores de retorno:'],
    ctaText: 'Solicitar Analise de Investimento',
    socialEmoji: ['\ud83d\udcb0', '\ud83d\udcc8', '\ud83c\udfe2', '\ud83d\udcbc', '\u2705', '\ud83d\udca1'],
  },
  professional: {
    adjectives: ['bem localizado', 'completo', 'moderno', 'atualizado', 'estruturado', 'versátil', 'bem distribuido', 'otimizado', 'qualificado', 'diferenciado'],
    openings: [
      'Apresentamos este excelente imovel',
      'Imovel com otima localizacao e infraestrutura completa',
      'Oportunidade imperdivel no mercado imobiliario',
      'Confira este imovel com excelente custo-beneficio',
      'Destaque do nosso portfolio imobiliario',
    ],
    closings: [
      'Entre em contato para mais informacoes e agendamento de visita.',
      'Agende sua visita e conheca pessoalmente.',
      'Estamos a disposicao para esclarecer qualquer duvida.',
      'Nao perca essa oportunidade. Fale conosco.',
    ],
    priceIntro: ['Valor:', 'Preco:', 'Valor de negociacao:'],
    featureIntros: ['Caracteristicas:', 'Diferenciais:', 'O imovel oferece:'],
    ctaText: 'Agendar Visita',
    socialEmoji: ['\ud83c\udfe0', '\ud83d\udccd', '\u2705', '\ud83d\udd11', '\ud83d\udcf2', '\ud83d\udc49'],
  },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDescription(property: PropertyData, tone: Tone): string {
  const config = toneConfig[tone];
  const features = parseFeatures(property.features);
  const typeLabel = getPropertyTypeLabel(property.type);
  const categoryLabel = getCategoryLabel(property.category);
  const price = formatPrice(property.price);
  const adj1 = pickRandom(config.adjectives);
  const adj2 = pickRandom(config.adjectives.filter(a => a !== adj1));

  let desc = `${pickRandom(config.openings)}.\n\n`;

  // Main description paragraph
  desc += `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} ${adj1} para ${categoryLabel}`;
  desc += ` localizado em ${property.address}, ${property.city} - ${property.state}.`;

  if (property.area) {
    desc += ` Com ${property.area}m² de area`;
    if (property.bedrooms && property.bedrooms > 0) {
      desc += `, ${property.bedrooms} ${property.bedrooms === 1 ? 'dormitorio' : 'dormitorios'}`;
    }
    if (property.bathrooms && property.bathrooms > 0) {
      desc += ` e ${property.bathrooms} ${property.bathrooms === 1 ? 'banheiro' : 'banheiros'}`;
    }
    desc += '.';
  } else {
    if (property.bedrooms && property.bedrooms > 0) {
      desc += ` ${property.bedrooms} ${property.bedrooms === 1 ? 'dormitorio' : 'dormitorios'}`;
      if (property.bathrooms && property.bathrooms > 0) {
        desc += ` e ${property.bathrooms} ${property.bathrooms === 1 ? 'banheiro' : 'banheiros'}`;
      }
      desc += '.';
    }
  }

  desc += `\n\nEste imovel ${adj2} `;
  desc += `oferece tudo o que voce precisa para `;
  if (tone === 'luxury') desc += `viver com o maximo conforto e sofisticacao.`;
  else if (tone === 'family') desc += `a sua familia se sentir em casa desde o primeiro dia.`;
  else if (tone === 'investment') desc += `garantir um retorno solido e consistente sobre seu capital.`;
  else desc += `atender suas necessidades com qualidade e praticidade.`;

  // Features section
  if (features.length > 0) {
    desc += `\n\n${pickRandom(config.featureIntros)}\n`;
    features.forEach(f => {
      desc += `- ${f}\n`;
    });
  }

  // Price
  desc += `\n${pickRandom(config.priceIntro)} ${price}`;

  // Closing
  desc += `\n\n${pickRandom(config.closings)}`;

  return desc;
}

function generateSocialMediaPost(property: PropertyData, tone: Tone): { post: string; hashtags: string[] } {
  const config = toneConfig[tone];
  const typeLabel = getPropertyTypeLabel(property.type);
  const categoryLabel = getCategoryLabel(property.category);
  const price = formatPrice(property.price);
  const features = parseFeatures(property.features);
  const emoji1 = pickRandom(config.socialEmoji);
  const emoji2 = pickRandom(config.socialEmoji.filter(e => e !== emoji1));
  const emoji3 = pickRandom(config.socialEmoji.filter(e => e !== emoji1 && e !== emoji2));

  let post = `${emoji1} ${pickRandom(config.openings)}!\n\n`;
  post += `${emoji2} ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} para ${categoryLabel}\n`;
  post += `\ud83d\udccd ${property.city} - ${property.state}\n`;
  post += `\ud83d\udcb2 ${price}\n\n`;

  if (property.bedrooms || property.area) {
    post += `${emoji3} `;
    const specs = [];
    if (property.bedrooms) specs.push(`${property.bedrooms} ${property.bedrooms === 1 ? 'quarto' : 'quartos'}`);
    if (property.bathrooms) specs.push(`${property.bathrooms} ${property.bathrooms === 1 ? 'banheiro' : 'banheiros'}`);
    if (property.area) specs.push(`${property.area}m²`);
    post += specs.join(' | ') + '\n\n';
  }

  if (features.length > 0) {
    const topFeatures = features.slice(0, 3);
    post += topFeatures.map(f => `\u2705 ${f}`).join('\n') + '\n\n';
  }

  post += `\ud83d\udcf2 Entre em contato e agende sua visita!`;

  // Generate hashtags
  const baseHashtags = ['#imoveis', '#imobiliaria', `#${property.city.toLowerCase().replace(/\s+/g, '')}`, '#mercadoimobiliario'];
  const typeHashtags: Record<string, string[]> = {
    house: ['#casa', '#casaavenda', '#casanova'],
    apartment: ['#apartamento', '#apto', '#aptodossonhos'],
    commercial: ['#salacomercial', '#comercial', '#empresarial'],
    land: ['#terreno', '#lote', '#terrenoavenda'],
    farm: ['#chacara', '#fazenda', '#rural'],
    condo: ['#condominio', '#condofechado'],
  };
  const toneHashtags: Record<Tone, string[]> = {
    luxury: ['#luxo', '#altopadrao', '#exclusivo', '#premium', '#imoveldeluxo'],
    family: ['#lar', '#familia', '#casadossonhos', '#minhacasa', '#lardocelar'],
    investment: ['#investimento', '#renda', '#rentabilidade', '#patrimonio', '#investimentoimobiliario'],
    professional: ['#oportunidade', '#negocio', '#imovel', '#corretor', '#imoveisdestaque'],
  };
  const categoryHashtags: Record<string, string[]> = {
    sale: ['#venda', '#avenda', '#comprar'],
    rent: ['#aluguel', '#alugar', '#paraalugar'],
    both: ['#vendaealuguel'],
  };

  const hashtags = [
    ...baseHashtags,
    ...(typeHashtags[property.type] || []),
    ...toneHashtags[tone],
    ...(categoryHashtags[property.category] || []),
  ];

  return { post, hashtags: [...new Set(hashtags)] };
}

function generateEmailHtml(property: PropertyData, tone: Tone, tenantName: string, tenantColor: string): { subject: string; html: string } {
  const config = toneConfig[tone];
  const typeLabel = getPropertyTypeLabel(property.type);
  const categoryLabel = getCategoryLabel(property.category);
  const price = formatPrice(property.price);
  const features = parseFeatures(property.features);
  const images = parseImages(property.images);
  const heroImage = images.length > 0 ? images[0] : '';

  const subject = tone === 'luxury'
    ? `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} exclusivo em ${property.city} - ${price}`
    : tone === 'family'
    ? `O lar ideal para sua familia em ${property.city}!`
    : tone === 'investment'
    ? `Oportunidade de investimento: ${typeLabel} em ${property.city} por ${price}`
    : `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} disponivel em ${property.city} - ${price}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background-color: ${tenantColor}; padding: 24px 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
    .hero-image { width: 100%; max-height: 300px; object-fit: cover; display: block; }
    .content { padding: 32px; }
    .content h2 { color: ${tenantColor}; font-size: 20px; margin: 0 0 16px; }
    .content p { font-size: 15px; line-height: 1.6; color: #555; margin: 0 0 16px; }
    .specs { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }
    .spec-item { background: #f0f4f8; border-radius: 8px; padding: 12px 16px; flex: 1; min-width: 120px; text-align: center; }
    .spec-value { font-size: 20px; font-weight: 700; color: ${tenantColor}; display: block; }
    .spec-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .price-section { background: linear-gradient(135deg, ${tenantColor}10, ${tenantColor}05); border-left: 4px solid ${tenantColor}; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .price { font-size: 28px; font-weight: 700; color: ${tenantColor}; }
    .price-label { font-size: 13px; color: #888; margin-bottom: 4px; }
    .features-list { list-style: none; padding: 0; margin: 16px 0; }
    .features-list li { padding: 6px 0 6px 24px; position: relative; font-size: 14px; color: #555; }
    .features-list li::before { content: "\\2713"; position: absolute; left: 0; color: ${tenantColor}; font-weight: 700; }
    .cta-section { text-align: center; padding: 24px 0; }
    .cta-button { display: inline-block; background-color: ${tenantColor}; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .location { background: #f8f9fa; padding: 16px 20px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #666; }
    .location strong { color: #333; }
    .footer { background: #f4f4f7; padding: 24px 32px; text-align: center; font-size: 12px; color: #999; }
    .footer a { color: ${tenantColor}; text-decoration: none; }
    @media (max-width: 480px) {
      .content { padding: 20px; }
      .specs { flex-direction: column; }
      .spec-item { min-width: unset; }
      .price { font-size: 24px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${tenantName}</h1>
    </div>

    ${heroImage ? `<img src="${heroImage}" alt="${property.title}" class="hero-image" />` : ''}

    <div class="content">
      <h2>${property.title}</h2>
      <p>${pickRandom(config.openings)}. ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} ${pickRandom(config.adjectives)} para ${categoryLabel} em ${property.city}.</p>

      <div class="specs">
        ${property.bedrooms ? `<div class="spec-item"><span class="spec-value">${property.bedrooms}</span><span class="spec-label">${property.bedrooms === 1 ? 'Dormitorio' : 'Dormitorios'}</span></div>` : ''}
        ${property.bathrooms ? `<div class="spec-item"><span class="spec-value">${property.bathrooms}</span><span class="spec-label">${property.bathrooms === 1 ? 'Banheiro' : 'Banheiros'}</span></div>` : ''}
        ${property.area ? `<div class="spec-item"><span class="spec-value">${property.area}m&sup2;</span><span class="spec-label">Area</span></div>` : ''}
      </div>

      <div class="price-section">
        <div class="price-label">${categoryLabel === 'aluguel' ? 'Valor mensal' : 'Valor'}</div>
        <div class="price">${price}</div>
      </div>

      ${features.length > 0 ? `
      <p style="font-weight: 600; color: #333; margin-bottom: 8px;">${pickRandom(config.featureIntros)}</p>
      <ul class="features-list">
        ${features.slice(0, 6).map(f => `<li>${f}</li>`).join('\n        ')}
      </ul>
      ` : ''}

      <div class="location">
        <strong>Localizacao:</strong> ${property.address}, ${property.city} - ${property.state}
      </div>

      <div class="cta-section">
        <a href="#" class="cta-button">${config.ctaText}</a>
      </div>

      <p style="text-align: center; font-size: 13px; color: #999;">${pickRandom(config.closings)}</p>
    </div>

    <div class="footer">
      <p>${tenantName} &bull; Todos os direitos reservados</p>
      <p><a href="#">Cancelar inscricao</a> | <a href="#">Ver no site</a></p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

function generateMicrositeContent(property: PropertyData, tone: Tone): string {
  const config = toneConfig[tone];
  const features = parseFeatures(property.features);
  const images = parseImages(property.images);

  const micrositeData = {
    headline: pickRandom(config.openings),
    subheadline: `${getPropertyTypeLabel(property.type).charAt(0).toUpperCase() + getPropertyTypeLabel(property.type).slice(1)} para ${getCategoryLabel(property.category)} em ${property.city}`,
    description: generateDescription(property, tone),
    price: formatPrice(property.price),
    specs: {
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      area: property.area || 0,
      type: getPropertyTypeLabel(property.type),
      category: getCategoryLabel(property.category),
    },
    features,
    images,
    location: {
      address: property.address,
      city: property.city,
      state: property.state,
    },
    cta: {
      text: config.ctaText,
      whatsappMessage: `Olá! Tenho interesse no imóvel: ${property.title} em ${property.city}. Poderia me passar mais informações?`,
    },
    tone,
    generatedAt: new Date().toISOString(),
  };

  return JSON.stringify(micrositeData);
}

// ==================== ROUTE REGISTRATION ====================

export function registerAutoMarketingRoutes(app: Express) {
  // Apply authentication to all auto-marketing routes
  app.use('/api/auto-marketing', requireAuth);

  /**
   * GET /api/auto-marketing/templates
   * List available templates/tones
   */
  app.get('/api/auto-marketing/templates', apiLimiter, async (req: Request, res: Response) => {
    try {
      const templates = [
        {
          id: 'luxury',
          name: 'Luxo',
          description: 'Linguagem premium e exclusiva, ideal para imoveis de alto padrao',
          icon: 'gem',
        },
        {
          id: 'family',
          name: 'Familiar',
          description: 'Foco em conforto, seguranca e espaco, ideal para familias',
          icon: 'heart',
        },
        {
          id: 'investment',
          name: 'Investimento',
          description: 'Foco em ROI, valorizacao e localizacao estrategica',
          icon: 'trending-up',
        },
        {
          id: 'professional',
          name: 'Profissional',
          description: 'Tom neutro e informativo, adequado para qualquer tipo de imovel',
          icon: 'briefcase',
        },
      ];
      res.json(templates);
    } catch (error: any) {
      console.error('Error listing templates:', error);
      res.status(500).json({ error: 'Erro ao listar templates' });
    }
  });

  /**
   * POST /api/auto-marketing/generate/:propertyId
   * Generate all marketing content for a property
   */
  app.post('/api/auto-marketing/generate/:propertyId', generateLimiter, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { propertyId } = req.params;
      const { tone = 'professional' } = req.body as { tone?: Tone };

      // Validate tone
      const validTones: Tone[] = ['luxury', 'family', 'investment', 'professional'];
      if (!validTones.includes(tone)) {
        return res.status(400).json({ error: 'Tom invalido. Use: luxury, family, investment ou professional' });
      }

      // Get property data
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ error: 'Imovel nao encontrado' });
      }
      if (property.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Recurso nao encontrado' });
      }

      // Get tenant data for branding
      const tenant = await storage.getTenant(tenantId);
      const tenantName = tenant?.name || 'Imobiliaria';
      const tenantColor = tenant?.primaryColor || '#0066cc';

      // Generate all content
      const description = generateDescription(property as PropertyData, tone);
      const { post: socialMediaPost, hashtags } = generateSocialMediaPost(property as PropertyData, tone);
      const { subject: emailSubject, html: emailHtml } = generateEmailHtml(property as PropertyData, tone, tenantName, tenantColor);
      const micrositeContent = generateMicrositeContent(property as PropertyData, tone);

      // Check if content already exists for this property
      const existing = await storage.getAutoMarketingContent(propertyId);

      let content;
      if (existing) {
        // Update existing content
        content = await storage.updateAutoMarketingContent(existing.id, {
          description,
          descriptionTone: tone,
          socialMediaPost,
          socialMediaHashtags: JSON.stringify(hashtags),
          emailSubject,
          emailHtml,
          micrositeContent,
          generatedAt: new Date().toISOString(),
          status: 'draft',
        });
      } else {
        // Create new content
        content = await storage.createAutoMarketingContent({
          tenantId,
          propertyId,
          description,
          descriptionTone: tone,
          socialMediaPost,
          socialMediaHashtags: JSON.stringify(hashtags),
          emailSubject,
          emailHtml,
          micrositeContent,
          generatedAt: new Date().toISOString(),
          status: 'draft',
        });
      }

      res.json(content);
    } catch (error: any) {
      console.error('Error generating marketing content:', error);
      res.status(500).json({ error: 'Erro ao gerar conteudo de marketing' });
    }
  });

  /**
   * POST /api/auto-marketing/generate-description
   * Generate only description with tone parameter
   */
  app.post('/api/auto-marketing/generate-description', generateLimiter, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { propertyId, tone = 'professional' } = req.body as { propertyId: string; tone?: Tone };

      if (!propertyId) {
        return res.status(400).json({ error: 'propertyId e obrigatorio' });
      }

      const property = await storage.getProperty(propertyId);
      if (!property || property.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Imovel nao encontrado' });
      }

      const description = generateDescription(property as PropertyData, tone as Tone);
      res.json({ description, tone });
    } catch (error: any) {
      console.error('Error generating description:', error);
      res.status(500).json({ error: 'Erro ao gerar descricao' });
    }
  });

  /**
   * POST /api/auto-marketing/generate-social
   * Generate only social media post
   */
  app.post('/api/auto-marketing/generate-social', generateLimiter, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { propertyId, tone = 'professional' } = req.body as { propertyId: string; tone?: Tone };

      if (!propertyId) {
        return res.status(400).json({ error: 'propertyId e obrigatorio' });
      }

      const property = await storage.getProperty(propertyId);
      if (!property || property.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Imovel nao encontrado' });
      }

      const { post, hashtags } = generateSocialMediaPost(property as PropertyData, tone as Tone);
      res.json({ post, hashtags, tone });
    } catch (error: any) {
      console.error('Error generating social media post:', error);
      res.status(500).json({ error: 'Erro ao gerar post para redes sociais' });
    }
  });

  /**
   * GET /api/auto-marketing/all
   * Get all marketing content for tenant
   */
  app.get('/api/auto-marketing/all', apiLimiter, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const contents = await storage.getAutoMarketingContentsByTenant(tenantId);
      res.json(contents);
    } catch (error: any) {
      console.error('Error fetching marketing contents:', error);
      res.status(500).json({ error: 'Erro ao buscar conteudos de marketing' });
    }
  });

  /**
   * GET /api/auto-marketing/:propertyId
   * Get generated content for a specific property
   */
  app.get('/api/auto-marketing/:propertyId', apiLimiter, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { propertyId } = req.params;

      const content = await storage.getAutoMarketingContent(propertyId);
      if (!content) {
        return res.status(404).json({ error: 'Conteudo de marketing nao encontrado' });
      }
      if (content.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Recurso nao encontrado' });
      }

      res.json(content);
    } catch (error: any) {
      console.error('Error fetching marketing content:', error);
      res.status(500).json({ error: 'Erro ao buscar conteudo de marketing' });
    }
  });

  /**
   * PUT /api/auto-marketing/:id
   * Update/edit generated content
   */
  app.put('/api/auto-marketing/:id', apiLimiter, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { id } = req.params;
      const updates = req.body;

      // Verify ownership before updating
      const contents = await storage.getAutoMarketingContentsByTenant(tenantId);
      const existing = contents.find(c => c.id === id);
      if (!existing) {
        return res.status(404).json({ error: 'Conteudo nao encontrado' });
      }

      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.tenantId;
      delete updates.createdAt;

      const content = await storage.updateAutoMarketingContent(id, updates);
      res.json(content);
    } catch (error: any) {
      console.error('Error updating marketing content:', error);
      res.status(500).json({ error: 'Erro ao atualizar conteudo' });
    }
  });

  /**
   * POST /api/auto-marketing/:id/publish
   * Publish content (mark as published)
   */
  app.post('/api/auto-marketing/:id/publish', apiLimiter, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { id } = req.params;

      // Verify ownership before updating
      const contents = await storage.getAutoMarketingContentsByTenant(tenantId);
      const existing = contents.find(c => c.id === id);
      if (!existing) {
        return res.status(404).json({ error: 'Conteudo nao encontrado' });
      }

      const updated = await storage.updateAutoMarketingContent(id, {
        status: 'published',
        publishedAt: new Date().toISOString(),
      });

      res.json(updated);
    } catch (error: any) {
      console.error('Error publishing content:', error);
      res.status(500).json({ error: 'Erro ao publicar conteudo' });
    }
  });

  /**
   * POST /api/auto-marketing/:id/send-email
   * Send email to matching leads (placeholder - logs intent)
   */
  app.post('/api/auto-marketing/:id/send-email', generateLimiter, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { id } = req.params;
      const { leadIds } = req.body as { leadIds?: string[] };

      // Get the marketing content
      const contents = await storage.getAutoMarketingContentsByTenant(tenantId);
      const content = contents.find(c => c.id === id);

      if (!content) {
        return res.status(404).json({ error: 'Conteudo nao encontrado' });
      }

      if (!content.emailHtml || !content.emailSubject) {
        return res.status(400).json({ error: 'Conteudo de email nao gerado' });
      }

      // Get leads to send to
      let leads;
      if (leadIds && leadIds.length > 0) {
        const allLeads = await storage.getLeadsByTenant(tenantId);
        leads = allLeads.filter(l => leadIds.includes(l.id));
      } else {
        // Get all leads for the tenant
        leads = await storage.getLeadsByTenant(tenantId);
      }

      const leadsWithEmail = leads.filter(l => l.email);

      // In a real implementation, this would queue emails via the email service
      // For now, we return the count of leads that would receive the email
      res.json({
        success: true,
        message: `Email preparado para envio a ${leadsWithEmail.length} lead(s)`,
        recipientCount: leadsWithEmail.length,
        recipients: leadsWithEmail.map(l => ({ id: l.id, name: l.name, email: l.email })),
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Erro ao enviar email' });
    }
  });

  /**
   * DELETE /api/auto-marketing/:id
   * Delete generated content
   */
  app.delete('/api/auto-marketing/:id', apiLimiter, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { id } = req.params;

      // Verify ownership
      const contents = await storage.getAutoMarketingContentsByTenant(tenantId);
      const content = contents.find(c => c.id === id);

      if (!content) {
        return res.status(404).json({ error: 'Conteudo nao encontrado' });
      }

      await storage.deleteAutoMarketingContent(id);
      res.json({ success: true, message: 'Conteudo removido com sucesso' });
    } catch (error: any) {
      console.error('Error deleting marketing content:', error);
      res.status(500).json({ error: 'Erro ao remover conteudo' });
    }
  });
}
