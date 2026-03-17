# Contribuindo para o ImobiBase

Obrigado pelo interesse em contribuir! Este guia explica como participar do desenvolvimento do projeto.

## Como Contribuir

1. Faca um fork do repositorio
2. Crie uma branch para sua feature ou correcao
3. Implemente suas alteracoes com testes
4. Abra um Pull Request para `main`

## Pre-requisitos

- **Node.js** 20+
- **PostgreSQL** 14+ (ou SQLite para desenvolvimento local com `USE_SQLITE=true`)
- **Redis** (opcional, usado para filas e cache)

## Setup do Ambiente

```bash
git clone https://github.com/nmatss/imobi-base.git
cd imobi-base
npm install
cp .env.example .env
# Edite .env com suas credenciais locais
npm run db:push
npm run db:seed  # dados de demonstracao
npm run dev
```

O servidor estara disponivel em `http://localhost:5000`.

## Estrutura do Projeto

| Diretorio  | Descricao                                      |
| ---------- | ---------------------------------------------- |
| `client/`  | Frontend React (Vite, TailwindCSS, shadcn/ui)  |
| `server/`  | Backend Express (rotas, servicos, integracoes) |
| `shared/`  | Schemas Drizzle e tipos compartilhados         |
| `tests/`   | Testes unitarios e E2E                         |
| `docs/`    | Documentacao tecnica e guias                   |
| `scripts/` | Scripts de automacao, seed e migracao          |

## Padrao de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
<tipo>: <descricao curta>
```

| Tipo       | Uso                                 |
| ---------- | ----------------------------------- |
| `feat`     | Nova funcionalidade                 |
| `fix`      | Correcao de bug                     |
| `docs`     | Apenas documentacao                 |
| `refactor` | Refatoracao sem mudar comportamento |
| `test`     | Adicao ou ajuste de testes          |
| `chore`    | Manutencao geral                    |

Exemplos:

```
feat: adicionar filtro por bairro na busca de imoveis
fix: corrigir calculo de comissao no fechamento
docs: atualizar guia de deploy
```

## Pre-commit Hooks

Ao fazer commit, os seguintes checks rodam automaticamente nos arquivos staged:

- **ESLint + Prettier** (via `lint-staged`) -- formatacao e analise estatica
- **Vitest** -- testes relacionados aos arquivos alterados

Esses hooks rodam apenas nos arquivos staged, entao sao rapidos. Se algum check falhar, o commit sera bloqueado ate a correcao.

## Testes

```bash
# Testes unitarios
npm test

# Testes E2E com Playwright
npm run test:e2e

# Relatorio de cobertura
npm run test:coverage
```

- O threshold minimo de cobertura e **70%**.
- Novas features devem incluir testes unitarios.
- Alteracoes em fluxos criticos devem incluir testes E2E.

## Code Style

- TypeScript em **strict mode**
- Use `unknown` em vez de `any`
- Prefira `const` sobre `let`
- Use `import.meta.env.DEV` para codigo exclusivo de desenvolvimento
- Siga os padroes ja existentes no codebase
- Nomeie arquivos em `kebab-case`

## Pull Requests

1. Crie uma branch a partir de `main`:
   ```bash
   git checkout -b feat/minha-feature main
   ```
2. Mantenha PRs focados e pequenos (uma feature ou correcao por PR)
3. Escreva testes para funcionalidades novas
4. Garanta que todos os checks passam antes de solicitar review
5. Descreva claramente o que foi feito e por que no corpo do PR

## Seguranca

- **Nunca** commite arquivos `.env` ou credenciais
- Use `SecretManager` para registrar novos secrets
- Siga as diretrizes do [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- Reporte vulnerabilidades de forma **privada** via email ou pela aba Security do GitHub

## Duvidas?

Abra uma [issue](https://github.com/nmatss/imobi-base/issues) ou inicie uma discussao no repositorio.
