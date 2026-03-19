#!/bin/bash

# ==================================
# ImobiBase Production Setup Script
# ==================================
# Guia interativo para configurar o ImobiBase para producao.
# Executa as fases que podem ser automatizadas e orienta nas manuais.
#
# Usage: ./scripts/setup-production.sh
# ==================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Tracking
PHASE_CURRENT=0
PHASE_TOTAL=10

log_phase() {
    PHASE_CURRENT=$((PHASE_CURRENT + 1))
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  FASE $PHASE_CURRENT/$PHASE_TOTAL: $1${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
}

log_info() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[X]${NC} $1"
}

log_action() {
    echo -e "${CYAN}[>]${NC} $1"
}

log_manual() {
    echo -e "${YELLOW}[MANUAL]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        log_info "$1 encontrado"
        return 0
    else
        log_error "$1 nao encontrado. Instale antes de continuar."
        return 1
    fi
}

pause_for_manual() {
    echo ""
    echo -e "${YELLOW}Pressione ENTER quando terminar esta fase...${NC}"
    read -r
}

# ==================================
# Header
# ==================================
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║          ImobiBase - Setup de Producao               ║${NC}"
echo -e "${BOLD}${GREEN}║          Guia Interativo Completo                    ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Data: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "Diretorio: $(pwd)"
echo ""

# Pre-flight checks
echo -e "${BOLD}Pre-flight checks...${NC}"
check_command "node" || exit 1
check_command "npm" || exit 1
check_command "openssl" || exit 1
check_command "git" || exit 1

VERCEL_AVAILABLE=false
if command -v vercel &> /dev/null; then
    log_info "vercel CLI encontrado"
    VERCEL_AVAILABLE=true
else
    log_warn "vercel CLI nao encontrado. Instale com: npm i -g vercel"
fi

echo ""

# ==================================
# FASE 1: Criar Contas (Manual)
# ==================================
log_phase "Criar Contas e Servicos (OBRIGATORIOS)"

echo -e "Crie as contas abaixo antes de continuar:"
echo ""
echo -e "  ${BOLD}1. Supabase${NC} (PostgreSQL) - https://supabase.com"
echo -e "     Projeto regiao: sa-east-1 (Sao Paulo)"
echo -e "     Plano: Pro (~\$25/mes)"
echo ""
echo -e "  ${BOLD}2. Upstash${NC} (Redis) - https://upstash.com"
echo -e "     Database regiao: sa-east-1"
echo -e "     Plano: Pay-as-you-go (~\$5-10/mes)"
echo ""
echo -e "  ${BOLD}3. Vercel${NC} (Hosting) - https://vercel.com"
echo -e "     Linkar repositorio Git"
echo -e "     Plano: Pro (\$20/mes)"
echo ""
echo -e "  ${BOLD}4. Sentry${NC} (Monitoramento) - https://sentry.io"
echo -e "     Criar projeto 'imobibase'"
echo -e "     Plano: Free (5K eventos/mes)"
echo ""
echo -e "  ${BOLD}5. SendGrid ou Resend${NC} (Email)"
echo -e "     SendGrid: https://sendgrid.com - Free (100 emails/dia)"
echo -e "     Resend: https://resend.com - Free (100 emails/dia)"
echo -e "     Verificar dominio de email"
echo ""
echo -e "${YELLOW}Custo minimo mensal: ~\$50-55/mes${NC}"

pause_for_manual

# ==================================
# FASE 2: Servicos Opcionais (Manual)
# ==================================
log_phase "Servicos Opcionais (conforme necessidade)"

echo -e "Os servicos abaixo sao opcionais. O sistema funciona com fallbacks."
echo ""
echo -e "  ${BOLD}6. Stripe${NC} - Pagamentos internacionais (2.9% + \$0.30/tx)"
echo -e "  ${BOLD}7. Mercado Pago${NC} - PIX, boleto (4.99%/tx)"
echo -e "  ${BOLD}8. WhatsApp Business API${NC} - CRM WhatsApp, ISA"
echo -e "  ${BOLD}9. Twilio${NC} - SMS e 2FA"
echo -e "  ${BOLD}10. Google Maps${NC} - APIs: Geocoding, Maps JS, Places"
echo -e "  ${BOLD}11. ClickSign${NC} - Assinatura digital de contratos"
echo -e "  ${BOLD}12. Anthropic (Claude)${NC} - IA: Auto-Marketing, AVM, ISA"
echo -e "  ${BOLD}13. PostHog${NC} - Analytics de produto (Free 1M eventos)"
echo -e "  ${BOLD}14. Google Analytics${NC} - Analytics web (Free)"
echo ""
echo -e "${YELLOW}Nota: Pelo menos 1 gateway (Stripe OU Mercado Pago) e necessario para cobrar assinaturas.${NC}"

pause_for_manual

# ==================================
# FASE 3: Gerar Secrets
# ==================================
log_phase "Gerar Secrets de Seguranca"

echo -e "Gerando secrets criptograficamente seguros..."
echo ""

SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')
CRON_SECRET=$(openssl rand -base64 48 | tr -d '\n')
CSRF_SECRET=$(openssl rand -base64 32 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n')
CLICKSIGN_WEBHOOK_SECRET=$(openssl rand -hex 32)

SECRETS_FILE=".secrets-production-$(date +%Y%m%d_%H%M%S).txt"

cat > "$SECRETS_FILE" << EOF
# ImobiBase Production Secrets
# Gerado em: $(date '+%Y-%m-%d %H:%M:%S')
# ATENÇÃO: Este arquivo contem segredos sensiveis!
# Copie estes valores para as variaveis de ambiente do Vercel
# e EXCLUA este arquivo imediatamente apos o uso.

SESSION_SECRET=$SESSION_SECRET
CRON_SECRET=$CRON_SECRET
CSRF_SECRET=$CSRF_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
CLICKSIGN_WEBHOOK_SECRET=$CLICKSIGN_WEBHOOK_SECRET
EOF

chmod 600 "$SECRETS_FILE"

log_info "SESSION_SECRET gerado (88 chars)"
log_info "CRON_SECRET gerado (64 chars)"
log_info "CSRF_SECRET gerado (44 chars)"
log_info "ENCRYPTION_KEY gerado (44 chars)"
log_info "CLICKSIGN_WEBHOOK_SECRET gerado (64 chars hex)"
echo ""
log_warn "Secrets salvos em: $SECRETS_FILE"
log_warn "IMPORTANTE: Exclua este arquivo apos copiar os valores para o Vercel!"

pause_for_manual

# ==================================
# FASE 4: Dominio + DNS (Manual)
# ==================================
log_phase "Registrar Dominio + DNS"

echo -e "  [ ] Registrar dominio (ex: imobibase.com.br)"
echo -e "  [ ] No Vercel: Project > Settings > Domains > Adicionar dominio"
echo -e "  [ ] Configurar registros DNS conforme instrucoes do Vercel"
echo -e "  [ ] Aguardar propagacao DNS + SSL (automatico)"
echo -e "  [ ] Atualizar CORS_ORIGINS com dominios de producao"
echo -e "  [ ] Configurar COOKIE_DOMAIN se usar subdominios"

pause_for_manual

# ==================================
# FASE 5: Variaveis de Ambiente
# ==================================
log_phase "Configurar Variaveis de Ambiente no Vercel"

if [ "$VERCEL_AVAILABLE" = true ]; then
    echo -e "Vercel CLI disponivel. Voce pode usar os comandos abaixo:"
    echo ""
    echo -e "${CYAN}# Database${NC}"
    echo -e "  vercel env add DATABASE_URL production"
    echo -e "  vercel env add SUPABASE_URL production"
    echo -e "  vercel env add SUPABASE_ANON_KEY production"
    echo -e "  vercel env add SUPABASE_SERVICE_KEY production"
    echo ""
    echo -e "${CYAN}# Cache${NC}"
    echo -e "  vercel env add REDIS_URL production"
    echo ""
    echo -e "${CYAN}# Seguranca (use os valores do arquivo $SECRETS_FILE)${NC}"
    echo -e "  vercel env add SESSION_SECRET production"
    echo -e "  vercel env add CRON_SECRET production"
    echo -e "  vercel env add CSRF_SECRET production"
    echo -e "  vercel env add ENCRYPTION_KEY production"
    echo -e "  vercel env add CORS_ORIGINS production"
    echo -e "  vercel env add COOKIE_DOMAIN production"
    echo ""
    echo -e "${CYAN}# Monitoramento${NC}"
    echo -e "  vercel env add SENTRY_DSN production"
    echo -e "  vercel env add VITE_SENTRY_DSN production"
    echo ""
    echo -e "${CYAN}# Email${NC}"
    echo -e "  vercel env add SENDGRID_API_KEY production"
    echo -e "  vercel env add EMAIL_FROM production"
    echo ""
    echo -e "${CYAN}# Pagamentos (pelo menos 1 gateway)${NC}"
    echo -e "  vercel env add STRIPE_SECRET_KEY production"
    echo -e "  vercel env add STRIPE_PUBLISHABLE_KEY production"
    echo -e "  vercel env add STRIPE_WEBHOOK_SECRET production"
    echo -e "  # OU"
    echo -e "  vercel env add MERCADOPAGO_ACCESS_TOKEN production"
    echo -e "  vercel env add MERCADOPAGO_PUBLIC_KEY production"
    echo ""
    echo -e "${CYAN}# Cron Jobs${NC}"
    echo -e "  vercel env add CRON_SECRET production"
    echo ""
    echo -e "${YELLOW}Total: ~24 variaveis obrigatorias + opcionais${NC}"
else
    echo -e "Vercel CLI nao disponivel. Configure as variaveis pelo dashboard:"
    echo -e "  https://vercel.com/dashboard > Seu Projeto > Settings > Environment Variables"
    echo ""
    echo -e "Consulte .env.production para a lista completa de variaveis."
fi

pause_for_manual

# ==================================
# FASE 6: Setup do Banco de Dados
# ==================================
log_phase "Setup do Banco de Dados"

echo -e "Os comandos abaixo configuram o banco de dados de producao."
echo -e "${RED}ATENCAO: Certifique-se que DATABASE_URL aponta para o banco CORRETO!${NC}"
echo ""

read -p "Deseja executar o setup do banco agora? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    log_action "1/4 - Aplicando schema (52 tabelas)..."
    npm run db:push || {
        log_error "Falha ao aplicar schema. Verifique DATABASE_URL."
        pause_for_manual
    }

    log_action "2/4 - Aplicando indexes de performance..."
    npm run db:indexes:apply || {
        log_warn "Falha ao aplicar indexes. Execute manualmente: npm run db:indexes:apply"
    }

    log_action "3/4 - Atualizando estatisticas do query planner..."
    npm run db:analyze || {
        log_warn "Falha no ANALYZE. Execute manualmente: npm run db:analyze"
    }

    log_action "4/4 - Criando tenant superadmin..."
    npm run db:init:production || {
        log_warn "Falha na inicializacao. Execute manualmente: npm run db:init:production"
    }

    log_info "Setup do banco concluido!"
else
    echo ""
    echo -e "Execute manualmente quando estiver pronto:"
    echo -e "  ${CYAN}npm run db:push${NC}              # Aplicar schema"
    echo -e "  ${CYAN}npm run db:indexes:apply${NC}     # Indexes de performance"
    echo -e "  ${CYAN}npm run db:analyze${NC}           # Estatisticas do planner"
    echo -e "  ${CYAN}npm run db:init:production${NC}   # Criar tenant superadmin"
fi

pause_for_manual

# ==================================
# FASE 7: Deploy
# ==================================
log_phase "Deploy Staging → Testes → Producao"

echo -e "Fluxo recomendado:"
echo ""
echo -e "  ${CYAN}1. Deploy staging (preview):${NC}"
echo -e "     vercel"
echo ""
echo -e "  ${CYAN}2. Testar manualmente:${NC}"
echo -e "     - Health check: curl https://preview-url/api/health"
echo -e "     - Login/logout"
echo -e "     - Cadastro de tenant"
echo -e "     - Envio de email (reset de senha)"
echo -e "     - Pagamento (se configurado)"
echo -e "     - Cron jobs (Vercel Dashboard > Monitoring)"
echo ""
echo -e "  ${CYAN}3. Deploy producao:${NC}"
echo -e "     vercel --prod"
echo -e "     # OU: npm run deploy:production"
echo ""

read -p "Deseja fazer deploy staging agora? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ "$VERCEL_AVAILABLE" = true ]; then
        log_action "Executando deploy staging..."
        vercel || log_error "Deploy staging falhou."
    else
        log_error "Vercel CLI nao disponivel. Instale com: npm i -g vercel"
    fi
fi

pause_for_manual

# ==================================
# FASE 8: Webhooks (Manual)
# ==================================
log_phase "Configurar Webhooks dos Servicos Externos"

echo -e "Configure os webhooks nos dashboards dos servicos:"
echo ""
echo -e "  ${BOLD}Stripe:${NC}"
echo -e "    URL: https://seudominio.com/api/webhooks/stripe"
echo -e "    Dashboard: Stripe > Developers > Webhooks"
echo ""
echo -e "  ${BOLD}Mercado Pago:${NC}"
echo -e "    URL: https://seudominio.com/api/webhooks/mercadopago"
echo -e "    Dashboard: MercadoPago Developers > Webhooks"
echo ""
echo -e "  ${BOLD}ClickSign:${NC}"
echo -e "    URL: https://seudominio.com/api/webhooks/clicksign"
echo -e "    Dashboard: ClickSign > Configuracoes > Webhooks"
echo ""
echo -e "  ${BOLD}WhatsApp:${NC}"
echo -e "    URL: https://seudominio.com/api/webhooks/whatsapp"
echo -e "    Dashboard: Meta Developer Console > WhatsApp > Configuration"

pause_for_manual

# ==================================
# FASE 9: Monitoramento
# ==================================
log_phase "Monitoramento Pos-Deploy"

echo -e "Checklist de monitoramento:"
echo ""
echo -e "  [ ] Sentry recebendo eventos"
echo -e "      Teste: curl https://seudominio.com/api/debug-sentry"
echo ""
echo -e "  [ ] Headers de seguranca OK"
echo -e "      Teste: https://securityheaders.com/?q=seudominio.com"
echo ""
echo -e "  [ ] Uptime monitoring configurado"
echo -e "      Recomendado: UptimeRobot ou Better Uptime"
echo ""
echo -e "  [ ] Alertas Sentry configurados:"
echo -e "      - >10 erros/hora"
echo -e "      - Latencia P95 >5s"
echo -e "      - Erros 5xx em pagamentos"
echo ""
echo -e "  [ ] Cron jobs funcionando"
echo -e "      Vercel Dashboard > Monitoring > Cron Jobs"

pause_for_manual

# ==================================
# FASE 10: Legal e Compliance
# ==================================
log_phase "Legal e Compliance"

echo -e "  [ ] Termos de uso publicados em /terms"
echo -e "  [ ] Politica de privacidade em /privacy"
echo -e "  [ ] Banner de consentimento de cookies (LGPD)"
echo -e "  [ ] Dados de contato do DPO configurados"
echo ""

# Check if pages exist
if [ -f "client/src/pages/public/terms.tsx" ]; then
    log_info "Pagina /terms encontrada"
else
    log_warn "Pagina /terms NAO encontrada"
fi

if [ -f "client/src/pages/public/privacy.tsx" ]; then
    log_info "Pagina /privacy encontrada"
else
    log_warn "Pagina /privacy NAO encontrada"
fi

# ==================================
# Cleanup reminder
# ==================================
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  Setup de Producao Completo!${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""

if [ -f "$SECRETS_FILE" ]; then
    echo -e "${RED}${BOLD}LEMBRETE IMPORTANTE:${NC}"
    echo -e "${RED}Exclua o arquivo de secrets apos copiar os valores:${NC}"
    echo -e "${RED}  rm $SECRETS_FILE${NC}"
    echo ""
fi

echo -e "Resumo:"
echo -e "  - Codigo: 100% pronto"
echo -e "  - Custo minimo: ~\$50-55/mes"
echo -e "  - Monitoramento: Sentry + Vercel Dashboard"
echo -e "  - Deploy: vercel --prod"
echo ""
echo -e "Comandos uteis:"
echo -e "  ${CYAN}npm run deploy:production${NC}    # Deploy automatizado"
echo -e "  ${CYAN}npm run health:check${NC}         # Health check"
echo -e "  ${CYAN}npm run validate:secrets${NC}     # Validar secrets"
echo -e "  ${CYAN}npm run rotate:secrets${NC}       # Rotacionar secrets"
echo ""
