export type Country = 'IN' | 'CN' | 'OTHER';
export type OrgKind = 'supplier' | 'buyer' | 'both';
export type DeviceClass = 'I' | 'IIa' | 'IIb' | 'III';

export type CertKind =
  | 'ISO_13485'
  | 'CE'
  | 'FDA_510K'
  | 'NMPA'
  | 'CDSCO_IMPORT'
  | 'CDSCO_MFG'
  | 'MDSAP'
  | 'WHO_PQ'
  | 'ROHS'
  | 'REACH';

export type RfqStatus =
  | 'draft'
  | 'open'
  | 'responses_in'
  | 'awarded'
  | 'closed'
  | 'cancelled';

export type QuoteStatus =
  | 'submitted'
  | 'shortlisted'
  | 'rejected'
  | 'accepted'
  | 'withdrawn';

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'in_production'
  | 'qc'
  | 'ready_to_ship'
  | 'shipped'
  | 'in_transit'
  | 'customs'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type ShipmentMode = 'air' | 'sea_lcl' | 'sea_fcl' | 'rail' | 'courier';

export interface Organization {
  id: string;
  kind: OrgKind;
  legal_name: string;
  display_name: string;
  country: Country;
  website: string | null;
  about: string | null;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierProfile {
  org_id: string;
  factory_address: string | null;
  factory_city: string | null;
  factory_province: string | null;
  nmpa_registration_no: string | null;
  export_license_no: string | null;
  business_license_no: string | null;
  established_year: number | null;
  employee_count: number | null;
  annual_revenue_usd: number | null;
  export_countries: string[] | null;
  primary_categories: string[] | null;
  capabilities: string[] | null;
  min_lead_time_days: number | null;
  typical_lead_time_days: number | null;
  payment_terms_accepted: string[] | null;
  incoterms_offered: string[] | null;
}

export interface BuyerProfile {
  org_id: string;
  billing_address: string | null;
  billing_state: string | null;
  gstin: string | null;
  pan: string | null;
  cdsco_importer_license_no: string | null;
  cdsco_license_expiry: string | null;
  drug_license_no: string | null;
  buyer_segment: string | null;
  annual_procurement_inr: number | null;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  parent_id: number | null;
  device_class: DeviceClass | null;
  gmdn_term: string | null;
  description: string | null;
}

export interface Product {
  id: string;
  supplier_org_id: string;
  category_id: number | null;
  sku: string | null;
  name: string;
  short_description: string | null;
  long_description: string | null;
  device_class: DeviceClass | null;
  hs_code: string | null;
  gmdn_code: string | null;
  specs: Record<string, unknown>;
  images: string[];
  moq: number | null;
  unit_price_usd: number | null;
  lead_time_days: number;
  lead_time_days_express: number | null;
  warranty_months: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rfq {
  id: string;
  buyer_org_id: string;
  created_by: string;
  title: string;
  category_id: number | null;
  description: string | null;
  target_specs: Record<string, unknown>;
  quantity: number;
  target_unit_price_usd: number | null;
  required_lead_time_days: number | null;
  required_certifications: CertKind[] | null;
  incoterm: string | null;
  delivery_port: string | null;
  closes_at: string | null;
  status: RfqStatus;
  created_at: string;
}

export interface RfqResponse {
  id: string;
  rfq_id: string;
  supplier_org_id: string;
  product_id: string | null;
  unit_price_usd: number;
  lead_time_days: number;
  validity_days: number;
  incoterm: string | null;
  payment_terms: string | null;
  notes: string | null;
  status: QuoteStatus;
  submitted_at: string;
}

export interface Order {
  id: string;
  order_no: string;
  buyer_org_id: string;
  supplier_org_id: string;
  rfq_response_id: string | null;
  product_id: string | null;
  quantity: number;
  unit_price_usd: number;
  total_usd: number;
  incoterm: string | null;
  status: OrderStatus;
  promised_dispatch_on: string | null;
  promised_delivery_on: string | null;
  actual_dispatch_on: string | null;
  actual_delivery_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  carrier: string | null;
  tracking_no: string | null;
  mode: ShipmentMode | null;
  origin_port: string | null;
  destination_port: string | null;
  dispatched_at: string | null;
  eta: string | null;
  delivered_at: string | null;
  current_location: string | null;
  current_status: string | null;
}

export interface ShipmentEvent {
  id: number;
  shipment_id: string;
  occurred_at: string;
  location: string | null;
  status: string;
  description: string | null;
  source: string | null;
  created_at: string;
}

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'in_production',
  'qc',
  'ready_to_ship',
  'shipped',
  'in_transit',
  'customs',
  'out_for_delivery',
  'delivered',
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  in_production: 'In production',
  qc: 'Quality check',
  ready_to_ship: 'Ready to ship',
  shipped: 'Shipped',
  in_transit: 'In transit',
  customs: 'In customs',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
