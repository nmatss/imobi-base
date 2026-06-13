import { cn } from "@/lib/utils";

/**
 * Ícone da marca ImobiBase — "pin predial": pin de localização com fachada
 * de prédio (grade de janelas + porta verde). Inline SVG para escalar nítido
 * em qualquer tamanho sem request extra. Fonte master: client/public/brand/.
 */
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      className={cn("h-8 w-8 shrink-0", className)}
    >
      <defs>
        <linearGradient id="ib-logo-pin" x1="256" y1="28" x2="256" y2="486" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0080FF" />
          <stop offset="0.55" stopColor="#0066CC" />
          <stop offset="1" stopColor="#0052AA" />
        </linearGradient>
        <linearGradient id="ib-logo-door" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#00D455" />
          <stop offset="1" stopColor="#00AA44" />
        </linearGradient>
      </defs>
      <path
        d="M256 28C152.2 28 68 112.2 68 216c0 80 54 152 106 204 30 30 58 52 72 62 6 4.4 14 4.4 20 0 14-10 42-32 72-62 52-52 106-124 106-204C444 112.2 359.8 28 256 28Z"
        fill="url(#ib-logo-pin)"
      />
      <rect x="144" y="104" width="56" height="56" rx="12" fill="#FFF" fillOpacity="0.95" />
      <rect x="228" y="104" width="56" height="56" rx="12" fill="#FFF" fillOpacity="0.8" />
      <rect x="312" y="104" width="56" height="56" rx="12" fill="#FFF" fillOpacity="0.95" />
      <rect x="144" y="188" width="56" height="56" rx="12" fill="#FFF" fillOpacity="0.8" />
      <rect x="228" y="188" width="56" height="56" rx="12" fill="#FFF" fillOpacity="0.95" />
      <rect x="312" y="188" width="56" height="56" rx="12" fill="#FFF" fillOpacity="0.8" />
      <rect x="144" y="272" width="56" height="56" rx="12" fill="#FFF" fillOpacity="0.95" />
      <rect x="228" y="272" width="56" height="56" rx="12" fill="url(#ib-logo-door)" />
      <rect x="312" y="272" width="56" height="56" rx="12" fill="#FFF" fillOpacity="0.95" />
    </svg>
  );
}

interface LogoProps {
  /** "full" = ícone + wordmark; "icon" = só o pin */
  variant?: "full" | "icon";
  /** "auto" segue o tema; "white" força wordmark claro (sidebar/fundos escuros) */
  tone?: "auto" | "white";
  iconClassName?: string;
  wordmarkClassName?: string;
  className?: string;
}

export function Logo({
  variant = "full",
  tone = "auto",
  iconClassName,
  wordmarkClassName,
  className,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoIcon className={iconClassName} />
      {variant === "full" && (
        <span
          className={cn(
            "font-heading font-extrabold tracking-tight leading-none",
            tone === "white" ? "text-white" : "text-foreground",
            wordmarkClassName,
          )}
        >
          Imobi
          <span className={tone === "white" ? "text-[#3D9BFF]" : "text-primary"}>Base</span>
        </span>
      )}
    </span>
  );
}
