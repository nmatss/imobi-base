# ImobiBase - Guia de Deploy em Producao

> CRM Imobiliario Multi-tenant SaaS
> Stack: React 19 + Express 5 + PostgreSQL + Redis
> Ultima atualizacao: Marco 2026

---

## Sumario

1. [Pre-requisitos](#1-pre-requisitos)
2. [Arquitetura de Deploy](#2-arquitetura-de-deploy)
3. [Contas e Servicos Necessarios](#3-contas-e-servicos-necessarios)
4. [Variaveis de Ambiente](#4-variaveis-de-ambiente)
5. [Deploy Passo-a-Passo](#5-deploy-passo-a-passo)
6. [Banco de Dados](#6-banco-de-dados)
7. [Vercel Cron Jobs](#7-vercel-cron-jobs)
8. [Checklist Pre-Go-Live](#8-checklist-pre-go-live)
9. [Monitoramento Pos-Deploy](#9-monitoramento-pos-deploy)
10. [Rollback](#10-rollback)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Pre-requisitos

### Software Local

| Ferramenta | Versao Minima | Verificacao        |
| ---------- | ------------- | ------------------ |
| Node.js    | 20.x          | `node --version`   |
| npm        | 10.x          | `npm --version`    |
| Git        | 2.40+         | `git --version`    |
| Vercel CLI | Latest        | `vercel --version` |
| psql       | 14+           | `psql --version`   |

### Infraestrutura

| Servico    | Versao Minima | Finalidade               |
| ---------- | ------------- | ------------------------ |
| PostgreSQL | 14+           | Banco de dados principal |
| Redis      | 7+            | Cache, sessoes, filas    |

### Instalacao das Ferramentas

```bash
# Node.js 20 (via nvm)
nvm install 20
nvm use 20

# Vercel CLI
npm install -g vercel

# Verificar tudo
node --version   # v20.x.x
npm --version    # 10.x.x
vercel --version
```

---

## 2. Arquitetura de Deploy

### Visao Geral

```
                    +------------------+
                    |   Cloudflare /   |
                    |   DNS Provider   |
                    +--------+---------+
                             |
                    +--------v---------+
                    |     Vercel       |
                    |                  |
                    |  +------------+  |        +------------------+
   Usuarios -----> |  | Frontend   |  |        |    Supabase      |
                    |  | (Static)   |  |        |  (PostgreSQL)    |
                    |  +------------+  |  SQL   |  gru1 region     |
                    |                  +------->|                  |
                    |  +------------+  |        +------------------+
                    |  | API        |  |
                    |  | (Serverless)|  |        +------------------+
                    |  +------------+  |  Redis |    Upstash       |
                    |                  +------->|  (Redis)         |
                    |  +------------+  |        |  gru1 region     |
                    |  | Cron Jobs  |  |        +------------------+
                    |  | (9 endpoints)|
                    |  +------------+  |
                    +------------------+
```

### Componentes

| Componente     | Provedor            | Funcao                                          |
| -------------- | ------------------- | ----------------------------------------------- |
| Frontend       | Vercel (Static)     | React 19 SPA, servido como arquivos estaticos   |
| API            | Vercel (Serverless) | Express 5, funcoes serverless (max 30s, 1024MB) |
| Banco de Dados | Supabase            | PostgreSQL 15, connection pooling via Supavisor |
| Cache/Sessoes  | Upstash             | Redis 7, persistente, compativel com serverless |
| Cron Jobs      | Vercel Cron         | 9 endpoints HTTP autenticados por `CRON_SECRET` |
| Filas          | BullMQ + Redis      | Processamento assincrono de emails, pagamentos  |

### Regiao

O projeto esta configurado para a regiao `gru1` (Sao Paulo) no Vercel para minimizar latencia para usuarios brasileiros. Mantenha Supabase e Upstash na mesma regiao (`sa-east-1`).

### Serverless vs Persistente

O ImobiBase suporta dois modelos de deploy:

- **Vercel (Serverless)**: API como funcoes serverless. Cron jobs via HTTP endpoints do Vercel Cron. `node-cron` e automaticamente desabilitado.
- **Docker/Railway (Persistente)**: Servidor Node.js persistente. `node-cron` e ativado automaticamente para agendamento in-process. Nao depende de Vercel Cron.

A deteccao e automatica via `process.env.VERCEL`.

---

## 3. Contas e Servicos Necessarios

| Servico                   | Finalidade                         | Obrigatorio | Plano Minimo      | URL                                                                      |
| ------------------------- | ---------------------------------- | ----------- | ----------------- | ------------------------------------------------------------------------ |
| **Vercel**                | Hosting (API + Frontend)           | Sim         | Pro ($20/mes)     | [vercel.com](https://vercel.com)                                         |
| **Supabase**              | PostgreSQL Database                | Sim         | Pro ($25/mes)     | [supabase.com](https://supabase.com)                                     |
| **Upstash**               | Redis (cache, sessoes, filas)      | Sim         | Pay-as-you-go     | [upstash.com](https://upstash.com)                                       |
| **Stripe**                | Pagamentos internacionais          | Sim\*       | Sem mensalidade   | [stripe.com](https://stripe.com)                                         |
| **Mercado Pago**          | Pagamentos Brasil (PIX, boleto)    | Sim\*       | Sem mensalidade   | [mercadopago.com.br](https://www.mercadopago.com.br/developers)          |
| **SendGrid**              | Email transacional                 | Sim\*\*     | Free (100/dia)    | [sendgrid.com](https://sendgrid.com)                                     |
| **Resend**                | Email transacional (alternativa)   | Sim\*\*     | Free (100/dia)    | [resend.com](https://resend.com)                                         |
| **Sentry**                | Monitoramento de erros             | Sim         | Free (5K eventos) | [sentry.io](https://sentry.io)                                           |
| **ClickSign**             | Assinatura digital de contratos    | Nao\*\*\*   | Sob demanda       | [clicksign.com](https://www.clicksign.com)                               |
| **Twilio**                | SMS / 2FA                          | Nao\*\*\*   | Pay-as-you-go     | [twilio.com](https://www.twilio.com)                                     |
| **Google Maps**           | Geocoding, mapas de imoveis        | Nao\*\*\*   | $200 credito/mes  | [cloud.google.com/maps-platform](https://cloud.google.com/maps-platform) |
| **WhatsApp Business API** | Mensagens via WhatsApp             | Nao\*\*\*   | Via Meta Business | [developers.facebook.com](https://developers.facebook.com)               |
| **Anthropic (Claude)**    | IA para descricoes, marketing, AVM | Nao         | Pay-as-you-go     | [console.anthropic.com](https://console.anthropic.com)                   |
| **PostHog**               | Analytics de produto               | Nao         | Free (1M eventos) | [posthog.com](https://posthog.com)                                       |
| **Google Analytics**      | Analytics web                      | Nao         | Free              | [analytics.google.com](https://analytics.google.com)                     |

> \* Pelo menos um gateway de pagamento (Stripe ou Mercado Pago) e necessario para cobranca de assinaturas.
>
> \*\* Pelo menos um servico de email (SendGrid ou Resend) e necessario.
>
> \*\*\* Funcionalidade degradada sem o servico; o sistema funciona com fallbacks ou desabilita o modulo correspondente.

---

## 4. Variaveis de Ambiente

Copie `.env.example` como ponto de partida. **Nunca** commite `.env` ou `.env.production` no repositorio.

### 4.1 Database

| Variavel       | Obrigatoria | Descricao                                                         | Como Obter                                                                  |
| -------------- | ----------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL` | Sim         | Connection string PostgreSQL (Supabase). Use porta 6543 (pooler). | Supabase Dashboard > Settings > Database > Connection String (Session mode) |

### 4.2 Seguranca

| Variavel                  | Obrigatoria  | Descricao                                                                                                                            | Como Obter                                            |
| ------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `SESSION_SECRET`          | Sim          | Chave para assinar cookies de sessao. Minimo 32 caracteres, recomendado 64+. O servidor recusa iniciar com secret fraco em producao. | `openssl rand -base64 64`                             |
| `CRON_SECRET`             | Sim (Vercel) | Autentica requisicoes dos cron jobs do Vercel. Minimo 32 caracteres.                                                                 | `openssl rand -base64 48`                             |
| `COOKIE_DOMAIN`           | Nao          | Dominio dos cookies (ex: `.imobibase.com`). Deixe vazio para deteccao automatica.                                                    | Definir manualmente se usar subdominios               |
| `CSRF_SECRET`             | Nao          | Chave para tokens CSRF. Auto-gerado se nao definido.                                                                                 | `openssl rand -base64 32`                             |
| `ENCRYPTION_KEY`          | Nao          | Chave para criptografia de dados sensiveis (tokens OAuth, API keys armazenadas).                                                     | `openssl rand -base64 32`                             |
| `CORS_ORIGINS`            | Sim          | Lista de origens permitidas, separadas por virgula. Remova localhost em producao.                                                    | Ex: `https://imobibase.com,https://www.imobibase.com` |
| `RATE_LIMIT_WINDOW_MS`    | Nao          | Janela de rate limiting em ms (padrao: 900000 = 15min).                                                                              | Definir manualmente                                   |
| `RATE_LIMIT_MAX_REQUESTS` | Nao          | Max requisicoes por janela (padrao: 100).                                                                                            | Definir manualmente                                   |

### 4.3 Monitoramento

| Variavel            | Obrigatoria | Descricao                                                      | Como Obter                                         |
| ------------------- | ----------- | -------------------------------------------------------------- | -------------------------------------------------- |
| `SENTRY_DSN`        | Sim         | DSN do Sentry para backend.                                    | Sentry > Project Settings > Client Keys (DSN)      |
| `VITE_SENTRY_DSN`   | Sim         | DSN do Sentry para frontend.                                   | Mesmo DSN ou projeto separado para frontend        |
| `SENTRY_ORG`        | Nao         | Nome da organizacao no Sentry (para upload de source maps).    | Sentry > Organization Settings                     |
| `SENTRY_PROJECT`    | Nao         | Nome do projeto no Sentry.                                     | Sentry > Project Settings                          |
| `SENTRY_AUTH_TOKEN` | Nao         | Token de autenticacao do Sentry (para releases e source maps). | Sentry > Settings > Auth Tokens > Create New Token |

### 4.4 Email

| Variavel           | Obrigatoria | Descricao                                                   | Como Obter                                       |
| ------------------ | ----------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `SENDGRID_API_KEY` | Sim\*       | API Key do SendGrid (prefixo `SG.`).                        | SendGrid > Settings > API Keys > Create          |
| `RESEND_API_KEY`   | Nao         | API Key do Resend (alternativa ao SendGrid, prefixo `re_`). | Resend Dashboard > API Keys                      |
| `EMAIL_FROM`       | Sim         | Endereco de email remetente. Dominio deve estar verificado. | Configurar dominio verificado no SendGrid/Resend |
| `EMAIL_FROM_NAME`  | Nao         | Nome de exibicao do remetente (padrao: `ImobiBase`).        | Definir manualmente                              |

> \* SendGrid ou Resend -- pelo menos um e necessario.

### 4.5 Pagamentos

| Variavel                   | Obrigatoria | Descricao                                                                   | Como Obter                                                          |
| -------------------------- | ----------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`        | Sim\*       | Chave secreta do Stripe. Use `sk_live_*` em producao, `sk_test_*` em dev.   | Stripe Dashboard > Developers > API Keys                            |
| `STRIPE_PUBLISHABLE_KEY`   | Sim\*       | Chave publica do Stripe (`pk_live_*` em producao).                          | Stripe Dashboard > Developers > API Keys                            |
| `STRIPE_WEBHOOK_SECRET`    | Sim\*       | Secret do webhook do Stripe (`whsec_*`).                                    | Stripe Dashboard > Webhooks > Endpoint > Signing Secret             |
| `MERCADOPAGO_ACCESS_TOKEN` | Sim\*       | Token de acesso do Mercado Pago (`APP_USR-*`). Use credenciais de producao. | MercadoPago Developers > Suas Integracoes > Credenciais de Producao |
| `MERCADOPAGO_PUBLIC_KEY`   | Sim\*       | Chave publica do Mercado Pago.                                              | MercadoPago Developers > Suas Integracoes > Credenciais de Producao |

> \* Pelo menos um gateway (Stripe ou Mercado Pago) deve estar configurado.

### 4.6 Comunicacao

| Variavel                       | Obrigatoria | Descricao                                                                   | Como Obter                                                 |
| ------------------------------ | ----------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `WHATSAPP_API_TOKEN`           | Nao         | Token da API do WhatsApp Business. Minimo 20 caracteres.                    | Meta Developer Console > WhatsApp > API Setup              |
| `WHATSAPP_PHONE_NUMBER_ID`     | Nao         | ID do numero de telefone no WhatsApp.                                       | Meta Developer Console > WhatsApp > Phone Numbers          |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Nao         | ID da conta WhatsApp Business.                                              | Meta Developer Console > WhatsApp > Getting Started        |
| `WHATSAPP_APP_SECRET`          | Nao         | Secret do app Meta (para validar webhooks via HMAC).                        | Meta Developer Console > App Settings > Basic              |
| `WHATSAPP_VERIFY_TOKEN`        | Nao         | Token de verificacao do webhook WhatsApp. String aleatoria criada por voce. | Definir manualmente e configurar no Meta Developer Console |
| `TWILIO_ACCOUNT_SID`           | Nao         | Account SID do Twilio (`AC*`).                                              | Twilio Console > Account Info                              |
| `TWILIO_AUTH_TOKEN`            | Nao         | Auth Token do Twilio.                                                       | Twilio Console > Account Info                              |
| `TWILIO_PHONE_NUMBER`          | Nao         | Numero de telefone Twilio (formato `+5511999999999`).                       | Twilio Console > Phone Numbers                             |

### 4.7 Integracoes

| Variavel                   | Obrigatoria | Descricao                                                                                                                     | Como Obter                                                        |
| -------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `GOOGLE_MAPS_API_KEY`      | Nao         | API Key do Google Maps (prefixo `AIza`). Ative Geocoding, Maps JS e Places.                                                   | Google Cloud Console > APIs & Services > Credentials              |
| `CLICKSIGN_API_KEY`        | Nao         | API Key da ClickSign (formato UUID).                                                                                          | ClickSign Dashboard > Configuracoes > API                         |
| `CLICKSIGN_WEBHOOK_SECRET` | Nao         | Secret para validar webhooks da ClickSign (HMAC-SHA256). Obrigatorio se usar ClickSign.                                       | `openssl rand -hex 32` (configurar no dashboard ClickSign)        |
| `ANTHROPIC_API_KEY`        | Nao         | API Key da Anthropic para funcionalidades de IA (descricoes, marketing, AVM). Sem ela, o sistema usa templates como fallback. | [console.anthropic.com](https://console.anthropic.com) > API Keys |

### 4.8 Supabase

| Variavel               | Obrigatoria | Descricao                                                              | Como Obter                                                    |
| ---------------------- | ----------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `SUPABASE_URL`         | Sim         | URL do projeto Supabase (`https://xxxxx.supabase.co`).                 | Supabase Dashboard > Settings > API > Project URL             |
| `SUPABASE_ANON_KEY`    | Sim         | Chave anonima (publica) do Supabase. Usada no frontend.                | Supabase Dashboard > Settings > API > anon public key         |
| `SUPABASE_SERVICE_KEY` | Sim         | Chave de servico (secreta, bypass RLS) do Supabase. Apenas no backend. | Supabase Dashboard > Settings > API > service_role secret key |

### 4.9 Cache

| Variavel    | Obrigatoria | Descricao                                                               | Como Obter                                                             |
| ----------- | ----------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `REDIS_URL` | Sim         | Connection string Redis (`redis://default:TOKEN@HOST.upstash.io:6379`). | Upstash Console > Seu Database > Details > Endpoint (formato redis://) |

### 4.10 Analytics

| Variavel                   | Obrigatoria | Descricao                                            | Como Obter                                  |
| -------------------------- | ----------- | ---------------------------------------------------- | ------------------------------------------- |
| `POSTHOG_API_KEY`          | Nao         | API Key do PostHog (prefixo `phc_`).                 | PostHog > Project Settings > API Key        |
| `POSTHOG_HOST`             | Nao         | Host do PostHog (padrao: `https://app.posthog.com`). | Manter padrao ou self-hosted URL            |
| `VITE_POSTHOG_API_KEY`     | Nao         | Mesma key do PostHog para o frontend.                | Mesmo valor de `POSTHOG_API_KEY`            |
| `VITE_POSTHOG_HOST`        | Nao         | Mesmo host do PostHog para o frontend.               | Mesmo valor de `POSTHOG_HOST`               |
| `GOOGLE_ANALYTICS_ID`      | Nao         | ID do Google Analytics 4 (`G-XXXXXXXXXX`).           | GA4 > Admin > Data Streams > Measurement ID |
| `VITE_GOOGLE_ANALYTICS_ID` | Nao         | Mesmo ID do GA4 para o frontend.                     | Mesmo valor de `GOOGLE_ANALYTICS_ID`        |

### 4.11 Deploy

| Variavel   | Obrigatoria | Descricao                                                        | Como Obter                            |
| ---------- | ----------- | ---------------------------------------------------------------- | ------------------------------------- |
| `NODE_ENV` | Sim         | Ambiente de execucao. Definir como `production`.                 | Configurado automaticamente no Vercel |
| `PORT`     | Nao         | Porta do servidor (padrao: 5000). Ignorado no Vercel serverless. | Definir manualmente se necessario     |

---

## 5. Deploy Passo-a-Passo

### 5.1 Vercel (Recomendado)

O deploy no Vercel e o metodo principal e recomendado para o ImobiBase.

#### Passo 1: Instalar e autenticar

```bash
npm install -g vercel
vercel login
```

#### Passo 2: Linkar o projeto

```bash
cd /caminho/para/ImobiBase
vercel link
```

Selecione a organizacao e confirme as configuracoes quando solicitado.

#### Passo 3: Configurar variaveis de ambiente

Configure cada variavel obrigatoria no Vercel:

```bash
# Database
vercel env add DATABASE_URL production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_KEY production

# Cache
vercel env add REDIS_URL production

# Seguranca
vercel env add SESSION_SECRET production
vercel env add CRON_SECRET production
vercel env add CORS_ORIGINS production

# Monitoramento
vercel env add SENTRY_DSN production
vercel env add VITE_SENTRY_DSN production

# Email
vercel env add SENDGRID_API_KEY production
vercel env add EMAIL_FROM production

# Pagamentos (configure os que usar)
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add MERCADOPAGO_ACCESS_TOKEN production
vercel env add MERCADOPAGO_PUBLIC_KEY production
```

Ou configure todas de uma vez pelo Vercel Dashboard:
**Project > Settings > Environment Variables**

#### Passo 4: Deploy de staging (preview)

```bash
vercel
```

Acesse a URL gerada para testar.

#### Passo 5: Deploy de producao

```bash
vercel --prod
```

Ou use o script automatizado:

```bash
npm run deploy:production
```

O script `scripts/deploy.sh` executa automaticamente:

1. Verificacao de branch (exige `main` para producao)
2. Verificacao de alteracoes nao commitadas
3. Execucao de testes
4. Verificacao de tipos TypeScript
5. Build da aplicacao
6. Deploy no Vercel
7. Health check pos-deploy
8. Notificacao ao Sentry da nova release
9. Criacao de tag Git com a versao

#### Passo 6: Configurar dominio customizado

No Vercel Dashboard:

1. **Project > Settings > Domains**
2. Adicione seu dominio (ex: `imobibase.com`)
3. Configure os registros DNS conforme instruido pelo Vercel
4. Aguarde propagacao DNS e provisionamento SSL (automatico)

#### Passo 7: Configurar webhooks dos servicos externos

Configure as URLs de webhook nos dashboards dos respectivos servicos:

| Servico      | URL do Webhook                                    | Observacao                                        |
| ------------ | ------------------------------------------------- | ------------------------------------------------- |
| Stripe       | `https://seudominio.com/api/webhooks/stripe`      | Stripe Dashboard > Developers > Webhooks          |
| Mercado Pago | `https://seudominio.com/api/webhooks/mercadopago` | MercadoPago Developers > Webhooks                 |
| ClickSign    | `https://seudominio.com/api/webhooks/clicksign`   | ClickSign Dashboard > Configuracoes > Webhooks    |
| WhatsApp     | `https://seudominio.com/api/webhooks/whatsapp`    | Meta Developer Console > WhatsApp > Configuration |

---

### 5.2 Docker

Para ambientes onde voce precisa de um servidor persistente (VPS, on-premises).

#### Passo 1: Preparar arquivo de ambiente

```bash
cp .env.example .env.production
```

Edite `.env.production` com todos os valores de producao. Para Docker com banco local, ajuste:

```env
DATABASE_URL=postgresql://imobibase:SUA_SENHA_FORTE@postgres:5432/imobibase
REDIS_URL=redis://default:SUA_SENHA_REDIS@redis:6379
NODE_ENV=production
```

#### Passo 2: Definir senhas

```bash
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
```

#### Passo 3: Build e inicializacao

```bash
# Build e start de todos os servicos
docker-compose up -d --build

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f app
```

O `docker-compose.yml` inclui quatro servicos:

| Servico    | Imagem                          | Porta   | Descricao                   |
| ---------- | ------------------------------- | ------- | --------------------------- |
| `app`      | Build local (Node.js 20 Alpine) | 5000    | Aplicacao ImobiBase         |
| `postgres` | postgres:15-alpine              | 5432    | PostgreSQL com health check |
| `redis`    | redis:7-alpine                  | 6379    | Redis com persistencia AOF  |
| `nginx`    | nginx:alpine                    | 80, 443 | Reverse proxy com SSL       |

#### Passo 4: Configurar SSL (nginx)

Crie o diretorio SSL e copie seus certificados:

```bash
mkdir -p ssl
# Copie seus certificados:
# ssl/cert.pem
# ssl/key.pem
```

Crie o arquivo `nginx.conf` com proxy para a porta 5000 da aplicacao.

#### Passo 5: Inicializar banco de dados

```bash
# Aplicar schema
docker-compose exec app npx drizzle-kit push

# Aplicar indexes de performance
docker-compose exec postgres psql -U imobibase -d imobibase \
  -f /docker-entrypoint-initdb.d/add-performance-indexes.sql
```

#### Passo 6: Comandos uteis

```bash
# Parar tudo
docker-compose down

# Rebuild apenas o app
docker-compose up -d --build app

# Backup do banco
docker-compose exec -T postgres pg_dump -U imobibase imobibase > backup_$(date +%Y%m%d).sql

# Restore de backup
cat backup_20260316.sql | docker-compose exec -T postgres psql -U imobibase imobibase

# Ver logs em tempo real
docker-compose logs -f --tail=100 app
```

---

### 5.3 Railway / Fly.io

Para deploy em plataformas de servidor persistente como alternativa ao Docker autogerenciado.

#### Railway

```bash
# Instalar CLI
npm install -g @railway/cli

# Login e inicializar
railway login
railway init

# Adicionar PostgreSQL e Redis como plugins
railway add --plugin postgresql
railway add --plugin redis

# Configurar variaveis (via dashboard ou CLI)
railway variables set SESSION_SECRET=$(openssl rand -base64 64)
railway variables set NODE_ENV=production
# ... demais variaveis

# Deploy
railway up
```

Observacoes importantes para Railway:

- `DATABASE_URL` e `REDIS_URL` sao injetados automaticamente pelos plugins
- O `node-cron` sera ativado automaticamente (servidor persistente)
- Nao precisa configurar Vercel Cron
- Configure o health check path como `/api/health`

#### Fly.io

```bash
# Instalar CLI
curl -L https://fly.io/install.sh | sh

# Login e launch
fly auth login
fly launch

# Criar PostgreSQL e Redis
fly postgres create --name imobibase-db
fly redis create --name imobibase-redis

# Attach ao app
fly postgres attach imobibase-db
fly redis attach imobibase-redis

# Configurar variaveis
fly secrets set SESSION_SECRET=$(openssl rand -base64 64)
fly secrets set NODE_ENV=production
# ... demais variaveis

# Deploy
fly deploy
```

Observacoes importantes para Fly.io:

- Defina a regiao `gru` (Guarulhos/Sao Paulo) para menor latencia
- Configure health check no `fly.toml`: `[http_service.checks]` > path = `/api/health`
- Escale para alta disponibilidade: `fly scale count 2`

---

## 6. Banco de Dados

### 6.1 Setup Inicial

```bash
# 1. Aplicar schema completo (Drizzle ORM push)
npm run db:push

# 2. Aplicar indexes de performance
npm run db:indexes:apply

# 3. Atualizar estatisticas do banco para o query planner
npm run db:analyze
```

### 6.2 Comandos Disponiveis

| Comando                       | Descricao                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `npm run db:push`             | Aplica o schema Drizzle (tabelas, constraints, relacoes) diretamente no banco |
| `npm run db:migrate`          | Executa migracoes SQL pendentes em ordem                                      |
| `npm run db:migrate:rollback` | Reverte a ultima migracao                                                     |
| `npm run db:indexes:apply`    | Executa `scripts/apply-indexes.sh` para criar indexes de performance          |
| `npm run db:indexes:test`     | Testa a performance das queries com os indexes aplicados                      |
| `npm run db:analyze`          | Executa `ANALYZE` no PostgreSQL para atualizar estatisticas do query planner  |
| `npm run db:seed`             | Popula com dados de demonstracao (apenas desenvolvimento)                     |
| `npm run db:init:production`  | Inicializa dados essenciais de producao                                       |

### 6.3 Criar Tenant Superadmin

Apos o setup inicial, crie o primeiro tenant (empresa) e usuario administrador:

```bash
npm run db:init:production
```

Ou manualmente via SQL:

```sql
-- Criar tenant
INSERT INTO tenants (name, slug, plan, status, created_at)
VALUES ('Sua Imobiliaria', 'sua-imobiliaria', 'enterprise', 'active', NOW());

-- Criar usuario admin (gere o hash com bcrypt)
INSERT INTO users (tenant_id, email, password_hash, name, role, status, created_at)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'sua-imobiliaria'),
  'admin@suaimobiliaria.com',
  '$2b$12$HASH_DA_SENHA_AQUI',
  'Administrador',
  'superadmin',
  'active',
  NOW()
);
```

### 6.4 Backups

O Supabase Pro inclui backups automaticos diarios com retencao de 7 dias e Point-in-Time Recovery. Alem disso, o cron job `database-backup` roda diariamente as 05:00 UTC (02:00 BRT).

Para backup manual:

```bash
# Via psql direto
pg_dump $DATABASE_URL > backup_manual_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_manual_20260316.sql
```

---

## 7. Vercel Cron Jobs

O ImobiBase possui 9 cron jobs configurados no `vercel.json`. Todos os endpoints sao autenticados via header `Authorization: Bearer <CRON_SECRET>`, enviado automaticamente pelo Vercel.

### 7.1 Tabela de Cron Jobs

| Endpoint                       | Schedule (UTC) | Horario (BRT)       | Descricao                                                                     |
| ------------------------------ | -------------- | ------------------- | ----------------------------------------------------------------------------- |
| `/api/cron/payment-reminders`  | `0 12 * * *`   | 09:00 diario        | Envia lembretes de pagamento (proximos do vencimento, vencidos, ultimo aviso) |
| `/api/cron/daily-reports`      | `0 3 * * *`    | 00:00 diario        | Gera e envia relatorios diarios por email aos usuarios configurados           |
| `/api/cron/weekly-reports`     | `0 11 * * 1`   | 08:00 segunda-feira | Gera e envia relatorios semanais consolidados                                 |
| `/api/cron/monthly-reports`    | `0 11 1 * *`   | 08:00 dia 1 do mes  | Gera e envia relatorios mensais com metricas do periodo                       |
| `/api/cron/cleanup-sessions`   | `0 * * * *`    | A cada hora         | Limpa sessoes expiradas (mais de 7 dias)                                      |
| `/api/cron/cleanup-logs`       | `0 */6 * * *`  | A cada 6 horas      | Limpa logs antigos (mais de 30 dias)                                          |
| `/api/cron/integration-sync`   | `0 */6 * * *`  | A cada 6 horas      | Sincroniza com integracoes externas (portais imobiliarios, Zapier)            |
| `/api/cron/database-backup`    | `0 5 * * *`    | 02:00 diario        | Enfileira backup completo do banco de dados                                   |
| `/api/cron/cleanup-temp-files` | `0 6 * * 0`    | 03:00 domingo       | Limpa arquivos temporarios (mais de 7 dias)                                   |

### 7.2 Configuracao do CRON_SECRET

O `CRON_SECRET` e obrigatorio para autenticar as requisicoes de cron do Vercel. Sem ele, os endpoints de cron rejeitarao todas as requisicoes.

```bash
# Gerar um secret forte
openssl rand -base64 48

# Adicionar no Vercel
vercel env add CRON_SECRET production
```

O Vercel envia automaticamente o header `Authorization: Bearer <CRON_SECRET>` em cada chamada de cron. O servidor valida esse token antes de executar o job.

### 7.3 Monitoramento dos Cron Jobs

- **Vercel Dashboard**: Project > Monitoring > Cron Jobs -- mostra execucoes, duracao e falhas
- **Sentry**: Erros nos cron jobs sao capturados automaticamente com a tag `component: scheduled-jobs`
- **Logs**: Cada execucao gera logs no formato `[ScheduledJobs] Running <job-name>...`

### 7.4 Teste Manual de Cron Jobs

```bash
# Testar um cron job manualmente
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  https://seudominio.com/api/cron/cleanup-sessions
```

### 7.5 Fallback para Servidor Persistente

Em deploys Docker/Railway/Fly.io, os mesmos jobs rodam via `node-cron` com fusos horarios em `America/Sao_Paulo`. A inicializacao e automatica ao iniciar o servidor:

- Se `process.env.VERCEL` estiver definido, o `node-cron` e ignorado (jobs via HTTP)
- Se nao estiver no Vercel, `initializeScheduledJobs()` registra todos os 9 jobs via `node-cron`

---

## 8. Checklist Pre-Go-Live

Execute esta checklist completa antes de liberar para usuarios em producao.

### Infraestrutura

- [ ] 1. Supabase (PostgreSQL) criado na regiao `sa-east-1` (Sao Paulo)
- [ ] 2. Upstash (Redis) criado na regiao `sa-east-1` (Sao Paulo)
- [ ] 3. Projeto Vercel criado e linkado ao repositorio
- [ ] 4. Dominio customizado configurado com SSL ativo
- [ ] 5. DNS propagado e acessivel

### Variaveis de Ambiente

- [ ] 6. `DATABASE_URL` configurada e testada com conexao bem-sucedida
- [ ] 7. `REDIS_URL` configurada e testada com `PING` bem-sucedido
- [ ] 8. `SESSION_SECRET` gerado com `openssl rand -base64 64` (minimo 32 caracteres)
- [ ] 9. `CRON_SECRET` gerado com `openssl rand -base64 48` (minimo 32 caracteres)
- [ ] 10. `CORS_ORIGINS` configurado apenas com dominios de producao (sem `localhost`)
- [ ] 11. `SENTRY_DSN` e `VITE_SENTRY_DSN` configurados corretamente
- [ ] 12. `SENDGRID_API_KEY` configurado e dominio de email verificado
- [ ] 13. Todas as chaves de API em modo producao (nao test/sandbox)
- [ ] 14. `STRIPE_SECRET_KEY` com prefixo `sk_live_` (nao `sk_test_`)
- [ ] 15. `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_KEY` configurados

### Banco de Dados

- [ ] 16. Schema aplicado com `npm run db:push`
- [ ] 17. Indexes de performance aplicados com `npm run db:indexes:apply`
- [ ] 18. Estatisticas atualizadas com `npm run db:analyze`
- [ ] 19. Tenant superadmin criado com `npm run db:init:production`
- [ ] 20. Backups automaticos do Supabase verificados e funcionando

### Seguranca

- [ ] 21. Nenhuma variavel de desenvolvimento exposta em producao
- [ ] 22. Rate limiting ativo e testado
- [ ] 23. Headers de seguranca ativos (verificar com securityheaders.com):
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy configurado
- [ ] 24. CSRF protection ativa
- [ ] 25. Webhooks com validacao de assinatura configurados (Stripe, ClickSign, WhatsApp)

### Funcionalidade

- [ ] 26. Health check retorna 200: `curl https://seudominio.com/api/health`
- [ ] 27. Readiness check retorna 200: `curl https://seudominio.com/api/ready`
- [ ] 28. Login e logout funcionando corretamente
- [ ] 29. Fluxo de cadastro de tenant testado end-to-end
- [ ] 30. Envio de email testado (reset de senha, convite de usuario)
- [ ] 31. Pagamento via Stripe testado com cartao real (se aplicavel)
- [ ] 32. Pagamento via Mercado Pago testado com PIX real (se aplicavel)
- [ ] 33. Cron jobs executando (verificar no Vercel Dashboard > Monitoring > Cron Jobs)

### Monitoramento

- [ ] 34. Sentry recebendo eventos (testar com erro intencional via `/api/debug-sentry`)
- [ ] 35. Logs do Vercel acessiveis e sem erros criticos
- [ ] 36. Uptime monitoring externo configurado (UptimeRobot, Better Uptime, etc.)
- [ ] 37. Alertas de erro configurados no Sentry (email ou Slack)

### Legal e Compliance

- [ ] 38. Termos de uso e politica de privacidade publicados no site
- [ ] 39. LGPD: consentimento de cookies implementado
- [ ] 40. Dados de contato do DPO configurados (se aplicavel)

---

## 9. Monitoramento Pos-Deploy

### 9.1 Health Endpoints

O ImobiBase expoe tres endpoints de saude:

| Endpoint          | Funcao                                     | Resposta Esperada                              |
| ----------------- | ------------------------------------------ | ---------------------------------------------- |
| `GET /api/health` | Verifica se a API esta respondendo         | `200 OK` com status geral                      |
| `GET /api/ready`  | Verifica se banco e Redis estao conectados | `200 OK` se tudo pronto; `503` se indisponivel |
| `GET /api/live`   | Liveness probe (para Kubernetes/Docker)    | `200 OK` se o processo esta vivo               |

```bash
# Teste rapido
curl -s https://seudominio.com/api/health | jq .
curl -s https://seudominio.com/api/ready | jq .
```

### 9.2 Sentry

Acesse [sentry.io](https://sentry.io) para monitorar:

- **Issues**: Erros em tempo real, agrupados por tipo e frequencia
- **Performance**: Latencia de transacoes, endpoints lentos, database queries
- **Releases**: Verificar se o deploy registrou a release corretamente
- **Alerts**: Configurar notificacoes por email/Slack para erros criticos

Alertas recomendados:

- Mais de 10 erros novos em 1 hora
- Latencia P95 > 5 segundos em qualquer endpoint
- Erros 5xx em endpoints de pagamento (`/api/webhooks/*`)
- Qualquer erro em cron jobs (tag `component: scheduled-jobs`)

### 9.3 Vercel Dashboard

No Vercel Dashboard do projeto:

- **Deployments**: Historico de deploys, logs de build, status de cada deploy
- **Analytics**: Web Vitals (LCP, FID, CLS), tempos de resposta por rota
- **Logs**: Runtime logs das funcoes serverless (retencao de 1 hora no plano Pro)
- **Monitoring > Cron Jobs**: Status e historico de execucao dos 9 cron jobs
- **Usage**: Consumo de funcoes serverless, bandwidth, execucoes de cron

### 9.4 Uptime Monitoring Externo

Configure um servico de uptime monitoring externo para ser notificado de indisponibilidade:

- **UptimeRobot** (gratuito ate 50 monitores): [uptimerobot.com](https://uptimerobot.com)
- **Better Uptime**: [betteruptime.com](https://betteruptime.com)
- **Checkly**: [checklyhq.com](https://www.checklyhq.com)

Monitore estes endpoints:

| URL                                 | Intervalo | Tipo          |
| ----------------------------------- | --------- | ------------- |
| `https://seudominio.com/api/health` | 1 minuto  | HTTP 200      |
| `https://seudominio.com/api/ready`  | 5 minutos | HTTP 200      |
| `https://seudominio.com`            | 5 minutos | Keyword check |

### 9.5 Redis (Upstash)

No Upstash Console:

- **Data Browser**: Inspecionar chaves de sessao e cache
- **Metrics**: Monitorar uso de memoria, comandos/segundo, latencia media
- **Slow Log**: Identificar comandos Redis lentos

### 9.6 PostgreSQL (Supabase)

No Supabase Dashboard:

- **Table Editor**: Consultar e editar dados via interface grafica
- **SQL Editor**: Executar queries ad-hoc diretamente
- **Database > Reports**: Uso de CPU, RAM, disco, conexoes ativas
- **Logs**: Query logs, auth logs, PostgREST logs

---

## 10. Rollback

### 10.1 Rollback via Script Automatizado

```bash
# Rollback de producao (interativo, pede confirmacao)
npm run rollback:production

# Rollback de staging
npm run rollback:staging
```

O script `scripts/rollback.sh` executa:

1. Pede confirmacao explicita (`yes`) antes de prosseguir
2. Lista deployments recentes do Vercel
3. Executa `vercel rollback` para reverter ao deploy anterior
4. Opcionalmente restaura backup do banco de dados
5. Executa health check automatico
6. Exibe orientacoes pos-rollback

### 10.2 Rollback via Vercel CLI

```bash
# Listar deployments recentes de producao
vercel ls --prod

# Rollback para o deploy anterior
vercel rollback

# Ou promover um deploy especifico para producao
vercel promote <DEPLOYMENT_URL>

# Exemplo:
vercel promote imobibase-abc123.vercel.app
```

### 10.3 Rollback via Vercel Dashboard

1. Acesse **Project > Deployments**
2. Encontre o deployment anterior que estava funcionando
3. Clique nos tres pontos (**...**) ao lado do deploy
4. Selecione **Promote to Production**

### 10.4 Rollback de Banco de Dados

```bash
# Reverter ultima migracao SQL
npm run db:migrate:rollback

# Ou restaurar backup manual
psql $DATABASE_URL < backup_20260316.sql
```

Via Supabase (Point-in-Time Recovery, disponivel no plano Pro):

1. Acesse Supabase Dashboard > **Database > Backups**
2. Selecione **Point in Time Recovery**
3. Escolha o ponto no tempo desejado

### 10.5 Rollback Docker

```bash
# Parar containers atuais
docker-compose down

# Usar imagem anterior (segunda mais recente)
docker tag $(docker images imobibase --format "{{.ID}}" | sed -n 2p) imobibase:latest
docker-compose up -d

# Ou rebuild a partir do commit anterior
git checkout HEAD~1
docker-compose up -d --build
```

### 10.6 Pos-Rollback

Apos qualquer rollback:

1. Verifique o health check: `curl https://seudominio.com/api/health`
2. Teste os fluxos criticos (login, pagamentos)
3. Verifique erros no Sentry
4. Investigue a causa raiz do problema
5. Corrija antes de tentar novo deploy
6. Notifique a equipe sobre o rollback

---

## 11. Troubleshooting

### "Session secret is too weak" / Servidor nao inicia

**Causa**: `SESSION_SECRET` nao foi configurado ou tem menos de 32 caracteres. O servidor recusa iniciar em producao com secrets fracos.

**Solucao**:

```bash
# Gerar um secret forte
openssl rand -base64 64

# Configurar no Vercel
vercel env add SESSION_SECRET production

# Ou usar o script do projeto
npm run generate:secret
```

---

### Falha na conexao com o banco de dados

**Causa**: `DATABASE_URL` incorreta, senha errada, ou usando porta errada.

**Solucao**:

1. Verifique o formato: `postgresql://postgres.[REF]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
2. Use a porta **6543** (pooler/Supavisor), nao 5432 (conexao direta)
3. No Supabase Dashboard: Settings > Database > Connection String > **Session mode**
4. Teste a conexao localmente:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

---

### Cron jobs nao executam no Vercel

**Causa**: `CRON_SECRET` nao configurado, incorreto, ou plano Vercel sem suporte a Cron.

**Solucao**:

1. Verifique se `CRON_SECRET` esta configurado no Vercel com pelo menos 32 caracteres
2. Vercel Cron requer plano **Pro** ou superior
3. Verifique os logs: Vercel Dashboard > Monitoring > Cron Jobs
4. Teste manualmente:
   ```bash
   curl -H "Authorization: Bearer SEU_CRON_SECRET" \
     https://seudominio.com/api/cron/cleanup-sessions
   ```
5. Verifique se o `vercel.json` contem a secao `crons` com os 9 endpoints

---

### "CORS policy" / Erro de CORS no frontend

**Causa**: `CORS_ORIGINS` nao inclui o dominio correto ou contem `localhost`.

**Solucao**:

```bash
# Configurar origens permitidas (sem espacos apos virgula)
vercel env add CORS_ORIGINS production
# Valor: https://imobibase.com,https://www.imobibase.com
```

Nunca inclua `http://localhost:*` em producao.

---

### Emails nao sao enviados

**Causa**: SendGrid nao configurado, API key invalida, ou dominio nao verificado.

**Solucao**:

1. Verifique se `SENDGRID_API_KEY` comeca com `SG.`
2. No SendGrid Dashboard: Settings > Sender Authentication -- o dominio deve estar verificado
3. Verifique se `EMAIL_FROM` usa o dominio verificado
4. Verifique logs no Sentry para erros de envio de email
5. Teste com um email de reset de senha

---

### Webhooks do Stripe retornam 400 ou assinatura invalida

**Causa**: `STRIPE_WEBHOOK_SECRET` incorreto ou desatualizado.

**Solucao**:

1. No Stripe Dashboard > Developers > Webhooks
2. Clique no endpoint configurado para sua URL de producao
3. Copie o **Signing secret** (comeca com `whsec_`)
4. Atualize `STRIPE_WEBHOOK_SECRET` no Vercel
5. Verifique se a URL do webhook esta correta: `https://seudominio.com/api/webhooks/stripe`
6. Verifique os eventos configurados no webhook (checkout.session.completed, invoice.paid, etc.)

---

### Funcao serverless timeout (504 Gateway Timeout)

**Causa**: A funcao excedeu o limite de 30 segundos configurado no `vercel.json`.

**Solucao**:

1. Verifique se o banco nao esta lento: Supabase Dashboard > Database > Reports
2. Verifique se o Redis esta acessivel e respondendo rapido
3. Otimize queries lentas (verifique se os indexes foram aplicados com `npm run db:indexes:apply`)
4. Para operacoes longas, use filas BullMQ em vez de processamento sincrono
5. Se necessario, aumente `maxDuration` no `vercel.json` (max 60s no plano Pro, 300s no Enterprise):
   ```json
   {
     "functions": {
       "api/index.ts": {
         "maxDuration": 60,
         "memory": 1024
       }
     }
   }
   ```

---

### "Redis connection refused" ou timeout no Redis

**Causa**: `REDIS_URL` incorreta ou Upstash indisponivel.

**Solucao**:

1. Verifique o formato: `redis://default:TOKEN@HOST.upstash.io:6379`
2. No Upstash Console, verifique se o banco esta ativo e na regiao `sa-east-1`
3. Teste a conexao:
   ```bash
   redis-cli -u $REDIS_URL ping
   # Esperado: PONG
   ```
4. Verifique se nao excedeu o limite de conexoes do plano

---

### Build falha no Vercel

**Causa**: Dependencias incompativeis, erro de TypeScript, ou memoria insuficiente.

**Solucao**:

1. Verifique os logs de build no Vercel Dashboard > Deployments > Selecione o deploy > Build Logs
2. Execute localmente para reproduzir:
   ```bash
   npm run build
   npm run check
   ```
3. Se for erro de memoria durante o build:
   ```bash
   # Adicione no Vercel como variavel de ambiente:
   # NODE_OPTIONS = --max-old-space-size=4096
   vercel env add NODE_OPTIONS production
   # Valor: --max-old-space-size=4096
   ```

---

### Performance lenta apos deploy

**Solucao**:

1. Verifique se indexes foram aplicados: `npm run db:indexes:apply`
2. Execute `npm run db:analyze` para atualizar estatisticas do query planner
3. Verifique latencia do Redis no Upstash Console > Metrics
4. Cold starts do Vercel serverless sao normais (1-3s na primeira requisicao)
5. Verifique o Sentry Performance para identificar endpoints e queries lentas
6. Verifique se Supabase, Upstash e Vercel estao todos na mesma regiao (`sa-east-1` / `gru1`)

---

### Validacao de secrets falha

**Solucao**:

```bash
# Validar todos os secrets antes do deploy
npm run validate:secrets

# Rotacionar secrets que estao expirados
npm run rotate:secrets
```

Lembre-se de rotacionar secrets:

- `SESSION_SECRET`: a cada 90 dias
- API keys de servicos externos: a cada 12 meses ou quando suspeitar de comprometimento
- Apos desligamento de desenvolvedor da equipe
