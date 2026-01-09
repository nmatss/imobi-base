#!/bin/bash

# Script de Teste - WhatsApp Webhook Signature Validation
# Este script testa a validação de assinatura do webhook do WhatsApp

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuração
SERVER_URL="${SERVER_URL:-http://localhost:5000}"
WHATSAPP_WEBHOOK_URL="$SERVER_URL/api/webhooks/whatsapp"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  WhatsApp Webhook Security Tests${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Verificar se o servidor está rodando
echo -e "${YELLOW}1. Verificando se o servidor está online...${NC}"
if curl -s -f "$SERVER_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Servidor online${NC}"
else
    echo -e "${RED}✗ Servidor offline ou sem endpoint /api/health${NC}"
    echo -e "${YELLOW}  Inicie o servidor com: npm run dev${NC}"
    exit 1
fi
echo ""

# Testar webhook verification (GET)
echo -e "${YELLOW}2. Testando Webhook Verification (GET)...${NC}"

# Verificar se WHATSAPP_VERIFY_TOKEN está configurado
if [ -z "$WHATSAPP_VERIFY_TOKEN" ]; then
    echo -e "${RED}✗ WHATSAPP_VERIFY_TOKEN não configurado${NC}"
    echo -e "${YELLOW}  Configure no .env: WHATSAPP_VERIFY_TOKEN=seu-token${NC}"
else
    # Teste com token correto
    echo -e "${BLUE}   Testando com token correto...${NC}"
    RESPONSE=$(curl -s -w "\n%{http_code}" "$WHATSAPP_WEBHOOK_URL?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=test123")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n1)

    if [ "$HTTP_CODE" = "200" ] && [ "$BODY" = "test123" ]; then
        echo -e "${GREEN}   ✓ Webhook verification bem-sucedida${NC}"
    else
        echo -e "${RED}   ✗ Webhook verification falhou (HTTP $HTTP_CODE)${NC}"
    fi

    # Teste com token incorreto
    echo -e "${BLUE}   Testando com token incorreto...${NC}"
    RESPONSE=$(curl -s -w "\n%{http_code}" "$WHATSAPP_WEBHOOK_URL?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=test123")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "403" ]; then
        echo -e "${GREEN}   ✓ Token incorreto rejeitado corretamente${NC}"
    else
        echo -e "${RED}   ✗ Token incorreto não foi rejeitado (HTTP $HTTP_CODE)${NC}"
    fi
fi
echo ""

# Testar webhook signature (POST)
echo -e "${YELLOW}3. Testando Webhook Signature Validation (POST)...${NC}"

# Verificar se WHATSAPP_APP_SECRET está configurado
if [ -z "$WHATSAPP_APP_SECRET" ]; then
    echo -e "${RED}✗ WHATSAPP_APP_SECRET não configurado${NC}"
    echo -e "${YELLOW}  Configure no .env: WHATSAPP_APP_SECRET=seu-app-secret${NC}"
else
    # Payload de teste
    PAYLOAD='{"object":"whatsapp_business_account","entry":[{"id":"default","changes":[{"field":"messages","value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"1234567890","phone_number_id":"123456"}}}]}]}'

    # Gerar signature válida
    echo -e "${BLUE}   Gerando signature válida...${NC}"
    SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | awk '{print $2}')
    SIGNATURE_HEADER="sha256=$SIGNATURE"

    # Teste com signature válida
    echo -e "${BLUE}   Testando com signature válida...${NC}"
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "$WHATSAPP_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "x-hub-signature-256: $SIGNATURE_HEADER" \
        -d "$PAYLOAD")

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}   ✓ Signature válida aceita${NC}"
    else
        echo -e "${RED}   ✗ Signature válida rejeitada (HTTP $HTTP_CODE)${NC}"
    fi

    # Teste com signature inválida
    echo -e "${BLUE}   Testando com signature inválida...${NC}"
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "$WHATSAPP_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "x-hub-signature-256: sha256=invalid_signature" \
        -d "$PAYLOAD")

    if [ "$HTTP_CODE" = "401" ]; then
        echo -e "${GREEN}   ✓ Signature inválida rejeitada corretamente${NC}"
    else
        echo -e "${RED}   ✗ Signature inválida não foi rejeitada (HTTP $HTTP_CODE)${NC}"
    fi

    # Teste sem signature
    echo -e "${BLUE}   Testando sem signature...${NC}"
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "$WHATSAPP_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")

    if [ "$HTTP_CODE" = "401" ]; then
        echo -e "${GREEN}   ✓ Request sem signature rejeitado corretamente${NC}"
    else
        echo -e "${RED}   ✗ Request sem signature não foi rejeitado (HTTP $HTTP_CODE)${NC}"
    fi
fi
echo ""

echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}  Testes concluídos!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "1. Configure o webhook no Meta Developer Console"
echo -e "2. Use a URL: $WHATSAPP_WEBHOOK_URL"
echo -e "3. Use o verify token configurado no .env"
echo -e "4. Verifique os logs do servidor para mensagens [WHATSAPP]"
echo ""
