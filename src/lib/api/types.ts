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

export type FulfillmentTiming = "ASAP" | "SCHEDULED";

export type DeliveryProvider = "UNDECIDED" | "INTERNAL" | "SELLER" | "NONE";

export type SellerDeliveryProvider = Extract<
  DeliveryProvider,
  "INTERNAL" | "SELLER"
>;

export type SellerReassignmentStatus =
  | "NONE"
  | "FINDING_SELLER"
  | "AWAITING_CUSTOMER_APPROVAL"
  | "AWAITING_PAYMENT_REAUTH";

export type OrderSellerAttemptStatus =
  | "PENDING"
  | "REJECTED"
  | "AWAITING_CUSTOMER_APPROVAL"
  | "ACCEPTED"
  | "EXPIRED"
  | "SKIPPED";

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
  | "AWAITING_DIRECT_PAYMENT"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export type PaymentProvider =
  | "STRIPE"
  | "DIRECT_SELLER"
  | "EXTERNAL_PAYMENT_LINK";

export type StripeConnectOnboardingStatus =
  | "NOT_STARTED"
  | "PENDING_ONBOARDING"
  | "PENDING_REVIEW"
  | "REQUIREMENTS_DUE"
  | "READY"
  | "RESTRICTED";

export type PaymentPayoutStatus = "PENDING" | "APPROVED" | "PAID" | "CANCELLED";

export type StripeTransferStatus =
  | "PENDING_RECIPIENT"
  | "TRANSFERRED"
  | "REVERSED"
  | "FAILED";

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

// ---- Blog ----

export type BlogPostStatus = "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";

export type BlogPostContentFormat = "HTML" | "MARKDOWN" | "JSON";

export interface BlogPostImage {
  id: number;
  blogPostId: number;
  url: string;
  altText?: string | null;
  caption?: string | null;
  position: number;
  isCover: boolean;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
}

export interface BlogAuthor {
  id: number;
  name: string;
  email: string;
}

export interface BlogPost {
  id: number;
  authorUserId: number | null;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  contentFormat: BlogPostContentFormat;
  contentEditorData?: string | null;
  status: BlogPostStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  ctaTitle?: string | null;
  ctaDescription?: string | null;
  ctaButtonText?: string | null;
  ctaHref?: string | null;
  ctaOpenInNewTab: boolean;
  readingTimeMinutes: number;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  active?: boolean;
  images: BlogPostImage[];
  tags: BlogTag[];
  author: BlogAuthor | null;
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
  stripeAccountId?: string | null;
  stripeAccountType?: string | null;
  stripeOnboardingStatus?: StripeConnectOnboardingStatus;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  stripeRequirementsCurrentlyDue?: string[] | null;
  stripeRequirementsEventuallyDue?: string[] | null;
  stripeDisabledReason?: string | null;
  stripeAccountUpdatedAt?: string | null;
  deliveryProvider?: SellerDeliveryProvider | null;
  isOnline?: boolean;
  autoOnlineEnabled?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SellerStorefront {
  id: number | null;
  sellerId: number;
  slug: string;
  enabled: boolean;
  publicName: string;
  description?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  allowedFulfillmentMethods: FulfillmentMethod[];
  allowedPaymentProviders: PaymentProvider[];
  externalPaymentLinkUrl?: string | null;
  externalPaymentInstructions?: string | null;
  seller?: Seller | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type SellerDayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface SellerOperatingHour {
  dayOfWeek: SellerDayOfWeek;
  isClosed: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
}

export interface SellerOperationalSettings {
  sellerId: number;
  isOnline: boolean;
  autoOnlineEnabled: boolean;
  operatingHours: SellerOperatingHour[];
  acceptsScheduledOrders: boolean;
  scheduledOrderingPaused: boolean;
  scheduledMinLeadMinutes: number;
  scheduledMaxLeadDays: number;
}

export interface SellerTeamInvitationPreview {
  id: number;
  email: string;
  sellerId: number;
  seller: Pick<Seller, "id" | "name" | "email"> | null;
  membershipRole: MembershipRole;
  jobTitle?: string | null;
  canEditSeller: boolean;
  canManageSellerProducts: boolean;
  canManageSellerStaff: boolean;
  expiresAt: string;
  existingUser: boolean;
}

export interface SellerTeamInvitationCreated {
  id: number;
  sellerId: number;
  email: string;
  membershipRole: MembershipRole;
  expiresAt: string;
  devInviteUrl?: string;
}

export interface SellerDeliverySettings {
  sellerId: number;
  ruleId?: number | null;
  maxDeliveryRadiusMeters: number;
  deliveryProvider: SellerDeliveryProvider;
  source: "SELLER_RULE" | "SYSTEM_DEFAULT";
  updatedAt?: string | null;
}

export interface StripeConnectStatus {
  connectEnabled: boolean;
  ownerType: "SELLER" | "DRIVER";
  ownerId: number;
  stripeAccountId?: string | null;
  stripeAccountType?: string | null;
  stripeOnboardingStatus: StripeConnectOnboardingStatus;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
  stripeRequirementsCurrentlyDue: string[];
  stripeRequirementsEventuallyDue: string[];
  stripeDisabledReason?: string | null;
  stripeAccountUpdatedAt?: string | null;
}

export interface StripeConnectOnboardingLinkResponse extends StripeConnectStatus {
  onboardingUrl: string;
  expiresAt: number;
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
  parentId?: number | null;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number;
  parent?: ProductCategory | null;
  children?: ProductCategory[];
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
  rawSize?: string | null;
  rawWeight?: number | null;
  rawUnit?: string | null;
  size?: string | null;
  weight?: number | null;
  brand?: string | null;
  unit?: string | null;
  saleUnit?: "UN" | "M2" | "M3" | "KG" | "L";
  packageContentQuantity?: number | null;
  packageContentUnit?: "KG" | "G" | "L" | "ML" | "M3" | null;
  logisticsWeightGrams?: number | null;
  logisticsWeightConfidence?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  diameterMm?: number | null;
  logisticsDimensionConfidence?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  logisticsReviewFlags?: string[];
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
  | "PENDING_PRODUCT_REVIEW"
  | "APPLIED"
  | "FAILED"
  | "APPLY_FAILED";

export type SellerProductImportRowStatus =
  | "VALID"
  | "WARNING"
  | "INVALID"
  | "APPLIED"
  | "SKIPPED"
  | "PENDING_PRODUCT_REVIEW"
  | "PRODUCT_REJECTED";

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
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  reviewRejectionReason?: string | null;
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
  sourceFileContentType?: string | null;
  sourceFileFormat?: "CSV" | "TXT" | "TSV" | "XLS" | "XLSX" | null;
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

export interface SellerProductImportReviewRow extends SellerProductImportRow {
  job: SellerProductImportJob;
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

export type DriverVehicleCategory =
  | "MOTORCYCLE"
  | "PASSENGER_CAR"
  | "COMPACT_UTILITY"
  | "PICKUP"
  | "VAN"
  | "TRUCK";

export type DriverCargoBodyType = "OPEN" | "CLOSED" | "UNKNOWN";

export type DriverVehicleCapacityConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "MANUAL";

export interface DriverVehicle {
  id: number;
  driverProfileId: number;
  plate: string;
  model?: string | null;
  brand?: string | null;
  catalogBrandId?: number | null;
  catalogModelId?: number | null;
  catalogSource?: string | null;
  year?: number | null;
  color?: string | null;
  type?: string | null;
  vehicleCategory?: DriverVehicleCategory | null;
  cargoBodyType?: DriverCargoBodyType | null;
  maxWeightGrams?: number | null;
  maxLengthMm?: number | null;
  maxWidthMm?: number | null;
  maxHeightMm?: number | null;
  capacityConfidence?: DriverVehicleCapacityConfidence | null;
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
  currentVehicleId?: number | null;
  currentVehicle?: DriverVehicle | null;
  stripeAccountId?: string | null;
  stripeAccountType?: string | null;
  stripeOnboardingStatus?: StripeConnectOnboardingStatus;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  stripeRequirementsCurrentlyDue?: string[] | null;
  stripeRequirementsEventuallyDue?: string[] | null;
  stripeDisabledReason?: string | null;
  stripeAccountUpdatedAt?: string | null;
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

export interface OrderSellerAttempt {
  id: number;
  orderId: number;
  sellerId: number;
  sequence: number;
  status: OrderSellerAttemptStatus;
  rejectionReason?: string | null;
  rejectionDetails?: string | null;
  rejectedByUserId?: number | null;
  productTotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  createdAt: string;
  updatedAt?: string;
  seller?: Seller | null;
  rejectedByUser?: User | null;
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
  source?: "APP" | "STOREFRONT";
  storefrontId?: number | null;
  publicToken?: string | null;
  assignedDriverProfileId?: number | null;
  status: OrderStatus;
  fulfillmentMethod?: FulfillmentMethod;
  fulfillmentTiming?: FulfillmentTiming;
  scheduledWindowStartAt?: string | null;
  scheduledWindowEndAt?: string | null;
  deliveryProvider?: DeliveryProvider;
  requiredVehicleCategory?: DriverVehicleCategory | null;
  paymentStatus?: PaymentStatus | null;
  sellerReassignmentStatus?: SellerReassignmentStatus;
  pendingReassignmentExpiresAt?: string | null;
  pendingReassignmentSnapshot?: unknown;
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
  sellerAttempts?: OrderSellerAttempt[];
  payments?: Payment[];
}

export interface InternalDeliveryAvailability {
  available: boolean;
  driverCount: number;
  radiusMeters: number;
  locationFreshnessSeconds: number;
}

// ---- Payments ----

export interface Payment {
  id: number;
  orderId?: number | null;
  deliveryRequestId?: number | null;
  provider?: string | null;
  method?: string | null;
  transactionId?: string | null;
  stripeTransferGroup?: string | null;
  amountCents: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt?: string;
  order?: Order | null;
  deliveryRequest?: DeliveryRequest | null;
  payouts?: PaymentPayout[];
  refunds?: PaymentRefund[];
}

export interface PaymentPayout {
  id: number;
  paymentId: number;
  recipientType: "SELLER" | "DRIVER";
  sellerId?: number | null;
  driverProfileId?: number | null;
  grossAmountCents: number;
  platformFeeCents: number;
  amountCents: number;
  status: PaymentPayoutStatus | string;
  paidAt?: string | null;
  stripeTransferId?: string | null;
  stripeTransferGroup?: string | null;
  stripeTransferStatus?: StripeTransferStatus | string | null;
  stripeTransferFailureReason?: string | null;
  stripeTransferAttempts?: number;
  stripeTransferredAt?: string | null;
  stripeTransferReversalId?: string | null;
  stripeTransferReversalStatus?: string | null;
  stripeTransferReversalFailureReason?: string | null;
  stripeTransferReversedAmountCents?: number;
  stripeTransferReversedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  payment?: Payment;
  seller?: Seller | null;
  driverProfile?: DriverProfile | null;
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

export interface DriverLocationCleanupResult {
  deleted: number;
  retentionHours: number;
  cutoff: string;
  batchSize: number;
  batches: number;
}

// ---- Cart ----

export interface CartItem {
  id: number;
  cartId: number;
  productId?: number;
  sellerProductId: number;
  quantity: number;
  product?: Product;
  sellerProduct?: SellerProduct;
}

export interface Cart {
  id: number;
  userId: number;
  sellerId?: number;
  resolvedSellerId?: number | null;
  customerAddressId?: number | null;
  fulfillmentMethod?: FulfillmentMethod;
  status: string;
  items?: CartItem[];
  seller?: Seller;
  resolvedSeller?: Seller | null;
  customerAddress?: CustomerAddress | null;
  subtotalProductsCents?: number;
  estimatedDeliveryFeeCents?: number;
  distanceMeters?: number;
  totalEstimatedCents?: number;
}

export interface CartPaymentOptionQuote {
  sellerId: number;
  sellerName?: string | null;
  subtotalProductsCents: number;
  estimatedDeliveryFeeCents: number;
  totalEstimatedCents: number;
  distanceMeters?: number;
}

export interface CartPaymentOption {
  type: "ONLINE" | "DIRECT_SELLER";
  provider: PaymentProvider;
  available: boolean;
  reason?: "CART_EMPTY" | "PROVIDER_DISABLED" | "NO_ELIGIBLE_SELLER";
  requiresSellerSwitch: boolean;
  current?: CartPaymentOptionQuote | null;
  alternative?: CartPaymentOptionQuote | null;
  deltaCents?: number;
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
