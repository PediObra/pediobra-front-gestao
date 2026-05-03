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

export type FulfillmentMethod = "DELIVERY" | "STORE_PICKUP";

export type MessageTargetType =
  | "ORDER"
  | "DELIVERY_REQUEST"
  | "USED_LISTING_INQUIRY";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "READY_FOR_CUSTOMER_PICKUP"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CUSTOMER_PICKED_UP"
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

export type DeliveryJobOfferStatus =
  | "OFFERED"
  | "ACCEPTING"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED";

export type PricingSource = "MANUAL" | "ESTIMATED";

export type UsedListingCondition =
  | "USED"
  | "SURPLUS"
  | "OPEN_BOX"
  | "PARTIAL"
  | "EXCESS_LOT"
  | "USED_TOOL"
  | "OTHER";

export type UsedListingStatus =
  | "DRAFT"
  | "ACTIVE"
  | "RESERVED"
  | "SOLD"
  | "CANCELLED"
  | "EXPIRED"
  | "REJECTED";

export type UsedListingInquiryStatus = "OPEN" | "ARCHIVED" | "BLOCKED";

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

// ---- Messages ----

export interface MessageThread {
  id: number;
  targetType: MessageTargetType;
  targetId: number;
  orderId?: number | null;
  deliveryRequestId?: number | null;
  usedListingInquiryId?: number | null;
  createdAt: string;
  updatedAt?: string;
}

export interface InternalMessage {
  id: number;
  threadId: number;
  authorUserId: number;
  body: string;
  createdAt: string;
  updatedAt?: string;
  authorUser?: Pick<User, "id" | "name" | "email"> | null;
}

export interface MessageThreadResponse {
  thread: MessageThread;
  messages: Paginated<InternalMessage>;
  lastReadAt?: string | null;
  unreadCount: number;
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

export type CatalogStatus = "VERIFIED" | "IMPORTED_CANDIDATE";

export type SellerProductImportStatus =
  | "UPLOADED"
  | "QUEUED"
  | "PROCESSING"
  | "READY_FOR_REVIEW"
  | "APPLYING"
  | "APPLIED"
  | "FAILED"
  | "APPLY_FAILED";

export type SellerProductImportRowStatus =
  | "VALID"
  | "WARNING"
  | "INVALID"
  | "APPLIED"
  | "SKIPPED";

export type CatalogImportCanonicalField =
  | "product.name"
  | "product.brand"
  | "product.unit"
  | "product.description"
  | "product.size"
  | "product.weight"
  | "product.barcode"
  | "sellerProduct.sku"
  | "sellerProduct.unitPriceCents"
  | "sellerProduct.stockAmount"
  | "sellerProduct.active";

export interface CatalogImportMappingEntry {
  canonicalField: CatalogImportCanonicalField;
  sourceColumn: string | null;
}

export interface SellerProductImportRow {
  id: number;
  jobId: number;
  rowNumber: number;
  rawRow?: unknown;
  normalizedPayload?: {
    product?: {
      name?: string | null;
      brand?: string | null;
      unit?: string | null;
      description?: string | null;
      size?: string | null;
      weight?: number | null;
      barcodes?: string[];
    };
    sellerProduct?: {
      sku?: string | null;
      unitPriceCents?: number | null;
      stockAmount?: number | null;
      active?: boolean | null;
    };
  } | null;
  status: SellerProductImportRowStatus;
  matchStrategy?: string | null;
  matchConfidenceBps?: number | null;
  existingProductId?: number | null;
  createdProductId?: number | null;
  sellerProductId?: number | null;
  errors?: string[] | null;
  warnings?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SellerProductImportJob {
  id: number;
  sellerId: number;
  createdByUserId: number;
  status: SellerProductImportStatus;
  mode: string;
  sourceFileBucket?: string | null;
  sourceFileKey?: string | null;
  sourceOriginalFilename?: string | null;
  sourceFileSizeBytes?: number | null;
  sourceFileChecksum?: string | null;
  mappingSnapshot?: CatalogImportMappingEntry[] | null;
  stats?: Record<string, unknown> | null;
  errors?: string[] | null;
  etlNotifiedAt?: string | null;
  etlNotificationError?: string | null;
  processedAt?: string | null;
  appliedAt?: string | null;
  attemptCount?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  seller?: Pick<Seller, "id" | "name"> | null;
  createdByUser?: Pick<User, "id" | "name" | "email"> | null;
  rows?: SellerProductImportRow[];
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

export interface UsedListingImage {
  id: number;
  listingId: number;
  url: string;
  position: number;
  createdAt?: string;
}

export interface UsedListing {
  id: number;
  ownerUserId: number;
  ownerSellerId?: number | null;
  baseProductId?: number | null;
  title: string;
  description: string;
  condition: UsedListingCondition;
  quantity?: number | null;
  unit?: string | null;
  remainingAmountDescription?: string | null;
  priceCents?: number | null;
  negotiable?: boolean;
  status: UsedListingStatus;
  publicNeighborhood?: string | null;
  publicCity?: string | null;
  publicState?: string | null;
  pickupAddress?: string | null;
  pickupCep?: string | null;
  pickupContactName?: string | null;
  pickupContactPhone?: string | null;
  pickupLatitude?: string | null;
  pickupLongitude?: string | null;
  moderationReason?: string | null;
  moderatedAt?: string | null;
  active?: boolean;
  createdAt: string;
  updatedAt?: string;
  ownerUser?: Pick<User, "id" | "name" | "email"> | null;
  ownerSeller?: Seller | Pick<Seller, "id" | "name" | "logo"> | null;
  baseProduct?: Product | null;
  images?: UsedListingImage[];
}

export interface UsedListingInquiry {
  id: number;
  listingId: number;
  buyerUserId: number;
  ownerUserId: number;
  ownerSellerId?: number | null;
  status: UsedListingInquiryStatus;
  selectedBuyer: boolean;
  selectedAt?: string | null;
  selectedByUserId?: number | null;
  createdAt: string;
  updatedAt?: string;
  buyerUser?: Pick<User, "id" | "name" | "email"> | null;
  ownerUser?: Pick<User, "id" | "name" | "email"> | null;
  ownerSeller?: Seller | null;
  listing?: UsedListing | null;
  deliveryRequests?: DeliveryRequest[];
}

export interface DeliveryRequest {
  id: number;
  requesterUserId: number;
  requesterSellerId?: number | null;
  usedListingId?: number | null;
  usedListingInquiryId?: number | null;
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
  usedListing?: UsedListing | null;
  usedListingInquiry?: UsedListingInquiry | null;
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
  fulfillmentMethod?: FulfillmentMethod;
  paymentStatus?: PaymentStatus | null;
  deliveryAddress?: string | null;
  deliveryCep?: string | null;
  pickupAddress?: string | null;
  pickupCep?: string | null;
  pickupContactName?: string | null;
  pickupContactPhone?: string | null;
  pickupLatitude?: string | null;
  pickupLongitude?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  confirmationCode?: string | null;
  pickupConfirmationCode?: string | null;
  deliveryConfirmationCode?: string | null;
  customerPickupConfirmationCode?: string | null;
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
  refunds?: PaymentRefund[];
}

export interface PaymentRefund {
  id: number;
  paymentId: number;
  providerRefundId?: string | null;
  amountCents: number;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  reason?: string | null;
  note?: string | null;
  requestedByUserId?: number | null;
  providerStatus?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// ---- Operations ----

export type OperationIssueSeverity = "warning" | "critical";

export type OperationIssueType =
  | "ORDER_PAYMENT_PENDING"
  | "DELIVERY_PAYMENT_PENDING"
  | "READY_ORDER_WITHOUT_JOB"
  | "OFFER_ACCEPTING_STALE"
  | "ONLINE_DRIVER_STALE_LOCATION"
  | "ASSIGNED_DRIVER_UNREACHABLE"
  | "DELIVERY_FAILED"
  | "CANCELLED_ORDER_PAID"
  | "CANCELLED_DELIVERY_PAID";

export interface OperationSummary {
  activeOrders: number;
  activeDeliveryRequests: number;
  openJobs: number;
  activeOffers: number;
  onlineDrivers: number;
}

export interface OperationIssue {
  type: OperationIssueType;
  title: string;
  severity: OperationIssueSeverity;
  orderId?: number | null;
  deliveryRequestId?: number | null;
  deliveryJobId?: number | null;
  offerId?: number | null;
  driverProfileId?: number | null;
  driverAvailability?: string | null;
  paymentId?: number | null;
  createdAt?: string | null;
  lastLocationAt?: string | null;
}

export interface OperationJob {
  id: number;
  status: DeliveryJobStatus;
  orderId?: number | null;
  deliveryRequestId?: number | null;
  acceptedByDriverProfileId?: number | null;
  createdAt: string;
  updatedAt?: string | null;
  orderStatus?: OrderStatus | null;
  orderPaymentStatus?: PaymentStatus | null;
  deliveryRequestStatus?: DeliveryRequestStatus | null;
  deliveryRequestPaymentStatus?: PaymentStatus | null;
}

export interface OperationOffer {
  id: number;
  deliveryJobId: number;
  driverProfileId: number;
  status: DeliveryJobOfferStatus;
  expiresAt: string;
  offeredAt: string;
  distanceMeters?: number | null;
  orderId?: number | null;
  deliveryRequestId?: number | null;
  driverName?: string | null;
}

export interface OperationOverview {
  summary: OperationSummary;
  issues: OperationIssue[];
  jobs: OperationJob[];
  offers: OperationOffer[];
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
  code?: string;
  currentSellerId?: number;
  requestedProductId?: number;
  activeSellerIds?: number[];
  options?: SmartCartSellerOption[];
}

export interface SmartCartSellerOption {
  sellerId: number;
  sellerProductIds: number[];
  totalProductsCents: number;
  distanceMeters?: number;
  estimatedDeliveryFeeCents?: number;
}
