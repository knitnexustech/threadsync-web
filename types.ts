
// Every company is a neutral peer — no more MANUFACTURER/VENDOR split.
export interface Company {
  id: string;
  name: string;
  gst_number?: string;
  kramiz_id?: string;
  address?: string;
  state?: string;
  pincode?: string;
  created_at?: string;
}

// A partnership is a verified, bidirectional link between two companies.
export interface Partnership {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at?: string;
  requester?: Company;
  receiver?: Company;
}

// A contact is a manually added company that may or may not be on Kramiz.
export interface Contact {
  id: string;
  owner_company_id: string;
  name: string;
  gst_number?: string;
  address?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  notes?: string;
  invite_sent_at?: string;
  linked_company_id?: string;
  created_at?: string;
  linked_company?: Company;
}

// ── Roles ─────────────────────────────────────────────────────────────────────
//
//  ADMIN         Owner / Partner — full access, sees ALL orders & channels
//  MERCHANDISER  Manages orders end-to-end, creates channels, DCs, invoices
//  MANAGER       Production / Floor manager — operational, cannot create orders
//  SENIOR_STAFF  Dispatch / logistics — creates DCs and ICs
//  JUNIOR_STAFF  Trainee / support — read + message only, cannot create docs
//
//  Visibility rule:
//    ADMIN → sees all orders & channels across the company
//    Everyone else → sees ONLY channels they have been explicitly added to
//
//  Auto-membership rule:
//    When a Merchandiser creates an order, ALL ADMINs of the company +
//    the creating Merchandiser are automatically added to every channel
//    created under that order.

export type UserRole =
  | 'ADMIN'
  | 'MERCHANDISER'
  | 'MANAGER'
  | 'SENIOR_STAFF'
  | 'JUNIOR_STAFF';

export interface User {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  passcode: string;
  role: UserRole;
  created_at?: string;
  company?: Company;
}

export interface Spec {
  id: string;
  content: string;
  created_at?: string;
  created_by?: string;
}

export interface AttachedFile {
  id: string;
  name: string;
  url: string;
  type: 'PDF' | 'IMAGE' | 'DOC' | 'OTHER';
  uploadedBy: string;
  uploadedAt: string;
}

export interface Order {
  id: string;
  order_number: string;
  manufacturer_id: string;
  style_number: string;
  image_url: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  created_by: string;
  created_at?: string;
}

export interface OrderMember {
  id: string;
  order_id: string;
  user_id: string;
  added_at?: string;
}

export type ChannelType = 'OVERVIEW' | 'VENDOR';

export interface Channel {
  id: string;
  order_id: string;
  name: string;
  type: ChannelType;
  vendor_id?: string;
  status: string;
  specs: Spec[];
  files: AttachedFile[];
  last_activity_at?: string;
  last_read_at?: string;
  last_message?: string;
  due_date?: string;
  created_at?: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  added_by: string;
  last_read_at?: string;
  added_at?: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  timestamp: string;
  is_system_update?: boolean;
  user?: User;
}

// ── DC / Challan types ────────────────────────────────────────────────────────

/** A single line item on a Delivery Challan or Inward Challan. */
export interface DCItem {
  description: string;
  quantity:    number;
  unit:        string; // KG, MTR, PCS, SET, BAG, ...
}

/** Outward Delivery Challan — created by the sender at point of dispatch; includes driver details. */
export interface DeliveryChallan {
  id:                   string;
  dc_number:            string;
  channel_id?:          string;
  sender_company_id:    string;
  receiver_company_id?: string;
  receiver_contact_id?: string;
  order_number?:        string;
  ref_order_number?:    string;
  items:                DCItem[];
  driver_name?:         string;
  driver_phone?:        string;
  driver_photo_url?:    string;
  notes?:               string;
  status:               'DELIVERED' | 'BILLED' | 'CANCELLED' | 'RETURNED';
  created_at?:          string;
  sender_company?:      Company;
  receiver_company?:    Company;
  receiver_contact?:    Contact;
  parent_order?:        Order;
}

/** Inward Challan — created by the receiver when goods arrive. */
export interface InwardChallan {
  id:                   string;
  ic_number:            string;
  channel_id?:          string;
  linked_dc_id?:        string;
  sender_company_id?:  string;
  sender_contact_id?:  string;
  receiver_company_id: string;
  order_number?:        string;
  ref_order_number?:    string;
  items_received:       DCItem[];
  status?:              'TO_RECEIVE' | 'RECEIVED' | 'RETURNED';
  discrepancies?:       string;
  notes?:               string;
  created_at?:          string;
  sender_company?:      Company;
  sender_contact?:      Contact;
  receiver_company?:    Company;
  parent_order?:        Order;
}


// ── Invoice types ─────────────────────────────────────────────────────────────

/**
 * GST type — determines how the rate is split on the document.
 *   CGST_SGST → intra-state: CGST (rate/2) + SGST (rate/2) shown separately
 *   IGST      → inter-state: IGST (full rate) shown as one line
 */
export type GSTType = 'CGST_SGST' | 'IGST' | 'NONE';

/** Valid Indian GST rate slabs. */
export type GSTRate = 3 | 5 | 12 | 18;

/**
 * A single line item on an Invoice.
 * amount = quantity × rate (stored pre-calculated to avoid floating-point drift).
 */
export interface InvoiceItem {
  description: string;
  hsn_code?:   string;   // HSN/SAC code for tax
  quantity:    number;
  unit:        string;   // KG, MTR, PCS, SET, ...
  rate:        number;   // price per unit (₹)
  amount:      number;   // quantity × rate
}

/**
 * Invoice — billing document raised by the seller.
 *
 * GST split logic (UI responsibility):
 *   CGST_SGST → display CGST = gst_rate/2, SGST = gst_rate/2
 *   IGST      → display IGST = gst_rate (full)
 *   null      → no GST line
 *
 * Status:
 *   DRAFT → saved, not yet shared with buyer
 *   SENT  → shared with buyer (can still be edited as DRAFT if recalled)
 */
export interface Invoice {
  id:                string;
  invoice_number:    string;          // e.g. INV-260322-001
  seller_company_id: string;          // always the creator's company
  buyer_company_id?: string;          // Kramiz partner
  buyer_contact_id?: string;          // manual contact (offline buyer)
  seller_contact_id?: string;         // manual contact (offline seller)
  order_id?:         string;          // linked Purchase Order (optional)
  channel_id?:       string;          // linked chat channel (optional)
  linked_dc_ids:     string[];        // array of DC IDs this invoice covers
  items:             InvoiceItem[];
  subtotal:          number;          // sum of all item amounts
  gst_type?:         GSTType;        // null = no GST
  gst_rate?:         GSTRate;        // 3 | 5 | 12 | 18
  gst_amount?:       number;         // calculated: subtotal × (gst_rate/100)
  total_amount:      number;         // subtotal + gst_amount (or just subtotal)
  due_date?:         string;         // ISO date
  notes?:            string;

  created_by:        string;         // user ID
  created_at?:       string;
  updated_at?:       string;
  // Joined for display
  seller_company?:   Company;
  seller_contact?:   Contact;
  buyer_company?:    Company;
  buyer_contact?:    Contact;
}

export interface Expense {
  id: string;
  company_id: string;
  order_id?: string;
  description: string;
  amount: number;
  created_by: string;
  created_at: string;
}


// ── Permission system ─────────────────────────────────────────────────────────

export type Permission =
  // Purchase Orders
  | 'CREATE_ORDER' | 'EDIT_ORDER' | 'DELETE_ORDER'
  // Channels
  | 'CREATE_CHANNEL'
  | 'EDIT_CHANNEL'
  | 'DELETE_CHANNEL'
  | 'ADD_CHANNEL_MEMBER'
  | 'REMOVE_CHANNEL_MEMBER'
  // Team
  | 'ADD_TEAM_MEMBER'
  | 'CHANGE_USER_ROLE'
  // Delivery documents
  | 'CREATE_DC'
  | 'EDIT_DC'
  | 'DELETE_DC'
  | 'CREATE_IC'
  | 'EDIT_IC'
  | 'DELETE_IC'
  | 'VIEW_DC'
  // Financial documents
  | 'CREATE_SALES_INVOICE' | 'EDIT_SALES_INVOICE' | 'DELETE_SALES_INVOICE'
  | 'CREATE_PURCHASE_INVOICE' | 'EDIT_PURCHASE_INVOICE' | 'DELETE_PURCHASE_INVOICE'
  | 'CREATE_SIMPLE_EXPENSE'
  | 'DELETE_SIMPLE_EXPENSE'
  | 'VIEW_FINANCIALS'

  // Contacts & Partnerships
  | 'MANAGE_CONTACTS'
  | 'SEND_PARTNERSHIP_INVITE'
  | 'ACCEPT_PARTNERSHIP_INVITE'
  // Org-level
  | 'DELETE_ORG';

/**
 * Role → Permissions map.
 * Channel/order VISIBILITY is NOT handled here — it is enforced at query level.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {

  ADMIN: [
    'CREATE_ORDER', 'EDIT_ORDER', 'DELETE_ORDER',
    'CREATE_CHANNEL', 'EDIT_CHANNEL', 'DELETE_CHANNEL',
    'ADD_CHANNEL_MEMBER', 'REMOVE_CHANNEL_MEMBER',
    'ADD_TEAM_MEMBER', 'CHANGE_USER_ROLE',
    'CREATE_DC', 'EDIT_DC', 'DELETE_DC',
    'CREATE_IC', 'EDIT_IC', 'DELETE_IC',
    'VIEW_DC',
    'CREATE_SALES_INVOICE', 'EDIT_SALES_INVOICE', 'DELETE_SALES_INVOICE',
    'CREATE_PURCHASE_INVOICE', 'EDIT_PURCHASE_INVOICE', 'DELETE_PURCHASE_INVOICE',
    'CREATE_SIMPLE_EXPENSE', 'DELETE_SIMPLE_EXPENSE',
    'VIEW_FINANCIALS',
    'MANAGE_CONTACTS',
    'SEND_PARTNERSHIP_INVITE', 'ACCEPT_PARTNERSHIP_INVITE',
    'DELETE_ORG',
  ],

  MERCHANDISER: [
    'CREATE_ORDER', 'EDIT_ORDER', 'DELETE_ORDER',
    'CREATE_CHANNEL', 'EDIT_CHANNEL', 'DELETE_CHANNEL',
    'ADD_CHANNEL_MEMBER', 'REMOVE_CHANNEL_MEMBER',
    'ADD_TEAM_MEMBER',
    'CREATE_DC', 'EDIT_DC', 'DELETE_DC',
    'CREATE_IC', 'EDIT_IC', 'DELETE_IC',
    'VIEW_DC',
    'CREATE_PURCHASE_INVOICE', 'EDIT_PURCHASE_INVOICE', 'DELETE_PURCHASE_INVOICE',
    'CREATE_SIMPLE_EXPENSE', 'DELETE_SIMPLE_EXPENSE',
    'MANAGE_CONTACTS',
    'SEND_PARTNERSHIP_INVITE', 'ACCEPT_PARTNERSHIP_INVITE',
  ],

  MANAGER: [
    'ADD_CHANNEL_MEMBER', 'REMOVE_CHANNEL_MEMBER',
    'CREATE_DC', 'EDIT_DC', 'DELETE_DC',
    'CREATE_IC', 'EDIT_IC', 'DELETE_IC',
    'VIEW_DC',
    'CREATE_PURCHASE_INVOICE', 'EDIT_PURCHASE_INVOICE', 'DELETE_PURCHASE_INVOICE',
    'CREATE_SIMPLE_EXPENSE', 'DELETE_SIMPLE_EXPENSE',
    'ADD_TEAM_MEMBER',
    'MANAGE_CONTACTS',
    'SEND_PARTNERSHIP_INVITE', 'ACCEPT_PARTNERSHIP_INVITE',
  ],

  SENIOR_STAFF: [
    'ADD_CHANNEL_MEMBER', 'REMOVE_CHANNEL_MEMBER',
    'CREATE_DC', 'EDIT_DC', 'DELETE_DC',
    'CREATE_IC', 'EDIT_IC', 'DELETE_IC',
    'VIEW_DC',
    'CREATE_SIMPLE_EXPENSE',
    'MANAGE_CONTACTS',
    'SEND_PARTNERSHIP_INVITE',
  ],

  JUNIOR_STAFF: [
    'CREATE_SIMPLE_EXPENSE',
    'VIEW_DC',
  ],

};

/** Check if a role has a given permission. */
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

/** All users can edit/delete their own messages. */
export const canEditMessage = (user: User, message: Message): boolean =>
  message.user_id === user.id && !message.is_system_update;

export const canDeleteMessage = (user: User, message: Message): boolean =>
  message.user_id === user.id && !message.is_system_update;
