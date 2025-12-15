import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { isSqlite } from "./db";
import { insertUserSchema, insertPropertySchema, insertLeadSchema, insertVisitSchema, insertContractSchema, insertNewsletterSchema, insertInteractionSchema, insertOwnerSchema, insertRenterSchema, insertRentalContractSchema, insertRentalPaymentSchema, insertSaleProposalSchema, insertPropertySaleSchema, insertFinanceCategorySchema, insertFinanceEntrySchema, insertLeadTagSchema, insertLeadTagLinkSchema, insertFollowUpSchema, insertRentalTransferSchema, insertCommissionSchema } from "@shared/schema-sqlite";
import type { User } from "@shared/schema-sqlite";
import connectPg from "connect-pg-simple";
import pkg from "pg";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
const { Pool } = pkg;

// ===== VALIDATION HELPERS =====
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

const sanitizePagination = (page: any, limit: any, maxLimit: number = 100): { page: number; limit: number } => {
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 50));
  return { page: parsedPage, limit: parsedLimit };
};

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePassword(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

declare global {
  namespace Express {
    interface User {
      id: string;
      tenantId: string;
      name: string;
      email: string;
      role: string;
      avatar: string | null;
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ===== SECURITY MIDDLEWARE =====
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Rate limiting - general API limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs
    message: { error: "Muitas requisições. Tente novamente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter rate limiting for auth routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 login attempts per windowMs
    message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter rate limiting for public routes (lead creation, newsletter)
  const publicLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // limit each IP to 30 public submissions per hour
    message: { error: "Muitas requisições. Tente novamente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general rate limiting to all API routes
  app.use('/api/', apiLimiter);

  // Session setup - uses MemoryStore in development (SQLite mode)
  // For production with PostgreSQL, configure connect-pg-simple
  let sessionStore: session.Store | undefined;

  if (!isSqlite && process.env.DATABASE_URL) {
    // Production: use PostgreSQL for sessions
    const PgSession = connectPg(session);
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    sessionStore = new PgSession({
      pool: pgPool,
      tableName: "session",
      createTableIfMissing: true,
    });
    console.log("Using PostgreSQL session store");
  } else {
    console.log("Using in-memory session store (development)");
  }

  // Detect if we're in a true production environment (HTTPS)
  const isProduction = process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV?.includes('preview');
  const isLocalDev = !isProduction || process.env.VERCEL_ENV === 'development';

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "imobibase-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        sameSite: isLocalDev ? "lax" : "none",
        secure: !isLocalDev,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePassword(password, user.password))) {
            return done(null, false, { message: "Email ou senha incorretos" });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, false);
      done(null, {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      });
    } catch (err) {
      done(err);
    }
  });

  // Auth middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    next();
  };

  // SuperAdmin middleware
  const requireSuperAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    if (req.user!.role !== "superadmin") {
      return res.status(403).json({ error: "Acesso negado. Apenas superadmins podem acessar esta rota." });
    }
    next();
  };

  // Permission middleware
  const requirePermission = (module: string, action: string) => {
    return async (req: Request, res: Response, next: Function) => {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      // Admin sempre tem todas as permissões
      if (req.user.role === 'admin') {
        return next();
      }

      try {
        // Busca o roleId do usuário (assumindo que será adicionado ao user)
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(403).json({ error: "Usuário não encontrado" });
        }

        // Se não tem roleId, usa role padrão (legado)
        if (!(user as any).roleId) {
          return next(); // Compatibilidade com sistema antigo
        }

        // Busca as permissões da role
        const role = await storage.getUserRole((user as any).roleId);
        if (!role) {
          return res.status(403).json({ error: "Role não encontrada" });
        }

        // Verifica permissão
        const permissions = role.permissions as any;
        if (!permissions || typeof permissions !== 'object') {
          return res.status(403).json({ error: "Permissões não configuradas" });
        }

        const modulePerms = permissions[module];
        if (!modulePerms || typeof modulePerms !== 'object') {
          return res.status(403).json({ error: `Sem acesso ao módulo ${module}` });
        }

        if (!modulePerms[action]) {
          return res.status(403).json({
            error: `Você não tem permissão para ${action} em ${module}`
          });
        }

        next();
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        return res.status(500).json({ error: "Erro ao verificar permissões" });
      }
    };
  };

  // ===== AUTH ROUTES =====
  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "Credenciais inválidas" });
      }
      req.login(user, async (err) => {
        if (err) return next(err);
        const tenant = await storage.getTenant(user.tenantId);
        return res.json({ 
          user: {
            id: user.id,
            tenantId: user.tenantId,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          },
          tenant 
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = req.user!;
    const tenant = await storage.getTenant(user.tenantId);
    res.json({ user, tenant });
  });

  // ===== TENANT ROUTES =====
  app.get("/api/tenants", requireAuth, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar empresas" });
    }
  });

  app.get("/api/tenants/:id", requireAuth, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) return res.status(404).json({ error: "Empresa não encontrada" });
      // Only allow access to own tenant data (unless superadmin)
      if (tenant.id !== req.user!.tenantId && req.user!.role !== 'superadmin') {
        return res.status(403).json({ error: "Acesso negado" });
      }
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar empresa" });
    }
  });

  app.get("/api/tenants/slug/:slug", async (req, res) => {
    try {
      const tenant = await storage.getTenantBySlug(req.params.slug);
      if (!tenant) return res.status(404).json({ error: "Empresa não encontrada" });
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar empresa" });
    }
  });

  // ===== USER ROUTES =====
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsersByTenant(req.user!.tenantId);
      res.json(users.map(u => ({
        id: u.id,
        tenantId: u.tenantId,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.avatar,
      })));
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  // ===== PROPERTY ROUTES =====
  app.get("/api/properties", requireAuth, async (req, res) => {
    try {
      const { type, category, status, featured } = req.query;
      const properties = await storage.getPropertiesByTenant(req.user!.tenantId, {
        type: type as string,
        category: category as string,
        status: status as string,
        featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      });
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar imóveis" });
    }
  });

  app.get("/api/properties/public/:tenantId", async (req, res) => {
    try {
      const properties = await storage.getPropertiesByTenant(req.params.tenantId, {
        status: "available",
      });
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar imóveis" });
    }
  });

  app.get("/api/properties/public/:tenantId/:propertyId", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.propertyId);
      if (!property) return res.status(404).json({ error: "Imóvel não encontrado" });
      if (property.tenantId !== req.params.tenantId) return res.status(404).json({ error: "Imóvel não encontrado" });
      if (property.status !== "available") return res.status(404).json({ error: "Imóvel não disponível" });
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar imóvel" });
    }
  });

  app.get("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) return res.status(404).json({ error: "Imóvel não encontrado" });
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar imóvel" });
    }
  });

  app.post("/api/properties", requireAuth, async (req, res) => {
    try {
      const data = insertPropertySchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const property = await storage.createProperty(data);
      res.status(201).json(property);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar imóvel" });
    }
  });

  app.patch("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      const property = await storage.updateProperty(req.params.id, req.body);
      if (!property) return res.status(404).json({ error: "Imóvel não encontrado" });
      res.json(property);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar imóvel" });
    }
  });

  app.delete("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteProperty(req.params.id);
      if (!success) return res.status(404).json({ error: "Imóvel não encontrado" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar imóvel" });
    }
  });

  // ===== LEAD ROUTES =====
  // Public route for lead creation from public portal
  app.post("/api/leads/public", publicLimiter, async (req, res) => {
    try {
      // Validate email format
      if (req.body.email && !isValidEmail(req.body.email)) {
        return res.status(400).json({ error: "Email inválido" });
      }
      // Validate phone format
      if (req.body.phone && !isValidPhone(req.body.phone)) {
        return res.status(400).json({ error: "Telefone inválido" });
      }
      const data = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(data);
      res.status(201).json({ success: true, lead });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar lead" });
    }
  });

  app.get("/api/leads", requireAuth, async (req, res) => {
    try {
      const leads = await storage.getLeadsByTenant(req.user!.tenantId);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar leads" });
    }
  });

  app.get("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead não encontrado" });
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar lead" });
    }
  });

  app.post("/api/leads", requireAuth, async (req, res) => {
    try {
      const data = insertLeadSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const lead = await storage.createLead(data);
      res.status(201).json(lead);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar lead" });
    }
  });

  app.patch("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const lead = await storage.updateLead(req.params.id, req.body);
      if (!lead) return res.status(404).json({ error: "Lead não encontrado" });
      res.json(lead);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar lead" });
    }
  });

  app.delete("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteLead(req.params.id);
      if (!success) return res.status(404).json({ error: "Lead não encontrado" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar lead" });
    }
  });

  // ===== LEAD MATCHED PROPERTIES =====
  app.get("/api/leads/:leadId/matched-properties", requireAuth, async (req, res) => {
    try {
      const matchedProperties = await storage.getMatchedProperties(req.params.leadId, req.user!.tenantId);
      res.json(matchedProperties);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar imóveis recomendados" });
    }
  });

  // ===== INTERACTION ROUTES =====
  app.get("/api/leads/:leadId/interactions", requireAuth, async (req, res) => {
    try {
      const interactions = await storage.getInteractionsByLead(req.params.leadId);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar interações" });
    }
  });

  app.post("/api/interactions", requireAuth, async (req, res) => {
    try {
      const data = insertInteractionSchema.parse({ ...req.body, userId: req.user!.id });
      const interaction = await storage.createInteraction(data);
      res.status(201).json(interaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar interação" });
    }
  });

  // ===== VISIT ROUTES =====
  app.get("/api/visits", requireAuth, async (req, res) => {
    try {
      const visits = await storage.getVisitsByTenant(req.user!.tenantId);
      res.json(visits);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar visitas" });
    }
  });

  app.post("/api/visits", requireAuth, async (req, res) => {
    try {
      const data = insertVisitSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const visit = await storage.createVisit(data);
      res.status(201).json(visit);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar visita" });
    }
  });

  app.patch("/api/visits/:id", requireAuth, async (req, res) => {
    try {
      const visit = await storage.updateVisit(req.params.id, req.body);
      if (!visit) return res.status(404).json({ error: "Visita não encontrada" });
      res.json(visit);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar visita" });
    }
  });

  app.delete("/api/visits/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteVisit(req.params.id);
      if (!success) return res.status(404).json({ error: "Visita não encontrada" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar visita" });
    }
  });

  // ===== CONTRACT ROUTES =====
  app.get("/api/contracts", requireAuth, async (req, res) => {
    try {
      const contracts = await storage.getContractsByTenant(req.user!.tenantId);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar contratos" });
    }
  });

  app.get("/api/contracts/:id", requireAuth, async (req, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) return res.status(404).json({ error: "Contrato não encontrado" });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar contrato" });
    }
  });

  app.post("/api/contracts", requireAuth, async (req, res) => {
    try {
      const data = insertContractSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const contract = await storage.createContract(data);
      res.status(201).json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar contrato" });
    }
  });

  app.patch("/api/contracts/:id", requireAuth, async (req, res) => {
    try {
      const contract = await storage.updateContract(req.params.id, req.body);
      if (!contract) return res.status(404).json({ error: "Contrato não encontrado" });
      res.json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar contrato" });
    }
  });

  // ===== NEWSLETTER ROUTES =====
  app.post("/api/newsletter/subscribe", publicLimiter, async (req, res) => {
    try {
      // Validate email format
      if (!req.body.email || !isValidEmail(req.body.email)) {
        return res.status(400).json({ error: "Email inválido" });
      }
      const data = insertNewsletterSchema.parse(req.body);
      const subscription = await storage.subscribeNewsletter(data);
      res.status(201).json(subscription);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao inscrever newsletter" });
    }
  });

  // ===== DASHBOARD STATS =====
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user!.tenantId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // ===== GLOBAL SEARCH =====
  app.get("/api/search", requireAuth, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json({ properties: [], leads: [], contracts: [] });
      }
      const results = await storage.globalSearch(req.user!.tenantId, query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar" });
    }
  });

  // ===== OWNER ROUTES (Locadores) =====
  app.get("/api/owners", requireAuth, async (req, res) => {
    try {
      const owners = await storage.getOwnersByTenant(req.user!.tenantId);
      res.json(owners);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar locadores" });
    }
  });

  app.get("/api/owners/:id", requireAuth, async (req, res) => {
    try {
      const owner = await storage.getOwner(req.params.id);
      if (!owner) return res.status(404).json({ error: "Locador não encontrado" });
      res.json(owner);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar locador" });
    }
  });

  app.post("/api/owners", requireAuth, async (req, res) => {
    try {
      const data = insertOwnerSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const owner = await storage.createOwner(data);
      res.status(201).json(owner);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar locador" });
    }
  });

  app.patch("/api/owners/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getOwner(req.params.id);
      if (!existing) return res.status(404).json({ error: "Locador não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const owner = await storage.updateOwner(req.params.id, allowedFields);
      res.json(owner);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar locador" });
    }
  });

  app.delete("/api/owners/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getOwner(req.params.id);
      if (!existing) return res.status(404).json({ error: "Locador não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const success = await storage.deleteOwner(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar locador" });
    }
  });

  // ===== RENTER ROUTES (Inquilinos) =====
  app.get("/api/renters", requireAuth, async (req, res) => {
    try {
      const renters = await storage.getRentersByTenant(req.user!.tenantId);
      res.json(renters);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar inquilinos" });
    }
  });

  app.get("/api/renters/:id", requireAuth, async (req, res) => {
    try {
      const renter = await storage.getRenter(req.params.id);
      if (!renter) return res.status(404).json({ error: "Inquilino não encontrado" });
      res.json(renter);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar inquilino" });
    }
  });

  app.post("/api/renters", requireAuth, async (req, res) => {
    try {
      const data = insertRenterSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const renter = await storage.createRenter(data);
      res.status(201).json(renter);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar inquilino" });
    }
  });

  app.patch("/api/renters/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getRenter(req.params.id);
      if (!existing) return res.status(404).json({ error: "Inquilino não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const renter = await storage.updateRenter(req.params.id, allowedFields);
      res.json(renter);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar inquilino" });
    }
  });

  app.delete("/api/renters/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getRenter(req.params.id);
      if (!existing) return res.status(404).json({ error: "Inquilino não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const success = await storage.deleteRenter(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar inquilino" });
    }
  });

  // ===== RENTAL CONTRACT ROUTES (Contratos de Aluguel) =====
  app.get("/api/rental-contracts", requireAuth, async (req, res) => {
    try {
      const contracts = await storage.getRentalContractsByTenant(req.user!.tenantId);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar contratos de aluguel" });
    }
  });

  app.get("/api/rental-contracts/:id", requireAuth, async (req, res) => {
    try {
      const contract = await storage.getRentalContract(req.params.id);
      if (!contract) return res.status(404).json({ error: "Contrato de aluguel não encontrado" });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar contrato de aluguel" });
    }
  });

  app.post("/api/rental-contracts", requireAuth, async (req, res) => {
    try {
      const data = insertRentalContractSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const contract = await storage.createRentalContract(data);
      res.status(201).json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar contrato de aluguel" });
    }
  });

  app.patch("/api/rental-contracts/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getRentalContract(req.params.id);
      if (!existing) return res.status(404).json({ error: "Contrato de aluguel não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const contract = await storage.updateRentalContract(req.params.id, allowedFields);
      res.json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar contrato de aluguel" });
    }
  });

  // ===== RENTAL PAYMENT ROUTES (Pagamentos de Aluguel) =====
  app.get("/api/rental-payments", requireAuth, async (req, res) => {
    try {
      const { status, month } = req.query;
      const payments = await storage.getRentalPaymentsByTenant(req.user!.tenantId, {
        status: status as string,
        month: month as string,
      });
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar pagamentos" });
    }
  });

  app.get("/api/rental-payments/contract/:contractId", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getRentalPaymentsByContract(req.params.contractId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar pagamentos do contrato" });
    }
  });

  app.get("/api/rental-payments/:id", requireAuth, async (req, res) => {
    try {
      const payment = await storage.getRentalPayment(req.params.id);
      if (!payment) return res.status(404).json({ error: "Pagamento não encontrado" });
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar pagamento" });
    }
  });

  app.post("/api/rental-payments", requireAuth, async (req, res) => {
    try {
      const data = insertRentalPaymentSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const payment = await storage.createRentalPayment(data);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar pagamento" });
    }
  });

  app.patch("/api/rental-payments/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getRentalPayment(req.params.id);
      if (!existing) return res.status(404).json({ error: "Pagamento não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const payment = await storage.updateRentalPayment(req.params.id, allowedFields);
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar pagamento" });
    }
  });

  // ===== RENTAL REPORTS =====
  app.get("/api/reports/rentals", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Validate dates if provided
      if (startDate && !isValidDate(startDate as string)) {
        return res.status(400).json({ error: "Data de início inválida" });
      }
      if (endDate && !isValidDate(endDate as string)) {
        return res.status(400).json({ error: "Data de fim inválida" });
      }

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Validate date range
      if (start > end) {
        return res.status(400).json({ error: "Data de início deve ser anterior à data de fim" });
      }

      const reportData = await storage.getRentalReportData(req.user!.tenantId, start, end);
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório" });
    }
  });

  app.get("/api/reports/owners", requireAuth, async (req, res) => {
    try {
      const { ownerId, startDate, endDate } = req.query;
      const filters = {
        ownerId: ownerId as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };
      const report = await storage.getOwnerReport(req.user!.tenantId, filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório de locadores" });
    }
  });

  app.get("/api/reports/renters", requireAuth, async (req, res) => {
    try {
      const { renterId, startDate, endDate } = req.query;
      const filters = {
        renterId: renterId as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };
      const report = await storage.getRenterReport(req.user!.tenantId, filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório de inquilinos" });
    }
  });

  app.get("/api/reports/payments-detailed", requireAuth, async (req, res) => {
    try {
      const { ownerId, renterId, status, startDate, endDate } = req.query;
      const filters = {
        ownerId: ownerId as string | undefined,
        renterId: renterId as string | undefined,
        status: status as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };
      const report = await storage.getPaymentDetailedReport(req.user!.tenantId, filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório de pagamentos" });
    }
  });

  app.get("/api/reports/overdue", requireAuth, async (req, res) => {
    try {
      const report = await storage.getOverdueReport(req.user!.tenantId);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório de inadimplência" });
    }
  });

  // ===== RENTAL TRANSFERS (REPASSES) ROUTES =====
  app.get("/api/rental-transfers", requireAuth, async (req, res) => {
    try {
      const { ownerId, status, referenceMonth } = req.query;
      const filters = {
        ownerId: ownerId as string | undefined,
        status: status as string | undefined,
        referenceMonth: referenceMonth as string | undefined,
      };
      const transfers = await storage.getRentalTransfersByTenant(req.user!.tenantId, filters);
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar repasses" });
    }
  });

  app.get("/api/rental-transfers/:id", requireAuth, async (req, res) => {
    try {
      const transfer = await storage.getRentalTransfer(req.params.id);
      if (!transfer) return res.status(404).json({ error: "Repasse não encontrado" });
      if (transfer.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      res.json(transfer);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar repasse" });
    }
  });

  app.post("/api/rental-transfers", requireAuth, async (req, res) => {
    try {
      // Validate using schema
      const data = insertRentalTransferSchema.parse({ ...req.body, tenantId: req.user!.tenantId });

      // Validate positive amounts
      if (parseFloat(data.grossAmount) <= 0) {
        return res.status(400).json({ error: "Valor bruto deve ser positivo" });
      }
      if (parseFloat(data.netAmount) < 0) {
        return res.status(400).json({ error: "Valor líquido não pode ser negativo" });
      }

      const transfer = await storage.createRentalTransfer(data);
      res.status(201).json(transfer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar repasse" });
    }
  });

  app.patch("/api/rental-transfers/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getRentalTransfer(req.params.id);
      if (!existing) return res.status(404).json({ error: "Repasse não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const transfer = await storage.updateRentalTransfer(req.params.id, allowedFields);
      res.json(transfer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar repasse" });
    }
  });

  app.delete("/api/rental-transfers/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getRentalTransfer(req.params.id);
      if (!existing) return res.status(404).json({ error: "Repasse não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteRentalTransfer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar repasse" });
    }
  });

  app.post("/api/rental-transfers/generate", requireAuth, async (req, res) => {
    try {
      const { referenceMonth } = req.body;
      if (!referenceMonth) return res.status(400).json({ error: "Mês de referência é obrigatório" });
      const transfers = await storage.generateTransfersForMonth(req.user!.tenantId, referenceMonth);
      res.status(201).json(transfers);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao gerar repasses" });
    }
  });

  // ===== RENTAL METRICS AND ALERTS =====
  app.get("/api/rentals/metrics", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getRentalMetrics(req.user!.tenantId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar métricas de aluguéis" });
    }
  });

  app.get("/api/rentals/metrics/chart", requireAuth, async (req, res) => {
    try {
      const { period } = req.query;
      const validPeriod = (period === 'currentMonth' || period === 'lastMonth' || period === 'year') ? period : 'currentMonth';
      const chartData = await storage.getRentalMetricsChart(req.user!.tenantId, validPeriod);
      res.json(chartData);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar dados do gráfico" });
    }
  });

  app.get("/api/rentals/alerts", requireAuth, async (req, res) => {
    try {
      const alerts = await storage.getRentalAlerts(req.user!.tenantId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar alertas de aluguéis" });
    }
  });

  // ===== OWNER STATEMENT AND RENTER PAYMENT HISTORY =====
  app.get("/api/owners/:id/statement", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const statement = await storage.getOwnerStatement(req.params.id, req.user!.tenantId, start, end);
      if (!statement) return res.status(404).json({ error: "Locador não encontrado" });
      res.json(statement);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar extrato do locador" });
    }
  });

  app.get("/api/renters/:id/payment-history", requireAuth, async (req, res) => {
    try {
      const history = await storage.getRenterPaymentHistory(req.params.id, req.user!.tenantId);
      if (!history) return res.status(404).json({ error: "Inquilino não encontrado" });
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar histórico de pagamentos" });
    }
  });

  // ===== SALE PROPOSALS ROUTES =====
  app.get("/api/sale-proposals", requireAuth, async (req, res) => {
    try {
      const proposals = await storage.getSaleProposalsByTenant(req.user!.tenantId);
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar propostas de venda" });
    }
  });

  app.get("/api/sale-proposals/:id", requireAuth, async (req, res) => {
    try {
      const proposal = await storage.getSaleProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: "Proposta não encontrada" });
      res.json(proposal);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar proposta" });
    }
  });

  app.post("/api/sale-proposals", requireAuth, async (req, res) => {
    try {
      const data = insertSaleProposalSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const proposal = await storage.createSaleProposal(data);
      res.status(201).json(proposal);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar proposta" });
    }
  });

  app.patch("/api/sale-proposals/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getSaleProposal(req.params.id);
      if (!existing) return res.status(404).json({ error: "Proposta não encontrada" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const proposal = await storage.updateSaleProposal(req.params.id, allowedFields);
      res.json(proposal);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar proposta" });
    }
  });

  app.delete("/api/sale-proposals/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getSaleProposal(req.params.id);
      if (!existing) return res.status(404).json({ error: "Proposta não encontrada" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteSaleProposal(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar proposta" });
    }
  });

  // ===== PROPERTY SALES ROUTES =====
  app.get("/api/property-sales", requireAuth, async (req, res) => {
    try {
      const sales = await storage.getPropertySalesByTenant(req.user!.tenantId);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar vendas" });
    }
  });

  app.get("/api/property-sales/:id", requireAuth, async (req, res) => {
    try {
      const sale = await storage.getPropertySale(req.params.id);
      if (!sale) return res.status(404).json({ error: "Venda não encontrada" });
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar venda" });
    }
  });

  app.post("/api/property-sales", requireAuth, async (req, res) => {
    try {
      const data = insertPropertySaleSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const sale = await storage.createPropertySale(data);
      res.status(201).json(sale);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao registrar venda" });
    }
  });

  app.patch("/api/property-sales/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getPropertySale(req.params.id);
      if (!existing) return res.status(404).json({ error: "Venda não encontrada" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const sale = await storage.updatePropertySale(req.params.id, allowedFields);
      res.json(sale);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar venda" });
    }
  });

  // ===== FINANCE CATEGORIES ROUTES =====
  app.get("/api/finance-categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getFinanceCategoriesByTenant(req.user!.tenantId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar categorias" });
    }
  });

  app.post("/api/finance-categories", requireAuth, async (req, res) => {
    try {
      const data = insertFinanceCategorySchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const category = await storage.createFinanceCategory(data);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar categoria" });
    }
  });

  app.patch("/api/finance-categories/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getFinanceCategory(req.params.id);
      if (!existing) return res.status(404).json({ error: "Categoria não encontrada" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const category = await storage.updateFinanceCategory(req.params.id, allowedFields);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar categoria" });
    }
  });

  app.delete("/api/finance-categories/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getFinanceCategory(req.params.id);
      if (!existing) return res.status(404).json({ error: "Categoria não encontrada" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteFinanceCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar categoria" });
    }
  });

  // ===== FINANCE ENTRIES ROUTES =====
  app.get("/api/finance-entries", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, flow, categoryId } = req.query;
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        flow: flow as string | undefined,
        categoryId: categoryId as string | undefined,
      };
      const entries = await storage.getFinanceEntriesByTenant(req.user!.tenantId, filters);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar lançamentos" });
    }
  });

  app.get("/api/finance-entries/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.getFinanceEntry(req.params.id);
      if (!entry) return res.status(404).json({ error: "Lançamento não encontrado" });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar lançamento" });
    }
  });

  app.post("/api/finance-entries", requireAuth, async (req, res) => {
    try {
      const data = insertFinanceEntrySchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const entry = await storage.createFinanceEntry(data);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar lançamento" });
    }
  });

  app.patch("/api/finance-entries/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getFinanceEntry(req.params.id);
      if (!existing) return res.status(404).json({ error: "Lançamento não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const entry = await storage.updateFinanceEntry(req.params.id, allowedFields);
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar lançamento" });
    }
  });

  app.delete("/api/finance-entries/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getFinanceEntry(req.params.id);
      if (!existing) return res.status(404).json({ error: "Lançamento não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteFinanceEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar lançamento" });
    }
  });

  // ===== LEAD TAGS ROUTES =====
  app.get("/api/lead-tags", requireAuth, async (req, res) => {
    try {
      const tags = await storage.getLeadTagsByTenant(req.user!.tenantId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tags" });
    }
  });

  app.post("/api/lead-tags", requireAuth, async (req, res) => {
    try {
      const data = insertLeadTagSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const tag = await storage.createLeadTag(data);
      res.status(201).json(tag);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar tag" });
    }
  });

  app.patch("/api/lead-tags/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getLeadTag(req.params.id);
      if (!existing) return res.status(404).json({ error: "Tag não encontrada" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const tag = await storage.updateLeadTag(req.params.id, allowedFields);
      res.json(tag);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar tag" });
    }
  });

  app.delete("/api/lead-tags/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getLeadTag(req.params.id);
      if (!existing) return res.status(404).json({ error: "Tag não encontrada" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteLeadTag(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar tag" });
    }
  });

  // ===== LEAD TAG LINKS ROUTES =====
  app.get("/api/leads/tags/batch", requireAuth, async (req, res) => {
    try {
      const tagsMap = await storage.getTagsForAllLeads(req.user!.tenantId);
      res.json(tagsMap);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tags dos leads" });
    }
  });

  app.get("/api/leads/:leadId/tags", requireAuth, async (req, res) => {
    try {
      const tags = await storage.getTagsByLead(req.params.leadId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tags do lead" });
    }
  });

  app.post("/api/leads/:leadId/tags", requireAuth, async (req, res) => {
    try {
      const data = insertLeadTagLinkSchema.parse({ leadId: req.params.leadId, tagId: req.body.tagId });
      const link = await storage.addTagToLead(data);
      res.status(201).json(link);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao adicionar tag" });
    }
  });

  app.delete("/api/leads/:leadId/tags/:tagId", requireAuth, async (req, res) => {
    try {
      await storage.removeTagFromLead(req.params.leadId, req.params.tagId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao remover tag" });
    }
  });

  // ===== FINANCIAL MODULE ROUTES =====
  app.get("/api/financial/metrics", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, previousPeriodStart, previousPeriodEnd } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const prevStart = previousPeriodStart ? new Date(previousPeriodStart as string) : undefined;
      const prevEnd = previousPeriodEnd ? new Date(previousPeriodEnd as string) : undefined;

      const metrics = await storage.getFinancialMetrics(req.user!.tenantId, start, end, prevStart, prevEnd);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar métricas financeiras" });
    }
  });

  app.get("/api/financial/transactions", requireAuth, async (req, res) => {
    try {
      const { type, category, status, origin, startDate, endDate } = req.query;
      const filters = {
        type: type as string | undefined,
        category: category as string | undefined,
        status: status as string | undefined,
        origin: origin as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };
      const transactions = await storage.getFinancialTransactions(req.user!.tenantId, filters);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar transações financeiras" });
    }
  });

  app.get("/api/financial/charts", requireAuth, async (req, res) => {
    try {
      const { period } = req.query;
      const validPeriod = (period === 'month' || period === 'quarter' || period === 'year') ? period : 'month';
      const chartData = await storage.getFinancialChartData(req.user!.tenantId, validPeriod);
      res.json(chartData);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar dados do gráfico financeiro" });
    }
  });

  // ===== FOLLOW-UPS ROUTES =====
  app.get("/api/follow-ups", requireAuth, async (req, res) => {
    try {
      const { status } = req.query;
      const filters = { status: status as string | undefined };
      const followUps = await storage.getFollowUpsByTenant(req.user!.tenantId, filters);
      res.json(followUps);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar follow-ups" });
    }
  });

  app.get("/api/leads/:leadId/follow-ups", requireAuth, async (req, res) => {
    try {
      const followUps = await storage.getFollowUpsByLead(req.params.leadId);
      res.json(followUps);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar follow-ups do lead" });
    }
  });

  app.get("/api/follow-ups/:id", requireAuth, async (req, res) => {
    try {
      const followUp = await storage.getFollowUp(req.params.id);
      if (!followUp) return res.status(404).json({ error: "Follow-up não encontrado" });
      res.json(followUp);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar follow-up" });
    }
  });

  app.post("/api/follow-ups", requireAuth, async (req, res) => {
    try {
      const data = insertFollowUpSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const followUp = await storage.createFollowUp(data);
      res.status(201).json(followUp);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar follow-up" });
    }
  });

  app.patch("/api/follow-ups/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getFollowUp(req.params.id);
      if (!existing) return res.status(404).json({ error: "Follow-up não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const followUp = await storage.updateFollowUp(req.params.id, allowedFields);
      res.json(followUp);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar follow-up" });
    }
  });

  app.delete("/api/follow-ups/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getFollowUp(req.params.id);
      if (!existing) return res.status(404).json({ error: "Follow-up não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteFollowUp(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar follow-up" });
    }
  });

  // ===== COMPREHENSIVE REPORTS ROUTES =====

  // Sales Report
  app.get("/api/reports/sales", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, brokerId } = req.query;
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        brokerId: brokerId as string | undefined,
      };
      const report = await storage.getSalesReport(req.user!.tenantId, filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório de vendas" });
    }
  });

  // Leads Funnel Report
  app.get("/api/reports/leads-funnel", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };
      const report = await storage.getLeadsFunnelReport(req.user!.tenantId, filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório de funil de leads" });
    }
  });

  // Broker Performance Report
  app.get("/api/reports/broker-performance", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };
      const report = await storage.getBrokerPerformanceReport(req.user!.tenantId, filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório de performance de corretores" });
    }
  });

  // Properties Report (Giro de Estoque)
  app.get("/api/reports/properties", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };
      const report = await storage.getPropertiesReport(req.user!.tenantId, filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório de imóveis" });
    }
  });

  // Financial Summary Report (DRE)
  app.get("/api/reports/financial-summary", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };
      const report = await storage.getFinancialSummaryReport(req.user!.tenantId, filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório financeiro" });
    }
  });

  // ===== TENANT SETTINGS ROUTES =====
  app.get("/api/settings/general", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getTenantSettings(req.user!.tenantId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar configurações" });
    }
  });

  app.put("/api/settings/general", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem alterar configurações." });
      }
      const settings = await storage.createOrUpdateTenantSettings(req.user!.tenantId, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar configurações" });
    }
  });

  // ===== BRAND SETTINGS ROUTES =====
  app.get("/api/settings/brand", requireAuth, async (req, res) => {
    try {
      const brandSettings = await storage.getBrandSettings(req.user!.tenantId);
      res.json(brandSettings || {});
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar configurações de marca" });
    }
  });

  app.put("/api/settings/brand", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem alterar configurações." });
      }
      const brandSettings = await storage.createOrUpdateBrandSettings(req.user!.tenantId, req.body);
      res.json(brandSettings);
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar configurações de marca" });
    }
  });

  // ===== AI SETTINGS ROUTES =====
  app.get("/api/settings/ai", requireAuth, async (req, res) => {
    try {
      const aiSettings = await storage.getAISettings(req.user!.tenantId);
      res.json(aiSettings || {});
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar configurações de IA" });
    }
  });

  app.put("/api/settings/ai", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem alterar configurações." });
      }
      const aiSettings = await storage.createOrUpdateAISettings(req.user!.tenantId, req.body);
      res.json(aiSettings);
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar configurações de IA" });
    }
  });

  // ===== USER ROLES ROUTES =====
  app.get("/api/user-roles", requireAuth, async (req, res) => {
    try {
      const roles = await storage.getUserRolesByTenant(req.user!.tenantId);
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar funções de usuário" });
    }
  });

  app.get("/api/user-roles/:id", requireAuth, async (req, res) => {
    try {
      const role = await storage.getUserRole(req.params.id);
      if (!role) return res.status(404).json({ error: "Função não encontrada" });
      if (role.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar função" });
    }
  });

  app.post("/api/user-roles", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem criar funções." });
      }
      const role = await storage.createUserRole({ ...req.body, tenantId: req.user!.tenantId });
      res.status(201).json(role);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar função" });
    }
  });

  app.patch("/api/user-roles/:id", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem atualizar funções." });
      }
      const existing = await storage.getUserRole(req.params.id);
      if (!existing) return res.status(404).json({ error: "Função não encontrada" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, ...allowedFields } = req.body;
      const role = await storage.updateUserRole(req.params.id, allowedFields);
      res.json(role);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar função" });
    }
  });

  app.delete("/api/user-roles/:id", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem deletar funções." });
      }
      const existing = await storage.getUserRole(req.params.id);
      if (!existing) return res.status(404).json({ error: "Função não encontrada" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteUserRole(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar função" });
    }
  });

  app.post("/api/user-roles/seed-defaults", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem criar roles padrão." });
      }
      const roles = await storage.seedDefaultRoles(req.user!.tenantId);
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar roles padrão" });
    }
  });

  // ===== INTEGRATION CONFIGS ROUTES =====
  app.get("/api/integrations", requireAuth, async (req, res) => {
    try {
      const integrations = await storage.getIntegrationsByTenant(req.user!.tenantId);
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar integrações" });
    }
  });

  app.get("/api/integrations/:name", requireAuth, async (req, res) => {
    try {
      const integration = await storage.getIntegrationByName(req.user!.tenantId, req.params.name);
      res.json(integration || null);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar integração" });
    }
  });

  app.put("/api/integrations/:name", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem configurar integrações." });
      }
      const integration = await storage.createOrUpdateIntegration(req.user!.tenantId, req.params.name, req.body);
      res.json(integration);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao salvar integração" });
    }
  });

  // ===== NOTIFICATION PREFERENCES ROUTES =====
  app.get("/api/notification-preferences", requireAuth, async (req, res) => {
    try {
      const preferences = await storage.getNotificationPreferencesByTenant(req.user!.tenantId);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar preferências de notificação" });
    }
  });

  app.put("/api/notification-preferences/:eventType", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem alterar preferências." });
      }
      const preference = await storage.createOrUpdateNotificationPreference(
        req.user!.tenantId,
        req.params.eventType,
        req.body
      );
      res.json(preference);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao salvar preferência" });
    }
  });

  // ===== SAVED REPORTS ROUTES =====
  app.get("/api/saved-reports", requireAuth, async (req, res) => {
    try {
      const reports = await storage.getSavedReportsByTenant(req.user!.tenantId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar relatórios salvos" });
    }
  });

  app.post("/api/saved-reports", requireAuth, async (req, res) => {
    try {
      const report = await storage.createSavedReport({
        ...req.body,
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
      });
      res.status(201).json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar relatório" });
    }
  });

  app.patch("/api/saved-reports/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getSavedReport(req.params.id);
      if (!existing) return res.status(404).json({ error: "Relatório não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const { tenantId, id, userId, ...allowedFields } = req.body;
      const report = await storage.updateSavedReport(req.params.id, allowedFields);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar relatório" });
    }
  });

  app.delete("/api/saved-reports/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getSavedReport(req.params.id);
      if (!existing) return res.status(404).json({ error: "Relatório não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteSavedReport(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar relatório" });
    }
  });

  app.post("/api/saved-reports/:id/toggle-favorite", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getSavedReport(req.params.id);
      if (!existing) return res.status(404).json({ error: "Relatório não encontrado" });
      if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
      const report = await storage.toggleReportFavorite(req.params.id);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao favoritar relatório" });
    }
  });

  // ===== SEED DEFAULT CATEGORIES =====
  app.post("/api/finance-categories/seed-defaults", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem criar categorias padrão." });
      }
      const categories = await storage.seedDefaultCategories(req.user!.tenantId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar categorias padrão" });
    }
  });

  // ===== ADMIN GLOBAL ROUTES =====

  // Admin Stats
  app.get("/api/admin/stats", requireSuperAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // Admin Tenants
  app.get("/api/admin/tenants", requireSuperAdmin, async (req, res) => {
    try {
      const tenants = await storage.getAllTenantsWithStats();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tenants" });
    }
  });

  app.post("/api/admin/tenants", requireSuperAdmin, async (req, res) => {
    try {
      const tenant = await storage.createTenantWithSubscription(req.body);
      res.status(201).json(tenant);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar tenant" });
    }
  });

  app.patch("/api/admin/tenants/:id", requireSuperAdmin, async (req, res) => {
    try {
      const tenant = await storage.updateTenantAdmin(req.params.id, req.body);
      if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });
      res.json(tenant);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar tenant" });
    }
  });

  app.delete("/api/admin/tenants/:id", requireSuperAdmin, async (req, res) => {
    try {
      const success = await storage.deleteTenantAdmin(req.params.id);
      if (!success) return res.status(404).json({ error: "Tenant não encontrado" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar tenant" });
    }
  });

  // Admin Plans
  app.get("/api/admin/plans", requireSuperAdmin, async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar planos" });
    }
  });

  app.patch("/api/admin/plans/:id", requireSuperAdmin, async (req, res) => {
    try {
      const plan = await storage.updatePlan(req.params.id, req.body);
      if (!plan) return res.status(404).json({ error: "Plano não encontrado" });
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar plano" });
    }
  });

  // Admin Logs
  app.get("/api/admin/logs", requireSuperAdmin, async (req, res) => {
    try {
      const { action, startDate } = req.query;
      // Sanitize pagination with max limit of 100
      const { page, limit } = sanitizePagination(req.query.page, req.query.limit, 100);

      // Validate date if provided
      if (startDate && !isValidDate(startDate as string)) {
        return res.status(400).json({ error: "Data inválida" });
      }

      const filters = {
        action: action as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
      };
      const logs = await storage.getUsageLogs(page, limit, filters);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar logs" });
    }
  });

  // ============== COMMISSIONS ROUTES ==============

  // GET /api/commissions - Get all commissions with filters
  app.get("/api/commissions", requireAuth, async (req, res) => {
    try {
      const { period, status, type, brokerId } = req.query;

      const filters = {
        period: period as string | undefined,
        status: status as 'pending' | 'approved' | 'paid' | undefined,
        type: type as 'sale' | 'rental' | undefined,
        brokerId: brokerId as string | undefined,
      };

      // Validate brokerId belongs to tenant if provided
      if (filters.brokerId) {
        const broker = await storage.getUser(filters.brokerId);
        if (!broker || broker.tenantId !== req.user!.tenantId) {
          return res.status(403).json({ error: "Corretor não encontrado" });
        }
      }

      const commissions = await storage.getCommissionsByTenant(req.user!.tenantId, filters);
      const brokerPerformance = await storage.getBrokerPerformance(req.user!.tenantId, filters);

      res.json({
        commissions,
        brokerPerformance,
      });
    } catch (error) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ error: "Erro ao buscar comissões" });
    }
  });

  // GET /api/commissions/:id - Get specific commission
  app.get("/api/commissions/:id", requireAuth, async (req, res) => {
    try {
      const commission = await storage.getCommission(req.params.id);
      if (!commission) {
        return res.status(404).json({ error: "Comissão não encontrada" });
      }
      if (commission.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      res.json(commission);
    } catch (error) {
      console.error("Error fetching commission:", error);
      res.status(500).json({ error: "Erro ao buscar comissão" });
    }
  });

  // PATCH /api/commissions/:id/status - Update commission status
  app.patch("/api/commissions/:id/status", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;

      if (!['pending', 'approved', 'paid'].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const existing = await storage.getCommission(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Comissão não encontrada" });
      }
      if (existing.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const updateData: any = { status };
      if (status === 'approved') {
        updateData.approvedAt = new Date().toISOString();
      } else if (status === 'paid') {
        updateData.paidAt = new Date().toISOString();
      }

      const commission = await storage.updateCommission(req.params.id, updateData);
      res.json(commission);
    } catch (error) {
      console.error("Error updating commission status:", error);
      res.status(500).json({ error: "Erro ao atualizar status da comissão" });
    }
  });

  // POST /api/commissions - Create new commission
  app.post("/api/commissions", requireAuth, async (req, res) => {
    try {
      // Validate using schema
      const data = insertCommissionSchema.parse({ ...req.body, tenantId: req.user!.tenantId });

      // Validate broker belongs to tenant
      const broker = await storage.getUser(data.brokerId);
      if (!broker || broker.tenantId !== req.user!.tenantId) {
        return res.status(400).json({ error: "Corretor inválido" });
      }

      // Validate transaction reference exists
      if (data.transactionType === 'sale' && data.saleId) {
        const sale = await storage.getPropertySale(data.saleId);
        if (!sale || sale.tenantId !== req.user!.tenantId) {
          return res.status(400).json({ error: "Venda não encontrada" });
        }
      } else if (data.transactionType === 'rental' && data.rentalContractId) {
        const contract = await storage.getRentalContract(data.rentalContractId);
        if (!contract || contract.tenantId !== req.user!.tenantId) {
          return res.status(400).json({ error: "Contrato não encontrado" });
        }
      }

      const commission = await storage.createCommission(data);
      res.status(201).json(commission);
    } catch (error: any) {
      console.error("Error creating commission:", error);
      res.status(400).json({ error: error.message || "Erro ao criar comissão" });
    }
  });

  // DELETE /api/commissions/:id - Delete commission
  app.delete("/api/commissions/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getCommission(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Comissão não encontrada" });
      }
      if (existing.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      // Only allow deletion of pending commissions
      if (existing.status !== 'pending') {
        return res.status(400).json({ error: "Apenas comissões pendentes podem ser excluídas" });
      }

      await storage.deleteCommission(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting commission:", error);
      res.status(500).json({ error: "Erro ao excluir comissão" });
    }
  });

  return httpServer;
}
