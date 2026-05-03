"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { usersService, type ListUsersParams } from "@/lib/api/users";
import { queryKeys } from "@/lib/query-keys";
import { formatDate, roleLabel } from "@/lib/formatters";
import type { RoleName, User } from "@/lib/api/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTranslation } from "@/lib/i18n/language-store";

const ROLE_OPTIONS: Array<RoleName | "ALL"> = [
  "ALL",
  "ADMIN",
  "SELLER",
  "DRIVER",
  "CUSTOMER",
];

export default function UsersListPage() {
  const t = useTranslation();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleName | "ALL">("ALL");

  const debouncedSearch = useDebouncedValue(search, 300);

  const params: ListUsersParams = useMemo(
    () => ({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      role: role === "ALL" ? undefined : role,
    }),
    [page, debouncedSearch, role],
  );

  const query = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersService.list(params),
  });

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            #{row.original.id}
          </span>
        ),
        size: 60,
      },
      {
        accessorKey: "name",
        header: t("users.name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "email",
        header: t("common.email"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("users.createdAt"),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("users.title")}
        description={t("users.description")}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("users.search")}
            className="pl-8"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <Select
          value={role}
          onValueChange={(v) => {
            setPage(1);
            setRole(v as RoleName | "ALL");
          }}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === "ALL" ? t("users.allRoles") : roleLabel(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={query.data?.data ?? []}
        columns={columns}
        meta={query.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRowClick={(user) => router.push(`/users/${user.id}`)}
      />
    </div>
  );
}
