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
  currentSessionToken?: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
}

export type ExternalCapitalMedium = "ELECTRONIC" | "PHYSICAL";

export interface ExternalCapital {
  id: string;
  branchId: string;
  shiftId?: string;
  type: ExternalCapitalMedium;
  network?: NetworkType;
  sourceName: string;
  amount: number;
  tappedAmount: number;
  remainingAmount: number;
  notes?: string;
  recordedByUserId: string;
  recordedByUserName: string;
  createdAt: string;
  status: "ACTIVE" | "EXHAUSTED" | "RETURNED";
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
  openingExternalCash?: number;
  openingExternalElectronic?: number;
  injectedExternalCash?: number;
  injectedExternalElectronic?: number;
  tappedExternalCash?: number;
  tappedExternalElectronic?: number;
  expectedCash?: number;
  actualCash?: number;
  difference?: number;
  expectedFloatMtn?: number;
  actualFloatMtn?: number;
  differenceFloatMtn?: number;
  expectedFloatTelecel?: number;
  actualFloatTelecel?: number;
  differenceFloatTelecel?: number;
  expectedFloatAirtelTigo?: number;
  actualFloatAirtelTigo?: number;
  differenceFloatAirtelTigo?: number;
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
  correctedAt?: string;
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
  commission?: number;
  paymentMode?: "PHYSICAL_CASH" | "ELECTRONIC_MONEY";
  paymentNetwork?: "MTN" | "TELECEL" | "AIRTELTIGO";
  reason: string;
  dueDate: string; // YYYY-MM-DD
  recordedByUserName: string;
  status: "OUTSTANDING" | "PAID" | "CANCELLED";
  clearedAt?: string; // ISO timestamp
  clearedByUserName?: string;
  clearedPaymentMode?: "PHYSICAL_CASH" | "ELECTRONIC_MONEY";
  clearedPaymentNetwork?: "MTN" | "TELECEL" | "AIRTELTIGO";
  createdAt?: string; // ISO timestamp of when debt was recorded
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
  todayTxCount?: number;
  workingCapital?: number;
  outstandingDebts?: number;
  totalFloats?: number;
  cashBalance?: number;
  mtnFloat?: number;
  telecelFloat?: number;
  airtelTigoFloat?: number;
  mtnAirtimeFloat?: number;
  telecelAirtimeFloat?: number;
  airtelTigoAirtimeFloat?: number;
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
  totalWorkingCapital?: number;
  combinedTotalCapital?: number;
  branchNetProfits?: BranchNetProfit[];
  totalExternalCapital?: number;
  externalElectronicCapital?: number;
  externalPhysicalCapital?: number;
  tappedExternalCapital?: number;
  remainingExternalCapital?: number;
  externalCapitals?: ExternalCapital[];
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

