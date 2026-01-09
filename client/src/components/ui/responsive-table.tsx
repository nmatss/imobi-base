import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export interface ResponsiveTableColumn<T = any> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export interface ResponsiveTableProps<T = any> {
  columns: ResponsiveTableColumn<T>[];
  data: T[];
  renderCard?: (row: T) => React.ReactNode;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
  className?: string;
}

/**
 * ResponsiveTable - Componente que alterna entre tabela e cards
 *
 * Desktop (≥768px): Exibe tabela tradicional
 * Mobile (<768px): Exibe cards responsivos
 *
 * @example
 * ```tsx
 * <ResponsiveTable
 *   columns={[
 *     { key: 'name', label: 'Nome' },
 *     { key: 'email', label: 'Email', hideOnMobile: true },
 *   ]}
 *   data={users}
 *   renderCard={(user) => (
 *     <Card className="p-4">
 *       <p className="font-semibold">{user.name}</p>
 *       <p className="text-sm text-muted-foreground">{user.email}</p>
 *     </Card>
 *   )}
 * />
 * ```
 */
export function ResponsiveTable<T = any>({
  columns,
  data,
  renderCard,
  getRowId,
  emptyMessage = "Nenhum registro encontrado",
  className = "",
}: ResponsiveTableProps<T>) {
  const getDefaultRowId = (row: T, index: number) => {
    if (getRowId) return getRowId(row);
    if (typeof row === "object" && row !== null && "id" in row) {
      return String((row as any).id);
    }
    return String(index);
  };

  const renderDefaultCard = (row: T) => {
    return (
      <Card className="p-4 space-y-2">
        {columns
          .filter((col) => !col.hideOnMobile)
          .map((col) => {
            const value = col.render ? col.render(row) : (row as any)[col.key];
            return (
              <div key={col.key} className="flex justify-between items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">{col.label}:</span>
                <span className="text-sm font-semibold truncate flex-1 text-right">{value}</span>
              </div>
            );
          })}
      </Card>
    );
  };

  const cardRenderer = renderCard || renderDefaultCard;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Desktop: Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={getDefaultRowId(row, index)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {data.map((row, index) => (
          <div key={getDefaultRowId(row, index)}>{cardRenderer(row)}</div>
        ))}
      </div>
    </div>
  );
}
