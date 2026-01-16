import { Timestamp } from 'firebase/firestore';

export type Team = {
  id: string;
  name: string;
  description?: string;
};

export type UserProfile = {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
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
  id: string;
  teamId: string;
  contactId: string;
  source: string;
  stage: string;
  priority?: 'high' | 'medium' | 'low';
};

export type Deal = {
  id: string;
  teamId: string;
  leadId: string;
  name: string;
  amount: number;
  stage: 'qualification' | 'proposal' | 'negotiation' | 'closed won' | 'closed lost';
  closeDate: Timestamp;
};

export type Activity = {
  id: string;
  teamId: string;
  type: 'call' | 'email' | 'meeting' | 'task';
  subject: string;
  description?: string;
  dueDate: Timestamp;
  contactId?: string;
  leadId?: string;
  dealId?: string;
};
