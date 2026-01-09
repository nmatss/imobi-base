import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfilePhotoUploadProps {
  photoUrl?: string;
  userName: string;
  onPhotoChange?: (photoUrl: string | undefined) => void;
  isUploading?: boolean;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

export function ProfilePhotoUpload({
  photoUrl,
  userName,
  onPhotoChange,
  isUploading = false,
  onUploadStart,
  onUploadEnd,
}: ProfilePhotoUploadProps) {
  const { toast } = useToast();
  const [localPhotoUrl, setLocalPhotoUrl] = useState(photoUrl);
  const [uploading, setUploading] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    onUploadStart?.();

    try {
      // Simular upload - em produção, fazer upload para servidor
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setLocalPhotoUrl(result);
        onPhotoChange?.(result);

        toast({
          title: "Foto atualizada",
          description: "Sua foto de perfil foi atualizada com sucesso.",
        });
      };
      reader.readAsDataURL(file);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      onUploadEnd?.();
    }
  };

  const handleRemovePhoto = () => {
    setLocalPhotoUrl(undefined);
    onPhotoChange?.(undefined);
    toast({
      title: "Foto removida",
      description: "Sua foto de perfil foi removida.",
    });
  };

  const isLoading = uploading || isUploading;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        {/* Avatar 120x120px com ring */}
        <Avatar className="w-30 h-30 ring-4 ring-primary/10">
          <AvatarImage src={localPhotoUrl} alt={userName} />
          <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>

        {/* Loading spinner overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Hover overlay com ícone de câmera */}
        <label
          htmlFor="avatar-upload-hover"
          className={cn(
            "absolute inset-0 bg-black/50 rounded-full flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
            isLoading && "pointer-events-none"
          )}
        >
          <Camera className="h-8 w-8 text-white" />
          <input
            id="avatar-upload-hover"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePhotoUpload}
            disabled={isLoading}
          />
        </label>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2">
        <label htmlFor="avatar-upload-btn">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isLoading}
            asChild
          >
            <span>
              <Upload className="h-4 w-4" />
              {isLoading ? "Enviando..." : "Fazer Upload"}
              <input
                id="avatar-upload-btn"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handlePhotoUpload}
                disabled={isLoading}
              />
            </span>
          </Button>
        </label>
        {localPhotoUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemovePhoto}
            disabled={isLoading}
          >
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
