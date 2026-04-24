/**
 * Tipos do domínio consumidos do backend NestJS.
 * Mantidos manualmente — shape baseado em:
 *  - backend/src/database/schema/index.ts
 *  - backend/src/modules/auth/auth.service.ts (serializeUser)
 *  - DTOs dos módulos
 */

export type RoleName = "ADMIN" | "CUSTOMER" | "SELLER" | "DRIVER";

export type MembershipRole = "OWNER" | "EMPLOYEE";

export type DriverStatus = "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";

export type DriverAvailability = "ONLINE" | "OFFLINE" | "BUSY";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "CANCELLED";

export type DeliveryRequestStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "CANCELLED";

export type DeliveryJobStatus = "OPEN" | "ACCEPTED" | "CANCELLED" | "COMPLETED";

export type PricingSource = "MANUAL" | "ESTIMATED";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export type EvidenceType =
  | "SELLER_CONFIRMATION"
  | "DRIVER_CONFIRMATION"
  | "DELIVERY_PHOTO"
  | "PICKUP_PHOTO"
  | "GENERAL";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

// ---- Auth ----

export interface SellerMembershipAccess {
  sellerId: number;
  membershipRole: MembershipRole;
  canEditSeller: boolean;
  canManageSellerProducts: boolean;
  canManageSellerStaff: boolean;
}

export interface AuthDriverProfileSummary {
  id: number;
  cpf: string;
  cnh: string;
  phone: string;
  address: string;
  status: DriverStatus;
  vehicles: DriverVehicle[];
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: RoleName[];
  sellers: Array<
    SellerMembershipAccess & {
      jobTitle: string | null;
      seller: Seller;
    }
  >;
  driverProfiles: AuthDriverProfileSummary[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ---- Users ----

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
  active?: boolean;
}

export interface UserRoleObject {
  id: number;
  name: RoleName | string;
  description?: string | null;
}

/**
 * Shape retornado pelos endpoints /users — roles são objetos,
 * não strings como em AuthUser (/auth/me).
 */
export interface UserWithRelations extends User {
  roles: UserRoleObject[];
  sellers: Array<
    SellerMembershipAccess & {
      jobTitle: string | null;
      seller: Seller;
    }
  >;
}

// ---- Sellers ----

export interface Seller {
  id: number;
  name: string;
  email: string;
  address: string;
  cep: string;
  phone: string;
  logo?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SellerMembership {
  userId: number;
  sellerId: number;
  jobTitle: string | null;
  membershipRole: MembershipRole;
  canEditSeller: boolean;
  canManageSellerProducts: boolean;
  canManageSellerStaff: boolean;
  user?: User;
  seller?: Seller;
}

// ---- Products ----

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  position: number;
  isPrimary: boolean;
}

export interface ProductBarcode {
  id: number;
  productId: number;
  barcode: string;
  barcodeType?: string | null;
  isPrimary?: boolean;
}

export interface Product {
  id: number;
  categoryId: number | null;
  name: string;
  description?: string | null;
  size?: string | null;
  weight?: number | null;
  brand?: string | null;
  unit?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  category?: ProductCategory | null;
  images?: ProductImage[];
  barcodes?: ProductBarcode[];
}

// ---- Seller Products ----

export interface SellerProduct {
  id: number;
  sellerId: number;
  productId: number;
  unitPriceCents: number;
  stockAmount: number;
  sku?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  seller?: Seller;
  product?: Product;
}

// ---- Customer Addresses ----

export interface CustomerAddress {
  id: number;
  userId: number;
  label?: string | null;
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ---- Drivers ----

export interface DriverVehicle {
  id: number;
  driverProfileId: number;
  plate: string;
  model?: string | null;
  brand?: string | null;
  year?: number | null;
  color?: string | null;
  type?: string | null;
  active?: boolean;
}

export interface DriverProfile {
  id: number;
  userId: number;
  cpf: string;
  cnh: string;
  phone: string;
  address: string;
  status: DriverStatus;
  availability?: DriverAvailability;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: User;
  vehicles?: DriverVehicle[];
}

// ---- Orders ----

export interface OrderItem {
  id: number;
  orderId: number;
  sellerProductId: number;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  sellerProduct?: SellerProduct;
}

export interface OrderStatusHistoryEntry {
  id: number;
  orderId: number;
  status?: OrderStatus;
  fromStatus?: OrderStatus | null;
  toStatus?: OrderStatus;
  note?: string | null;
  createdAt: string;
  changedByUserId?: number | null;
  changedByUser?: User | null;
}

export interface OrderEvidence {
  id: number;
  orderId: number;
  evidenceType: EvidenceType;
  imageUrl: string;
  note?: string | null;
  createdAt: string;
  uploadedByUserId?: number | null;
}

export interface DeliveryRequestEvidence {
  id: number;
  deliveryRequestId: number;
  evidenceType: EvidenceType;
  imageUrl: string;
  note?: string | null;
  createdAt: string;
  uploadedByUserId?: number | null;
  uploadedByUser?: User | null;
}

export interface DeliveryRequestStatusHistoryEntry {
  id: number;
  deliveryRequestId: number;
  fromStatus?: DeliveryRequestStatus | null;
  toStatus: DeliveryRequestStatus;
  status?: DeliveryRequestStatus;
  note?: string | null;
  createdAt: string;
  changedByUserId?: number | null;
  changedByUser?: User | null;
}

export interface DeliveryJob {
  id: number;
  orderId?: number | null;
  deliveryRequestId?: number | null;
  pickupLatitude?: string | null;
  pickupLongitude?: string | null;
  radiusMeters: number;
  offeredFeeCents: number;
  status: DeliveryJobStatus;
  acceptedByDriverProfileId?: number | null;
  acceptedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  order?: Order | null;
  deliveryRequest?: DeliveryRequest | null;
  acceptedByDriverProfile?: DriverProfile | null;
}

export interface DeliveryRequest {
  id: number;
  requesterUserId: number;
  requesterSellerId?: number | null;
  assignedDriverProfileId?: number | null;
  status: DeliveryRequestStatus;
  paymentStatus?: PaymentStatus | null;
  pickupAddress: string;
  pickupCep?: string | null;
  pickupContactName?: string | null;
  pickupContactPhone?: string | null;
  pickupLatitude?: string | null;
  pickupLongitude?: string | null;
  dropoffAddress: string;
  dropoffCep?: string | null;
  dropoffContactName?: string | null;
  dropoffContactPhone?: string | null;
  dropoffLatitude?: string | null;
  dropoffLongitude?: string | null;
  packageDescription: string;
  packageSize?: string | null;
  packageWeightGrams?: number | null;
  notes?: string | null;
  cancellationReason?: string | null;
  cancellationDetails?: string | null;
  cancelledByUserId?: number | null;
  deliveryFeeCents: number;
  deliveryDistanceMeters?: number | null;
  pricingSource: PricingSource;
  active?: boolean;
  createdAt: string;
  updatedAt?: string;
  requesterUser?: User;
  requesterSeller?: Seller | null;
  assignedDriverProfile?: DriverProfile | null;
  evidences?: DeliveryRequestEvidence[];
  statusHistory?: DeliveryRequestStatusHistoryEntry[];
  payments?: Payment[];
  deliveryJobs?: DeliveryJob[];
}

export interface Order {
  id: number;
  code?: string | null;
  clientUserId: number;
  sellerId: number;
  customerAddressId?: number | null;
  assignedDriverProfileId?: number | null;
  status: OrderStatus;
  paymentStatus?: PaymentStatus | null;
  deliveryAddress: string;
  deliveryCep?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  confirmationCode?: string | null;
  deliveryFeeCents?: number | null;
  totalAmountCents: number;
  distanceMeters?: number | null;
  cancellationReason?: string | null;
  cancellationDetails?: string | null;
  cancelledByUserId?: number | null;
  createdAt: string;
  updatedAt?: string;
  clientUser?: User;
  customerAddress?: CustomerAddress | null;
  seller?: Seller;
  assignedDriverProfile?: DriverProfile | null;
  items?: OrderItem[];
  evidences?: OrderEvidence[];
  statusHistory?: OrderStatusHistoryEntry[];
  payments?: Payment[];
}

// ---- Payments ----

export interface Payment {
  id: number;
  orderId?: number | null;
  deliveryRequestId?: number | null;
  provider?: string | null;
  method?: string | null;
  transactionId?: string | null;
  amountCents: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt?: string;
  order?: Order | null;
  deliveryRequest?: DeliveryRequest | null;
}

// ---- Cart ----

export interface CartItem {
  id: number;
  cartId: number;
  sellerProductId: number;
  quantity: number;
  sellerProduct?: SellerProduct;
}

export interface Cart {
  id: number;
  userId: number;
  sellerId: number;
  status: string;
  items?: CartItem[];
  seller?: Seller;
}

// ---- API error shape ----

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  details?: unknown;
}
