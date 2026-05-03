"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/lib/api/types";
import { useTranslation } from "@/lib/i18n/language-store";

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  meta?: PaginationMeta;
  page: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  isFetching?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string | undefined;
}

export function DataTable<TData>({
  data,
  columns,
  meta,
  page,
  onPageChange,
  isLoading,
  isFetching,
  emptyMessage,
  onRowClick,
  rowClassName,
}: DataTableProps<TData>) {
  const t = useTranslation();
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: meta?.totalPages ?? 1,
  });

  const hasPrev = page > 1;
  const hasNext = meta ? page < meta.totalPages : false;
  const handleRowAction = React.useCallback(
    (row: TData) => {
      onRowClick?.(row);
    },
    [onRowClick],
  );

  const handleRowKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, row: TData) => {
      if (!onRowClick || shouldIgnoreRowAction(event.target)) return;
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      handleRowAction(row);
    },
    [handleRowAction, onRowClick],
  );

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-40 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {t("app.loading")}
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-40 text-center text-muted-foreground text-sm"
                >
                  {emptyMessage ?? t("dataTable.empty")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    onRowClick &&
                      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    rowClassName?.(row.original),
                  )}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={(event) => {
                    if (shouldIgnoreRowAction(event.target)) return;
                    handleRowAction(row.original);
                  }}
                  onKeyDown={(event) =>
                    handleRowKeyDown(event, row.original)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {t("dataTable.page", {
              page: meta.page,
              totalPages: meta.totalPages,
            })}
            {isFetching && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs">
                <Loader2 className="size-3 animate-spin" />
                {t("app.updating")}
              </span>
            )}
            <span className="ml-3 text-xs">
              {t("dataTable.results", {
                total: meta.total,
                plural: meta.total === 1 ? "" : "s",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4" />
              {t("dataTable.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => onPageChange(page + 1)}
            >
              {t("dataTable.next")}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function shouldIgnoreRowAction(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      'a,button,input,select,textarea,[data-row-click-ignore="true"]',
    ),
  );
}
