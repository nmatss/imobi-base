/**
 * Exemplo de Uso do Design System ImobiBase
 *
 * Este arquivo demonstra como usar os design tokens e componentes
 * padronizados do sistema.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { H1, H2, H3, H4, Text, Caption, Lead, Muted } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import {
  statusColors,
  semanticColors,
  spacing,
  getStatusColor,
  getSemanticColor
} from "@/lib/design-tokens";

export function DesignSystemExample() {
  return (
    <div className="container-responsive py-responsive space-y-8">
      {/* Typography Section */}
      <section className="space-y-4">
        <H1>Sistema de Design ImobiBase</H1>
        <Lead>
          Componentes e tokens padronizados para garantir consistência visual
          em toda a aplicação.
        </Lead>

        <div className="space-y-2">
          <H2>Títulos e Hierarquia</H2>
          <H3>Este é um H3</H3>
          <H4>Este é um H4</H4>
          <Text>Este é um parágrafo de texto normal.</Text>
          <Muted>Este é um texto secundário/muted.</Muted>
          <Caption>Esta é uma legenda pequena.</Caption>
        </div>
      </section>

      {/* Status Colors Section */}
      <section className="space-y-4">
        <H2>Cores de Status (CRM/Pipeline)</H2>
        <Text variant="muted">
          Use estas cores para representar status de leads e propostas.
        </Text>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusColorCard status="new" label="Novo" />
          <StatusColorCard status="qualification" label="Qualificação" />
          <StatusColorCard status="visit" label="Visita" />
          <StatusColorCard status="proposal" label="Proposta" />
          <StatusColorCard status="negotiation" label="Negociação" />
          <StatusColorCard status="contract" label="Fechado" />
          <StatusColorCard status="closed" label="Concluído" />
          <StatusColorCard status="lost" label="Perdido" />
        </div>

        <div className="space-y-2">
          <H4>Badges de Status</H4>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="new">Novo</StatusBadge>
            <StatusBadge status="qualification">Em Qualificação</StatusBadge>
            <StatusBadge status="visit">Visita Agendada</StatusBadge>
            <StatusBadge status="proposal">Proposta Enviada</StatusBadge>
            <StatusBadge status="negotiation">Em Negociação</StatusBadge>
            <StatusBadge status="contract">Fechado</StatusBadge>
            <StatusBadge status="lost">Perdido</StatusBadge>
          </div>

          <H4>Tamanhos de Badges</H4>
          <div className="flex flex-wrap gap-2 items-center">
            <StatusBadge status="new" size="sm">Pequeno</StatusBadge>
            <StatusBadge status="new" size="md">Médio</StatusBadge>
            <StatusBadge status="new" size="lg">Grande</StatusBadge>
          </div>
        </div>
      </section>

      {/* Semantic Colors Section */}
      <section className="space-y-4">
        <H2>Cores Semânticas (Feedback)</H2>
        <Text variant="muted">
          Use estas cores para feedback do sistema e alertas.
        </Text>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge className="badge-success">Sucesso</Badge>
            <Badge className="badge-warning">Atenção</Badge>
            <Badge className="badge-error">Erro</Badge>
            <Badge className="badge-info">Informação</Badge>
          </div>
        </div>
      </section>

      {/* Buttons Section */}
      <section className="space-y-4">
        <H2>Botões</H2>

        <div className="space-y-4">
          <div>
            <H4>Variantes</H4>
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>

          <div>
            <H4>Tamanhos</H4>
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm">Pequeno</Button>
              <Button size="default">Normal</Button>
              <Button size="lg">Grande</Button>
            </div>
          </div>

          <div>
            <H4>Estados</H4>
            <div className="flex flex-wrap gap-2">
              <Button>Normal</Button>
              <Button disabled>Desabilitado</Button>
              <Button isLoading>Carregando</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing Section */}
      <section className="space-y-4">
        <H2>Espaçamento</H2>
        <Text variant="muted">
          Sistema baseado em grid de 8pt para espaçamento consistente.
        </Text>

        <div className="space-y-2">
          <SpacingExample size="xs" />
          <SpacingExample size="sm" />
          <SpacingExample size="md" />
          <SpacingExample size="lg" />
          <SpacingExample size="xl" />
          <SpacingExample size="2xl" />
        </div>
      </section>

      {/* Cards Section */}
      <section className="space-y-4">
        <H2>Cards com Efeitos</H2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>Card com Hover</CardTitle>
              <CardDescription>
                Passe o mouse para ver o efeito de elevação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Text size="sm">
                Este card tem efeito de hover com elevação suave.
              </Text>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardHeader>
              <CardTitle>Card Interativo</CardTitle>
              <CardDescription>
                Efeito sofisticado no hover
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Text size="sm">
                Este card tem efeito interativo mais pronunciado.
              </Text>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card Padrão</CardTitle>
              <CardDescription>
                Sem efeitos especiais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Text size="sm">
                Este é um card padrão sem efeitos de hover.
              </Text>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

// Helper Components

function StatusColorCard({
  status,
  label,
}: {
  status: keyof typeof statusColors;
  label: string;
}) {
  const color = getStatusColor(status);

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className={`h-12 rounded ${color.bg}`} />
        <div>
          <Text size="sm" className="font-medium">
            {label}
          </Text>
          <Caption>{color.hex}</Caption>
        </div>
      </CardContent>
    </Card>
  );
}

function SpacingExample({ size }: { size: keyof typeof spacing }) {
  return (
    <div className="flex items-center gap-4">
      <Caption className="w-16">{size}</Caption>
      <div
        className="bg-primary h-4"
        style={{ width: spacing[size] }}
      />
      <Caption className="text-muted-foreground">{spacing[size]}</Caption>
    </div>
  );
}
