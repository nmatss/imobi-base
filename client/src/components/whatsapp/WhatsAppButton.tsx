import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WhatsAppButtonProps {
  phone: string;
  onClick?: () => void;
  variant?: 'icon-only' | 'with-text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

/**
 * WhatsApp action button component
 * Green themed button with WhatsApp icon
 * Mobile optimized with larger touch targets
 */
export function WhatsAppButton({
  phone,
  onClick,
  variant = 'icon-only',
  size = 'md',
  className,
  disabled = false,
}: WhatsAppButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8 min-w-[32px] min-h-[32px]',
    md: 'h-9 w-9 min-w-[44px] min-h-[44px] sm:h-10 sm:w-10',
    lg: 'h-10 w-10 min-w-[44px] min-h-[44px] sm:h-12 sm:w-12',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4 sm:h-5 sm:w-5',
    lg: 'h-5 w-5 sm:h-6 sm:w-6',
  };

  if (!phone && !disabled) {
    return null;
  }

  if (variant === 'with-text') {
    return (
      <Button
        variant="outline"
        size={size === 'sm' ? 'sm' : 'default'}
        className={cn(
          'bg-green-500 hover:bg-green-600 text-white border-0 gap-2',
          'min-h-[44px] sm:min-h-0',
          className
        )}
        onClick={handleClick}
        disabled={disabled}
      >
        <MessageCircle className={iconSizes[size]} />
        <span className="hidden sm:inline">WhatsApp</span>
        <span className="sm:hidden">Enviar</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        'bg-green-500 hover:bg-green-600 text-white border-0',
        'rounded-full transition-all duration-200',
        'hover:scale-105 active:scale-95',
        sizeClasses[size],
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      title="Enviar WhatsApp"
    >
      <MessageCircle className={iconSizes[size]} />
    </Button>
  );
}
