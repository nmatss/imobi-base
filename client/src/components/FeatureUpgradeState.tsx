import type { ReactElement } from "react";
import { ArrowUpRight, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UpgradeBenefit {
  title: string;
  description: string;
}

interface FeatureUpgradeStateProps {
  title: string;
  description: string;
  benefits: UpgradeBenefit[];
  onRefresh?: () => void;
}

export function FeatureUpgradeState({
  title,
  description,
  benefits,
  onRefresh,
}: FeatureUpgradeStateProps): ReactElement {
  return (
    <Card className="border-primary/20">
      <CardContent className="py-12">
        <div className="mx-auto max-w-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="grid gap-3 text-left sm:grid-cols-3">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-lg border bg-muted/20 p-3"
              >
                <p className="text-sm font-medium">{benefit.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button
              onClick={() => {
                window.location.href = "/pricing";
              }}
              className="gap-2"
            >
              Ver planos
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Atualizar acesso
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
