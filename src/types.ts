/**
 * TypeScript definitions for the Mobile Money Business Management Platform.
 */

export type UserRole = "ADMIN" | "WORKER";

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  branchId: string;
  isActive: boolean;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  branchId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime?: string;
  openingCash: number;
  openingFloatMtn: number;
  openingFloatTelecel: number;
  openingFloatAirtelTigo: number;
  expectedCash?: number;
  actualCash?: number;
  difference?: number;
  status: "OPEN" | "CLOSED";
}

export type TransactionType = "deposit" | "withdrawal" | "send_money" | "airtime";
export type NetworkType = "MTN" | "TELECEL" | "AIRTELTIGO";

export interface Transaction {
  id: string;
  shiftId: string;
  branchId: string;
  userId: string;
  userName: string;
  type: TransactionType;
  network?: NetworkType; // Not needed for general if not applicable, but used for deposit/withdrawal/airtime
  customerNumber?: string; // used for deposit/withdrawal
  senderNumber?: string; // used for send_money
  receiverNumber?: string; // used for send_money
  amount: number;
  commission: number;
  recordedAt: string; // ISO timestamp
  status: "ACTIVE" | "REVERSED" | "PENDING_APPROVAL" | "REJECTED";
  correctedBy?: string;
  correctionReason?: string;
}

export interface CommissionRule {
  id: string;
  minAmount: number;
  maxAmount: number; // e.g. 999999 for infinity
  commissionValue: number;
}

export interface Debt {
  id: string;
  branchId: string;
  customerName: string;
  customerNumber: string;
  amount: number;
  reason: string;
  dueDate: string; // YYYY-MM-DD
  recordedByUserName: string;
  status: "OUTSTANDING" | "PAID";
  clearedAt?: string; // ISO timestamp
  clearedByUserName?: string;
}

export interface FloatBalance {
  branchId: string;
  mtnFloat: number;
  telecelFloat: number;
  airtelTigoFloat: number;
  mtnAirtimeFloat: number;
  telecelAirtimeFloat: number;
  airtelTigoAirtimeFloat: number;
  lowFloatThreshold: number;
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO string
  userId: string;
  userName: string;
  action: string;
  oldValue?: string;
  newValue?: string;
}

export interface BranchNetProfit {
  branchId: string;
  branchName: string;
  location: string;
  todayProfit: number;
  cumulativeProfit: number;
  transactionCount: number;
}

export interface DashboardStats {
  todayProfit: number;
  todayTransactionsCount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalSendMoney: number;
  totalAirtime: number;
  outstandingDebts: number;
  currentCashBalance: number;
  currentMtnFloat: number;
  currentTelecelFloat: number;
  currentAirtelTigoFloat: number;
  branchNetProfits?: BranchNetProfit[];
}

export interface AuthResponse {
  token: string;
  user: User;
  branch: Branch;
}

export interface Notification {
  id: string;
  branchId: string;
  branchName: string;
  message: string;
  type: "shortage" | "info" | "warning" | "approval" | "escalation";
  timestamp: string; // ISO string
  isRead: boolean;
  shiftId?: string;
  difference?: number;
  transactionId?: string;
}

export interface ApprovalSettings {
  approvalThreshold: number;
  notificationRecipients: string[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  escalationRulesEnabled: boolean;
  escalationTimeoutMinutes: number;
  escalationRecipients: string[];
  browserPushEnabled: boolean;
  fcmEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
}

