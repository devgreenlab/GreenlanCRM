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
  city?: string;
  companyName?: string;
  needType?: "pengujian" | "pelatihan" | "lainnya";
  stage: string;
  lastInboundAt?: Timestamp;
  lastOutboundAt?: Timestamp;
  lastMessagePreview?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  chatId: string; // The customer's whatsapp ID, e.g., 628...
  wahaSession: string; // The WAHA session of the sales owner
};

export type Deal = {
  id: string;
  leadId: string;
  ownerUid: string;
  teamId: string;
  stage: "prospek" | "negosiasi" | "deal" | "produksi" | "selesai" | "lost";
  amount: number;
  probability: number; // 0-1
  nextActionAt: Timestamp;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Activity = {
  id: string;
  leadId?: string;
  dealId?: string;
  teamId: string;
  actorUid: string; // userId who performed the action
  type: "whatsapp_in" | "whatsapp_out" | "call" | "meeting" | "proposal_sent" | "follow_up" | "presentation";
  content: string;
  meta?: Record<string, any>;
  createdAt: Timestamp;
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
    waha: {
        baseUrl: string;
        session: string; // Default session, can be overridden by user
    };
    n8n: {
        inboundWebhookUrl: string;
        outboundWebhookUrl: string;
    };
    // Public metadata about secrets, the actual secrets are stored server-side
    secrets: {
        crmWebhookSecret?: string; // This is a shared secret, ok to be here if that's the design
        wahaApiKeyLast4?: string;
        wahaApiKeyRotatedAt?: Timestamp;
    };
    flags: {
        inboundEnabled: boolean;
        outboundEnabled: boolean;
    };
    updatedAt?: Timestamp;
    updatedBy?: string; // UID
};

export type AuditLog = {
    id: string;
    action: 'SAVE_INTEGRATION_SETTINGS' | 'SET_WAHA_KEY' | 'CLEAR_WAHA_KEY' | 'TEST_WAHA_CONNECTION' | 'SEND_WA_ATTEMPT' | 'SEND_WA_SUCCESS' | 'SEND_WA_FAIL' | 'TEST_SUMOPOD_SUCCESS' | 'TEST_SUMOPOD_FAIL' | 'SET_SUMOPOD_KEY' | 'CLEAR_SUMOPOD_KEY';
    byUid: string;
    at: Timestamp;
    result: 'SUCCESS' | 'FAILURE' | 'FAIL';
    message?: string;
};
