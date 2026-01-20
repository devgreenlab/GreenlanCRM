import { Timestamp } from 'firebase/firestore';

export type Team = {
  id: string;
  name: string;
  headSalesUid?: string;
  createdAt?: Timestamp;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'HEAD_SALES' | 'SALES';
  teamId?: string | null;
  isActive: boolean;
  wahaSession?: string; // Session name for WAHA, e.g., 'sales_rika'
  waNumber?: string;    // Display number for UI
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type Contact = {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
};

export type Lead = {
  id:string;
  ownerUid: string;
  teamId: string;
  source: "whatsapp" | "web" | "manual";
  customerName: string;
  phone: string; // The customer's phone number
  stage: string;
  lastMessageAt?: Timestamp;
  lastMessagePreview?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  chatId: string; // The customer's whatsapp ID, e.g., 628...@c.us
  wahaSession: string; // The WAHA session of the sales owner
  unreadCount?: number;
};

export type Deal = {
  id: string;
  leadId: string;
  ownerUid: string;
  teamId: string;
  name: string;
  stage: "prospek" | "negosiasi" | "deal" | "produksi" | "selesai" | "lost";
  amount: number;
  closeDate: Timestamp;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type Activity = {
  id: string;
  leadId?: string;
  dealId?: string;
  teamId: string;
  actorUid: string; // userId who performed the action
  type: "whatsapp_in" | "whatsapp_out" | "call" | "meeting";
  content: string;
  meta?: Record<string, any>;
  createdAt: Timestamp;
};

export type Message = {
    id: string;
    direction: 'in' | 'out';
    text: string;
    session: string;
    timestamp: Timestamp;
    actorUid?: string; // For outbound messages
    status?: 'sent' | 'delivered' | 'read' | 'failed';
    raw?: any; // Raw payload from WAHA
};

export type RoleAccess = {
  SUPER_ADMIN: string[];
  HEAD_SALES: string[];
  SALES: string[];
};

export type NavigationSettings = {
  id: string;
  roleAccess: RoleAccess;
};

export type PipelineSettings = {
    id: string;
    leadStages: string[];
    dealStages: string[];
};

export type IntegrationSettings = {
    id?: string;
    wahaBaseUrl?: string;
    wahaAuthMode?: 'X-Api-Key' | 'Bearer';
    updatedAt?: Timestamp;
    updatedBy?: string; // UID
};

export type AuditLog = {
    id: string;
    action: 
      | 'SAVE_WAHA_CONFIG' 
      | 'SET_WAHA_KEY'
      | 'TEST_WAHA_CONNECTION';
    byUid: string;
    at: Timestamp;
    result: 'SUCCESS' | 'FAILURE';
    message?: string;
};
    