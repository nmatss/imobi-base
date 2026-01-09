import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useImobi } from "@/lib/imobi-context";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Building2,
  Users,
  FileText,
  Search,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  Home,
  Bed
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function GlobalSearch() {
  const iconA11yProps = { "aria-hidden": true, focusable: false } as const;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { properties, leads, contracts } = useImobi();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredProperties = properties.filter((p) =>
    search.length >= 2
      ? p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.address?.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase()) ||
        p.neighborhood?.toLowerCase().includes(search.toLowerCase())
      : false
  ).slice(0, 5);

  const filteredLeads = leads.filter((l) =>
    search.length >= 2
      ? l.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.email?.toLowerCase().includes(search.toLowerCase()) ||
        l.phone?.toLowerCase().includes(search.toLowerCase())
      : false
  ).slice(0, 5);

  const filteredContracts = contracts.filter((c) =>
    search.length >= 2
      ? c.id?.toLowerCase().includes(search.toLowerCase()) ||
        c.value?.toLowerCase().includes(search.toLowerCase())
      : false
  ).slice(0, 5);

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false);
    setSearch("");
    callback();
  }, []);

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return "Sob consulta";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(parseFloat(price.replace(/[^\d,]/g, "").replace(",", ".")));
  };

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      house: "Casa",
      apartment: "Apartamento",
      land: "Terreno",
      commercial: "Comercial",
    };
    return labels[type] || type;
  };

  const getLeadStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500",
      qualification: "bg-purple-500",
      visit: "bg-orange-500",
      proposal: "bg-amber-700", // WCAG AA: 4.6:1 contrast
      contract: "bg-green-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getLeadStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: "Novo",
      qualification: "Em Contato",
      visit: "Visita",
      proposal: "Proposta",
      contract: "Fechado",
    };
    return labels[status] || status;
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar imóveis, leads, contratos..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Search {...iconA11yProps} className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">
              {search.length < 2
                ? "Digite pelo menos 2 caracteres para buscar"
                : "Nenhum resultado encontrado"}
            </p>
          </div>
        </CommandEmpty>

        {filteredProperties.length > 0 && (
          <>
            <CommandGroup heading="Imóveis">
              {filteredProperties.map((property) => (
                <CommandItem
                  key={property.id}
                  value={`property-${property.id}`}
                  onSelect={() =>
                    handleSelect(() => setLocation(`/properties/${property.id}`))
                  }
                  className="flex items-start gap-3 py-3 cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Building2 {...iconA11yProps} className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{property.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <MapPin {...iconA11yProps} className="h-3 w-3" />
                      <span className="truncate">
                        {property.neighborhood}, {property.city}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {getPropertyTypeLabel(property.type)}
                      </Badge>
                      {property.bedrooms && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Bed {...iconA11yProps} className="h-3 w-3" />
                          {property.bedrooms}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-blue-600">
                        {formatPrice(property.price)}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {filteredLeads.length > 0 && (
          <>
            <CommandGroup heading="Leads">
              {filteredLeads.map((lead) => (
                <CommandItem
                  key={lead.id}
                  value={`lead-${lead.id}`}
                  onSelect={() => handleSelect(() => setLocation("/leads"))}
                  className="flex items-start gap-3 py-3 cursor-pointer"
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${getLeadStatusColor(
                      lead.status
                    )}`}
                  >
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lead.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {lead.email && (
                        <>
                          <Mail {...iconA11yProps} className="h-3 w-3" />
                          <span className="truncate">{lead.email}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {getLeadStatusLabel(lead.status)}
                      </Badge>
                      {lead.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone {...iconA11yProps} className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {filteredContracts.length > 0 && (
          <CommandGroup heading="Contratos">
            {filteredContracts.map((contract) => (
              <CommandItem
                key={contract.id}
                value={`contract-${contract.id}`}
                onSelect={() => handleSelect(() => setLocation("/contracts"))}
                className="flex items-start gap-3 py-3 cursor-pointer"
              >
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <FileText {...iconA11yProps} className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Contrato {contract.id.slice(0, 8)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign {...iconA11yProps} className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-semibold text-green-600">
                      {contract.value}
                    </span>
                  </div>
                  <Badge
                    variant={
                      contract.status === "signed"
                        ? "default"
                        : contract.status === "sent"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs mt-1"
                  >
                    {contract.status === "draft"
                      ? "Rascunho"
                      : contract.status === "sent"
                      ? "Enviado"
                      : "Assinado"}
                  </Badge>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {search.length === 0 && (
          <CommandGroup heading="Ações Rápidas">
            <CommandItem onSelect={() => handleSelect(() => setLocation("/properties"))}>
              <Home {...iconA11yProps} className="mr-2 h-4 w-4" />
              <span>Ver todos os imóveis</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => setLocation("/leads"))}>
              <Users {...iconA11yProps} className="mr-2 h-4 w-4" />
              <span>Ver todos os leads</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => setLocation("/contracts"))}>
              <FileText {...iconA11yProps} className="mr-2 h-4 w-4" />
              <span>Ver todos os contratos</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => setLocation("/calendar"))}>
              <Calendar {...iconA11yProps} className="mr-2 h-4 w-4" />
              <span>Abrir agenda</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
