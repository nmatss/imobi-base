import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  DollarSign,
} from "lucide-react";

type ComparisonItem = {
  itemName: string;
  roomLabel: string;
  entryCondition: string;
  exitCondition: string;
  conditionChanged: boolean;
  hasDamage: boolean;
  damageDescription?: string;
  estimatedRepairCost?: number;
};

type RoomSummary = {
  roomLabel: string;
  entryCondition: string | null;
  exitCondition: string | null;
  changed: boolean;
};

type ComparisonResult = {
  entryInspectionId: string;
  exitInspectionId: string;
  entryDate: string | null;
  exitDate: string | null;
  overallEntryCondition: string | null;
  overallExitCondition: string | null;
  items: ComparisonItem[];
  totalDamages: number;
  roomsSummary: RoomSummary[];
};

const conditionLabels: Record<string, string> = {
  excellent: "Excelente",
  good: "Bom",
  fair: "Regular",
  poor: "Ruim",
  not_applicable: "N/A",
};

const conditionColors: Record<string, string> = {
  excellent: "bg-green-100 text-green-800 border-green-200",
  good: "bg-blue-100 text-blue-800 border-blue-200",
  fair: "bg-yellow-100 text-yellow-800 border-yellow-200",
  poor: "bg-red-100 text-red-800 border-red-200",
};

export default function InspectionComparisonPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchComparison = useCallback(async () => {
    try {
      const res = await fetch(`/api/inspections/${id}/compare`, {
        credentials: "include",
      });
      if (res.ok) {
        setComparison(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch comparison", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nao foi possivel carregar a comparacao</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setLocation(`/vistorias/${id}`)}
        >
          Voltar para a Vistoria
        </Button>
      </div>
    );
  }

  const changedItems = comparison.items.filter((i) => i.conditionChanged);
  const damagedItems = comparison.items.filter((i) => i.hasDamage);
  const changedRooms = comparison.roomsSummary.filter((r) => r.changed);

  // Group items by room
  const itemsByRoom: Record<string, ComparisonItem[]> = {};
  for (const item of comparison.items) {
    if (!itemsByRoom[item.roomLabel]) {
      itemsByRoom[item.roomLabel] = [];
    }
    itemsByRoom[item.roomLabel].push(item);
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(`/vistorias/${id}`)}
          className="h-10 w-10 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Comparacao de Vistorias
          </h1>
          <p className="text-sm text-muted-foreground">
            Entrada vs Saida
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              R$ {comparison.totalDamages.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total de Danos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {changedItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Itens Alterados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {damagedItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Itens com Dano
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {changedRooms.length}/{comparison.roomsSummary.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Comodos Alterados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Condition Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Condicao Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Entrada</p>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  conditionColors[comparison.overallEntryCondition || ""] || "bg-gray-100 text-gray-600"
                }`}
              >
                {conditionLabels[comparison.overallEntryCondition || ""] || "N/A"}
              </span>
              {comparison.entryDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(comparison.entryDate).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Saida</p>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  conditionColors[comparison.overallExitCondition || ""] || "bg-gray-100 text-gray-600"
                }`}
              >
                {conditionLabels[comparison.overallExitCondition || ""] || "N/A"}
              </span>
              {comparison.exitDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(comparison.exitDate).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rooms Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comparacao por Comodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {comparison.roomsSummary.map((room, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  room.changed ? "bg-yellow-50 border-yellow-200" : "bg-muted/30"
                }`}
              >
                <span className="font-medium text-sm">{room.roomLabel}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      conditionColors[room.entryCondition || ""] || "bg-gray-100"
                    }`}
                  >
                    {conditionLabels[room.entryCondition || ""] || "N/A"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      conditionColors[room.exitCondition || ""] || "bg-gray-100"
                    }`}
                  >
                    {conditionLabels[room.exitCondition || ""] || "N/A"}
                  </span>
                  {room.changed ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Item Comparison by Room */}
      {Object.entries(itemsByRoom).map(([roomLabel, items]) => {
        const hasChanges = items.some((i) => i.conditionChanged || i.hasDamage);

        return (
          <Card key={roomLabel}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{roomLabel}</CardTitle>
                {hasChanges && (
                  <Badge variant="destructive" className="text-xs">
                    Alteracoes
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      item.hasDamage
                        ? "bg-red-50 border-red-200"
                        : item.conditionChanged
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.itemName}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                            conditionColors[item.entryCondition] || "bg-gray-100"
                          }`}
                        >
                          {conditionLabels[item.entryCondition] || item.entryCondition}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                            conditionColors[item.exitCondition] || "bg-gray-100"
                          }`}
                        >
                          {conditionLabels[item.exitCondition] || item.exitCondition}
                        </span>
                      </div>
                    </div>

                    {item.hasDamage && (
                      <div className="mt-2 pt-2 border-t border-red-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="text-sm">
                            {item.damageDescription && (
                              <p className="text-red-700">{item.damageDescription}</p>
                            )}
                            {item.estimatedRepairCost && item.estimatedRepairCost > 0 && (
                              <p className="font-medium text-red-800 mt-1">
                                Custo estimado: R$ {item.estimatedRepairCost.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Damage Summary / Deposit Retention */}
      {comparison.totalDamages > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-800 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumo de Danos - Retencao do Caucao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {damagedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {item.roomLabel} - {item.itemName}
                  </span>
                  <span className="font-medium text-red-800">
                    R$ {(item.estimatedRepairCost || 0).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between font-bold">
                <span>Total a Reter do Caucao</span>
                <span className="text-red-800 text-lg">
                  R$ {comparison.totalDamages.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
