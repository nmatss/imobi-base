# Guia Rápido: Filtros Avançados

## Início Rápido em 3 Passos

### 1. Importar Hook e Componente

```tsx
// Para Properties
import { usePropertyFilters } from "@/hooks/usePropertyFilters";
import { AdvancedFilters } from "@/components/properties";

// Para Leads
import { useLeadFilters } from "@/hooks/useLeadFilters";
import { AdvancedLeadFilters } from "@/components/leads";
```

### 2. Usar Hook na Página

```tsx
export default function MyPage() {
  const { properties } = useImobi();

  // Hook retorna filtros e dados filtrados
  const {
    filters,              // Estado atual
    filteredProperties,   // Dados filtrados
    updateFilters,        // Atualizar filtros
    clearFilters          // Limpar tudo
  } = usePropertyFilters(properties);

  // Extract cidades únicas para o filtro
  const cities = Array.from(new Set(properties.map(p => p.city)));

  // ... resto do componente
}
```

### 3. Renderizar Componente

```tsx
return (
  <div className="grid lg:grid-cols-4 gap-6">
    {/* Filtros na sidebar */}
    <AdvancedFilters
      filters={filters}
      onFiltersChange={updateFilters}
      cities={cities}
      stats={{
        totalProperties: properties.length,
        filteredProperties: filteredProperties.length
      }}
    />

    {/* Lista de resultados */}
    <div className="lg:col-span-3">
      {filteredProperties.map(property => (
        <PropertyCard key={property.id} {...property} />
      ))}
    </div>
  </div>
);
```

## Exemplos de Uso

### Filtros Simples

```tsx
// Apenas busca por texto
const { filteredProperties } = usePropertyFilters(properties);

// Usuário digita "apartamento vila"
// Resultado: Properties com "apartamento" OU "vila" no título/endereço/cidade
```

### Filtros Combinados

```tsx
// Usuário seleciona:
// - Tipo: Apartamento + Casa
// - Cidade: São Paulo
// - Preço: R$ 500K - R$ 1M
// - Quartos: 3+

// Resultado: Apartamentos OU Casas, em São Paulo,
// entre 500K-1M, com 3+ quartos
```

### Salvar Filtro Favorito

```tsx
// 1. Usuário configura filtros
updateFilters({
  type: ['apartment'],
  city: ['São Paulo'],
  minPrice: 800000,
  bedrooms: [3, 4]
});

// 2. Clica em "Salvar Filtros"
// 3. Digite nome: "Apt 3Q SP - Alto Padrão"
// 4. Salvo! Agora aparece em "Filtros Salvos"
```

### Aplicar Filtro Salvo

```tsx
// Dropdown "Filtros Salvos"
// Click em "Apt 3Q SP - Alto Padrão"
// Todos os filtros são aplicados instantaneamente
```

## Layout Responsivo

### Desktop (Sidebar)

```tsx
<div className="grid lg:grid-cols-4 gap-6">
  <div className="lg:col-span-1">
    <AdvancedFilters {...props} />
  </div>
  <div className="lg:col-span-3">
    {/* Results */}
  </div>
</div>
```

### Mobile (Sheet/Drawer)

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button>
      Filtros
      {activeFilterCount > 0 && (
        <Badge>{activeFilterCount}</Badge>
      )}
    </Button>
  </SheetTrigger>
  <SheetContent>
    <AdvancedFilters {...props} />
  </SheetContent>
</Sheet>
```

## Customização

### Alterar Range de Preço

```tsx
// Em AdvancedFilters.tsx, linha ~200
<Slider
  min={0}
  max={20000000}  // Aumentar para R$ 20M
  step={100000}   // Passos de R$ 100K
  value={[filters.minPrice, filters.maxPrice]}
  onValueChange={([min, max]) =>
    onFiltersChange({ ...filters, minPrice: min, maxPrice: max })
  }
/>
```

### Adicionar Novos Tipos de Imóvel

```tsx
// Em AdvancedFilters.tsx, linha ~50
const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartamento" },
  { value: "house", label: "Casa" },
  { value: "commercial", label: "Comercial" },
  { value: "land", label: "Terreno" },
  { value: "condo", label: "Condomínio" },
  { value: "farm", label: "Fazenda" },        // NOVO
  { value: "warehouse", label: "Galpão" },    // NOVO
];
```

### Personalizar Cores dos Badges

```tsx
// Badge selecionado
<Badge variant="default" className="bg-primary">
  Selecionado
</Badge>

// Badge não selecionado
<Badge variant="outline" className="hover:bg-muted">
  Não selecionado
</Badge>
```

## Integração com Kanban

Para usar filtros no Kanban de Leads:

```tsx
export default function LeadsKanban() {
  const { leads } = useImobi();
  const { filteredLeads } = useLeadFilters(leads);

  // Agrupar leads FILTRADOS por status
  const leadsByStatus = COLUMNS.map(column => ({
    ...column,
    leads: filteredLeads.filter(lead => lead.status === column.id)
  }));

  return (
    <div className="flex gap-4">
      {leadsByStatus.map(column => (
        <KanbanColumn key={column.id} {...column}>
          {column.leads.map(lead => (
            <LeadCard key={lead.id} {...lead} />
          ))}
        </KanbanColumn>
      ))}
    </div>
  );
}
```

## Performance Tips

### 1. Memoize Extract de Cidades

```tsx
const cities = useMemo(
  () => Array.from(new Set(properties.map(p => p.city))).filter(Boolean),
  [properties]
);
```

### 2. Debounce em Busca por Texto

```tsx
import { useDebounce } from "@/hooks/useDebounce";

const [searchInput, setSearchInput] = useState("");
const debouncedSearch = useDebounce(searchInput, 300);

// Usar debouncedSearch nos filtros
useEffect(() => {
  updateFilter("search", debouncedSearch);
}, [debouncedSearch]);
```

### 3. Virtualização para Muitos Resultados

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

const parentRef = useRef();
const virtualizer = useVirtualizer({
  count: filteredProperties.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 300,
});

// Renderizar apenas itens visíveis
{virtualizer.getVirtualItems().map(virtualRow => {
  const property = filteredProperties[virtualRow.index];
  return <PropertyCard key={property.id} {...property} />;
})}
```

## Troubleshooting

### Filtros não aparecem

```tsx
// Verificar se passou cities/sources
<AdvancedFilters
  filters={filters}
  onFiltersChange={updateFilters}
  cities={cities}  // ← Não esqueça!
  stats={stats}
/>
```

### Slider não atualiza

```tsx
// Garantir que value é array
<Slider
  value={[filters.minPrice, filters.maxPrice]}  // ✓ Array
  // NÃO: value={filters.minPrice}              // ✗ Number
/>
```

### Filtro salvo não carrega

```tsx
// Verificar formato de data ao salvar
const saveFilter = () => {
  const toSave = {
    ...filters,
    // Converter Date para string
    createdAfter: filters.createdAfter?.toISOString() || null
  };
  localStorage.setItem(KEY, JSON.stringify(toSave));
};

// E ao carregar
const loadFilter = (saved) => {
  updateFilters({
    ...saved.filters,
    // Converter string de volta para Date
    createdAfter: saved.filters.createdAfter
      ? new Date(saved.filters.createdAfter)
      : null
  });
};
```

## Próximas Melhorias

### Autocomplete de Cidades

```tsx
// TODO: Integrar com Google Places
<Autocomplete
  options={cities}
  onSelect={(city) => updateFilter("city", [...filters.city, city])}
  placeholder="Digite a cidade..."
/>
```

### Compartilhar Filtros via URL

```tsx
// TODO: Sincronizar com URL query params
const params = new URLSearchParams();
params.set("type", filters.type.join(","));
params.set("minPrice", filters.minPrice.toString());
window.history.pushState({}, "", `?${params}`);
```

### Analytics de Filtros

```tsx
// TODO: Rastrear filtros mais usados
const trackFilter = (filterName: string, value: any) => {
  analytics.track("Filter Applied", {
    filter: filterName,
    value,
    timestamp: new Date()
  });
};
```

## Recursos Adicionais

- 📄 **Documentação Completa**: `AGENTE_17_FILTROS_AVANCADOS_REPORT.md`
- 💻 **Código Exemplo**: `client/src/components/properties/AdvancedFiltersExample.tsx`
- 🎯 **Hook API**: `client/src/hooks/usePropertyFilters.ts`
- 🎨 **UI Components**: `client/src/components/properties/AdvancedFilters.tsx`

## Suporte

Para dúvidas ou problemas:
1. Consulte os arquivos de exemplo
2. Verifique o relatório completo
3. Analise o código dos hooks
4. Teste com dados de exemplo

---

**Versão**: 1.0.0
**Última Atualização**: 2025-12-25
**Autor**: Agente 17 - Sistema de Filtros Avançados
