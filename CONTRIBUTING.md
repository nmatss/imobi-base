# Contribuindo com o ImobiBase

## Como Contribuir

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/minha-feature`)
3. Commit suas alterações (`git commit -m 'feat: adicionar minha feature'`)
4. Push para a branch (`git push origin feature/minha-feature`)
5. Abra um Pull Request

## Padrões de Código

### Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nova funcionalidade
fix: correção de bug
docs: alteração de documentação
style: formatação (sem mudança de lógica)
refactor: refatoração de código
test: adição ou correção de testes
chore: manutenção geral
```

### TypeScript

- Strict mode habilitado
- Validação de tipos com Zod para inputs externos
- Sem `any` — use tipos específicos ou `unknown`

### Frontend

- Componentes funcionais com hooks
- shadcn/ui para componentes base
- Tailwind CSS para estilização
- React Query para data fetching
- Lazy loading para páginas

### Backend

- Validação de input em todas as rotas
- Queries parametrizadas (nunca string interpolation)
- Rate limiting em endpoints sensíveis
- Logging estruturado com Winston

## Ambiente de Desenvolvimento

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env

# Criar banco
npm run db:push

# Dados de demonstração
npm run db:seed

# Iniciar servidor
npm run dev
```

## Testes

Antes de submeter um PR, execute:

```bash
# Testes unitários
npm test

# Verificação de tipos
npm run check

# Linting
npm run lint

# Testes E2E (requer servidor rodando)
npm run test:e2e
```

## Estrutura de Diretórios

- `client/src/components/` — Componentes React reutilizáveis
- `client/src/pages/` — Páginas da aplicação
- `client/src/hooks/` — Hooks customizados
- `client/src/lib/` — Utilitários e contextos
- `server/` — Backend Express
- `shared/` — Schemas e tipos compartilhados
- `tests/` — Testes E2E, segurança, acessibilidade
- `docs/` — Documentação técnica

## Segurança

- Nunca commite `.env`, credenciais ou chaves de API
- Use `npm run validate:secrets` para verificar vazamentos
- Siga as práticas documentadas em [SECURITY.md](SECURITY.md)
- Reporte vulnerabilidades por email (veja SECURITY.md)

## Pull Requests

- PRs devem ter descrição clara do que foi alterado e por quê
- Inclua screenshots para mudanças visuais
- Testes devem passar no CI
- Mantenha PRs focados — uma feature/fix por PR
