import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  ArrowLeft,
  Camera,
  Plus,
  Trash2,
  CheckCircle2,
  FileSignature,
  FileText,
  ChevronRight,
  AlertTriangle,
  X,
} from "lucide-react";

type InspectionItem = {
  id: string;
  roomId: string;
  itemName: string;
  condition: string;
  description: string | null;
  hasDamage: boolean;
  damageDescription: string | null;
  estimatedRepairCost: number | null;
  photos: string | null;
  previousCondition: string | null;
  order: number;
};

type InspectionRoom = {
  id: string;
  inspectionId: string;
  roomType: string;
  roomLabel: string;
  overallCondition: string | null;
  notes: string | null;
  photos: string | null;
  order: number;
};

type RoomWithItems = {
  room: InspectionRoom;
  items: InspectionItem[];
};

type Inspection = {
  id: string;
  tenantId: string;
  propertyId: string;
  type: string;
  status: string;
  inspectorName: string;
  renterName: string | null;
  overallCondition: string | null;
  generalNotes: string | null;
  totalDamages: number | null;
  previousInspectionId: string | null;
  inspectorSignature: string | null;
  renterSignature: string | null;
  completedDate: string | null;
  signedAt: string | null;
  createdAt: string;
  rooms: RoomWithItems[];
};

const conditionOptions = [
  { value: "excellent", label: "Excelente", color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-50 border-green-200" },
  { value: "good", label: "Bom", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50 border-blue-200" },
  { value: "fair", label: "Regular", color: "bg-yellow-500", textColor: "text-yellow-700", bgLight: "bg-yellow-50 border-yellow-200" },
  { value: "poor", label: "Ruim", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50 border-red-200" },
  { value: "not_applicable", label: "N/A", color: "bg-gray-400", textColor: "text-gray-600", bgLight: "bg-gray-50 border-gray-200" },
];

const conditionLabels: Record<string, string> = {
  excellent: "Excelente",
  good: "Bom",
  fair: "Regular",
  poor: "Ruim",
  not_applicable: "N/A",
};

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { properties } = useImobi();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signatureType, setSignatureType] = useState<"inspector" | "renter">("inspector");
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [newRoomLabel, setNewRoomLabel] = useState("");
  const [newRoomType, setNewRoomType] = useState("other");
  const [newItemName, setNewItemName] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const isEditable = inspection?.status === "in_progress";

  const fetchInspection = useCallback(async () => {
    try {
      const res = await fetch(`/api/inspections/${id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setInspection(data);
        setGeneralNotes(data.generalNotes || "");
      }
    } catch (e) {
      console.error("Failed to fetch inspection", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  const updateItem = async (
    roomId: string,
    itemId: string,
    updates: Partial<InspectionItem>
  ) => {
    if (!inspection || !isEditable) return;

    // Optimistic update
    setInspection((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map((r) => {
          if (r.room.id !== roomId) return r;
          return {
            ...r,
            items: r.items.map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          };
        }),
      };
    });

    try {
      await fetch(
        `/api/inspections/${inspection.id}/rooms/${roomId}/items/${itemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        }
      );
    } catch (e) {
      console.error("Failed to update item", e);
      fetchInspection(); // Revert
    }
  };

  const updateRoom = async (roomId: string, updates: Partial<InspectionRoom>) => {
    if (!inspection || !isEditable) return;

    setInspection((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map((r) =>
          r.room.id === roomId ? { ...r, room: { ...r.room, ...updates } } : r
        ),
      };
    });

    try {
      await fetch(`/api/inspections/${inspection.id}/rooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.error("Failed to update room", e);
      fetchInspection();
    }
  };

  const addRoom = async () => {
    if (!inspection || !newRoomLabel) return;

    try {
      const res = await fetch(`/api/inspections/${inspection.id}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          roomType: newRoomType,
          roomLabel: newRoomLabel,
          order: inspection.rooms.length,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInspection((prev) => {
          if (!prev) return prev;
          return { ...prev, rooms: [...prev.rooms, data] };
        });
        setShowAddRoom(false);
        setNewRoomLabel("");
        setNewRoomType("other");
      }
    } catch (e) {
      console.error("Failed to add room", e);
    }
  };

  const addItem = async (roomId: string) => {
    if (!inspection || !newItemName) return;

    try {
      const res = await fetch(
        `/api/inspections/${inspection.id}/rooms/${roomId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            itemName: newItemName,
            order: inspection.rooms.find((r) => r.room.id === roomId)?.items.length || 0,
          }),
        }
      );
      if (res.ok) {
        const item = await res.json();
        setInspection((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            rooms: prev.rooms.map((r) =>
              r.room.id === roomId
                ? { ...r, items: [...r.items, item] }
                : r
            ),
          };
        });
        setShowAddItem(null);
        setNewItemName("");
      }
    } catch (e) {
      console.error("Failed to add item", e);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!inspection || !confirm("Remover este comodo e todos os itens?")) return;

    try {
      await fetch(`/api/inspections/${inspection.id}/rooms/${roomId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setInspection((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.filter((r) => r.room.id !== roomId),
        };
      });
    } catch (e) {
      console.error("Failed to delete room", e);
    }
  };

  const completeInspection = async () => {
    if (!inspection) return;
    if (!confirm("Concluir a vistoria? Apos a conclusao nao sera possivel editar os itens.")) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/inspections/${inspection.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ generalNotes }),
      });
      if (res.ok) {
        await fetchInspection();
      }
    } catch (e) {
      console.error("Failed to complete inspection", e);
    } finally {
      setSaving(false);
    }
  };

  // Signature canvas logic
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    if (showSignDialog) {
      setTimeout(initCanvas, 100);
    }
  }, [showSignDialog]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !inspection) return;

    const signatureData = canvas.toDataURL("image/png");

    setSaving(true);
    try {
      const res = await fetch(`/api/inspections/${inspection.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ signatureType, signatureData }),
      });
      if (res.ok) {
        setShowSignDialog(false);
        await fetchInspection();
      }
    } catch (e) {
      console.error("Failed to submit signature", e);
    } finally {
      setSaving(false);
    }
  };

  const openReport = () => {
    if (!inspection) return;
    window.open(`/api/inspections/${inspection.id}/report`, "_blank");
  };

  // Calculate progress
  const totalItems = inspection?.rooms.reduce((acc, r) => acc + r.items.length, 0) || 0;
  const completedItems =
    inspection?.rooms.reduce(
      (acc, r) =>
        acc +
        r.items.filter(
          (i) => i.condition && i.condition !== "good" || i.hasDamage || i.description
        ).length,
      0
    ) || 0;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const property = properties.find((p: any) => p.id === inspection?.propertyId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Vistoria nao encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/vistorias")}>
          Voltar
        </Button>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    entry: "Entrada",
    exit: "Saida",
    periodic: "Periodica",
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/vistorias")}
          className="h-10 w-10 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            Vistoria de {typeLabels[inspection.type] || inspection.type}
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            {property?.title || property?.address || "Imovel"}
          </p>
        </div>
        <Badge
          variant={
            inspection.status === "signed"
              ? "outline"
              : inspection.status === "completed"
              ? "default"
              : "secondary"
          }
        >
          {inspection.status === "signed"
            ? "Assinada"
            : inspection.status === "completed"
            ? "Concluida"
            : "Em Andamento"}
        </Badge>
      </div>

      {/* Progress */}
      {isEditable && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso da Vistoria</span>
              <span className="text-sm text-muted-foreground">
                {completedItems}/{totalItems} itens avaliados
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Info Summary */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block">Vistoriador</span>
              <span className="font-medium">{inspection.inspectorName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Inquilino</span>
              <span className="font-medium">{inspection.renterName || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Condicao Geral</span>
              <span className="font-medium">
                {conditionLabels[inspection.overallCondition || ""] || "Pendente"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Danos Totais</span>
              <span className="font-medium text-red-600">
                R$ {(inspection.totalDamages || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rooms Accordion */}
      <Accordion type="multiple" className="space-y-3">
        {inspection.rooms.map(({ room, items }) => {
          const roomCondition = conditionOptions.find(
            (c) => c.value === room.overallCondition
          );
          const roomDamages = items.filter((i) => i.hasDamage).length;

          return (
            <AccordionItem
              key={room.id}
              value={room.id}
              className="border rounded-lg bg-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-semibold text-sm sm:text-base truncate">
                    {room.roomLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    {roomCondition && (
                      <span
                        className={`w-3 h-3 rounded-full ${roomCondition.color}`}
                        title={roomCondition.label}
                      />
                    )}
                    {roomDamages > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {roomDamages} dano{roomDamages > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {/* Room-level controls */}
                {isEditable && (
                  <div className="space-y-3 mb-4 pb-4 border-b">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Condicao geral do comodo
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {conditionOptions.filter((c) => c.value !== "not_applicable").map((opt) => (
                          <button
                            key={opt.value}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              room.overallCondition === opt.value
                                ? `${opt.bgLight} ${opt.textColor} ring-2 ring-offset-1 ring-${opt.color}`
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            onClick={() =>
                              updateRoom(room.id, { overallCondition: opt.value })
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Observacoes do comodo
                      </Label>
                      <Textarea
                        value={room.notes || ""}
                        onChange={(e) =>
                          updateRoom(room.id, { notes: e.target.value })
                        }
                        placeholder="Observacoes sobre este comodo..."
                        className="mt-1 text-sm h-16"
                      />
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      roomId={room.id}
                      isEditable={isEditable}
                      onUpdate={updateItem}
                    />
                  ))}
                </div>

                {/* Add Item / Delete Room */}
                {isEditable && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                    {showAddItem === room.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Nome do item..."
                          className="h-9 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addItem(room.id);
                            if (e.key === "Escape") {
                              setShowAddItem(null);
                              setNewItemName("");
                            }
                          }}
                        />
                        <Button size="sm" onClick={() => addItem(room.id)}>
                          Adicionar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowAddItem(null);
                            setNewItemName("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => setShowAddItem(room.id)}
                        >
                          <Plus className="h-3 w-3" />
                          Adicionar Item
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-destructive ml-auto"
                          onClick={() => deleteRoom(room.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remover Comodo
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Add Room */}
      {isEditable && (
        <>
          {showAddRoom ? (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={newRoomLabel}
                    onChange={(e) => setNewRoomLabel(e.target.value)}
                    placeholder="Nome do comodo (ex: Suite Master)"
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addRoom();
                      if (e.key === "Escape") setShowAddRoom(false);
                    }}
                  />
                  <Select value={newRoomType} onValueChange={setNewRoomType}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="living_room">Sala</SelectItem>
                      <SelectItem value="kitchen">Cozinha</SelectItem>
                      <SelectItem value="bedroom_1">Quarto</SelectItem>
                      <SelectItem value="bathroom_1">Banheiro</SelectItem>
                      <SelectItem value="laundry">Lavanderia</SelectItem>
                      <SelectItem value="balcony">Varanda</SelectItem>
                      <SelectItem value="garage">Garagem</SelectItem>
                      <SelectItem value="exterior">Externo</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button onClick={addRoom}>Adicionar</Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowAddRoom(false);
                        setNewRoomLabel("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={() => setShowAddRoom(true)}
            >
              <Plus className="h-4 w-4" />
              Adicionar Comodo
            </Button>
          )}
        </>
      )}

      {/* General Notes */}
      {isEditable && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Observacoes Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Observacoes gerais sobre a vistoria..."
              className="h-24"
            />
          </CardContent>
        </Card>
      )}

      {/* Bottom Action Bar - Fixed on mobile */}
      <div className="fixed bottom-0 left-0 right-0 lg:static bg-background border-t lg:border-0 p-4 lg:p-0 z-40 flex gap-3">
        {isEditable && (
          <Button
            className="flex-1 lg:flex-none gap-2"
            onClick={completeInspection}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Concluir Vistoria
          </Button>
        )}

        {inspection.status === "completed" && (
          <>
            <Button
              className="flex-1 lg:flex-none gap-2"
              variant="outline"
              onClick={() => {
                setSignatureType("inspector");
                setShowSignDialog(true);
              }}
              disabled={!!inspection.inspectorSignature}
            >
              <FileSignature className="h-4 w-4" />
              {inspection.inspectorSignature
                ? "Vistoriador Assinou"
                : "Assinar (Vistoriador)"}
            </Button>
            <Button
              className="flex-1 lg:flex-none gap-2"
              variant="outline"
              onClick={() => {
                setSignatureType("renter");
                setShowSignDialog(true);
              }}
              disabled={!!inspection.renterSignature}
            >
              <FileSignature className="h-4 w-4" />
              {inspection.renterSignature
                ? "Inquilino Assinou"
                : "Assinar (Inquilino)"}
            </Button>
          </>
        )}

        {(inspection.status === "completed" || inspection.status === "signed") && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={openReport}
          >
            <FileText className="h-4 w-4" />
            Relatorio
          </Button>
        )}

        {inspection.previousInspectionId && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              setLocation(`/vistorias/${inspection.id}/comparacao`)
            }
          >
            <ChevronRight className="h-4 w-4" />
            Comparacao
          </Button>
        )}
      </div>

      {/* Signature Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Assinatura - {signatureType === "inspector" ? "Vistoriador" : "Inquilino"}
            </DialogTitle>
            <DialogDescription>
              Desenhe sua assinatura no campo abaixo usando o dedo ou caneta
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="border-2 border-dashed rounded-lg overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                className="w-full h-40 bg-white cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={clearCanvas}
            >
              Limpar assinatura
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={submitSignature} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Individual item row component for mobile-first inspection
 */
function ItemRow({
  item,
  roomId,
  isEditable,
  onUpdate,
}: {
  item: InspectionItem;
  roomId: string;
  isEditable: boolean;
  onUpdate: (roomId: string, itemId: string, updates: Partial<InspectionItem>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const currentCondition = conditionOptions.find((c) => c.value === item.condition);

  return (
    <div
      className={`border rounded-lg p-3 transition-all ${
        item.hasDamage ? "border-red-200 bg-red-50/50" : ""
      }`}
    >
      {/* Item Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{item.itemName}</span>
          {item.previousCondition && item.previousCondition !== item.condition && (
            <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
          )}
          {item.hasDamage && (
            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
          )}
        </div>
        {currentCondition && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${currentCondition.bgLight} ${currentCondition.textColor} border`}
          >
            {currentCondition.label}
          </span>
        )}
      </div>

      {/* Condition Selector - always visible on mobile for quick selection */}
      {isEditable && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {conditionOptions.map((opt) => (
            <button
              key={opt.value}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all touch-manipulation ${
                item.condition === opt.value
                  ? `${opt.bgLight} ${opt.textColor}`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(roomId, item.id, { condition: opt.value });
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 space-y-3 pt-3 border-t">
          {item.previousCondition && (
            <div className="text-xs text-muted-foreground">
              Condicao na entrada:{" "}
              <span className="font-medium">
                {conditionLabels[item.previousCondition] || item.previousCondition}
              </span>
            </div>
          )}

          {isEditable && (
            <>
              <div>
                <Label className="text-xs">Observacoes</Label>
                <Textarea
                  value={item.description || ""}
                  onChange={(e) =>
                    onUpdate(roomId, item.id, { description: e.target.value })
                  }
                  placeholder="Detalhes sobre a condicao..."
                  className="mt-1 text-sm h-16"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.hasDamage || false}
                    onChange={(e) =>
                      onUpdate(roomId, item.id, {
                        hasDamage: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-red-600 font-medium">
                    Possui dano
                  </span>
                </label>
              </div>

              {item.hasDamage && (
                <div className="space-y-3 pl-4 border-l-2 border-red-200">
                  <div>
                    <Label className="text-xs">Descricao do dano</Label>
                    <Textarea
                      value={item.damageDescription || ""}
                      onChange={(e) =>
                        onUpdate(roomId, item.id, {
                          damageDescription: e.target.value,
                        })
                      }
                      placeholder="Descreva o dano encontrado..."
                      className="mt-1 text-sm h-16"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Custo estimado de reparo (R$)</Label>
                    <Input
                      type="number"
                      value={item.estimatedRepairCost || ""}
                      onChange={(e) =>
                        onUpdate(roomId, item.id, {
                          estimatedRepairCost: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                      className="mt-1 text-sm h-9"
                    />
                  </div>
                </div>
              )}

              {/* Photo capture */}
              <div>
                <Label className="text-xs">Fotos</Label>
                <label className="flex items-center justify-center gap-2 mt-1 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors touch-manipulation">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Tirar foto ou selecionar
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      // Photo handling placeholder
                      // In production, would upload to storage and save URL
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("Photo selected:", file.name);
                      }
                    }}
                  />
                </label>
              </div>
            </>
          )}

          {!isEditable && (
            <>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
              {item.hasDamage && (
                <div className="space-y-1 p-2 bg-red-50 rounded border border-red-200">
                  <p className="text-sm font-medium text-red-800">Dano Identificado</p>
                  {item.damageDescription && (
                    <p className="text-sm text-red-700">{item.damageDescription}</p>
                  )}
                  {item.estimatedRepairCost && (
                    <p className="text-sm font-medium text-red-800">
                      Custo estimado: R$ {item.estimatedRepairCost.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
