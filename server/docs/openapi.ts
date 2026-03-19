/**
 * OpenAPI 3.0.3 Specification for ImobiBase API
 */

export function generateOpenAPISpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "ImobiBase API",
      version: "1.0.0",
      description:
        "API para gestão imobiliária multi-tenant. Inclui autenticação, gestão de imóveis, leads, visitas, contratos e portal self-service para proprietários e inquilinos.",
      contact: {
        name: "ImobiBase",
        url: "https://imobibase.com",
      },
    },
    servers: [{ url: "/api", description: "API Server" }],
    tags: [
      { name: "Auth", description: "Autenticação e registro" },
      { name: "Properties", description: "Gestão de imóveis" },
      { name: "Leads", description: "Gestão de leads" },
      { name: "Visits", description: "Agendamento de visitas" },
      { name: "Contracts", description: "Contratos de venda" },
      { name: "Portal", description: "Portal self-service (proprietários e inquilinos)" },
      { name: "Health", description: "Health checks e probes" },
    ],
    paths: {
      // ==================== AUTH ====================
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Registrar nova imobiliária",
          description: "Cria um novo tenant (imobiliária) e o usuário admin. Rate-limited a 5 requisições por hora por IP.",
          operationId: "register",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Registro bem-sucedido",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "409": {
              description: "Email ou slug já em uso",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login do usuário",
          description: "Autentica o usuário via email/senha. Cria sessão com cookie httpOnly e retorna CSRF token.",
          operationId: "login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Login bem-sucedido",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            "401": {
              description: "Credenciais inválidas",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "423": {
              description: "Conta bloqueada temporariamente",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string" },
                      lockedUntil: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Dados do usuário autenticado",
          operationId: "getMe",
          security: [{ session: [] }],
          responses: {
            "200": {
              description: "Dados do usuário",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout do usuário",
          operationId: "logout",
          security: [{ session: [] }],
          responses: {
            "200": {
              description: "Logout bem-sucedido",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string", example: "Deslogado com sucesso" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ==================== PROPERTIES ====================
      "/properties": {
        get: {
          tags: ["Properties"],
          summary: "Listar imóveis do tenant",
          operationId: "listProperties",
          security: [{ session: [] }],
          parameters: [
            { name: "type", in: "query", schema: { type: "string" }, description: "Filtrar por tipo (casa, apartamento, terreno, comercial, rural)" },
            { name: "category", in: "query", schema: { type: "string" }, description: "Filtrar por categoria (venda, aluguel)" },
            { name: "status", in: "query", schema: { type: "string" }, description: "Filtrar por status (available, sold, rented)" },
            { name: "featured", in: "query", schema: { type: "string", enum: ["true", "false"] }, description: "Filtrar por destaque" },
          ],
          responses: {
            "200": {
              description: "Lista de imóveis",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Property" },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
        post: {
          tags: ["Properties"],
          summary: "Criar imóvel",
          operationId: "createProperty",
          security: [{ session: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InsertProperty" },
              },
            },
          },
          responses: {
            "201": {
              description: "Imóvel criado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Property" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/properties/{id}": {
        get: {
          tags: ["Properties"],
          summary: "Obter imóvel por ID",
          operationId: "getProperty",
          security: [{ session: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": {
              description: "Dados do imóvel",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Property" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
        patch: {
          tags: ["Properties"],
          summary: "Atualizar imóvel",
          operationId: "updateProperty",
          security: [{ session: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InsertProperty" },
              },
            },
          },
          responses: {
            "200": {
              description: "Imóvel atualizado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Property" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
        delete: {
          tags: ["Properties"],
          summary: "Deletar imóvel",
          operationId: "deleteProperty",
          security: [{ session: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": {
              description: "Imóvel deletado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/properties/public/{tenantId}": {
        get: {
          tags: ["Properties"],
          summary: "Listar imóveis públicos de um tenant",
          description: "Endpoint público, sem autenticação. Retorna apenas imóveis com status 'available'.",
          operationId: "listPublicProperties",
          parameters: [{ name: "tenantId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": {
              description: "Lista de imóveis disponíveis",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Property" },
                  },
                },
              },
            },
          },
        },
      },

      // ==================== LEADS ====================
      "/leads": {
        get: {
          tags: ["Leads"],
          summary: "Listar leads do tenant",
          operationId: "listLeads",
          security: [{ session: [] }],
          responses: {
            "200": {
              description: "Lista de leads",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Lead" },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
        post: {
          tags: ["Leads"],
          summary: "Criar lead",
          operationId: "createLead",
          security: [{ session: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InsertLead" },
              },
            },
          },
          responses: {
            "201": {
              description: "Lead criado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Lead" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/leads/{id}": {
        get: {
          tags: ["Leads"],
          summary: "Obter lead por ID",
          operationId: "getLead",
          security: [{ session: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": {
              description: "Dados do lead",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Lead" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
        patch: {
          tags: ["Leads"],
          summary: "Atualizar lead",
          operationId: "updateLead",
          security: [{ session: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InsertLead" },
              },
            },
          },
          responses: {
            "200": {
              description: "Lead atualizado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Lead" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
        delete: {
          tags: ["Leads"],
          summary: "Deletar lead",
          operationId: "deleteLead",
          security: [{ session: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": {
              description: "Lead deletado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/leads/public": {
        post: {
          tags: ["Leads"],
          summary: "Criar lead via portal público",
          description: "Endpoint público com rate limiting. Usado pelo formulário de contato do site público.",
          operationId: "createPublicLead",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InsertLead" },
              },
            },
          },
          responses: {
            "201": {
              description: "Lead criado",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      lead: { $ref: "#/components/schemas/Lead" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "429": { $ref: "#/components/responses/TooManyRequests" },
          },
        },
      },

      // ==================== VISITS ====================
      "/visits": {
        get: {
          tags: ["Visits"],
          summary: "Listar visitas do tenant",
          operationId: "listVisits",
          security: [{ session: [] }],
          responses: {
            "200": {
              description: "Lista de visitas",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Visit" },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
        post: {
          tags: ["Visits"],
          summary: "Agendar visita",
          operationId: "createVisit",
          security: [{ session: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InsertVisit" },
              },
            },
          },
          responses: {
            "201": {
              description: "Visita agendada",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Visit" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },

      // ==================== CONTRACTS ====================
      "/contracts": {
        get: {
          tags: ["Contracts"],
          summary: "Listar contratos do tenant",
          operationId: "listContracts",
          security: [{ session: [] }],
          responses: {
            "200": {
              description: "Lista de contratos",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Contract" },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
        post: {
          tags: ["Contracts"],
          summary: "Criar contrato",
          operationId: "createContract",
          security: [{ session: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InsertContract" },
              },
            },
          },
          responses: {
            "201": {
              description: "Contrato criado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Contract" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/contracts/{id}": {
        get: {
          tags: ["Contracts"],
          summary: "Obter contrato por ID",
          operationId: "getContract",
          security: [{ session: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": {
              description: "Dados do contrato",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Contract" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },

      // ==================== PORTAL ====================
      "/portal/login": {
        post: {
          tags: ["Portal"],
          summary: "Login do portal (proprietário/inquilino)",
          description: "Autentica via JWT. Token é retornado como cookie httpOnly. Rate-limited a 20 tentativas por 15 minutos.",
          operationId: "portalLogin",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Login bem-sucedido",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PortalLoginResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": {
              description: "Credenciais inválidas",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "429": { $ref: "#/components/responses/TooManyRequests" },
          },
        },
      },
      "/portal/me": {
        get: {
          tags: ["Portal"],
          summary: "Dados do usuário do portal autenticado",
          operationId: "portalGetMe",
          security: [{ portalToken: [] }],
          responses: {
            "200": {
              description: "Dados do usuário do portal",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PortalMeResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/portal/logout": {
        post: {
          tags: ["Portal"],
          summary: "Logout do portal",
          operationId: "portalLogout",
          responses: {
            "200": {
              description: "Logout bem-sucedido",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string", example: "Logout realizado com sucesso" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/portal/owner/dashboard": {
        get: {
          tags: ["Portal"],
          summary: "Dashboard do proprietário",
          operationId: "portalOwnerDashboard",
          security: [{ portalToken: [] }],
          responses: {
            "200": {
              description: "Dados do dashboard",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OwnerDashboard" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
          },
        },
      },
      "/portal/renter/dashboard": {
        get: {
          tags: ["Portal"],
          summary: "Dashboard do inquilino",
          operationId: "portalRenterDashboard",
          security: [{ portalToken: [] }],
          responses: {
            "200": {
              description: "Dados do dashboard",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RenterDashboard" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
          },
        },
      },

      // ==================== HEALTH ====================
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          description: "Verifica o estado da aplicação e conexão com banco de dados.",
          operationId: "healthCheck",
          responses: {
            "200": {
              description: "Sistema operacional",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                },
              },
            },
            "503": {
              description: "Sistema degradado ou com erro",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                },
              },
            },
          },
        },
      },
      "/ready": {
        get: {
          tags: ["Health"],
          summary: "Readiness probe",
          operationId: "readinessProbe",
          responses: {
            "200": {
              description: "Aplicação pronta",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ready: { type: "boolean", example: true },
                      timestamp: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            "503": {
              description: "Aplicação não pronta",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ready: { type: "boolean", example: false },
                      reason: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    components: {
      securitySchemes: {
        session: {
          type: "apiKey",
          in: "cookie",
          name: "imobibase.sid",
          description: "Session cookie (httpOnly, secure em produção)",
        },
        portalToken: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token para portal self-service. Também aceito via cookie httpOnly 'portal_token'.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
          required: ["error"],
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "admin@imobiliaria.com" },
            password: { type: "string", format: "password", minLength: 8 },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["companyName", "slug", "name", "email", "password"],
          properties: {
            companyName: { type: "string", example: "Imobiliária Exemplo" },
            slug: { type: "string", example: "imobiliaria-exemplo", minLength: 3, pattern: "^[a-z0-9-]+$" },
            name: { type: "string", example: "João Silva" },
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password", minLength: 8 },
            phone: { type: "string", example: "(11) 99999-9999" },
          },
        },
        UserInfo: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["admin", "user", "manager"] },
            avatar: { type: "string", nullable: true },
          },
        },
        Tenant: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            logo: { type: "string", nullable: true },
            primaryColor: { type: "string", example: "#0066cc" },
            secondaryColor: { type: "string", example: "#333333" },
            phone: { type: "string", nullable: true },
            email: { type: "string", nullable: true },
            address: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/UserInfo" },
            tenant: { $ref: "#/components/schemas/Tenant" },
            csrfToken: { type: "string", description: "Token CSRF para Double Submit Cookie pattern" },
          },
        },
        Property: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            type: { type: "string", enum: ["casa", "apartamento", "terreno", "comercial", "rural"] },
            category: { type: "string", enum: ["venda", "aluguel"] },
            price: { type: "string", description: "Valor decimal como string (ex: '450000.00')" },
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zipCode: { type: "string", nullable: true },
            bedrooms: { type: "integer", nullable: true },
            bathrooms: { type: "integer", nullable: true },
            area: { type: "integer", nullable: true, description: "Área em m²" },
            features: { type: "array", items: { type: "string" }, nullable: true },
            images: { type: "array", items: { type: "string" }, nullable: true },
            status: { type: "string", enum: ["available", "sold", "rented", "inactive"] },
            featured: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        InsertProperty: {
          type: "object",
          required: ["title", "type", "category", "price", "address", "city", "state"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            type: { type: "string" },
            category: { type: "string" },
            price: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zipCode: { type: "string" },
            bedrooms: { type: "integer" },
            bathrooms: { type: "integer" },
            area: { type: "integer" },
            features: { type: "array", items: { type: "string" } },
            images: { type: "array", items: { type: "string" } },
            status: { type: "string", default: "available" },
            featured: { type: "boolean", default: false },
          },
        },
        Lead: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            source: { type: "string" },
            status: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] },
            budget: { type: "string", nullable: true },
            interests: { type: "array", items: { type: "string" }, nullable: true },
            notes: { type: "string", nullable: true },
            assignedTo: { type: "string", format: "uuid", nullable: true },
            preferredType: { type: "string", nullable: true },
            preferredCategory: { type: "string", nullable: true },
            preferredCity: { type: "string", nullable: true },
            preferredNeighborhood: { type: "string", nullable: true },
            minBedrooms: { type: "integer", nullable: true },
            maxBedrooms: { type: "integer", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        InsertLead: {
          type: "object",
          required: ["name", "email", "phone", "source"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            source: { type: "string" },
            status: { type: "string", default: "new" },
            budget: { type: "string" },
            interests: { type: "array", items: { type: "string" } },
            notes: { type: "string" },
            assignedTo: { type: "string", format: "uuid" },
            preferredType: { type: "string" },
            preferredCategory: { type: "string" },
            preferredCity: { type: "string" },
            preferredNeighborhood: { type: "string" },
            minBedrooms: { type: "integer" },
            maxBedrooms: { type: "integer" },
          },
        },
        Visit: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            propertyId: { type: "string", format: "uuid" },
            leadId: { type: "string", format: "uuid", nullable: true },
            scheduledFor: { type: "string", format: "date-time" },
            status: { type: "string", enum: ["scheduled", "completed", "cancelled", "no_show"] },
            notes: { type: "string", nullable: true },
            assignedTo: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        InsertVisit: {
          type: "object",
          required: ["propertyId", "scheduledFor"],
          properties: {
            propertyId: { type: "string", format: "uuid" },
            leadId: { type: "string", format: "uuid" },
            scheduledFor: { type: "string", format: "date-time" },
            status: { type: "string", default: "scheduled" },
            notes: { type: "string" },
            assignedTo: { type: "string", format: "uuid" },
          },
        },
        Contract: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            propertyId: { type: "string", format: "uuid" },
            leadId: { type: "string", format: "uuid" },
            type: { type: "string" },
            status: { type: "string", enum: ["draft", "sent", "signed", "cancelled"] },
            value: { type: "string" },
            terms: { type: "string", nullable: true },
            clicksignDocumentKey: { type: "string", nullable: true },
            signedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        InsertContract: {
          type: "object",
          required: ["propertyId", "leadId", "type", "value"],
          properties: {
            propertyId: { type: "string", format: "uuid" },
            leadId: { type: "string", format: "uuid" },
            type: { type: "string" },
            status: { type: "string", default: "draft" },
            value: { type: "string" },
            terms: { type: "string" },
          },
        },
        PortalLoginResponse: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string", format: "email" },
                clientType: { type: "string", enum: ["owner", "renter"] },
                clientId: { type: "string", format: "uuid" },
                name: { type: "string" },
                tenantId: { type: "string", format: "uuid" },
              },
            },
            tenant: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                slug: { type: "string" },
                logo: { type: "string", nullable: true },
                primaryColor: { type: "string" },
              },
            },
          },
        },
        PortalMeResponse: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string", format: "email" },
                clientType: { type: "string", enum: ["owner", "renter"] },
                clientId: { type: "string", format: "uuid" },
                name: { type: "string" },
                phone: { type: "string" },
                lastLogin: { type: "string", format: "date-time", nullable: true },
              },
            },
            tenant: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                slug: { type: "string" },
                logo: { type: "string", nullable: true },
                primaryColor: { type: "string" },
                phone: { type: "string", nullable: true },
                email: { type: "string", nullable: true },
              },
            },
          },
        },
        OwnerDashboard: {
          type: "object",
          properties: {
            totalProperties: { type: "integer" },
            activeContracts: { type: "integer" },
            occupancyRate: { type: "integer", description: "Percentual de ocupação (0-100)" },
            monthlyRevenue: { type: "number" },
            pendingTransfers: { type: "integer" },
            pendingTransfersValue: { type: "number" },
            openTickets: { type: "integer" },
          },
        },
        RenterDashboard: {
          type: "object",
          properties: {
            contract: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                rentValue: { type: "string" },
                dueDay: { type: "integer" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                status: { type: "string" },
              },
            },
            property: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                title: { type: "string" },
                address: { type: "string" },
                city: { type: "string" },
                images: { type: "array", items: { type: "string" } },
              },
            },
            nextPayment: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                dueDate: { type: "string" },
                totalValue: { type: "string" },
                status: { type: "string" },
                referenceMonth: { type: "string" },
              },
            },
            openTickets: { type: "integer" },
            totalContracts: { type: "integer" },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok", "degraded", "error"] },
            timestamp: { type: "string", format: "date-time" },
            uptime: { type: "number", description: "Uptime em segundos" },
            environment: { type: "string" },
            version: { type: "string" },
            database: { type: "string", enum: ["connected", "disconnected", "error"] },
            message: { type: "string" },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Dados inválidos",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Unauthorized: {
          description: "Não autenticado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Forbidden: {
          description: "Acesso negado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NotFound: {
          description: "Recurso não encontrado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        TooManyRequests: {
          description: "Muitas requisições - rate limit excedido",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  };
}
