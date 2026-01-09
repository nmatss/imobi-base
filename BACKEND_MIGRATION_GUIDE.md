# BACKEND VALIDATION & ERROR HANDLING - GUIA DE MIGRAÇÃO

## INÍCIO RÁPIDO

### 1. Importações Necessárias

```typescript
import { validateBody, validateQuery, validateParams, ValidatedRequest } from './middleware/validate';
import { asyncHandler, NotFoundError, AuthError, BadRequestError } from './middleware/error-handler';
import { createResourceSchema, updateResourceSchema, resourceQuerySchema, idParamSchema } from './schemas';
```

### 2. Padrão Antigo vs Novo

#### ANTES (Padrão Antigo):

```typescript
app.post('/api/resource', requireAuth, async (req, res) => {
  try {
    // Validação manual
    if (!req.body.name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!req.body.email || !isValidEmail(req.body.email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const data = {
      ...req.body,
      tenantId: req.user.tenantId,
    };

    const resource = await storage.createResource(data);
    res.status(201).json(resource);
  } catch (error: any) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: error.message || 'Failed to create resource' });
  }
});
```

#### DEPOIS (Padrão Novo):

```typescript
app.post(
  '/api/resource',
  requireAuth,
  validateBody(createResourceSchema),
  asyncHandler(async (req: ValidatedRequest<InsertResource>, res) => {
    if (!req.user) throw new AuthError();

    const data = {
      ...req.body,
      tenantId: req.user.tenantId,
    };

    const resource = await storage.createResource(data);
    res.status(201).json(resource);
  })
);
```

### 3. Benefícios Imediatos

✅ **Type-Safety**: `req.body` é totalmente tipado
✅ **Validação Automática**: Sem código de validação manual
✅ **Error Handling**: Sem try/catch repetitivo
✅ **Código Limpo**: 50% menos código
✅ **Mensagens Claras**: Erros detalhados automáticos

---

## EXEMPLOS POR TIPO DE ROTA

### GET com Query Parameters

#### Antes:
```typescript
app.get('/api/resources', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    const resources = await storage.getResources({
      tenantId: req.user.tenantId,
      page,
      limit,
      status: req.query.status as string,
    });

    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});
```

#### Depois:
```typescript
app.get(
  '/api/resources',
  requireAuth,
  validateQuery(resourceQuerySchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const { page, limit, status } = req.query;

    const resources = await storage.getResources({
      tenantId: req.user!.tenantId,
      page,
      limit,
      status,
    });

    res.json(resources);
  })
);
```

### GET por ID

#### Antes:
```typescript
app.get('/api/resource/:id', requireAuth, async (req, res) => {
  try {
    const resource = await storage.getResource(req.params.id);

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (resource.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});
```

#### Depois:
```typescript
app.get(
  '/api/resource/:id',
  requireAuth,
  validateParams(idParamSchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const resource = await storage.getResource(req.params.id);

    if (!resource || resource.tenantId !== req.user!.tenantId) {
      throw new NotFoundError('Resource');
    }

    res.json(resource);
  })
);
```

### POST (Create)

#### Antes:
```typescript
app.post('/api/resource', requireAuth, async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const data = insertResourceSchema.parse({
      ...req.body,
      tenantId: req.user.tenantId,
    });

    const resource = await storage.createResource(data);
    res.status(201).json(resource);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create resource' });
  }
});
```

#### Depois:
```typescript
app.post(
  '/api/resource',
  requireAuth,
  validateBody(createResourceSchema),
  asyncHandler(async (req: ValidatedRequest<InsertResource>, res) => {
    const data = {
      ...req.body,
      tenantId: req.user!.tenantId,
    };

    const resource = await storage.createResource(data);
    res.status(201).json(resource);
  })
);
```

### PATCH (Update)

#### Antes:
```typescript
app.patch('/api/resource/:id', requireAuth, async (req, res) => {
  try {
    const existing = await storage.getResource(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (existing.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const resource = await storage.updateResource(req.params.id, req.body);
    res.json(resource);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update resource' });
  }
});
```

#### Depois:
```typescript
app.patch(
  '/api/resource/:id',
  requireAuth,
  validateParams(idParamSchema),
  validateBody(updateResourceSchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const existing = await storage.getResource(req.params.id);

    if (!existing || existing.tenantId !== req.user!.tenantId) {
      throw new NotFoundError('Resource');
    }

    const resource = await storage.updateResource(req.params.id, req.body);
    res.json(resource);
  })
);
```

### DELETE

#### Antes:
```typescript
app.delete('/api/resource/:id', requireAuth, async (req, res) => {
  try {
    const existing = await storage.getResource(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (existing.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const success = await storage.deleteResource(req.params.id);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});
```

#### Depois:
```typescript
app.delete(
  '/api/resource/:id',
  requireAuth,
  validateParams(idParamSchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const existing = await storage.getResource(req.params.id);

    if (!existing || existing.tenantId !== req.user!.tenantId) {
      throw new NotFoundError('Resource');
    }

    const success = await storage.deleteResource(req.params.id);
    res.json({ success });
  })
);
```

---

## CRIANDO NOVOS SCHEMAS

### Schema Básico

```typescript
// Em /server/schemas/index.ts

import { z } from 'zod';
import { insertResourceSchema } from '@shared/schema-sqlite';

export const createResourceSchema = insertResourceSchema.extend({
  // Customizações adicionais
  price: z.string().or(z.number()), // Aceita string ou number
  email: z.string().email(), // Validação de email
});

export const updateResourceSchema = createResourceSchema.partial(); // Todos os campos opcionais

export const resourceQuerySchema = paginationSchema.extend({
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
});
```

### Schema com Validações Customizadas

```typescript
export const createUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),

  email: z.string()
    .email('Invalid email address')
    .transform(email => email.toLowerCase()),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[0-9]/, 'Password must contain number'),

  age: z.number()
    .int('Age must be an integer')
    .min(18, 'Must be 18 or older')
    .max(120, 'Invalid age'),

  role: z.enum(['admin', 'user', 'guest'])
    .default('user'),
});
```

---

## TRATAMENTO DE ERROS

### Usar Classes de Erro

```typescript
// Ao invés de:
if (!resource) {
  return res.status(404).json({ error: 'Not found' });
}

// Use:
if (!resource) {
  throw new NotFoundError('Resource');
}
```

### Lista de Erros Disponíveis

```typescript
throw new ValidationError('Validation failed'); // 400
throw new BadRequestError('Invalid request'); // 400
throw new AuthError(); // 401
throw new ForbiddenError(); // 403
throw new NotFoundError('Resource'); // 404
throw new ConflictError('Already exists'); // 409
throw new RateLimitError(); // 429
throw new InternalError(); // 500
throw new ServiceUnavailableError(); // 503
```

### Erros com Detalhes

```typescript
// ValidationError com detalhes Zod
if (error instanceof ZodError) {
  throw new ValidationError('Invalid data', error.errors);
}

// Resposta automática:
{
  "error": "Invalid data",
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address",
      "code": "invalid_string"
    }
  ]
}
```

---

## REFATORAÇÃO MODULAR

### Estrutura de Pastas

```
server/
  routes/
    properties/
      index.ts
      schemas.ts      (opcional - schemas específicos)
      validators.ts   (opcional - validadores custom)
    leads/
      index.ts
    contracts/
      index.ts
```

### Template de Router

```typescript
// /server/routes/resources/index.ts

import { Router } from 'express';
import { storage } from '../../storage';
import { validateBody, validateParams, validateQuery, ValidatedRequest } from '../../middleware/validate';
import { asyncHandler, NotFoundError } from '../../middleware/error-handler';
import { createResourceSchema, updateResourceSchema, resourceQuerySchema, idParamSchema } from '../../schemas';

const router = Router();

// LIST
router.get(
  '/',
  validateQuery(resourceQuerySchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const resources = await storage.listResources({
      tenantId: req.user!.tenantId,
      ...req.query,
    });
    res.json(resources);
  })
);

// GET
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const resource = await storage.getResource(req.params.id);
    if (!resource || resource.tenantId !== req.user!.tenantId) {
      throw new NotFoundError('Resource');
    }
    res.json(resource);
  })
);

// CREATE
router.post(
  '/',
  validateBody(createResourceSchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const resource = await storage.createResource({
      ...req.body,
      tenantId: req.user!.tenantId,
    });
    res.status(201).json(resource);
  })
);

// UPDATE
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateResourceSchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const existing = await storage.getResource(req.params.id);
    if (!existing || existing.tenantId !== req.user!.tenantId) {
      throw new NotFoundError('Resource');
    }
    const resource = await storage.updateResource(req.params.id, req.body);
    res.json(resource);
  })
);

// DELETE
router.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const existing = await storage.getResource(req.params.id);
    if (!existing || existing.tenantId !== req.user!.tenantId) {
      throw new NotFoundError('Resource');
    }
    await storage.deleteResource(req.params.id);
    res.json({ success: true });
  })
);

export default router;
```

### Registro no index.ts

```typescript
// Em routes.ts ou index.ts
import resourceRoutes from './routes/resources';

app.use('/api/resources', requireAuth, resourceRoutes);
```

---

## CHECKLIST DE MIGRAÇÃO

Para migrar uma rota existente:

1. **Identificar o tipo de rota**
   - [ ] GET (list)
   - [ ] GET (single)
   - [ ] POST (create)
   - [ ] PATCH (update)
   - [ ] DELETE

2. **Criar ou identificar schema**
   - [ ] Schema existe em `/server/schemas/index.ts`?
   - [ ] Se não, criar novo schema

3. **Adicionar validação**
   - [ ] Importar `validateBody/Query/Params`
   - [ ] Aplicar no middleware chain
   - [ ] Remover validações manuais

4. **Substituir try/catch**
   - [ ] Importar `asyncHandler`
   - [ ] Envolver handler com `asyncHandler`
   - [ ] Remover try/catch

5. **Usar classes de erro**
   - [ ] Substituir `res.status(404).json(...)` por `throw new NotFoundError(...)`
   - [ ] Substituir `res.status(401).json(...)` por `throw new AuthError()`
   - [ ] Etc.

6. **Adicionar types**
   - [ ] Importar `ValidatedRequest`
   - [ ] Tipar request: `req: ValidatedRequest<TBody, TQuery, TParams>`

7. **Testar**
   - [ ] Request válido funciona
   - [ ] Request inválido retorna 400 com detalhes
   - [ ] Erros são capturados corretamente

---

## DICAS E BOAS PRÁTICAS

### 1. Sempre use asyncHandler

```typescript
// ❌ RUIM
app.get('/api/resource', async (req, res) => {
  const resource = await storage.get();
  res.json(resource);
});

// ✅ BOM
app.get('/api/resource', asyncHandler(async (req, res) => {
  const resource = await storage.get();
  res.json(resource);
}));
```

### 2. Valide tudo

```typescript
// ❌ RUIM - Sem validação
app.post('/api/resource', requireAuth, asyncHandler(async (req, res) => {
  const resource = await storage.create(req.body);
  res.json(resource);
}));

// ✅ BOM - Com validação
app.post(
  '/api/resource',
  requireAuth,
  validateBody(createResourceSchema),
  asyncHandler(async (req, res) => {
    const resource = await storage.create(req.body);
    res.json(resource);
  })
);
```

### 3. Use throw ao invés de return res

```typescript
// ❌ RUIM
if (!resource) {
  return res.status(404).json({ error: 'Not found' });
}

// ✅ BOM
if (!resource) {
  throw new NotFoundError('Resource');
}
```

### 4. Verifique tenant access

```typescript
// Sempre verifique se o recurso pertence ao tenant do usuário
if (!resource || resource.tenantId !== req.user!.tenantId) {
  throw new NotFoundError('Resource');
}
```

### 5. Use coerce para query params

```typescript
// Query params são sempre strings
export const querySchema = z.object({
  page: z.coerce.number().int().min(1), // "1" -> 1
  limit: z.coerce.number().int().max(100),
  active: z.coerce.boolean(), // "true" -> true
});
```

---

## TROUBLESHOOTING

### Erro: "Property does not exist on type 'Request'"

**Solução**: Use `ValidatedRequest`

```typescript
// ❌
async (req: Request, res: Response) => {
  const { name } = req.body; // Type error
}

// ✅
async (req: ValidatedRequest<{ name: string }>, res: Response) => {
  const { name } = req.body; // OK
}
```

### Erro: Validação não está funcionando

**Verifique**:
1. Schema está importado corretamente
2. Middleware está na ordem correta
3. asyncHandler está sendo usado

```typescript
// Ordem correta:
app.post(
  '/api/resource',
  requireAuth,           // 1. Auth
  validateBody(schema),  // 2. Validation
  asyncHandler(handler)  // 3. Handler
);
```

### Erro: "Cannot read property 'tenantId' of undefined"

**Causa**: `req.user` é undefined

**Solução**: Verificar auth antes

```typescript
if (!req.user) throw new AuthError();
const tenantId = req.user.tenantId;
```

---

## RECURSOS ADICIONAIS

### Arquivos de Referência

- `/server/middleware/validate.ts` - Middleware de validação
- `/server/middleware/error-handler.ts` - Error handlers
- `/server/schemas/index.ts` - Todos os schemas
- `/server/routes/properties/index.ts` - Exemplo completo
- `/server/routes-payments.ts` - Rotas validadas
- `/server/routes-esignature.ts` - Rotas validadas

### Documentação Zod

- https://zod.dev
- Validações: https://zod.dev/?id=primitives
- Transformações: https://zod.dev/?id=transform
- Refinamentos: https://zod.dev/?id=refine

---

**Última atualização**: 2025-12-25
**Versão**: 1.0.0
