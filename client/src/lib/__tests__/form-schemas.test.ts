import { describe, it, expect } from 'vitest';
import {
  propertySchema,
  leadSchema,
  contractSchema,
  rentalContractSchema,
  ownerSchema,
  renterSchema,
  userSchema,
  loginSchema,
  interactionSchema,
  followUpSchema,
  calendarEventSchema,
  publicInterestSchema,
  propertyFilterSchema,
} from '../form-schemas';

describe('Form Schemas Validation', () => {
  describe('Property Schema', () => {
    it('should validate valid property data', () => {
      const validProperty = {
        title: 'Apartamento 3 quartos',
        description: 'Lindo apartamento no centro',
        type: 'apartment' as const,
        category: 'sale' as const,
        price: 'R$ 500.000',
        address: 'Rua Principal, 123',
        city: 'São Paulo',
        state: 'SP',
        status: 'available' as const,
        featured: false,
      };

      const result = propertySchema.safeParse(validProperty);
      expect(result.success).toBe(true);
    });

    it('should fail with short title', () => {
      const invalidProperty = {
        title: 'Casa',
        type: 'house' as const,
        category: 'sale' as const,
        price: 'R$ 500.000',
        address: 'Rua Principal, 123',
        city: 'São Paulo',
        state: 'SP',
      };

      const result = propertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mínimo 5 caracteres');
      }
    });

    it('should fail with invalid price', () => {
      const invalidProperty = {
        title: 'Apartamento bonito',
        type: 'apartment' as const,
        category: 'sale' as const,
        price: 'R$ 0',
        address: 'Rua Principal, 123',
        city: 'São Paulo',
        state: 'SP',
      };

      const result = propertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('maior que zero');
      }
    });

    it('should fail with invalid state format', () => {
      const invalidProperty = {
        title: 'Apartamento bonito',
        type: 'apartment' as const,
        category: 'sale' as const,
        price: 'R$ 500.000',
        address: 'Rua Principal, 123',
        city: 'São Paulo',
        state: 'São Paulo',
      };

      const result = propertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('sigla do estado');
      }
    });

    it('should validate optional fields', () => {
      const propertyWithOptionals = {
        title: 'Casa grande',
        type: 'house' as const,
        category: 'sale' as const,
        price: 'R$ 800.000',
        address: 'Rua Secundária, 456',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '12345-678',
        neighborhood: 'Centro',
        bedrooms: 3,
        bathrooms: 2,
        area: 150,
        status: 'available' as const,
        featured: true,
      };

      const result = propertySchema.safeParse(propertyWithOptionals);
      expect(result.success).toBe(true);
    });

    it('should fail with negative bedrooms', () => {
      const invalidProperty = {
        title: 'Apartamento bonito',
        type: 'apartment' as const,
        category: 'sale' as const,
        price: 'R$ 500.000',
        address: 'Rua Principal, 123',
        city: 'São Paulo',
        state: 'SP',
        bedrooms: -1,
      };

      const result = propertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
    });

    it('should validate coordinates within valid ranges', () => {
      const propertyWithCoords = {
        title: 'Casa com localização',
        type: 'house' as const,
        category: 'sale' as const,
        price: 'R$ 600.000',
        address: 'Rua Teste, 789',
        city: 'Curitiba',
        state: 'PR',
        latitude: -25.4284,
        longitude: -49.2733,
        status: 'available' as const,
        featured: false,
      };

      const result = propertySchema.safeParse(propertyWithCoords);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid latitude', () => {
      const invalidProperty = {
        title: 'Casa com localização inválida',
        type: 'house' as const,
        category: 'sale' as const,
        price: 'R$ 600.000',
        address: 'Rua Teste, 789',
        city: 'Curitiba',
        state: 'PR',
        latitude: 100,
        longitude: -49.2733,
      };

      const result = propertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
    });
  });

  describe('Lead Schema', () => {
    it('should validate valid lead data', () => {
      const validLead = {
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
        source: 'Site' as const,
      };

      const result = leadSchema.safeParse(validLead);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid email', () => {
      const invalidLead = {
        name: 'Maria Santos',
        email: 'invalid-email',
        phone: '11988888888',
        source: 'WhatsApp' as const,
      };

      const result = leadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('E-mail inválido');
      }
    });

    it('should fail with invalid phone', () => {
      const invalidLead = {
        name: 'Pedro Costa',
        email: 'pedro@example.com',
        phone: '123',
        source: 'Instagram' as const,
      };

      const result = leadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Telefone inválido');
      }
    });

    it('should validate bedrooms range', () => {
      const leadWithBedrooms = {
        name: 'Ana Paula',
        email: 'ana@example.com',
        phone: '11977777777',
        source: 'Facebook' as const,
        minBedrooms: 2,
        maxBedrooms: 4,
      };

      const result = leadSchema.safeParse(leadWithBedrooms);
      expect(result.success).toBe(true);
    });

    it('should fail when min bedrooms > max bedrooms', () => {
      const invalidLead = {
        name: 'Carlos Souza',
        email: 'carlos@example.com',
        phone: '11966666666',
        source: 'Portal' as const,
        minBedrooms: 4,
        maxBedrooms: 2,
      };

      const result = leadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Mínimo de quartos');
      }
    });
  });

  describe('User Schema', () => {
    it('should validate valid user data', () => {
      const validUser = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'Senha123',
        confirmPassword: 'Senha123',
        role: 'admin' as const,
      };

      const result = userSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should fail with weak password (no uppercase)', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'senha123',
        confirmPassword: 'senha123',
        role: 'user' as const,
      };

      const result = userSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('letra maiúscula');
      }
    });

    it('should fail with weak password (no lowercase)', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SENHA123',
        confirmPassword: 'SENHA123',
        role: 'user' as const,
      };

      const result = userSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('letra minúscula');
      }
    });

    it('should fail with weak password (no number)', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SenhaForte',
        confirmPassword: 'SenhaForte',
        role: 'user' as const,
      };

      const result = userSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('número');
      }
    });

    it('should fail with short password', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Sn123',
        confirmPassword: 'Sn123',
        role: 'user' as const,
      };

      const result = userSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mínimo 8 caracteres');
      }
    });

    it('should fail when passwords do not match', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Senha123',
        confirmPassword: 'Senha456',
        role: 'user' as const,
      };

      const result = userSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('não coincidem');
      }
    });
  });

  describe('Login Schema', () => {
    it('should validate valid login data', () => {
      const validLogin = {
        email: 'user@example.com',
        password: 'anypassword',
      };

      const result = loginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid email', () => {
      const invalidLogin = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });

    it('should fail with empty password', () => {
      const invalidLogin = {
        email: 'user@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });
  });

  describe('Rental Contract Schema', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    it('should validate valid rental contract', () => {
      const validContract = {
        propertyId: 'prop-123',
        ownerId: 'owner-123',
        renterId: 'renter-123',
        rentValue: 'R$ 2.000',
        dueDay: 10,
        startDate: new Date(),
        endDate: futureDate,
        adjustmentIndex: 'IGPM' as const,
        administrationFee: '10',
      };

      const result = rentalContractSchema.safeParse(validContract);
      expect(result.success).toBe(true);
    });

    it('should fail when endDate <= startDate', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const invalidContract = {
        propertyId: 'prop-123',
        ownerId: 'owner-123',
        renterId: 'renter-123',
        rentValue: 'R$ 2.000',
        dueDay: 10,
        startDate: new Date(),
        endDate: pastDate,
        adjustmentIndex: 'IGPM' as const,
        administrationFee: '10',
      };

      const result = rentalContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Data de término');
      }
    });

    it('should fail with invalid due day', () => {
      const invalidContract = {
        propertyId: 'prop-123',
        ownerId: 'owner-123',
        renterId: 'renter-123',
        rentValue: 'R$ 2.000',
        dueDay: 32,
        startDate: new Date(),
        endDate: futureDate,
        adjustmentIndex: 'IGPM' as const,
        administrationFee: '10',
      };

      const result = rentalContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid administration fee', () => {
      const invalidContract = {
        propertyId: 'prop-123',
        ownerId: 'owner-123',
        renterId: 'renter-123',
        rentValue: 'R$ 2.000',
        dueDay: 10,
        startDate: new Date(),
        endDate: futureDate,
        adjustmentIndex: 'IGPM' as const,
        administrationFee: '150',
      };

      const result = rentalContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('0 e 100%');
      }
    });
  });

  describe('Calendar Event Schema', () => {
    it('should validate valid calendar event', () => {
      const validEvent = {
        type: 'visit' as const,
        title: 'Visita ao imóvel',
        date: '2024-12-25',
        time: '14:30',
        duration: 60,
      };

      const result = calendarEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid date format', () => {
      const invalidEvent = {
        type: 'visit' as const,
        title: 'Visita ao imóvel',
        date: '25/12/2024',
        time: '14:30',
        duration: 60,
      };

      const result = calendarEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid time format', () => {
      const invalidEvent = {
        type: 'visit' as const,
        title: 'Visita ao imóvel',
        date: '2024-12-25',
        time: '2:30 PM',
        duration: 60,
      };

      const result = calendarEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('should fail with duration too short', () => {
      const invalidEvent = {
        type: 'visit' as const,
        title: 'Visita ao imóvel',
        date: '2024-12-25',
        time: '14:30',
        duration: 3,
      };

      const result = calendarEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('should fail with duration too long', () => {
      const invalidEvent = {
        type: 'visit' as const,
        title: 'Visita ao imóvel',
        date: '2024-12-25',
        time: '14:30',
        duration: 500,
      };

      const result = calendarEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('Property Filter Schema', () => {
    it('should validate valid filter', () => {
      const validFilter = {
        type: 'apartment' as const,
        category: 'sale' as const,
        city: 'São Paulo',
        minPrice: 500000,
        maxPrice: 1000000,
        minBedrooms: 2,
        maxBedrooms: 4,
      };

      const result = propertyFilterSchema.safeParse(validFilter);
      expect(result.success).toBe(true);
    });

    it('should fail when minPrice > maxPrice', () => {
      const invalidFilter = {
        minPrice: 1000000,
        maxPrice: 500000,
      };

      const result = propertyFilterSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Preço mínimo');
      }
    });

    it('should fail when minBedrooms > maxBedrooms', () => {
      const invalidFilter = {
        minBedrooms: 4,
        maxBedrooms: 2,
      };

      const result = propertyFilterSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('quartos');
      }
    });

    it('should fail when minArea > maxArea', () => {
      const invalidFilter = {
        minArea: 200,
        maxArea: 100,
      };

      const result = propertyFilterSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Área mínima');
      }
    });
  });

  describe('Interaction Schema', () => {
    it('should validate valid interaction', () => {
      const validInteraction = {
        type: 'call' as const,
        content: 'Cliente interessado no imóvel',
      };

      const result = interactionSchema.safeParse(validInteraction);
      expect(result.success).toBe(true);
    });

    it('should fail with empty content', () => {
      const invalidInteraction = {
        type: 'email' as const,
        content: '',
      };

      const result = interactionSchema.safeParse(invalidInteraction);
      expect(result.success).toBe(false);
    });

    it('should fail with content too long', () => {
      const invalidInteraction = {
        type: 'note' as const,
        content: 'a'.repeat(6000),
      };

      const result = interactionSchema.safeParse(invalidInteraction);
      expect(result.success).toBe(false);
    });
  });

  describe('Follow Up Schema', () => {
    it('should validate valid follow up', () => {
      const validFollowUp = {
        type: 'call' as const,
        dueAt: new Date(),
        notes: 'Ligar para confirmar interesse',
      };

      const result = followUpSchema.safeParse(validFollowUp);
      expect(result.success).toBe(true);
    });

    it('should validate without notes', () => {
      const validFollowUp = {
        type: 'email' as const,
        dueAt: new Date(),
      };

      const result = followUpSchema.safeParse(validFollowUp);
      expect(result.success).toBe(true);
    });
  });

  describe('Public Interest Schema', () => {
    it('should validate valid public interest', () => {
      const validInterest = {
        name: 'Cliente Interessado',
        email: 'cliente@example.com',
        phone: '11999999999',
        message: 'Gostaria de saber mais sobre o imóvel',
      };

      const result = publicInterestSchema.safeParse(validInterest);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid phone', () => {
      const invalidInterest = {
        name: 'Cliente',
        email: 'cliente@example.com',
        phone: '123',
      };

      const result = publicInterestSchema.safeParse(invalidInterest);
      expect(result.success).toBe(false);
    });
  });
});
