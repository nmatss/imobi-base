import * as React from "react";
import { MoreVertical, MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/**
 * Item do menu de ações
 */
export interface ActionMenuItem {
  /**
   * Label do item
   */
  label: string;
  /**
   * Ícone do item (componente Lucide React)
   */
  icon?: LucideIcon;
  /**
   * Callback ao clicar no item
   */
  onClick: () => void;
  /**
   * Variante do item (afeta a cor)
   */
  variant?: "default" | "destructive" | "warning";
  /**
   * Se o item está desabilitado
   */
  disabled?: boolean;
  /**
   * Atalho de teclado (exibido à direita)
   */
  shortcut?: string;
  /**
   * Se deve renderizar um separador após este item
   */
  separator?: boolean;
}

/**
 * Grupo de itens do menu
 */
export interface ActionMenuGroup {
  /**
   * Label do grupo (opcional)
   */
  label?: string;
  /**
   * Itens do grupo
   */
  items: ActionMenuItem[];
}

export interface ActionMenuProps {
  /**
   * Itens do menu (array simples ou array de grupos)
   */
  items?: ActionMenuItem[];
  /**
   * Grupos de itens (alternativa a items)
   */
  groups?: ActionMenuGroup[];
  /**
   * Orientação do ícone trigger
   */
  orientation?: "vertical" | "horizontal";
  /**
   * Label para acessibilidade
   */
  label?: string;
  /**
   * Alinhamento do menu
   */
  align?: "start" | "center" | "end";
  /**
   * Side do menu
   */
  side?: "top" | "right" | "bottom" | "left";
  /**
   * Variante do botão trigger
   */
  triggerVariant?: "default" | "ghost" | "outline";
  /**
   * Tamanho do botão trigger
   */
  triggerSize?: "default" | "sm" | "lg" | "icon";
  /**
   * Classes customizadas
   */
  className?: string;
  /**
   * Classes customizadas para o trigger
   */
  triggerClassName?: string;
  /**
   * Trigger customizado (substitui o padrão)
   */
  trigger?: React.ReactNode;
  /**
   * Se o menu está aberto (controlado)
   */
  open?: boolean;
  /**
   * Callback ao mudar estado de aberto
   */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Dropdown menu para ações secundárias
 * Usa DropdownMenu do shadcn/ui com trigger MoreVertical/MoreHorizontal
 *
 * @example
 * ```tsx
 * // Menu simples com itens
 * <ActionMenu
 *   items={[
 *     { label: "Editar", icon: Edit, onClick: () => {} },
 *     { label: "Duplicar", icon: Copy, onClick: () => {} },
 *     { label: "Excluir", icon: Trash, onClick: () => {}, variant: "destructive", separator: true }
 *   ]}
 * />
 *
 * // Menu com grupos
 * <ActionMenu
 *   groups={[
 *     {
 *       label: "Ações",
 *       items: [
 *         { label: "Editar", icon: Edit, onClick: () => {} },
 *         { label: "Duplicar", icon: Copy, onClick: () => {} }
 *       ]
 *     },
 *     {
 *       label: "Zona de perigo",
 *       items: [
 *         { label: "Excluir", icon: Trash, onClick: () => {}, variant: "destructive" }
 *       ]
 *     }
 *   ]}
 * />
 *
 * // Menu horizontal
 * <ActionMenu
 *   orientation="horizontal"
 *   items={[...]}
 * />
 *
 * // Menu com trigger customizado
 * <ActionMenu
 *   trigger={<Button>Ações</Button>}
 *   items={[...]}
 * />
 * ```
 */
export function ActionMenu({
  items = [],
  groups,
  orientation = "vertical",
  label = "Ações",
  align = "end",
  side = "bottom",
  triggerVariant = "ghost",
  triggerSize = "icon",
  className,
  triggerClassName,
  trigger,
  open,
  onOpenChange,
}: ActionMenuProps) {
  const TriggerIcon = orientation === "vertical" ? MoreVertical : MoreHorizontal;

  // Determinar se deve usar items ou groups
  const menuGroups: ActionMenuGroup[] = groups || [{ items }];

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={cn(triggerClassName)}
            aria-label={label}
          >
            <TriggerIcon className="h-4 w-4" />
            <span className="sr-only">{label}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className={cn("w-56", className)}>
        {menuGroups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {group.label && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
            <DropdownMenuGroup>
              {group.items.map((item, itemIndex) => (
                <React.Fragment key={`${groupIndex}-${itemIndex}`}>
                  <DropdownMenuItem
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={cn(
                      item.variant === "destructive" &&
                        "text-destructive focus:text-destructive focus:bg-destructive/10",
                      item.variant === "warning" &&
                        "text-orange-600 dark:text-orange-400 focus:text-orange-600 dark:focus:text-orange-400 focus:bg-orange-50 dark:focus:bg-orange-950/20"
                    )}
                  >
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="ml-auto text-xs tracking-widest opacity-60">
                        {item.shortcut}
                      </span>
                    )}
                  </DropdownMenuItem>
                  {item.separator && <DropdownMenuSeparator />}
                </React.Fragment>
              ))}
            </DropdownMenuGroup>
            {groupIndex < menuGroups.length - 1 && <DropdownMenuSeparator />}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * ActionMenu compacto para uso em tabelas
 */
export function ActionMenuCompact({
  items,
  groups,
  className,
}: {
  items?: ActionMenuItem[];
  groups?: ActionMenuGroup[];
  className?: string;
}) {
  return (
    <ActionMenu
      items={items}
      groups={groups}
      triggerVariant="ghost"
      triggerSize="sm"
      className={className}
      triggerClassName="h-8 w-8"
    />
  );
}

/**
 * Hook para criar itens de menu comuns
 * Importar os ícones necessários de lucide-react no componente que usar este hook
 *
 * @example
 * ```tsx
 * import { Edit, Trash, Copy } from "lucide-react";
 * const { createEditItem, createDeleteItem } = useActionMenuItems();
 *
 * const items = [
 *   createEditItem(Edit, () => handleEdit()),
 *   createDeleteItem(Trash, () => handleDelete())
 * ];
 * ```
 */
export function useActionMenuItems() {
  const createEditItem = (
    icon: LucideIcon,
    onClick: () => void,
    disabled?: boolean
  ): ActionMenuItem => ({
    label: "Editar",
    icon,
    onClick,
    disabled,
  });

  const createDeleteItem = (
    icon: LucideIcon,
    onClick: () => void,
    disabled?: boolean
  ): ActionMenuItem => ({
    label: "Excluir",
    icon,
    onClick,
    variant: "destructive",
    disabled,
    separator: true,
  });

  const createDuplicateItem = (
    icon: LucideIcon,
    onClick: () => void,
    disabled?: boolean
  ): ActionMenuItem => ({
    label: "Duplicar",
    icon,
    onClick,
    disabled,
  });

  const createViewItem = (
    icon: LucideIcon,
    onClick: () => void,
    disabled?: boolean
  ): ActionMenuItem => ({
    label: "Ver detalhes",
    icon,
    onClick,
    disabled,
  });

  const createArchiveItem = (
    icon: LucideIcon,
    onClick: () => void,
    disabled?: boolean
  ): ActionMenuItem => ({
    label: "Arquivar",
    icon,
    onClick,
    disabled,
  });

  return {
    createEditItem,
    createDeleteItem,
    createDuplicateItem,
    createViewItem,
    createArchiveItem,
  };
}
