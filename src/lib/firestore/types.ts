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
  phone: string;
  city: string;
  companyName?: string;
  needType: "pengujian" | "pelatihan" | "lainnya";
  stage: string;
  lastInboundAt: Timestamp;
  lastMessagePreview: string;
  lastOutboundAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  actorUid: string; // userId
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
    id: string;
    waha: {
        baseUrl: string;
        session: string;
    };
    n8n: {
        outboundWebhookUrl: string;
    };
    secrets: {
        crmWebhookSecret?: string;
        wahaApiKeyLast4?: string;
        wahaApiKeyRotatedAt?: Timestamp;
    };
    flags: {
        inboundEnabled: boolean;
        outboundEnabled: boolean;
    };
    updatedAt: Timestamp;
    updatedBy: string; // UID
};

export type AuditLog = {
    id: string;
    action: 'SAVE_INTEGRATION_SETTINGS' | 'SET_WAHA_KEY' | 'CLEAR_WAHA_KEY' | 'TEST_WAHA_CONNECTION' | 'SEND_WA_ATTEMPT' | 'SEND_WA_SUCCESS' | 'SEND_WA_FAIL';
    byUid: string;
    at: Timestamp;
    result: 'SUCCESS' | 'FAILURE';
    message?: string;
};
