import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { insertUserSchema, insertPropertySchema, insertLeadSchema, insertVisitSchema, insertContractSchema, insertNewsletterSchema, insertInteractionSchema } from "@shared/schema";
import type { User } from "@shared/schema";

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
  
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "imobibase-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        sameSite: "lax",
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

  // ===== AUTH ROUTES =====
  app.post("/api/auth/login", (req, res, next) => {
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

  app.get("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) return res.status(404).json({ error: "Empresa não encontrada" });
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
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
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

  return httpServer;
}
