# AGENTE 8 - PASSOS DE INTEGRAÇÃO

## COMO INTEGRAR O TRABALHO DO AGENTE 8

Este documento descreve os passos exatos para integrar as melhorias de validação e error handling no projeto.

---

## PRÉ-REQUISITOS

Certifique-se de que você tem:
- [x] Node.js instalado
- [x] Dependências instaladas (`npm install`)
- [x] Zod já instalado no projeto

---

## PASSO 1: INTEGRAR ERROR HANDLER NO INDEX.TS

### Arquivo: `/server/index.ts`

**Adicione as importações no topo:**

```typescript
import { errorHandler, notFoundHandler } from './middleware/error-handler';
```

**Adicione os handlers ANTES do serveStatic (linha ~100):**

```typescript
  // Register file upload routes
  registerFileRoutes(app);

  // Add Sentry error handler (must be before custom error handlers)
  addSentryErrorHandler(app);

  // ========== ADICIONE AQUI ==========

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Global error handler (MUST be last)
  app.use(errorHandler);

  // ===================================

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // ... código existente
  });
```

**IMPORTANTE**:
- O `notFoundHandler` deve vir ANTES do `errorHandler`
- O `errorHandler` deve vir DEPOIS do Sentry handler
- Ambos devem vir ANTES do handler padrão do Express

---

## PASSO 2: TESTAR A INTEGRAÇÃO

### 2.1 Teste o Error Handler

```bash
# Inicie o servidor
npm run dev
```

### 2.2 Teste uma rota 404

```bash
curl http://localhost:5000/api/rota-inexistente
```

**Resposta esperada:**
```json
{
  "error": "Route GET /api/rota-inexistente not found",
  "statusCode": 404
}
```

### 2.3 Teste uma rota validada

```bash
# Teste com dados inválidos
curl -X POST http://localhost:5000/api/payments/stripe/create-subscription \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Resposta esperada:**
```json
{
  "error": "Invalid request body",
  "statusCode": 400,
  "errors": [
    {
      "field": "priceId",
      "message": "Required",
      "code": "invalid_type"
    }
  ]
}
```

---

## PASSO 3: APLICAR VALIDAÇÃO EM ROTAS EXISTENTES

### Template de Migração

Para cada rota em `routes.ts`, siga este padrão:

**ANTES:**
```typescript
app.post('/api/resource', requireAuth, async (req, res) => {
  try {
    const data = insertResourceSchema.parse(req.body);
    const resource = await storage.create(data);
    res.json(resource);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
```

**DEPOIS:**
```typescript
import { validateBody, asyncHandler } from './middleware/validate';
import { createResourceSchema } from './schemas';

app.post(
  '/api/resource',
  requireAuth,
  validateBody(createResourceSchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const resource = await storage.create(req.body);
    res.json(resource);
  })
);
```

### Rotas Prioritárias

Aplique validação nestas rotas primeiro (em ordem de prioridade):

1. **Properties (routes.ts, linhas 625-653)**
   - POST /api/properties
   - PATCH /api/properties/:id

2. **Leads (routes.ts, linhas 657-742)**
   - POST /api/leads/public
   - POST /api/leads
   - PATCH /api/leads/:id

3. **Finance (routes.ts, linhas 1411-1516)**
   - POST /api/finance-categories
   - POST /api/finance-entries
   - PATCH endpoints

4. **Rental Contracts (routes.ts, linhas 1003-1192)**
   - POST /api/rental-contracts
   - POST /api/rental-payments
   - PATCH endpoints

5. **WhatsApp (routes-whatsapp.ts)**
   - POST /api/whatsapp/send-message
   - POST /api/whatsapp/templates

---

## PASSO 4: MIGRAR UMA ROTA COMPLETA (EXEMPLO)

### Exemplo: POST /api/properties

**1. Abra `/server/routes.ts`**

**2. Adicione as importações (linha ~1):**
```typescript
import { validateBody, asyncHandler, ValidatedRequest } from './middleware/validate';
import { createPropertySchema } from './schemas';
```

**3. Encontre a rota (linha ~625):**
```typescript
app.post("/api/properties", requireAuth, async (req, res) => {
  try {
    const data = insertPropertySchema.parse({ ...req.body, tenantId: req.user!.tenantId });
    const property = await storage.createProperty(data);
    res.status(201).json(property);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao criar imóvel" });
  }
});
```

**4. Substitua por:**
```typescript
app.post(
  "/api/properties",
  requireAuth,
  validateBody(createPropertySchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const data = {
      ...req.body,
      tenantId: req.user!.tenantId,
    };
    const property = await storage.createProperty(data);
    res.status(201).json(property);
  })
);
```

**5. Teste:**
```bash
# Teste com dados válidos
curl -X POST http://localhost:5000/api/properties \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION" \
  -d '{
    "title": "Casa Test",
    "type": "casa",
    "category": "venda",
    "price": "500000",
    "address": "Rua Test",
    "city": "São Paulo",
    "state": "SP"
  }'

# Teste com dados inválidos
curl -X POST http://localhost:5000/api/properties \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION" \
  -d '{}'
```

---

## PASSO 5: REFATORAR EM MÓDULOS (OPCIONAL)

### Criar módulo de properties

**1. Já existe:** `/server/routes/properties/index.ts`

**2. Registrar no routes.ts:**

```typescript
// No topo do arquivo
import propertyRoutes from './routes/properties';

// Substituir as rotas de properties por:
app.use('/api/properties', requireAuth, propertyRoutes);

// Comentar ou remover:
// app.get("/api/properties", ...);
// app.get("/api/properties/:id", ...);
// app.post("/api/properties", ...);
// app.patch("/api/properties/:id", ...);
// app.delete("/api/properties/:id", ...);
```

**3. Testar:**
```bash
# Deve funcionar igual a antes
curl http://localhost:5000/api/properties
```

---

## PASSO 6: ADICIONAR VALIDAÇÃO EM NOVO ARQUIVO

### Exemplo: routes-whatsapp.ts

**1. Adicione as importações:**
```typescript
import { validateBody, asyncHandler } from './middleware/validate';
import { sendWhatsAppMessageSchema, createWhatsAppTemplateSchema } from './schemas';
```

**2. Aplique validação:**
```typescript
app.post(
  '/api/whatsapp/send-message',
  validateBody(sendWhatsAppMessageSchema),
  asyncHandler(async (req, res) => {
    // ... lógica
  })
);
```

---

## PASSO 7: CRIAR SCHEMA CUSTOMIZADO

Se precisar de um schema que não existe:

**1. Abra `/server/schemas/index.ts`**

**2. Adicione o schema:**
```typescript
export const createMyResourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().int().min(18, 'Must be 18+'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateMyResourceSchema = createMyResourceSchema.partial();
```

**3. Use na rota:**
```typescript
import { createMyResourceSchema } from './schemas';

app.post(
  '/api/my-resource',
  validateBody(createMyResourceSchema),
  asyncHandler(async (req, res) => {
    // req.body is validated!
  })
);
```

---

## CHECKLIST DE INTEGRAÇÃO

### Setup Inicial
- [ ] Error handler adicionado ao index.ts
- [ ] Servidor reiniciado
- [ ] Teste 404 funcionando
- [ ] Teste validação funcionando

### Aplicar Validação
- [ ] Properties - 3 rotas
- [ ] Leads - 3 rotas
- [ ] Finance - 6 rotas
- [ ] Rental - 5 rotas
- [ ] WhatsApp - todas

### Refatoração (Opcional)
- [ ] Properties em módulo
- [ ] Leads em módulo
- [ ] Contracts em módulo
- [ ] Outros módulos

### Testes
- [ ] Rotas validadas retornam 400 com dados inválidos
- [ ] Rotas retornam 404 quando recurso não existe
- [ ] Rotas retornam 401 quando não autenticado
- [ ] Mensagens de erro são claras

---

## TROUBLESHOOTING

### Erro: "Cannot find module './middleware/validate'"

**Solução:** Verifique se os arquivos foram criados corretamente
```bash
ls -la server/middleware/validate.ts
ls -la server/middleware/error-handler.ts
ls -la server/schemas/index.ts
```

### Erro: "ValidationError is not defined"

**Solução:** Adicione a importação
```typescript
import { ValidationError } from './middleware/error-handler';
```

### Erro: Schema não está validando

**Solução:** Verifique a ordem dos middlewares
```typescript
// ✅ CORRETO
app.post(
  '/api/resource',
  requireAuth,           // 1. Auth primeiro
  validateBody(schema),  // 2. Validação depois
  asyncHandler(handler)  // 3. Handler por último
);

// ❌ ERRADO
app.post(
  '/api/resource',
  validateBody(schema),  // Validação antes de auth
  requireAuth,
  asyncHandler(handler)
);
```

### Erro: TypeScript reclamando de types

**Solução:** Use `ValidatedRequest<T>`
```typescript
import { ValidatedRequest } from './middleware/validate';

asyncHandler(async (req: ValidatedRequest<MyType>, res) => {
  // req.body é do tipo MyType
});
```

---

## PRÓXIMOS PASSOS APÓS INTEGRAÇÃO

1. **Monitorar Sentry**
   - Verificar se erros estão sendo reportados
   - Analisar padrões de erro

2. **Adicionar Testes**
   - Testes unitários para schemas
   - Testes de integração para rotas

3. **Expandir Validação**
   - Aplicar em todas as rotas
   - Criar schemas customizados conforme necessário

4. **Documentar API**
   - Gerar OpenAPI usando zod-to-openapi
   - Criar Swagger UI

5. **Otimizar**
   - Cache de schemas compilados
   - Rate limiting por rota
   - Audit log de validações

---

## RECURSOS

### Documentação
- [AGENTE_8_BACKEND_ROBUSTEZ_REPORT.md](./AGENTE_8_BACKEND_ROBUSTEZ_REPORT.md) - Relatório completo
- [BACKEND_MIGRATION_GUIDE.md](./BACKEND_MIGRATION_GUIDE.md) - Guia de migração
- [AGENTE_8_SUMMARY.md](./AGENTE_8_SUMMARY.md) - Sumário executivo

### Código
- `/server/middleware/validate.ts` - Validação
- `/server/middleware/error-handler.ts` - Error handling
- `/server/schemas/index.ts` - Schemas
- `/server/routes/properties/index.ts` - Exemplo modular

### Externos
- [Zod Documentation](https://zod.dev)
- [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Última atualização:** 2025-12-25
**Versão:** 1.0.0
**Suporte:** Ver documentação acima
