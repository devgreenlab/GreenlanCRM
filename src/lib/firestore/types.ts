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
