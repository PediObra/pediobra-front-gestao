import { api } from "./client";
import type {
  Paginated,
  RoleName,
  SellerMembershipAccess,
  User,
  UserWithRelations,
} from "./types";

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  email?: string;
  role?: RoleName;
  sellerId?: number;
}

export const usersService = {
  list: (params: ListUsersParams = {}) =>
    api.get<Paginated<User>>("/users", { query: params }),

  getById: (id: number) => api.get<UserWithRelations>(`/users/${id}`),

  update: (id: number, payload: { name?: string; email?: string }) =>
    api.patch<UserWithRelations>(`/users/${id}`, payload),

  updateRoles: (id: number, roles: RoleName[]) =>
    api.patch<UserWithRelations>(`/users/${id}/roles`, { roles }),

  updateSellers: (
    id: number,
    sellers: Array<
      SellerMembershipAccess & {
        jobTitle?: string | null;
      }
    >,
  ) => api.patch<UserWithRelations>(`/users/${id}/sellers`, { sellers }),
};
