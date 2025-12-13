import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { insertUserSchema, insertPropertySchema, insertLeadSchema, insertVisitSchema, insertContractSchema, insertNewsletterSchema, insertInteractionSchema, insertOwnerSchema, insertRenterSchema, insertRentalContractSchema, insertRentalPaymentSchema, insertSaleProposalSchema, insertPropertySaleSchema, insertFinanceCategorySchema, insertFinanceEntrySchema, insertLeadTagSchema, insertLeadTagLinkSchema, insertFollowUpSchema } from "@shared/schema";
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
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();
      
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

  return httpServer;
}
