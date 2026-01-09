import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@/lib/imobi-context";

export function usePropertyActions(refetchProperties: () => Promise<void>) {
  const { toast } = useToast();

  const deleteProperty = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete property");
      }

      toast({
        title: "Sucesso",
        description: "Imóvel excluído com sucesso",
      });

      await refetchProperties();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete property";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast, refetchProperties]);

  const toggleFeatured = useCallback(async (property: Property) => {
    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...property, featured: !property.featured }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to update property");
      }

      toast({
        title: "Sucesso",
        description: property.featured
          ? "Imóvel removido dos destaques"
          : "Imóvel adicionado aos destaques",
      });

      await refetchProperties();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update property";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    }
  }, [toast, refetchProperties]);

  const copyPropertyLink = useCallback((property: Property) => {
    const url = `${window.location.origin}/properties/${property.id}`;
    navigator.clipboard.writeText(url);

    toast({
      title: "Sucesso",
      description: "Link copiado para a área de transferência",
    });
  }, [toast]);

  const shareWhatsApp = useCallback((property: Property) => {
    const message = encodeURIComponent(
      `Confira este imóvel: ${property.title}\n` +
      `Preço: R$ ${parseFloat(property.price).toLocaleString("pt-BR")}\n` +
      `${window.location.origin}/properties/${property.id}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  }, []);

  return {
    deleteProperty,
    toggleFeatured,
    copyPropertyLink,
    shareWhatsApp,
  };
}
