export type Cycle = 'weekly' | 'monthly' | 'yearly';
export type Lifecycle = 'active' | 'paused' | 'cancelled' | 'archived';
export type ScheduleState = 'upcoming' | 'due-soon' | 'due-today' | 'past-due' | 'inactive';
export type VerificationState = 'confirmed' | 'unverified' | 'failed' | 'waived';
export interface Rule { start: string; cycle: Cycle; interval: number; anchorDay?: number; }
export interface Issue { field: string; message: string; }
export interface Subscription {
  path: string; service: string; category: string; rule?: Rule; amount?: number; currency?: string;
  autoRenew: boolean; lifecycle: Lifecycle; paymentMethodRaw?: string; paymentMethodPath?: string;
  remindBefore: number; lastPaymentDate?: string; paidThrough?: string;
  verificationOverride?: 'failed' | 'waived'; issues: Issue[];
}
export interface PaymentMethod { path: string; name: string; institution?: string; kind?: string; currency?: string; last4?: string; expiryMonth?: string; status?: string; }
