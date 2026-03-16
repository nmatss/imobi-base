// @ts-nocheck
/**
 * Portal Self-Service Routes
 * Separate authentication for owners and renters
 * Uses JWT tokens instead of sessions
 */

import type { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { requireAuth } from "./middleware/auth";
import { randomBytes } from "crypto";
import type { ClientPortalAccess } from "@shared/schema-sqlite";

// Portal JWT secret - required in production, default only for development
const PORTAL_JWT_SECRET = process.env.PORTAL_JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('PORTAL_JWT_SECRET is required in production'); })() : 'dev-portal-secret-change-in-prod');
const PORTAL_JWT_EXPIRY = "24h";

// Extend Request to include portal user
interface PortalUser {
  id: string;
  tenantId: string;
  clientType: string;
  clientId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      portalUser?: PortalUser;
    }
  }
}

// Portal auth middleware - validates JWT token
function requirePortalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de acesso não fornecido", code: "UNAUTHORIZED" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, PORTAL_JWT_SECRET) as PortalUser;
    req.portalUser = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token inválido ou expirado", code: "INVALID_TOKEN" });
    return;
  }
}

// Middleware to restrict by portal user type
function requirePortalType(type: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.portalUser || req.portalUser.clientType !== type) {
      res.status(403).json({ error: "Acesso não autorizado para este tipo de usuário", code: "FORBIDDEN" });
      return;
    }
    next();
  };
}

export function registerPortalRoutes(app: Express): void {
  // Rate limiting for portal auth routes
  const portalAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 attempts per windowMs
    message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ==================== PORTAL AUTH ====================

  // POST /api/portal/login
  app.post("/api/portal/login", portalAuthLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      const access = await storage.getPortalAccessByEmail(email);
      if (!access || !access.isActive) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      if (!access.passwordHash) {
        return res.status(401).json({ error: "Senha não configurada. Solicite redefinição de senha." });
      }

      const isValid = await bcrypt.compare(password, access.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      // Get tenant info
      const tenant = await storage.getTenant(access.tenantId);

      // Get client info (owner or renter)
      let clientName = "";
      if (access.clientType === "owner") {
        const owner = await storage.getOwner(access.clientId);
        clientName = owner?.name || "";
      } else if (access.clientType === "renter") {
        const renter = await storage.getRenter(access.clientId);
        clientName = renter?.name || "";
      }

      // Generate JWT
      const payload: PortalUser = {
        id: access.id,
        tenantId: access.tenantId,
        clientType: access.clientType,
        clientId: access.clientId,
        email: access.email,
      };

      const token = jwt.sign(payload, PORTAL_JWT_SECRET, { expiresIn: PORTAL_JWT_EXPIRY });

      // Update last login
      await storage.updatePortalAccess(access.id, {
        lastLogin: new Date().toISOString(),
        loginCount: (access.loginCount || 0) + 1,
      } as any);

      res.json({
        token,
        user: {
          id: access.id,
          email: access.email,
          clientType: access.clientType,
          clientId: access.clientId,
          name: clientName,
          tenantId: access.tenantId,
        },
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.logo,
          primaryColor: tenant.primaryColor,
        } : null,
      });
    } catch (err) {
      console.error("Portal login error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // POST /api/portal/forgot-password
  app.post("/api/portal/forgot-password", portalAuthLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email é obrigatório" });
      }

      const access = await storage.getPortalAccessByEmail(email);
      if (access) {
        const resetToken = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour
        await storage.updatePortalAccess(access.id, {
          resetToken,
          resetTokenExpires: expires,
        } as any);
        // In production, send email with reset link
      }

      // Always return success to prevent email enumeration
      res.json({ message: "Se o email estiver cadastrado, você receberá instruções para redefinição de senha." });
    } catch (err) {
      console.error("Portal forgot password error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/me
  app.get("/api/portal/me", requirePortalAuth, async (req: Request, res: Response) => {
    try {
      const access = await storage.getPortalAccess(req.portalUser!.id);
      if (!access) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const tenant = await storage.getTenant(access.tenantId);

      let clientName = "";
      let clientPhone = "";
      if (access.clientType === "owner") {
        const owner = await storage.getOwner(access.clientId);
        clientName = owner?.name || "";
        clientPhone = owner?.phone || "";
      } else if (access.clientType === "renter") {
        const renter = await storage.getRenter(access.clientId);
        clientName = renter?.name || "";
        clientPhone = renter?.phone || "";
      }

      res.json({
        user: {
          id: access.id,
          email: access.email,
          clientType: access.clientType,
          clientId: access.clientId,
          name: clientName,
          phone: clientPhone,
          lastLogin: access.lastLogin,
        },
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.logo,
          primaryColor: tenant.primaryColor,
          phone: tenant.phone,
          email: tenant.email,
        } : null,
      });
    } catch (err) {
      console.error("Portal me error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // ==================== OWNER PORTAL ENDPOINTS ====================

  // GET /api/portal/owner/dashboard
  app.get("/api/portal/owner/dashboard", requirePortalAuth, requirePortalType("owner"), async (req: Request, res: Response) => {
    try {
      const ownerId = req.portalUser!.clientId;
      const tenantId = req.portalUser!.tenantId;

      // Get owner's contracts
      const contracts = await storage.getRentalContractsByOwner(ownerId);
      const activeContracts = contracts.filter(c => c.status === "active");

      // Get owner's properties via contracts
      const propertyIds = [...new Set(contracts.map(c => c.propertyId))];
      const properties = [];
      for (const pid of propertyIds) {
        const prop = await storage.getProperty(pid);
        if (prop) properties.push(prop);
      }

      // Get transfers
      const transfers = await storage.getRentalTransfersByOwner(ownerId);
      const pendingTransfers = transfers.filter(t => t.status === "pending");

      // Calculate occupancy
      const occupiedPropertyIds = new Set(activeContracts.map(c => c.propertyId));
      const occupancyRate = properties.length > 0
        ? Math.round((occupiedPropertyIds.size / properties.length) * 100)
        : 0;

      // Calculate monthly revenue
      const monthlyRevenue = activeContracts.reduce((sum, c) => sum + parseFloat(c.rentValue || "0"), 0);

      // Get maintenance tickets for owner's properties
      const tickets: any[] = [];
      for (const pid of propertyIds) {
        const propertyTickets = await storage.getMaintenanceTicketsByProperty(pid);
        tickets.push(...propertyTickets);
      }
      const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");

      res.json({
        totalProperties: properties.length,
        activeContracts: activeContracts.length,
        occupancyRate,
        monthlyRevenue,
        pendingTransfers: pendingTransfers.length,
        pendingTransfersValue: pendingTransfers.reduce((sum, t) => sum + parseFloat(t.netAmount || "0"), 0),
        openTickets: openTickets.length,
      });
    } catch (err) {
      console.error("Portal owner dashboard error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/owner/properties
  app.get("/api/portal/owner/properties", requirePortalAuth, requirePortalType("owner"), async (req: Request, res: Response) => {
    try {
      const ownerId = req.portalUser!.clientId;

      const contracts = await storage.getRentalContractsByOwner(ownerId);
      const propertyIds = [...new Set(contracts.map(c => c.propertyId))];

      const propertiesWithDetails = [];
      for (const pid of propertyIds) {
        const property = await storage.getProperty(pid);
        if (!property) continue;

        const propertyContracts = contracts.filter(c => c.propertyId === pid);
        const activeContract = propertyContracts.find(c => c.status === "active");

        let renterInfo = null;
        if (activeContract) {
          const renter = await storage.getRenter(activeContract.renterId);
          renterInfo = renter ? { id: renter.id, name: renter.name, phone: renter.phone } : null;
        }

        propertiesWithDetails.push({
          property: {
            id: property.id,
            title: property.title,
            address: property.address,
            city: property.city,
            status: property.status,
            images: property.images,
            type: property.type,
            bedrooms: property.bedrooms,
            area: property.area,
          },
          contract: activeContract ? {
            id: activeContract.id,
            rentValue: activeContract.rentValue,
            startDate: activeContract.startDate,
            endDate: activeContract.endDate,
            status: activeContract.status,
          } : null,
          renter: renterInfo,
          isOccupied: !!activeContract,
        });
      }

      res.json(propertiesWithDetails);
    } catch (err) {
      console.error("Portal owner properties error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/owner/repasses
  app.get("/api/portal/owner/repasses", requirePortalAuth, requirePortalType("owner"), async (req: Request, res: Response) => {
    try {
      const ownerId = req.portalUser!.clientId;
      const { status, month } = req.query;

      let transfers = await storage.getRentalTransfersByOwner(ownerId);

      if (status && typeof status === "string") {
        transfers = transfers.filter(t => t.status === status);
      }
      if (month && typeof month === "string") {
        transfers = transfers.filter(t => t.referenceMonth === month);
      }

      res.json(transfers);
    } catch (err) {
      console.error("Portal owner repasses error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/owner/repasses/:id
  app.get("/api/portal/owner/repasses/:id", requirePortalAuth, requirePortalType("owner"), async (req: Request, res: Response) => {
    try {
      const transfer = await storage.getRentalTransfer(req.params.id);
      if (!transfer || transfer.ownerId !== req.portalUser!.clientId) {
        return res.status(404).json({ error: "Repasse não encontrado" });
      }
      res.json(transfer);
    } catch (err) {
      console.error("Portal owner repasse detail error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/owner/contracts
  app.get("/api/portal/owner/contracts", requirePortalAuth, requirePortalType("owner"), async (req: Request, res: Response) => {
    try {
      const ownerId = req.portalUser!.clientId;
      const contracts = await storage.getRentalContractsByOwner(ownerId);

      const contractsWithDetails = [];
      for (const contract of contracts) {
        const property = await storage.getProperty(contract.propertyId);
        const renter = await storage.getRenter(contract.renterId);

        contractsWithDetails.push({
          ...contract,
          property: property ? { id: property.id, title: property.title, address: property.address } : null,
          renter: renter ? { id: renter.id, name: renter.name } : null,
        });
      }

      res.json(contractsWithDetails);
    } catch (err) {
      console.error("Portal owner contracts error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/owner/maintenance
  app.get("/api/portal/owner/maintenance", requirePortalAuth, requirePortalType("owner"), async (req: Request, res: Response) => {
    try {
      const ownerId = req.portalUser!.clientId;
      const contracts = await storage.getRentalContractsByOwner(ownerId);
      const propertyIds = [...new Set(contracts.map(c => c.propertyId))];

      const tickets: any[] = [];
      for (const pid of propertyIds) {
        const propertyTickets = await storage.getMaintenanceTicketsByProperty(pid);
        for (const ticket of propertyTickets) {
          const property = await storage.getProperty(ticket.propertyId);
          tickets.push({
            ...ticket,
            propertyTitle: property?.title || "",
            propertyAddress: property?.address || "",
          });
        }
      }

      res.json(tickets);
    } catch (err) {
      console.error("Portal owner maintenance error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // PUT /api/portal/owner/maintenance/:id/approve
  app.put("/api/portal/owner/maintenance/:id/approve", requirePortalAuth, requirePortalType("owner"), async (req: Request, res: Response) => {
    try {
      const ticket = await storage.getMaintenanceTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Chamado não encontrado" });
      }

      // Verify this ticket is for owner's property
      const contracts = await storage.getRentalContractsByOwner(req.portalUser!.clientId);
      const propertyIds = contracts.map(c => c.propertyId);
      if (!propertyIds.includes(ticket.propertyId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { approved, notes: noteText } = req.body;
      const existingNotes = ticket.notes ? JSON.parse(ticket.notes) : [];
      existingNotes.push({
        date: new Date().toISOString(),
        author: "Proprietário",
        text: approved ? `Aprovado. ${noteText || ""}` : `Recusado. ${noteText || ""}`,
      });

      const updated = await storage.updateMaintenanceTicket(ticket.id, {
        status: approved ? "in_progress" : "cancelled",
        notes: JSON.stringify(existingNotes),
      });

      res.json(updated);
    } catch (err) {
      console.error("Portal owner approve maintenance error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/owner/income-report
  app.get("/api/portal/owner/income-report", requirePortalAuth, requirePortalType("owner"), async (req: Request, res: Response) => {
    try {
      const ownerId = req.portalUser!.clientId;
      const tenantId = req.portalUser!.tenantId;
      const { year } = req.query;

      const targetYear = year ? String(year) : String(new Date().getFullYear());

      const owner = await storage.getOwner(ownerId);
      const contracts = await storage.getRentalContractsByOwner(ownerId);

      const incomeByMonth: Record<string, number> = {};
      let totalIncome = 0;

      for (const contract of contracts) {
        const payments = await storage.getRentalPaymentsByContract(contract.id);
        for (const payment of payments) {
          if (payment.status === "paid" && payment.paidDate && payment.paidDate.startsWith(targetYear)) {
            const month = payment.referenceMonth || payment.paidDate.substring(0, 7);
            const value = parseFloat(payment.paidValue || payment.totalValue || "0");
            incomeByMonth[month] = (incomeByMonth[month] || 0) + value;
            totalIncome += value;
          }
        }
      }

      // Get transfers (repasses) for tax purposes
      const transfers = await storage.getRentalTransfersByOwner(ownerId);
      const yearTransfers = transfers.filter(t => t.referenceMonth?.startsWith(targetYear));

      res.json({
        owner: owner ? { name: owner.name, cpfCnpj: owner.cpfCnpj } : null,
        year: targetYear,
        totalIncome,
        incomeByMonth,
        transfers: yearTransfers.map(t => ({
          referenceMonth: t.referenceMonth,
          grossAmount: t.grossAmount,
          netAmount: t.netAmount,
          administrationFee: t.administrationFee,
          status: t.status,
        })),
        propertiesCount: [...new Set(contracts.map(c => c.propertyId))].length,
      });
    } catch (err) {
      console.error("Portal owner income report error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // ==================== RENTER PORTAL ENDPOINTS ====================

  // GET /api/portal/renter/dashboard
  app.get("/api/portal/renter/dashboard", requirePortalAuth, requirePortalType("renter"), async (req: Request, res: Response) => {
    try {
      const renterId = req.portalUser!.clientId;

      const contracts = await storage.getRentalContractsByRenter(renterId);
      const activeContract = contracts.find(c => c.status === "active");

      let nextPayment = null;
      let propertyInfo = null;

      if (activeContract) {
        const payments = await storage.getRentalPaymentsByContract(activeContract.id);
        const pendingPayments = payments
          .filter(p => p.status === "pending" || p.status === "overdue")
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        if (pendingPayments.length > 0) {
          nextPayment = pendingPayments[0];
        }

        const property = await storage.getProperty(activeContract.propertyId);
        propertyInfo = property ? {
          id: property.id,
          title: property.title,
          address: property.address,
          city: property.city,
          images: property.images,
        } : null;
      }

      // Get maintenance tickets
      const tickets = await storage.getMaintenanceTicketsByRequester(req.portalUser!.id);
      const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");

      res.json({
        contract: activeContract ? {
          id: activeContract.id,
          rentValue: activeContract.rentValue,
          dueDay: activeContract.dueDay,
          startDate: activeContract.startDate,
          endDate: activeContract.endDate,
          status: activeContract.status,
        } : null,
        property: propertyInfo,
        nextPayment: nextPayment ? {
          id: nextPayment.id,
          dueDate: nextPayment.dueDate,
          totalValue: nextPayment.totalValue,
          status: nextPayment.status,
          referenceMonth: nextPayment.referenceMonth,
        } : null,
        openTickets: openTickets.length,
        totalContracts: contracts.length,
      });
    } catch (err) {
      console.error("Portal renter dashboard error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/renter/payments
  app.get("/api/portal/renter/payments", requirePortalAuth, requirePortalType("renter"), async (req: Request, res: Response) => {
    try {
      const renterId = req.portalUser!.clientId;
      const contracts = await storage.getRentalContractsByRenter(renterId);

      const allPayments: any[] = [];
      for (const contract of contracts) {
        const payments = await storage.getRentalPaymentsByContract(contract.id);
        const property = await storage.getProperty(contract.propertyId);

        for (const payment of payments) {
          allPayments.push({
            ...payment,
            propertyTitle: property?.title || "",
            propertyAddress: property?.address || "",
          });
        }
      }

      // Sort by due date descending
      allPayments.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

      res.json(allPayments);
    } catch (err) {
      console.error("Portal renter payments error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/renter/payments/:id/boleto
  app.get("/api/portal/renter/payments/:id/boleto", requirePortalAuth, requirePortalType("renter"), async (req: Request, res: Response) => {
    try {
      const payment = await storage.getRentalPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Pagamento não encontrado" });
      }

      // Verify this payment belongs to the renter
      const contract = await storage.getRentalContract(payment.rentalContractId);
      if (!contract || contract.renterId !== req.portalUser!.clientId) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Get owner's PIX key for payment
      const owner = await storage.getOwner(contract.ownerId);
      const tenant = await storage.getTenant(contract.tenantId);

      res.json({
        payment: {
          id: payment.id,
          referenceMonth: payment.referenceMonth,
          dueDate: payment.dueDate,
          totalValue: payment.totalValue,
          status: payment.status,
        },
        paymentInfo: {
          pixKey: owner?.pixKey || null,
          bankName: owner?.bankName || null,
          bankAgency: owner?.bankAgency || null,
          bankAccount: owner?.bankAccount || null,
          beneficiary: tenant?.name || "",
        },
      });
    } catch (err) {
      console.error("Portal renter boleto error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // POST /api/portal/renter/payments/:id/request-copy
  app.post("/api/portal/renter/payments/:id/request-copy", requirePortalAuth, requirePortalType("renter"), async (req: Request, res: Response) => {
    try {
      const payment = await storage.getRentalPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Pagamento não encontrado" });
      }

      const contract = await storage.getRentalContract(payment.rentalContractId);
      if (!contract || contract.renterId !== req.portalUser!.clientId) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // In production, this would trigger boleto re-generation or email
      res.json({ message: "Solicitação de 2ª via registrada. Você receberá por email em breve." });
    } catch (err) {
      console.error("Portal renter request copy error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/renter/contract
  app.get("/api/portal/renter/contract", requirePortalAuth, requirePortalType("renter"), async (req: Request, res: Response) => {
    try {
      const renterId = req.portalUser!.clientId;
      const contracts = await storage.getRentalContractsByRenter(renterId);
      const activeContract = contracts.find(c => c.status === "active");

      if (!activeContract) {
        return res.json(null);
      }

      const property = await storage.getProperty(activeContract.propertyId);
      const owner = await storage.getOwner(activeContract.ownerId);

      res.json({
        ...activeContract,
        property: property ? {
          id: property.id,
          title: property.title,
          address: property.address,
          city: property.city,
          state: property.state,
          type: property.type,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          area: property.area,
          images: property.images,
        } : null,
        ownerName: owner?.name || null,
      });
    } catch (err) {
      console.error("Portal renter contract error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/renter/documents
  app.get("/api/portal/renter/documents", requirePortalAuth, requirePortalType("renter"), async (req: Request, res: Response) => {
    try {
      const renterId = req.portalUser!.clientId;
      const contracts = await storage.getRentalContractsByRenter(renterId);

      // Return contract info as "documents"
      const documents = contracts.map(c => ({
        id: c.id,
        type: "rental_contract",
        title: `Contrato de Locação - ${c.startDate} a ${c.endDate}`,
        status: c.status,
        createdAt: c.createdAt,
      }));

      res.json(documents);
    } catch (err) {
      console.error("Portal renter documents error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // POST /api/portal/renter/maintenance
  app.post("/api/portal/renter/maintenance", requirePortalAuth, requirePortalType("renter"), async (req: Request, res: Response) => {
    try {
      const renterId = req.portalUser!.clientId;
      const tenantId = req.portalUser!.tenantId;

      const contracts = await storage.getRentalContractsByRenter(renterId);
      const activeContract = contracts.find(c => c.status === "active");

      if (!activeContract) {
        return res.status(400).json({ error: "Nenhum contrato ativo encontrado" });
      }

      const { title, description, category, priority, photos } = req.body;

      if (!title || !description || !category) {
        return res.status(400).json({ error: "Título, descrição e categoria são obrigatórios" });
      }

      const ticket = await storage.createMaintenanceTicket({
        tenantId,
        propertyId: activeContract.propertyId,
        rentalContractId: activeContract.id,
        requestedById: req.portalUser!.id,
        requestedByType: "renter",
        title,
        description,
        category,
        priority: priority || "medium",
        status: "open",
        photos: photos ? JSON.stringify(photos) : null,
      });

      res.status(201).json(ticket);
    } catch (err) {
      console.error("Portal renter create maintenance error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/renter/maintenance
  app.get("/api/portal/renter/maintenance", requirePortalAuth, requirePortalType("renter"), async (req: Request, res: Response) => {
    try {
      const tickets = await storage.getMaintenanceTicketsByRequester(req.portalUser!.id);

      const ticketsWithDetails = [];
      for (const ticket of tickets) {
        const property = await storage.getProperty(ticket.propertyId);
        ticketsWithDetails.push({
          ...ticket,
          propertyTitle: property?.title || "",
          propertyAddress: property?.address || "",
        });
      }

      res.json(ticketsWithDetails);
    } catch (err) {
      console.error("Portal renter maintenance error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // PUT /api/portal/renter/maintenance/:id
  app.put("/api/portal/renter/maintenance/:id", requirePortalAuth, requirePortalType("renter"), async (req: Request, res: Response) => {
    try {
      const ticket = await storage.getMaintenanceTicket(req.params.id);
      if (!ticket || ticket.requestedById !== req.portalUser!.id) {
        return res.status(404).json({ error: "Chamado não encontrado" });
      }

      const { photos, notes: noteText } = req.body;
      const updates: any = {};

      if (photos) {
        const existingPhotos = ticket.photos ? JSON.parse(ticket.photos) : [];
        updates.photos = JSON.stringify([...existingPhotos, ...photos]);
      }

      if (noteText) {
        const existingNotes = ticket.notes ? JSON.parse(ticket.notes) : [];
        existingNotes.push({
          date: new Date().toISOString(),
          author: "Inquilino",
          text: noteText,
        });
        updates.notes = JSON.stringify(existingNotes);
      }

      const updated = await storage.updateMaintenanceTicket(ticket.id, updates);
      res.json(updated);
    } catch (err) {
      console.error("Portal renter update maintenance error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // ==================== ADMIN PORTAL MANAGEMENT ====================

  // GET /api/portal/admin/access
  app.get("/api/portal/admin/access", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const accesses = await storage.getPortalAccessesByTenant(tenantId);

      const accessesWithDetails = [];
      for (const access of accesses) {
        let clientName = "";
        if (access.clientType === "owner") {
          const owner = await storage.getOwner(access.clientId);
          clientName = owner?.name || "";
        } else if (access.clientType === "renter") {
          const renter = await storage.getRenter(access.clientId);
          clientName = renter?.name || "";
        }

        accessesWithDetails.push({
          ...access,
          passwordHash: undefined,
          clientName,
        });
      }

      res.json(accessesWithDetails);
    } catch (err) {
      console.error("Portal admin list access error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // POST /api/portal/admin/access
  app.post("/api/portal/admin/access", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { clientType, clientId, email, password } = req.body;

      if (!clientType || !clientId || !email) {
        return res.status(400).json({ error: "Tipo de cliente, ID do cliente e email são obrigatórios" });
      }

      // Check if email already exists
      const existing = await storage.getPortalAccessByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Este email já está cadastrado no portal" });
      }

      // Verify the client exists
      if (clientType === "owner") {
        const owner = await storage.getOwner(clientId);
        if (!owner || owner.tenantId !== tenantId) {
          return res.status(404).json({ error: "Proprietário não encontrado" });
        }
      } else if (clientType === "renter") {
        const renter = await storage.getRenter(clientId);
        if (!renter || renter.tenantId !== tenantId) {
          return res.status(404).json({ error: "Inquilino não encontrado" });
        }
      }

      const tempPassword = password || randomBytes(8).toString("hex");
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const access = await storage.createPortalAccess({
        tenantId,
        clientType,
        clientId,
        email,
        passwordHash,
        isActive: true,
      });

      res.status(201).json({
        ...access,
        passwordHash: undefined,
        temporaryPassword: password ? undefined : tempPassword,
      });
    } catch (err) {
      console.error("Portal admin create access error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // PUT /api/portal/admin/access/:id
  app.put("/api/portal/admin/access/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const access = await storage.getPortalAccess(req.params.id);
      if (!access || access.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Acesso não encontrado" });
      }

      const { isActive, email } = req.body;
      const updates: any = {};

      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (email) updates.email = email;

      const updated = await storage.updatePortalAccess(access.id, updates);
      res.json({ ...updated, passwordHash: undefined });
    } catch (err) {
      console.error("Portal admin update access error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // DELETE /api/portal/admin/access/:id
  app.delete("/api/portal/admin/access/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const access = await storage.getPortalAccess(req.params.id);
      if (!access || access.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Acesso não encontrado" });
      }

      await storage.deletePortalAccess(access.id);
      res.json({ message: "Acesso removido com sucesso" });
    } catch (err) {
      console.error("Portal admin delete access error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // POST /api/portal/admin/access/:id/reset-password
  app.post("/api/portal/admin/access/:id/reset-password", requireAuth, async (req: Request, res: Response) => {
    try {
      const access = await storage.getPortalAccess(req.params.id);
      if (!access || access.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Acesso não encontrado" });
      }

      const { password } = req.body;
      const newPassword = password || randomBytes(8).toString("hex");
      const passwordHash = await bcrypt.hash(newPassword, 12);

      await storage.updatePortalAccess(access.id, { passwordHash } as any);

      res.json({
        message: "Senha redefinida com sucesso",
        temporaryPassword: password ? undefined : newPassword,
      });
    } catch (err) {
      console.error("Portal admin reset password error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // GET /api/portal/admin/maintenance
  app.get("/api/portal/admin/maintenance", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const tickets = await storage.getMaintenanceTicketsByTenant(tenantId);

      const ticketsWithDetails = [];
      for (const ticket of tickets) {
        const property = await storage.getProperty(ticket.propertyId);
        ticketsWithDetails.push({
          ...ticket,
          propertyTitle: property?.title || "",
          propertyAddress: property?.address || "",
        });
      }

      res.json(ticketsWithDetails);
    } catch (err) {
      console.error("Portal admin maintenance error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // PUT /api/portal/admin/maintenance/:id
  app.put("/api/portal/admin/maintenance/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const ticket = await storage.getMaintenanceTicket(req.params.id);
      if (!ticket || ticket.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Chamado não encontrado" });
      }

      const { status, priority, estimatedCost, actualCost, notes: noteText } = req.body;
      const updates: any = {};

      if (status) updates.status = status;
      if (priority) updates.priority = priority;
      if (estimatedCost !== undefined) updates.estimatedCost = estimatedCost;
      if (actualCost !== undefined) updates.actualCost = actualCost;

      if (status === "completed") {
        updates.resolvedAt = new Date().toISOString();
      }

      if (noteText) {
        const existingNotes = ticket.notes ? JSON.parse(ticket.notes) : [];
        existingNotes.push({
          date: new Date().toISOString(),
          author: "Administrador",
          text: noteText,
        });
        updates.notes = JSON.stringify(existingNotes);
      }

      const updated = await storage.updateMaintenanceTicket(ticket.id, updates);
      res.json(updated);
    } catch (err) {
      console.error("Portal admin update maintenance error:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
}
