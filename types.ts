
export type CompanyType = 'MANUFACTURER' | 'VENDOR';

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  created_at?: string;
}

export type UserRole =
  | 'ADMIN'
  | 'SENIOR_MERCHANDISER'
  | 'JUNIOR_MERCHANDISER'
  | 'SENIOR_MANAGER'
  | 'JUNIOR_MANAGER';

export interface User {
  id: string;
  company_id: string;
  name: string;
  phone: string; // Must be exactly 10 digits
  passcode: string; // 4-digit passcode for authentication
  role: UserRole;
  created_at?: string;
  company?: Company;
}

export interface Spec {
  id: string;
  content: string; // Free-form text note/spec
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

export interface PurchaseOrder {
  id: string;
  order_number: string;
  manufacturer_id: string;
  style_number: string;
  image_url: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  created_by: string; // User ID who created the PO
  created_at?: string;
}

// NEW: PO Members (Overview Group)
export interface POMember {
  id: string;
  po_id: string;
  user_id: string;
  added_at?: string;
}

export type ChannelType = 'OVERVIEW' | 'VENDOR';

export interface Channel {
  id: string;
  po_id: string;
  name: string;
  type: ChannelType;
  vendor_id?: string; // Nullable if managed internally or unassigned (for OVERVIEW type)
  status: string; // PENDING, IN_PROGRESS, COMPLETED
  specs: Spec[]; // Channel-specific specs (GSM, Dia, Color, etc.)
  files: AttachedFile[]; // Channel-specific files (spec sheets, samples, etc.)
  last_activity_at?: string;
  last_read_at?: string; // Add this field for UI convenience
  created_at?: string;
}

// NEW: Channel Members
export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  added_by: string; // User ID who added this member
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

// Permission helper types
export type Permission =
  | 'CREATE_PO'
  | 'EDIT_PO'
  | 'DELETE_PO'
  | 'CREATE_CHANNEL'
  | 'EDIT_CHANNEL'
  | 'DELETE_CHANNEL'
  | 'ADD_CHANNEL_MEMBER'
  | 'REMOVE_CHANNEL_MEMBER'
  | 'CHANGE_USER_ROLE'
  | 'ADD_TEAM_MEMBER'
  | 'EDIT_MESSAGE'
  | 'DELETE_MESSAGE';

// Role permissions matrix
// Note: All users can create/edit/delete their own messages (checked at runtime)
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: ['CREATE_PO', 'EDIT_PO', 'DELETE_PO', 'CREATE_CHANNEL', 'EDIT_CHANNEL', 'DELETE_CHANNEL',
    'ADD_CHANNEL_MEMBER', 'REMOVE_CHANNEL_MEMBER', 'CHANGE_USER_ROLE', 'ADD_TEAM_MEMBER'],
  SENIOR_MERCHANDISER: ['CREATE_PO', 'EDIT_PO', 'DELETE_PO', 'CREATE_CHANNEL', 'EDIT_CHANNEL', 'DELETE_CHANNEL', 'ADD_CHANNEL_MEMBER', 'REMOVE_CHANNEL_MEMBER'],
  JUNIOR_MERCHANDISER: [], // No special permissions
  SENIOR_MANAGER: ['CREATE_CHANNEL', 'EDIT_CHANNEL', 'DELETE_CHANNEL', 'ADD_CHANNEL_MEMBER', 'REMOVE_CHANNEL_MEMBER'],
  JUNIOR_MANAGER: [], // No special permissions
};

// Helper function to check permissions
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role].includes(permission);
};

// Message ownership helpers - all users can edit/delete their own messages
export const canEditMessage = (user: User, message: Message): boolean => {
  return message.user_id === user.id && !message.is_system_update;
};

export const canDeleteMessage = (user: User, message: Message): boolean => {
  return message.user_id === user.id && !message.is_system_update;
};
