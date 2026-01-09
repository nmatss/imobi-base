import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { publicInterestSchema, type PublicInterestFormData } from "@/lib/form-schemas";
import { phoneMask, getErrorMessage } from "@/lib/form-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

interface InterestFormProps {
  propertyId: string;
  tenantId: string;
  propertyTitle: string;
}

export default function InterestForm({ propertyId, tenantId, propertyTitle }: InterestFormProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, isValid },
    setValue,
    watch,
    reset,
  } = useForm<PublicInterestFormData>({
    resolver: zodResolver(publicInterestSchema),
    mode: "onChange", // Validação em tempo real
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const phoneValue = watch("phone");

  const onSubmit = async (data: PublicInterestFormData) => {
    try {
      const response = await fetch("/api/leads/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tenantId,
          propertyId,
          source: "portal_publico",
          status: "new",
          interests: [propertyTitle],
          notes: `Interesse pelo imóvel: ${propertyTitle}\n\nMensagem: ${data.message || "Sem mensagem adicional"}`,
        }),
      });

      if (response.ok) {
        toast({
          title: "Mensagem enviada!",
          description: "Em breve entraremos em contato com você.",
        });
        reset();
      } else {
        throw new Error("Erro ao enviar mensagem");
      }
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: "Por favor, tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenho interesse</CardTitle>
        <CardDescription>
          Preencha o formulário abaixo que entraremos em contato com você
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Seu nome"
              disabled={isSubmitting}
              className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                {getErrorMessage(errors.name)}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              E-mail <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="seu@email.com"
              disabled={isSubmitting}
              className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                {getErrorMessage(errors.email)}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Telefone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="(00) 00000-0000"
              disabled={isSubmitting}
              className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
              onChange={(e) => {
                const masked = phoneMask(e.target.value);
                setValue("phone", masked, { shouldValidate: true });
              }}
              value={phoneValue}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                {getErrorMessage(errors.phone)}
              </p>
            )}
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem (opcional)</Label>
            <Textarea
              id="message"
              {...register("message")}
              placeholder="Deixe uma mensagem..."
              rows={4}
              disabled={isSubmitting}
              className={errors.message ? "border-destructive focus-visible:ring-destructive" : ""}
              aria-invalid={!!errors.message}
            />
            {errors.message && (
              <p className="text-sm text-destructive flex items-center gap-1" role="alert">
                {getErrorMessage(errors.message)}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar mensagem
              </>
            )}
          </Button>

          {/* Validação visual */}
          {isDirty && isValid && !isSubmitting && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Formulário válido e pronto para envio</span>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
