# ImobiBase - CRM Imobiliário Multi-tenant SaaS

Sistema completo de gestão para imobiliárias com suporte multi-tenant, desenvolvido com React, TypeScript, Express e PostgreSQL.

## Funcionalidades

### Módulos Principais

- **Dashboard** - Visão geral com KPIs, gráficos e lembretes
- **Imóveis** - Cadastro completo de imóveis (venda/aluguel)
- **CRM/Leads** - Funil Kanban, tags, follow-ups e match de imóveis
- **Agenda** - Agendamento de visitas
- **Propostas** - Gestão de propostas e contratos
- **Aluguéis** - Contratos de locação, proprietários, inquilinos e pagamentos
- **Vendas** - Propostas e registro de vendas com comissões
- **Financeiro** - Controle de entradas e saídas
- **Relatórios** - Relatórios detalhados de aluguéis, inadimplência, etc.
- **Landing Pages** - Site público personalizado por imobiliária

### Características Técnicas

- **Multi-tenant** - Isolamento completo de dados por imobiliária
- **Autenticação** - Login seguro com sessões PostgreSQL
- **API RESTful** - Backend Express com validação Zod
- **UI Moderna** - React + Tailwind CSS + shadcn/ui
- **Banco de Dados** - PostgreSQL com Drizzle ORM

## Tecnologias

- **Frontend**: React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Wouter
- **Backend**: Node.js, Express, Passport.js
- **Database**: PostgreSQL, Drizzle ORM
- **Build**: Vite, esbuild

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

## Configuração Local

1. Clone o repositório:
```bash
git clone https://github.com/nmatss/imobi-base.git
cd imobi-base
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/imobibase
SESSION_SECRET=seu-secret-super-seguro
PORT=5000
NODE_ENV=development
```

4. Execute as migrações do banco:
```bash
npm run db:push
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:5000`

## Deploy na Vercel

### Pré-requisitos

1. Conta na [Vercel](https://vercel.com)
2. Banco PostgreSQL (recomendamos [Neon](https://neon.tech), [Supabase](https://supabase.com) ou [Railway](https://railway.app))

### Passos para Deploy

1. **Configure o banco de dados**:
   - Crie um banco PostgreSQL em um dos provedores acima
   - Copie a connection string

2. **Deploy via Vercel CLI**:
```bash
npm install -g vercel
vercel login
vercel
```

3. **Configure as variáveis de ambiente na Vercel**:
   - `DATABASE_URL` - Connection string do PostgreSQL
   - `SESSION_SECRET` - String aleatória segura
   - `NODE_ENV` - "production"

4. **Execute as migrações**:
```bash
DATABASE_URL="sua-connection-string" npm run db:push
```

### Deploy via GitHub

1. Faça push do código para o GitHub
2. Acesse [vercel.com/new](https://vercel.com/new)
3. Importe o repositório
4. Configure as variáveis de ambiente
5. Deploy!

## Estrutura do Projeto

```
├── api/                    # Vercel serverless functions
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes UI
│   │   ├── hooks/          # React hooks
│   │   ├── lib/            # Utilitários e contexto
│   │   └── pages/          # Páginas da aplicação
├── server/                 # Backend Express
│   ├── index.ts            # Entry point
│   ├── routes.ts           # Rotas da API
│   └── storage.ts          # Camada de dados
├── shared/                 # Código compartilhado
│   └── schema.ts           # Schema do banco (Drizzle)
└── dist/                   # Build de produção
```

## Banco de Dados

O sistema utiliza 19 tabelas:

| Tabela | Descrição |
|--------|-----------|
| `tenants` | Imobiliárias (multi-tenant) |
| `users` | Usuários do sistema |
| `properties` | Imóveis |
| `leads` | Leads/Clientes potenciais |
| `interactions` | Histórico de interações |
| `lead_tags` | Tags para leads |
| `lead_tag_links` | Associação lead-tag |
| `follow_ups` | Lembretes de follow-up |
| `visits` | Visitas agendadas |
| `contracts` | Propostas/Contratos |
| `owners` | Proprietários (locadores) |
| `renters` | Inquilinos |
| `rental_contracts` | Contratos de aluguel |
| `rental_payments` | Pagamentos de aluguel |
| `sale_proposals` | Propostas de venda |
| `property_sales` | Vendas realizadas |
| `finance_categories` | Categorias financeiras |
| `finance_entries` | Lançamentos financeiros |
| `newsletter_subscriptions` | Assinaturas de newsletter |

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run start` - Inicia servidor de produção
- `npm run db:push` - Aplica migrações no banco
- `npm run check` - Verifica tipos TypeScript

## Landing Pages Públicas

Cada imobiliária tem uma landing page pública acessível em:
```
https://seu-dominio.com/e/{slug-da-imobiliaria}
```

Características:
- Design responsivo
- Filtros de busca
- Listagem de imóveis disponíveis
- Captação de leads
- Newsletter

## Integrações

ImobiBase suporta integração com diversos serviços externos:

### WhatsApp Business API

Integração completa com WhatsApp Business API para comunicação com leads:
- Envio e recebimento de mensagens
- Templates de mensagens
- Gestão de conversas
- Auto-resposta inteligente
- **Webhook com validação de assinatura HMAC SHA-256**

**Documentação:**
- 📖 [Setup Completo](./docs/WHATSAPP_WEBHOOK_SECURITY_SETUP.md) - Guia passo-a-passo
- 📋 [Referência Rápida](./docs/WHATSAPP_WEBHOOK_QUICK_REFERENCE.md) - Comandos e troubleshooting
- 📊 [Resumo da Implementação](./docs/WHATSAPP_WEBHOOK_IMPLEMENTATION_SUMMARY.md)

**Configuração Rápida:**
```bash
# Gerar tokens
WHATSAPP_VERIFY_TOKEN=$(openssl rand -base64 32)

# Adicionar ao .env
echo "WHATSAPP_APP_SECRET=seu-app-secret" >> .env
echo "WHATSAPP_VERIFY_TOKEN=$WHATSAPP_VERIFY_TOKEN" >> .env
```

### Outras Integrações (Planejadas)

- **Email** - SendGrid / Resend
- **SMS** - Twilio
- **Pagamentos** - Stripe / Mercado Pago
- **Mapas** - Google Maps API
- **E-signature** - ClickSign
- **Storage** - Supabase Storage

## Design System

ImobiBase utiliza um design system consistente baseado em:

- **UI Components**: shadcn/ui + Tailwind CSS
- **Icons**: Lucide React
- **Spacing**: Sistema 8pt grid (16px, 24px, 32px)
- **Colors**: Paleta semântica (Primary, Success, Warning, Error, Info)
- **Typography**: Escala hierárquica clara

Para mais detalhes, consulte:
- [Design System Guide](./client/src/lib/DESIGN_SYSTEM_GUIDE.md)
- [Component Examples](./client/src/lib/COMPONENT_EXAMPLES.md)
- [Spacing Guide](./client/src/lib/SPACING_GUIDE.md)
- [Migration Guide](./client/src/lib/MIGRATION_GUIDE.md)

## Licença

MIT

## Suporte

Para dúvidas ou sugestões, abra uma issue no GitHub.
