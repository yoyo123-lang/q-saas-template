"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 10,
  onRowClick,
  keyExtractor,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null || bVal == null) return 0;
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: "var(--q-border-light)" }}
      >
        <table className="min-w-full divide-y" style={{ borderColor: "var(--q-border-light)" }}>
          <thead style={{ backgroundColor: "var(--q-table-header-bg)" }}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--q-text-muted)" }}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 transition-colors"
                      style={{ color: "var(--q-text-muted)" }}
                    >
                      {col.label}
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? "cursor-pointer transition-colors" : ""}
                style={{ backgroundColor: "var(--q-surface)", borderBottom: "1px solid var(--q-border-light)" }}
                onMouseEnter={
                  onRowClick
                    ? (e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                          "var(--q-table-hover)";
                      }
                    : undefined
                }
                onMouseLeave={
                  onRowClick
                    ? (e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                          "var(--q-surface)";
                      }
                    : undefined
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="whitespace-nowrap px-4 py-3 text-sm"
                    style={{ color: "var(--q-text-body)" }}
                  >
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--q-text-muted)" }}>
            Mostrando {page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, sorted.length)} de {sorted.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="rounded-md border p-1.5 transition-colors disabled:opacity-50"
              style={{
                borderColor: "var(--q-border)",
                color: "var(--q-text-muted)",
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="rounded-md border p-1.5 transition-colors disabled:opacity-50"
              style={{
                borderColor: "var(--q-border)",
                color: "var(--q-text-muted)",
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
