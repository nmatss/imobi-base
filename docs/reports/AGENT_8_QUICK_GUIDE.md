# 📊 Guia Rápido - Página de Relatórios ImobiBase

## Acesso Rápido

**URL**: `http://localhost:5000/reports`  
**Menu**: Dashboard → Relatórios

---

## 🎯 6 Tipos de Relatórios Disponíveis

### 1. 💰 Vendas

**O que mostra:**

- Total de vendas realizadas
- Valor total transacionado
- Ticket médio por venda
- Taxa de conversão
- Top corretor do período

**Gráficos:**

- 📊 Vendas por mês (barras)
- 🥧 Distribuição por tipo de imóvel (pizza)

**Tabela:** Lista completa de vendas com data, imóvel, comprador, corretor e valor

---

### 2. 🏠 Aluguéis

**O que mostra:**

- Contratos ativos
- Receita recorrente mensal
- Taxa de inadimplência
- Taxa de ocupação
- Contratos vencendo em breve

**Gráfico:**

- 📈 Receitas mensais (recebido vs pendente)

---

### 3. 🎯 Funil de Leads

**O que mostra:**

- Progressão por etapas (Novo → Qualificação → Visita → Proposta → Contrato)
- Tempo médio em cada etapa
- Leads ganhos vs perdidos
- Taxa de conversão geral

**Gráficos:**

- 🎨 Funil visual colorido
- 🥧 Origem dos leads

---

### 4. 👥 Corretores

**O que mostra:**

- Ranking completo da equipe
- Leads trabalhados por corretor
- Visitas realizadas
- Propostas enviadas
- Contratos fechados
- Ticket médio individual
- Taxa de conversão

**Gráfico:**

- 📊 Comparação de performance (barras agrupadas)

**Tabela:** Ranking detalhado com todas as métricas

---

### 5. 🏢 Imóveis

**O que mostra:**

- Imóveis mais visitados (Top 5)
- Distribuição do estoque por status
- ⚠️ Imóveis parados (sem visitas em 30 dias)
- Tempo médio para vender/alugar por tipo

**Gráficos:**

- 🥧 Estoque por status
- 📊 Tempo médio de venda por tipo

---

### 6. 💼 Financeiro (DRE)

**O que mostra:**

- Receita de vendas (comissões)
- Receita de aluguéis (administração)
- Outras receitas
- Despesas operacionais
- Lucro líquido
- Margem de lucro (%)

**Gráficos:**

- 🥧 Margem por canal de receita
- 📊 Margem por corretor

---

## 🔍 Filtros Disponíveis

### Período

- ⏰ **Hoje**: Dados do dia atual
- 📅 **7 dias**: Última semana
- 📅 **30 dias**: Último mês
- 📅 **Trimestre**: Últimos 3 meses
- 📅 **Ano**: Últimos 12 meses
- 📅 **Personalizado**: Escolha data inicial e final

### Corretor

- 👥 **Todos os corretores**: Visão geral da equipe
- 👤 **Corretor específico**: Dados individuais

---

## 📥 Exportação

### Opções de Exportação

1. **📄 CSV/Excel**
   - ✅ Download imediato
   - ✅ Formato compatível com Excel
   - ✅ Dados estruturados prontos para análise
   - Nome do arquivo: `relatorio_vendas_2024-12-25.csv`

2. **🖨️ Impressão**
   - ✅ Layout otimizado para A4
   - ✅ Cabeçalho com logo e período
   - ✅ Oculta botões e filtros
   - ✅ Mostra apenas conteúdo relevante

3. **📕 PDF** (em desenvolvimento)
   - 🚧 Será implementado em breve
   - Sistema notifica quando estiver disponível

---

## 💾 Relatórios Salvos

### Como Salvar

1. Configure os filtros desejados
2. Clique em **"Salvar"**
3. Relatório aparece na tela inicial para acesso rápido

### Acesso Rápido

- Clique no relatório salvo
- Filtros são aplicados automaticamente
- Dados atualizados na hora

---

## 📱 Mobile & Desktop

### Desktop (1920x1080)

- ✅ Filtros inline na mesma linha
- ✅ Tabelas completas
- ✅ 5 colunas de KPIs
- ✅ Gráficos lado a lado

### Mobile (375x667)

- ✅ Bottom Sheets para filtros
- ✅ Cards expansíveis para tabelas
- ✅ 2 colunas de KPIs
- ✅ Gráficos empilhados
- ✅ Navegação por swipe

---

## 🚀 Passo a Passo de Uso

### 1️⃣ Acessar Relatórios

```
Menu Lateral → Relatórios
```

### 2️⃣ Escolher Tipo

Clique em um dos 6 cards:

- Vendas
- Aluguéis
- Funil de Leads
- Corretores
- Imóveis
- Financeiro

### 3️⃣ Definir Filtros

```
Período: Selecione o intervalo
Corretor: Escolha "Todos" ou específico
Clique em "Aplicar Filtros"
```

### 4️⃣ Analisar Dados

- 📊 Visualize os KPIs no topo
- 📈 Explore os gráficos interativos
- 📋 Revise as tabelas detalhadas

### 5️⃣ Exportar ou Salvar

```
Exportar → Escolha CSV ou Imprimir
OU
Salvar → Para acesso futuro rápido
```

---

## 🎨 Recursos Visuais

### KPI Cards

```
┌─────────────────────────┐
│ [Ícone] 💰             │
│                         │
│ R$ 1.245.000            │
│ Total de Vendas         │
│                         │
│ ▲ +12% vs mês anterior  │
└─────────────────────────┘
```

### Gráficos Interativos

- **Hover**: Mostra valor exato
- **Tooltip**: Formatação em R$ ou %
- **Cores**: Consistentes com brand

### Tabelas Responsivas

- **Desktop**: Tabela completa HTML
- **Mobile**: Cards expansíveis

---

## 🔔 Notificações e Feedback

### Loading States

- ⏳ Skeleton loaders durante carregamento
- 🔄 Spinner na primeira carga
- ✅ Confirmação de ações

### Mensagens de Erro

```
❌ Erro ao carregar relatório
Descrição: Não foi possível conectar ao servidor
```

### Mensagens de Sucesso

```
✅ Exportação concluída
Descrição: Arquivo CSV baixado com sucesso
```

---

## 🛠️ Troubleshooting

### Relatório não carrega?

1. Verifique sua conexão
2. Tente atualizar a página (F5)
3. Limpe o cache do navegador

### Dados não aparecem?

1. Confirme que há dados no período selecionado
2. Tente ampliar o período de filtro
3. Remova filtro de corretor específico

### Exportação não funciona?

1. Permita downloads no navegador
2. Desative bloqueador de popups
3. Tente formato diferente (CSV em vez de PDF)

---

## 📞 Suporte

**Dúvidas?**

- Consulte a documentação técnica: `AGENT_8_REPORTS_IMPLEMENTATION.md`
- Entre em contato com o suporte técnico

---

✨ **Dica Pro**: Salve seus relatórios mais usados para acesso com 1 clique!

📊 **Dados em tempo real**: Todos os relatórios refletem informações atualizadas do banco de dados.

🔒 **Segurança**: Apenas usuários autenticados do seu tenant podem ver os relatórios.

---

**Versão**: 1.0  
**Última atualização**: 25/12/2024  
**Autor**: Claude Code - AGENTE 8
