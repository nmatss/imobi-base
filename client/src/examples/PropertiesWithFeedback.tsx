/**
 * EXEMPLO DE IMPLEMENTAÇÃO DE FEEDBACK VISUAL EM IMÓVEIS
 *
 * Demonstra:
 * - Toast de promise para operações assíncronas longas
 * - Loading states em grid de imóveis
 * - Feedback ao copiar link do imóvel
 * - Upload de imagens com progress
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback, toastHelpers } from "@/hooks/useToastFeedback";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { PropertyGridSkeleton } from "@/components/ui/skeleton-loaders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Eye,
  Edit,
  Trash2,
  Upload,
  ExternalLink,
  Share2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Property {
  id: string;
  title: string;
  price: number;
  city: string;
  type: "sale" | "rent";
  status: "active" | "inactive" | "rented" | "sold";
  images: string[];
}

export function PropertiesWithFeedback() {
  const toast = useToastFeedback();
  const { confirm, dialog } = useConfirmDialog();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  // Query para buscar imóveis
  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Mutation para deletar imóvel
  const deleteMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar imóvel");
      return response.json();
    },
    onSuccess: () => {
      toastHelpers.deleted("Imóvel");
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar imóvel", error.message);
    },
  });

  // Mutation para duplicar imóvel (exemplo de promise toast)
  const duplicateMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      // Simular operação lenta
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await fetch(`/api/properties/${propertyId}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Erro ao duplicar imóvel");
      return response.json();
    },
  });

  // Mutation para publicar imóvel
  const publishMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const response = await fetch(`/api/properties/${propertyId}/publish`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Erro ao publicar imóvel");
      return response.json();
    },
  });

  const handleDelete = async (property: Property) => {
    const confirmed = await confirm({
      title: "Deletar imóvel?",
      description: `Tem certeza que deseja deletar "${property.title}"? Esta ação não pode ser desfeita.`,
      confirmText: "Deletar",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate(property.id);
    }
  };

  const handleDuplicate = async (propertyId: string) => {
    // Toast de promise - mostra loading, success ou error automaticamente
    toast.promise(duplicateMutation.mutateAsync(propertyId), {
      loading: "Duplicando imóvel...",
      success: "Imóvel duplicado com sucesso!",
      error: "Erro ao duplicar imóvel",
    });

    // Após sucesso, invalidar queries
    await duplicateMutation.mutateAsync(propertyId);
    queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
  };

  const handlePublish = async (propertyId: string) => {
    try {
      await publishMutation.mutateAsync(propertyId);
      toast.success("Imóvel publicado!", "O imóvel agora está visível no site público");
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    } catch (error: any) {
      toast.error("Erro ao publicar", error.message);
    }
  };

  const handleCopyLink = (property: Property) => {
    const link = `https://seusite.com/imoveis/${property.id}`;
    navigator.clipboard.writeText(link);
    toastHelpers.copied("Link do imóvel");
  };

  const handleShare = (property: Property) => {
    if (navigator.share) {
      navigator
        .share({
          title: property.title,
          text: `Confira este imóvel: ${property.title}`,
          url: `https://seusite.com/imoveis/${property.id}`,
        })
        .then(() => {
          toast.success("Compartilhado com sucesso!");
        })
        .catch(() => {
          // Usuário cancelou
        });
    } else {
      handleCopyLink(property);
    }
  };

  const handleUploadImages = async (propertyId: string, files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("images", file);
    });

    // Simular upload com progress
    const uploadPromise = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          reject(new Error("Upload failed"));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error")));

      xhr.open("POST", `/api/properties/${propertyId}/images`);
      xhr.send(formData);
    });

    toast.promise(uploadPromise, {
      loading: "Fazendo upload das imagens...",
      success: "Imagens enviadas com sucesso!",
      error: "Erro ao fazer upload",
    });

    try {
      await uploadPromise;
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setUploadProgress(0);
    } catch (error) {
      setUploadProgress(0);
    }
  };

  if (isLoading) {
    return <PropertyGridSkeleton />;
  }

  return (
    <>
      {dialog}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Imóveis</h1>
            <p className="text-muted-foreground">Gerencie seu portfólio de imóveis</p>
          </div>
          <Button>Novo Imóvel</Button>
        </div>

        {/* Upload progress */}
        {uploadProgress > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Fazendo upload...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid de imóveis */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties?.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onPublish={handlePublish}
              onCopyLink={handleCopyLink}
              onShare={handleShare}
              onUploadImages={handleUploadImages}
              isDeleting={deleteMutation.isPending}
              isDuplicating={duplicateMutation.isPending}
              isPublishing={publishMutation.isPending}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// Card de imóvel
interface PropertyCardProps {
  property: Property;
  onDelete: (property: Property) => void;
  onDuplicate: (propertyId: string) => void;
  onPublish: (propertyId: string) => void;
  onCopyLink: (property: Property) => void;
  onShare: (property: Property) => void;
  onUploadImages: (propertyId: string, files: FileList) => void;
  isDeleting?: boolean;
  isDuplicating?: boolean;
  isPublishing?: boolean;
}

function PropertyCard({
  property,
  onDelete,
  onDuplicate,
  onPublish,
  onCopyLink,
  onShare,
  onUploadImages,
  isDeleting,
  isDuplicating,
  isPublishing,
}: PropertyCardProps) {
  return (
    <Card>
      <CardHeader className="p-0">
        {property.images && property.images[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="h-48 w-full object-cover rounded-t-lg"
          />
        ) : (
          <div className="h-48 w-full bg-muted rounded-t-lg flex items-center justify-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="font-semibold line-clamp-1">{property.title}</h3>
        <p className="text-2xl font-bold text-primary">
          R$ {property.price.toLocaleString("pt-BR")}
        </p>
        <div className="flex gap-2 mt-2">
          <Badge variant={property.type === "sale" ? "default" : "secondary"}>
            {property.type === "sale" ? "Venda" : "Aluguel"}
          </Badge>
          <Badge variant="outline">{property.city}</Badge>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCopyLink(property)}
          className="flex-1"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copiar Link
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onShare(property)}
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(property)}
          disabled={isDeleting}
          isLoading={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
