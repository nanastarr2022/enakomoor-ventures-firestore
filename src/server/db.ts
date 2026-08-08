import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { 
  User, 
  Branch, 
  Shift, 
  Transaction, 
  CommissionRule, 
  Debt, 
  FloatBalance, 
  AuditLog,
  DashboardStats,
  TransactionType,
  NetworkType,
  Notification,
  ApprovalSettings,
  ExternalCapital,
  ExternalCapitalMedium
} from "../types";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// --- FIRESTORE PERSISTENT STORAGE ---
// Uses a service account (set as the FIREBASE_SERVICE_ACCOUNT env var, containing
// the full JSON key downloaded from Firebase Console > Project Settings > Service Accounts)
// to store the entire app state as a single document. If no service account is
// configured (e.g. local development), the app falls back to the local db.json file only.
let firestoreDoc: FirebaseFirestore.DocumentReference | null = null;

// Helper function to safely parse FIREBASE_SERVICE_ACCOUNT string with multiple fallback strategies
function parseServiceAccountJson(raw: string): any {
  let str = raw.trim();

  // Strip wrapping outer quotes if stringified twice
  if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"') && !str.includes("\n"))) {
    str = str.slice(1, -1).trim();
  }

  // Attempt 1: Direct standard JSON.parse
  try {
    return JSON.parse(str);
  } catch {
    // Continue to fallback strategies
  }

  // Attempt 2: Base64 decoding if not starting with '{'
  if (!str.startsWith("{")) {
    try {
      const decoded = Buffer.from(str, "base64").toString("utf-8").trim();
      if (decoded.startsWith("{")) {
        return JSON.parse(decoded);
      }
    } catch {
      // Continue
    }
  }

  // Attempt 3: Replace stringified escaped newlines in private key
  try {
    const withNewlines = str.replace(/\\n/g, "\n");
    return JSON.parse(withNewlines);
  } catch {
    // Continue
  }

  // Attempt 4: Convert single-quoted JSON or Python dict format ({'key': 'value'}) to double quotes
  try {
    const doubleQuoted = str
      .replace(/\\n/g, "\\n")
      .replace(/'/g, '"');
    return JSON.parse(doubleQuoted);
  } catch {
    // Continue
  }

  // Attempt 5: Regex replace key names to double quotes
  try {
    const jsonified = str.replace(/(['"])?([a-zA-Z0-9_]+)\1\s*:\s*(['"])(.*?)\3/g, '"$2":"$4"');
    return JSON.parse(jsonified);
  } catch {
    // Continue
  }

  throw new Error("Unable to parse FIREBASE_SERVICE_ACCOUNT JSON after multiple sanitization attempts");
}

function initFirestore() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || !raw.trim()) {
    console.warn("[DB] FIREBASE_SERVICE_ACCOUNT not set — falling back to local db.json persistence.");
    return;
  }
  try {
    const serviceAccount = parseServiceAccountJson(raw);
    if (serviceAccount && typeof serviceAccount === "object" && serviceAccount.private_key) {
      if (typeof serviceAccount.private_key === "string") {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
      }
    }
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    // FIRESTORE_DATABASE_ID lets you point at a specific existing Firestore database
    // (e.g. one already created under an "AI SHARED QUOTA" name) instead of "(default)",
    // which is useful on the free Spark plan where creating a brand-new database
    // requires upgrading to Blaze.
    const databaseId = process.env.FIRESTORE_DATABASE_ID;
    const firestore = databaseId
      ? getFirestore(admin.app(), databaseId)
      : admin.firestore();
    firestoreDoc = firestore.collection("enakomoorVentures").doc("state");
    console.log(`[DB] Connected to Firestore (database: ${databaseId || "(default)"}) for persistent storage.`);
  } catch (err: any) {
    console.warn(`[DB] FIREBASE_SERVICE_ACCOUNT is invalid JSON or failed to initialize (${err.message}). Falling back to local db.json.`);
    firestoreDoc = null;
  }
}

interface DBStructure {
  users: Array<User & { passwordHash: string }>;
  branches: Array<Branch>;
  shifts: Array<Shift>;
  transactions: Array<Transaction>;
  commissions: Array<CommissionRule>;
  debts: Array<Debt>;
  floats: Array<FloatBalance>;
  auditLogs: Array<AuditLog>;
  notifications?: Array<Notification>;
  approvalSettings?: ApprovalSettings;
  resetCodes?: Array<{ username: string; code: string; expiresAt: number; used: boolean }>;
  externalCapitals?: Array<ExternalCapital>;
}

// Initial seeding of data to replicate real-world environment
const INITIAL_COMMISSIONS: CommissionRule[] = [
  { id: "comm-1", minAmount: 1, maxAmount: 100, commissionValue: 1 },
  { id: "comm-2", minAmount: 101, maxAmount: 500, commissionValue: 5 },
  { id: "comm-3", minAmount: 501, maxAmount: 1000, commissionValue: 10 },
  { id: "comm-4", minAmount: 1001, maxAmount: 2000, commissionValue: 15 },
  { id: "comm-5", minAmount: 2001, maxAmount: 9999999, commissionValue: 20 }
];

const INITIAL_BRANCHES: Branch[] = [
  { id: "branch-a", name: "Accra Mall Branch", location: "Tetteh Quarshie Interchange, Accra" },
  { id: "branch-b", name: "Kumasi Kejetia Branch", location: "Kejetia Market, Kumasi" },
  { id: "branch-c", name: "Takoradi Circle Branch", location: "Market Circle, Takoradi" }
];

const INITIAL_USERS = [
  { id: "user-1", name: "Kweku Boateng (Owner)", username: "admin", role: "ADMIN" as const, branchId: "branch-a", isActive: true, passwordHash: "admin123" },
  { id: "user-2", name: "Kofi Mensah (Agent)", username: "worker1", role: "WORKER" as const, branchId: "branch-a", isActive: true, passwordHash: "worker123" },
  { id: "user-3", name: "Ama Serwaa (Agent)", username: "worker2", role: "WORKER" as const, branchId: "branch-b", isActive: true, passwordHash: "worker123" },
  { id: "user-4", name: "Kwabena Appiah (Agent)", username: "worker3", role: "WORKER" as const, branchId: "branch-c", isActive: true, passwordHash: "worker123" }
];

const INITIAL_FLOATS: FloatBalance[] = [
  { branchId: "branch-a", mtnFloat: 15200, telecelFloat: 5800, airtelTigoFloat: 3500, mtnAirtimeFloat: 5000, telecelAirtimeFloat: 2000, airtelTigoAirtimeFloat: 1500, lowFloatThreshold: 1500 },
  { branchId: "branch-b", mtnFloat: 8500, telecelFloat: 4200, airtelTigoFloat: 2100, mtnAirtimeFloat: 3000, telecelAirtimeFloat: 1500, airtelTigoAirtimeFloat: 1000, lowFloatThreshold: 1000 },
  { branchId: "branch-c", mtnFloat: 6200, telecelFloat: 3100, airtelTigoFloat: 1200, mtnAirtimeFloat: 2000, telecelAirtimeFloat: 1000, airtelTigoAirtimeFloat: 800, lowFloatThreshold: 800 }
];

// Helper to get relative ISO date offsets for historical data
const getPastDate = (daysAgo: number, timeStr: string): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.toISOString().split("T")[0]}T${timeStr}`;
};

// Generate sample historical transactions
const sampleTransactions = () => {
  const txs: Transaction[] = [];
  
  // Historical data for charts (Last 7 days)
  const branches = ["branch-a", "branch-b", "branch-c"];
  const operators = [
    { id: "user-2", name: "Kofi Mensah" },
    { id: "user-3", name: "Ama Serwaa" },
    { id: "user-4", name: "Kwabena Appiah" }
  ];

  const types: TransactionType[] = ["deposit", "withdrawal", "send_money", "airtime"];
  const networks: NetworkType[] = ["MTN", "TELECEL", "AIRTELTIGO"];

  let idCounter = 1;

  for (let d = 7; d >= 0; d--) {
    const isToday = d === 0;
    const count = isToday ? 5 : 8 + Math.floor(Math.random() * 5); // Fewer transactions today for active operations
    const dateStr = getPastDate(d, "00:00:00").split("T")[0];

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const network = networks[Math.floor(Math.random() * networks.length)];
      const amount = [50, 100, 250, 450, 800, 1200, 2500][Math.floor(Math.random() * 7)];
      const branchIdx = Math.floor(Math.random() * branches.length);
      const branchId = branches[branchIdx];
      const op = operators[branchIdx] || operators[0];
      
      let commission = 0;
      if (type === "withdrawal" || type === "send_money") {
        if (amount <= 100) commission = 1;
        else if (amount <= 500) commission = 5;
        else if (amount <= 1000) commission = 10;
        else if (amount <= 2000) commission = 15;
        else commission = 20;
      }

      // Record transaction
      txs.push({
        id: `tx-sample-${idCounter++}`,
        shiftId: `shift-sample-${idCounter % 5}`,
        branchId,
        userId: op.id,
        userName: op.name,
        type,
        network: type !== "send_money" ? network : undefined,
        customerNumber: type !== "send_money" ? `024${Math.floor(1000000 + Math.random() * 8999999)}` : undefined,
        senderNumber: type === "send_money" ? `024${Math.floor(1000000 + Math.random() * 8999999)}` : undefined,
        receiverNumber: type === "send_money" ? `050${Math.floor(1000000 + Math.random() * 8999999)}` : undefined,
        amount,
        commission,
        recordedAt: getPastDate(d, `${10 + (i % 8)}:${12 * (i % 5)}:00`),
        status: "ACTIVE"
      });
    }
  }
  return txs;
};

// Generate initial sample Debts
const defaultDebts = (): Debt[] => {
  return [
    {
      id: "debt-1",
      branchId: "branch-a",
      customerName: "Immanuel Quaye",
      customerNumber: "0244192837",
      amount: 450,
      reason: "Emergency money withdrawal for transport, promised next Monday",
      dueDate: getPastDate(-3, "17:00:00").split("T")[0],
      recordedByUserName: "Kofi Mensah (Agent)",
      status: "OUTSTANDING"
    },
    {
      id: "debt-2",
      branchId: "branch-b",
      customerName: "Naa Borley",
      customerNumber: "0209938475",
      amount: 150,
      reason: "Airtime purchase debt",
      dueDate: getPastDate(2, "12:00:00").split("T")[0],
      recordedByUserName: "Ama Serwaa (Agent)",
      status: "PAID",
      clearedAt: getPastDate(1, "14:22:00"),
      clearedByUserName: "Kweku Boateng (Owner)"
    },
    {
      id: "debt-3",
      branchId: "branch-a",
      customerName: "Ebenezer Ocloo",
      customerNumber: "0556102938",
      amount: 1200,
      reason: "Cash deposit shortage - promised payment at bank tomorrow",
      dueDate: getPastDate(-1, "18:00:00").split("T")[0],
      recordedByUserName: "Kofi Mensah (Agent)",
      status: "OUTSTANDING"
    }
  ];
};

const defaultAuditLogs = (): AuditLog[] => {
  return [
    {
      id: "log-1",
      timestamp: getPastDate(2, "08:15:22"),
      userId: "user-1",
      userName: "Kweku Boateng (Owner)",
      action: "User Login",
      newValue: "Admin user session started"
    },
    {
      id: "log-2",
      timestamp: getPastDate(2, "18:30:10"),
      userId: "user-1",
      userName: "Kweku Boateng (Owner)",
      action: "Commission Updated",
      oldValue: "Standard legacy commissions",
      newValue: "Automatic tiered commission rules from 1 GHS up to 20 GHS set"
    }
  ];
};

class JSONDatabase {
  private data!: DBStructure;
  public ready: Promise<void>;

  constructor() {
    initFirestore();
    this.ready = this.init();
  }

  private async init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    // 1. Try Firestore first (this is the persistent source of truth on Render)
    if (firestoreDoc) {
      try {
        const snap = await firestoreDoc.get();
        if (snap.exists) {
          this.data = snap.data() as DBStructure;
          this.ensureDefaults();
          console.log("[DB] Loaded state from Firestore.");
          return;
        }
      } catch (err: any) {
        console.warn(`[DB] Firestore database unavailable (${err?.message || err}). Disabling Firestore sync and falling back to local file.`);
        firestoreDoc = null;
      }
    }

    // 2. Fall back to local db.json (local dev, or first-ever boot before Firestore has data)
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(raw);
        this.ensureDefaults();
      } catch (err) {
        console.error("Failed to parse db.json, creating a new seed database...", err);
        this.seedDB();
      }
    } else {
      this.seedDB();
    }

    // If Firestore is configured but had no document yet, push our starting data to it now
    if (firestoreDoc) {
      this.save();
    }
  }

  private ensureDefaults() {
    if (!this.data.branches || this.data.branches.length === 0) {
      this.data.branches = INITIAL_BRANCHES;
    }
    if (!this.data.users || this.data.users.length === 0) {
      this.data.users = INITIAL_USERS;
    }
    if (!this.data.commissions || this.data.commissions.length === 0) {
      this.data.commissions = INITIAL_COMMISSIONS;
    }
    if (!this.data.floats || this.data.floats.length === 0) {
      this.data.floats = INITIAL_FLOATS;
    }
    if (!this.data.notifications) {
      this.data.notifications = [];
    }
    if (!this.data.externalCapitals) {
      this.data.externalCapitals = [
        {
          id: "ext-cap-1",
          branchId: "branch-a",
          type: "ELECTRONIC",
          network: "MTN",
          sourceName: "External Admin - Chief Investor",
          amount: 5000,
          tappedAmount: 1200,
          remainingAmount: 3800,
          notes: "Emergency electronic float injected to prevent wallet dry-outs during peak hours",
          recordedByUserId: "user-1",
          recordedByUserName: "Kweku Boateng (Owner)",
          createdAt: new Date().toISOString(),
          status: "ACTIVE"
        },
        {
          id: "ext-cap-2",
          branchId: "branch-a",
          type: "PHYSICAL",
          sourceName: "External Admin - Kwesi Vault",
          amount: 3000,
          tappedAmount: 500,
          remainingAmount: 2500,
          notes: "Solicited physical cash injection for drawer reserves",
          recordedByUserId: "user-1",
          recordedByUserName: "Kweku Boateng (Owner)",
          createdAt: new Date().toISOString(),
          status: "ACTIVE"
        }
      ];
    }
    if (!this.data.approvalSettings) {
      this.data.approvalSettings = {
        approvalThreshold: 5000,
        notificationRecipients: ["enakomoorventures@gmail.com"],
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "06:00",
        escalationRulesEnabled: true,
        escalationTimeoutMinutes: 15,
        escalationRecipients: ["backup-admin@enakomoorventures.com"],
        browserPushEnabled: true,
        fcmEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        whatsappEnabled: false
      };
      this.save();
    }
  }

  private seedDB() {
    this.data = {
      users: INITIAL_USERS,
      branches: INITIAL_BRANCHES,
      shifts: [],
      transactions: [],
      commissions: INITIAL_COMMISSIONS,
      debts: [],
      floats: INITIAL_BRANCHES.map(b => ({
        branchId: b.id,
        mtnFloat: 0,
        telecelFloat: 0,
        airtelTigoFloat: 0,
        mtnAirtimeFloat: 0,
        telecelAirtimeFloat: 0,
        airtelTigoAirtimeFloat: 0,
        lowFloatThreshold: 1000
      })),
      auditLogs: [],
      notifications: [],
      externalCapitals: [
        {
          id: "ext-cap-1",
          branchId: "branch-a",
          type: "ELECTRONIC",
          network: "MTN",
          sourceName: "External Admin - Chief Investor",
          amount: 5000,
          tappedAmount: 1200,
          remainingAmount: 3800,
          notes: "Emergency electronic float injected to prevent wallet dry-outs during peak hours",
          recordedByUserId: "user-1",
          recordedByUserName: "Kweku Boateng (Owner)",
          createdAt: new Date().toISOString(),
          status: "ACTIVE"
        },
        {
          id: "ext-cap-2",
          branchId: "branch-a",
          type: "PHYSICAL",
          sourceName: "External Admin - Kwesi Vault",
          amount: 3000,
          tappedAmount: 500,
          remainingAmount: 2500,
          notes: "Solicited physical cash injection for drawer reserves",
          recordedByUserId: "user-1",
          recordedByUserName: "Kweku Boateng (Owner)",
          createdAt: new Date().toISOString(),
          status: "ACTIVE"
        }
      ],
      approvalSettings: {
        approvalThreshold: 5000,
        notificationRecipients: ["enakomoorventures@gmail.com"],
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "06:00",
        escalationRulesEnabled: true,
        escalationTimeoutMinutes: 15,
        escalationRecipients: ["backup-admin@enakomoorventures.com"],
        browserPushEnabled: true,
        fcmEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        whatsappEnabled: false
      }
    };
    this.save();
  }

  resetToFreshStart(adminId: string, adminName: string) {
    this.data.shifts = [];
    this.data.transactions = [];
    this.data.debts = [];
    this.data.externalCapitals = [];
    this.data.floats = this.data.branches.map(b => ({
      branchId: b.id,
      mtnFloat: 0,
      telecelFloat: 0,
      airtelTigoFloat: 0,
      mtnAirtimeFloat: 0,
      telecelAirtimeFloat: 0,
      airtelTigoAirtimeFloat: 0,
      lowFloatThreshold: 1000
    }));
    this.data.auditLogs = [];
    this.data.notifications = [];

    this.logAction(adminId, adminName, "System Reset", "All historical records", "Reset all figures, shifts, transactions, debts, and floats to 0 for a fresh start.");
    this.save();
  }

  private cleanOldPaidDebts() {
    const now = Date.now();
    const originalLength = this.data.debts ? this.data.debts.length : 0;
    if (!this.data.debts) return;
    
    this.data.debts = this.data.debts.filter(d => {
      if (d.status === "PAID" && d.clearedAt) {
        const clearedTime = new Date(d.clearedAt).getTime();
        // 24 hours = 24 * 60 * 60 * 1000 = 86400000 ms
        if (now - clearedTime > 24 * 60 * 60 * 1000) {
          return false;
        }
      }
      return true;
    });

    if (this.data.debts.length !== originalLength) {
      this.save();
    }
  }

  private save() {
    // Local file: best-effort cache (works for local dev; ephemeral on Render, so not relied upon there)
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("Error saving to db.json:", err);
    }

    // Firestore: the real persistent store on Render
    if (firestoreDoc) {
      const snapshot = JSON.parse(JSON.stringify(this.data));
      firestoreDoc.set(snapshot).catch((err: any) => {
        console.warn(`[DB] Error saving to Firestore (${err?.message || err}). Disabling Firestore sync.`);
        firestoreDoc = null;
      });
    }
  }

  // --- LOGGING ENGINE ---
  logAction(userId: string, userName: string, action: string, oldValue?: string, newValue?: string) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      oldValue,
      newValue
    };
    this.data.auditLogs.unshift(log);
    // Keep reasonable size
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  // --- USER CONTROLS ---
  getUsers() {
    return this.data.users.map(({ passwordHash, ...safeUser }) => safeUser);
  }

  authenticate(username: string, passwordHash: string, selectedBranchId?: string) {
    const user = this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === passwordHash);
    if (!user) return null;
    if (!user.isActive) return null;
    
    // Choose selected branch, or fall back to user's branch
    const activeBranchId = selectedBranchId || user.branchId;
    const branch = this.data.branches.find(b => b.id === activeBranchId) || this.data.branches[0] || { id: "all", name: "System Base", location: "Global Headquarters" };
    
    this.logAction(user.id, user.name, "User Login", undefined, `Logged into ${branch.name}`);
    
    const { passwordHash: _, ...safeUser } = user;
    // Generate a new session token, invalidating any other active session for this user (workers only)
    const sessionToken = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    user.currentSessionToken = sessionToken;
    
    // Override default user branchId for this session's context
        const sessionUser = {
      ...safeUser,
      branchId: branch.id
    };

    return { user: sessionUser, branch, sessionToken };
  }
    validateSession(userId: string, sessionToken: string): boolean {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return false;
    if (user.role === "ADMIN") return true; // Admins can use multiple devices
    return user.currentSessionToken === sessionToken;
  }
  requestPasswordReset(username: string): { user: Omit<User, "passwordHash">; code: string } {
    const user = this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      throw new Error("No account found with that username");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    if (!this.data.resetCodes) {
      this.data.resetCodes = [];
    }

    // Clear any previous unused codes for this user
    this.data.resetCodes = this.data.resetCodes.filter(
      r => r.username.toLowerCase() !== username.toLowerCase()
    );

    this.data.resetCodes.push({ username: user.username, code, expiresAt, used: false });

    this.logAction(
      user.id,
      user.name,
      "Password Reset Requested",
      undefined,
      `Reset code generated for ${user.role} account: ${user.username}`
    );
    this.save();

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, code };
  }

  resetPassword(username: string, code: string, newPasswordHash: string): { success: boolean } {
    if (!this.data.resetCodes) {
      this.data.resetCodes = [];
    }

    const entry = this.data.resetCodes.find(
      r => r.username.toLowerCase() === username.toLowerCase() && r.code === code && !r.used
    );

    if (!entry) {
      throw new Error("Invalid or already-used reset code");
    }

    if (Date.now() > entry.expiresAt) {
      throw new Error("This reset code has expired. Please request a new one.");
    }

    const user = this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      throw new Error("User not found");
    }

    user.passwordHash = newPasswordHash;
    entry.used = true;

    this.logAction(
      user.id,
      user.name,
      "Password Reset Completed",
      "Password changed via reset code",
      `${user.role} account ${user.username} password was reset`
    );
    this.save();

    return { success: true };
  }

  createUser(adminId: string, adminName: string, name: string, username: string, passwordHash: string, role: "ADMIN" | "WORKER", branchId: string) {

    const exists = this.data.users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) throw new Error("Username already exists");
    
    const newUser = {
      id: `user-${Date.now()}`,
      name,
      username,
      role,
      branchId,
      isActive: true,
      passwordHash
    };
    
    this.data.users.push(newUser);
    this.logAction(adminId, adminName, "User Created", undefined, `Created user: ${name} (${role}) for branch ${branchId}`);
    this.save();
    
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  // --- BRANCH CONTROLS ---
  getBranches() {
    return this.data.branches;
  }

  createBranch(adminId: string, adminName: string, name: string, location: string) {
    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name,
      location
    };
    
    this.data.branches.push(newBranch);
    
    // Initialize float variables for this branch
    this.data.floats.push({
      branchId: newBranch.id,
      mtnFloat: 5000,
      telecelFloat: 2000,
      airtelTigoFloat: 1000,
      mtnAirtimeFloat: 1000,
      telecelAirtimeFloat: 500,
      airtelTigoAirtimeFloat: 500,
      lowFloatThreshold: 1000
    });
    
    this.logAction(adminId, adminName, "Branch Created", undefined, `Created branch: ${name} at ${location}`);
    this.save();
    return newBranch;
  }

  updateBranch(adminId: string, adminName: string, id: string, name: string, location: string) {
    const branch = this.data.branches.find(b => b.id === id);
    if (!branch) throw new Error("Branch not found");
    const oldVal = `${branch.name} at ${branch.location}`;
    branch.name = name;
    branch.location = location;
    
    this.logAction(adminId, adminName, "Branch Updated", oldVal, `${name} at ${location}`);
    this.save();
    return branch;
  }

  deleteBranch(adminId: string, adminName: string, id: string) {
    const idx = this.data.branches.findIndex(b => b.id === id);
    if (idx === -1) throw new Error("Branch not found");
    const branch = this.data.branches[idx];
    
    // Cascading delete
    this.data.branches.splice(idx, 1);
    this.data.floats = this.data.floats.filter(f => f.branchId !== id);
    this.data.users = this.data.users.filter(u => u.branchId !== id || u.role === "ADMIN");
    this.data.users.forEach(u => {
      if (u.role === "ADMIN" && u.branchId === id) {
        u.branchId = this.data.branches[0]?.id || "all";
      }
    });
    this.data.shifts = this.data.shifts.filter(s => s.branchId !== id);
    this.data.transactions = this.data.transactions.filter(t => t.branchId !== id);
    this.data.debts = this.data.debts.filter(d => d.branchId !== id);
    if (this.data.notifications) {
      this.data.notifications = this.data.notifications.filter(n => n.branchId !== id);
    }
    
    this.logAction(adminId, adminName, "Branch Deleted", `${branch.name} at ${branch.location}`, `Deleted branch: ${branch.name}`);
    this.save();
    return { success: true, deletedId: id };
  }

  // --- FLOAT CONTROLS ---
  getFloats() {
    return this.data.floats;
  }

  getFloatByBranch(branchId: string): FloatBalance {
    let fl = this.data.floats.find(f => f.branchId === branchId);
    if (!fl) {
      fl = {
        branchId,
        mtnFloat: 5000,
        telecelFloat: 2000,
        airtelTigoFloat: 1000,
        mtnAirtimeFloat: 1000,
        telecelAirtimeFloat: 500,
        airtelTigoAirtimeFloat: 500,
        lowFloatThreshold: 1000
      };
      this.data.floats.push(fl);
      this.save();
    }
    // Safeguard for existing setups that don't have these properties
    if (fl.mtnAirtimeFloat === undefined) fl.mtnAirtimeFloat = 1000;
    if (fl.telecelAirtimeFloat === undefined) fl.telecelAirtimeFloat = 500;
    if (fl.airtelTigoAirtimeFloat === undefined) fl.airtelTigoAirtimeFloat = 500;
    return fl;
  }

  updateFloatThreshold(adminId: string, adminName: string, branchId: string, threshold: number) {
    const fl = this.getFloatByBranch(branchId);
    const old = fl.lowFloatThreshold;
    fl.lowFloatThreshold = threshold;
    this.logAction(adminId, adminName, "Float Threshold Updated", `Old: GHS ${old}`, `New: GHS ${threshold} for branch ${branchId}`);
    this.save();
    return fl;
  }

  checkFloatThresholds(branchId: string) {
    const fl = this.getFloatByBranch(branchId);
    const branch = this.data.branches.find(b => b.id === branchId);
    const branchName = branch ? branch.name : branchId;

    if (!this.data.notifications) {
      this.data.notifications = [];
    }

    const thresholds = [
      { name: "MTN", balance: fl.mtnFloat, limit: 2000 },
      { name: "TELECEL", balance: fl.telecelFloat, limit: 1000 },
      { name: "AIRTELTIGO", balance: fl.airtelTigoFloat, limit: 500 }
    ];

    thresholds.forEach(t => {
      if (t.balance < t.limit) {
        // To avoid spam, check if we already have an unread warning of this type for this branch & network
        const queryStr = `Alarm - Low Float: ${t.name} Float at ${branchName}`;
        const alreadyNotified = this.data.notifications!.some(
          n => n.branchId === branchId && 
               n.type === "warning" && 
               !n.isRead && 
               n.message.includes(queryStr)
        );

        if (!alreadyNotified) {
          const newNotification: Notification = {
            id: `noti-low-float-${t.name}-${branchId}-${Date.now()}`,
            branchId,
            branchName,
            message: `🚨 Alarm - Low Float: ${t.name} Float at ${branchName} is GHS ${t.balance.toLocaleString()} (below critical safety threshold GHS ${t.limit.toLocaleString()}!). Please refill immediately.`,
            type: "warning",
            timestamp: new Date().toISOString(),
            isRead: false
          };
          this.data.notifications!.unshift(newNotification);
          
          this.logAction(
            "system",
            "System Monitor",
            "Low Float Alarm Triggered",
            `${t.name} float limit is ${t.limit}`,
            `Current balance: GHS ${t.balance} at ${branchName}`
          );
        }
      }
    });
  }

  adjustFloatManually(adminId: string, adminName: string, branchId: string, mtn: number, telecel: number, airtel: number) {
    const fl = this.getFloatByBranch(branchId);
    const oldVals = `MTN: ${fl.mtnFloat}, TEL: ${fl.telecelFloat}, ART: ${fl.airtelTigoFloat}`;
    fl.mtnFloat = mtn;
    fl.telecelFloat = telecel;
    fl.airtelTigoFloat = airtel;
    
    this.logAction(
      adminId, 
      adminName, 
      "Float Adjusted Manually", 
      oldVals, 
      `MTN: ${fl.mtnFloat}, TEL: ${fl.telecelFloat}, ART: ${fl.airtelTigoFloat}`
    );
    this.checkFloatThresholds(branchId);
    this.save();
    return fl;
  }

  adjustAirtimeFloatManually(adminId: string, adminName: string, branchId: string, mtn: number, telecel: number, airtel: number) {
    const fl = this.getFloatByBranch(branchId);
    const oldVals = `MTN Airtime: ${fl.mtnAirtimeFloat}, TEL Airtime: ${fl.telecelAirtimeFloat}, ART Airtime: ${fl.airtelTigoAirtimeFloat}`;
    fl.mtnAirtimeFloat = mtn;
    fl.telecelAirtimeFloat = telecel;
    fl.airtelTigoAirtimeFloat = airtel;
    
    this.logAction(
      adminId, 
      adminName, 
      "Airtime Float Adjusted Manually", 
      oldVals, 
      `MTN Airtime: ${fl.mtnAirtimeFloat}, TEL Airtime: ${fl.telecelAirtimeFloat}, ART Airtime: ${fl.airtelTigoAirtimeFloat}`
    );
    this.save();
    return fl;
  }

  // --- APPROVAL AND NOTIFICATION SETTINGS ---
  getApprovalSettings(): ApprovalSettings {
    if (!this.data.approvalSettings) {
      this.data.approvalSettings = {
        approvalThreshold: 5000,
        notificationRecipients: ["enakomoorventures@gmail.com"],
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "06:00",
        escalationRulesEnabled: true,
        escalationTimeoutMinutes: 15,
        escalationRecipients: ["backup-admin@enakomoorventures.com"],
        browserPushEnabled: true,
        fcmEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        whatsappEnabled: false
      };
      this.save();
    }
    return this.data.approvalSettings;
  }

  updateApprovalSettings(adminId: string, adminName: string, settings: Partial<ApprovalSettings>): ApprovalSettings {
    const current = this.getApprovalSettings();
    const updated = { ...current, ...settings };
    this.data.approvalSettings = updated;
    this.logAction(
      adminId,
      adminName,
      "Approval Settings Updated",
      JSON.stringify(current),
      JSON.stringify(updated)
    );
    this.save();
    return updated;
  }

  // --- COMMISSION ENGINE ---
  getCommissions() {
    return this.data.commissions;
  }

  updateCommissionRules(adminId: string, adminName: string, rules: CommissionRule[]) {
    const oldRulesStr = JSON.stringify(this.data.commissions);
    this.data.commissions = rules.map((r, index) => ({
      ...r,
      id: r.id || `comm-${Date.now()}-${index}`
    }));
    this.logAction(adminId, adminName, "Commission Rules Configured", oldRulesStr, JSON.stringify(this.data.commissions));
    this.save();
    return this.data.commissions;
  }

  calculateCommission(amount: number): number {
    const rule = this.data.commissions.find(r => amount >= r.minAmount && amount <= r.maxAmount);
    return rule ? rule.commissionValue : 0;
  }

  // --- SHIFTS ---
  getActiveShift(userId: string): Shift | null {
    const openShift = this.data.shifts.find(s => s.userId === userId && s.status === "OPEN");
    return openShift || null;
  }

  openShift(userId: string, userName: string, branchId: string, openingCash: number, mtnFloat: number, telecelFloat: number, airtelTigoFloat: number): Shift {
    const active = this.getActiveShift(userId);
    if (active) {
      throw new Error("You already have an open shift. Please close it first.");
    }

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const timeStr = today.toTimeString().split(" ")[0];

    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      userId,
      userName,
      branchId,
      date: dateStr,
      startTime: timeStr,
      openingCash,
      openingFloatMtn: mtnFloat,
      openingFloatTelecel: telecelFloat,
      openingFloatAirtelTigo: airtelTigoFloat,
      status: "OPEN"
    };

    // Override branch floats to align with opening float entered by operator (sync step)
    const fl = this.getFloatByBranch(branchId);
    fl.mtnFloat = mtnFloat;
    fl.telecelFloat = telecelFloat;
    fl.airtelTigoFloat = airtelTigoFloat;

    this.data.shifts.push(newShift);
    this.logAction(userId, userName, "Shift Opened", undefined, `Opened shift at ${newShift.startTime} with cash. GHS ${openingCash}, MTN float GHS ${mtnFloat}`);
    this.checkFloatThresholds(branchId);
    this.save();
    return newShift;
  }

  // --- EXTERNAL CAPITAL MANAGEMENT ---
  getExternalCapitals(branchId?: string): ExternalCapital[] {
    if (!this.data.externalCapitals) this.data.externalCapitals = [];
    let list = this.data.externalCapitals;
    if (branchId && branchId !== "all") {
      list = list.filter(e => e.branchId === branchId || e.branchId === "all");
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createExternalCapital(
    userId: string,
    userName: string,
    params: {
      branchId: string;
      type: ExternalCapitalMedium;
      network?: NetworkType;
      sourceName: string;
      amount: number;
      notes?: string;
      shiftId?: string;
      directInject?: boolean;
    }
  ): ExternalCapital {
    const { branchId, type, network, sourceName, amount, notes, shiftId, directInject = true } = params;

    if (amount <= 0) {
      throw new Error("External capital amount must be greater than zero GHS");
    }
    if (!sourceName || !sourceName.trim()) {
      throw new Error("Source/Admin name soliciting the external capital is required");
    }

    if (!this.data.externalCapitals) this.data.externalCapitals = [];

    const newCap: ExternalCapital = {
      id: `ext-cap-${Date.now()}`,
      branchId: branchId || "branch-a",
      shiftId,
      type,
      network: type === "ELECTRONIC" ? network : undefined,
      sourceName: sourceName.trim(),
      amount: Number(amount),
      tappedAmount: 0,
      remainingAmount: Number(amount),
      notes: notes?.trim(),
      recordedByUserId: userId,
      recordedByUserName: userName,
      createdAt: new Date().toISOString(),
      status: "ACTIVE"
    };

    this.data.externalCapitals.unshift(newCap);

    if (directInject) {
      if (type === "ELECTRONIC" && network) {
        const fl = this.getFloatByBranch(branchId);
        if (network === "MTN") fl.mtnFloat = Number((fl.mtnFloat + amount).toFixed(2));
        else if (network === "TELECEL") fl.telecelFloat = Number((fl.telecelFloat + amount).toFixed(2));
        else if (network === "AIRTELTIGO") fl.airtelTigoFloat = Number((fl.airtelTigoFloat + amount).toFixed(2));
        
        newCap.tappedAmount = Number(amount);
        newCap.remainingAmount = 0;
        newCap.status = "EXHAUSTED";
      }

      if (shiftId) {
        const shift = this.data.shifts.find(s => s.id === shiftId);
        if (shift) {
          if (type === "ELECTRONIC") {
            shift.injectedExternalElectronic = Number(((shift.injectedExternalElectronic || 0) + amount).toFixed(2));
          } else {
            shift.injectedExternalCash = Number(((shift.injectedExternalCash || 0) + amount).toFixed(2));
          }
        }
      }
    }

    this.logAction(
      userId,
      userName,
      "External Capital Injected",
      undefined,
      `Injected GHS ${amount} (${type}${network ? ' - ' + network : ''}) solicited from '${sourceName}'. Notes: ${notes || 'N/A'}`
    );

    this.save();
    return newCap;
  }

  tapExternalCapital(
    adminId: string,
    adminName: string,
    id: string,
    tapAmount: number,
    reason?: string
  ): ExternalCapital {
    if (!this.data.externalCapitals) this.data.externalCapitals = [];
    const index = this.data.externalCapitals.findIndex(e => e.id === id);
    if (index === -1) throw new Error("External capital record not found");

    const record = this.data.externalCapitals[index];
    if (record.remainingAmount < tapAmount) {
      throw new Error(`Cannot tap GHS ${tapAmount}: only GHS ${record.remainingAmount} remaining in reserve`);
    }

    record.tappedAmount = Number((record.tappedAmount + tapAmount).toFixed(2));
    record.remainingAmount = Number((record.remainingAmount - tapAmount).toFixed(2));
    if (record.remainingAmount <= 0) record.status = "EXHAUSTED";

    if (record.type === "ELECTRONIC" && record.network) {
      const fl = this.getFloatByBranch(record.branchId);
      if (record.network === "MTN") fl.mtnFloat = Number((fl.mtnFloat + tapAmount).toFixed(2));
      else if (record.network === "TELECEL") fl.telecelFloat = Number((fl.telecelFloat + tapAmount).toFixed(2));
      else if (record.network === "AIRTELTIGO") fl.airtelTigoFloat = Number((fl.airtelTigoFloat + tapAmount).toFixed(2));
    }

    this.logAction(
      adminId,
      adminName,
      "External Capital Tapped Manually",
      `GHS ${tapAmount} tapped`,
      `Source: ${record.sourceName} | Reason: ${reason || 'Manual Tap'} | Remaining: GHS ${record.remainingAmount}`
    );

    this.save();
    return record;
  }

  returnExternalCapital(
    adminId: string,
    adminName: string,
    id: string
  ): ExternalCapital {
    if (!this.data.externalCapitals) this.data.externalCapitals = [];
    const index = this.data.externalCapitals.findIndex(e => e.id === id);
    if (index === -1) throw new Error("External capital record not found");

    const record = this.data.externalCapitals[index];
    record.status = "RETURNED";
    record.remainingAmount = 0;

    this.logAction(
      adminId,
      adminName,
      "External Capital Returned",
      `ID: ${id}`,
      `Marked external capital from '${record.sourceName}' as returned / settled.`
    );

    this.save();
    return record;
  }

  tapExternalCapitalIfNeeded(
    branchId: string, 
    medium: ExternalCapitalMedium, 
    shortfallAmount: number, 
    network?: NetworkType, 
    userId?: string, 
    userName?: string, 
    txType?: string,
    shiftId?: string
  ): number {
    if (shortfallAmount <= 0) return 0;
    if (!this.data.externalCapitals) this.data.externalCapitals = [];

    const eligible = this.data.externalCapitals.filter(e => 
      e.status === "ACTIVE" && 
      e.remainingAmount > 0 && 
      (e.branchId === branchId || e.branchId === "all") &&
      e.type === medium &&
      (!network || !e.network || e.network === network)
    );

    let remainingShortfall = shortfallAmount;
    let totalTapped = 0;

    for (const record of eligible) {
      if (remainingShortfall <= 0) break;

      const tapAmount = Math.min(record.remainingAmount, remainingShortfall);
      record.tappedAmount = Number((record.tappedAmount + tapAmount).toFixed(2));
      record.remainingAmount = Number((record.remainingAmount - tapAmount).toFixed(2));
      if (record.remainingAmount <= 0) {
        record.status = "EXHAUSTED";
      }

      remainingShortfall = Number((remainingShortfall - tapAmount).toFixed(2));
      totalTapped = Number((totalTapped + tapAmount).toFixed(2));

      if (medium === "ELECTRONIC" && network) {
        const fl = this.getFloatByBranch(branchId);
        if (network === "MTN") fl.mtnFloat = Number((fl.mtnFloat + tapAmount).toFixed(2));
        else if (network === "TELECEL") fl.telecelFloat = Number((fl.telecelFloat + tapAmount).toFixed(2));
        else if (network === "AIRTELTIGO") fl.airtelTigoFloat = Number((fl.airtelTigoFloat + tapAmount).toFixed(2));
      }

      if (shiftId) {
        const shift = this.data.shifts.find(s => s.id === shiftId);
        if (shift) {
          if (medium === "ELECTRONIC") {
            shift.tappedExternalElectronic = Number(((shift.tappedExternalElectronic || 0) + tapAmount).toFixed(2));
          } else {
            shift.tappedExternalCash = Number(((shift.tappedExternalCash || 0) + tapAmount).toFixed(2));
          }
        }
      }

      this.logAction(
        userId || "system",
        userName || "System Auto-Tap",
        "⚡ External Capital Tapped",
        `Shortfall: GHS ${shortfallAmount} (${medium}${network ? ' - ' + network : ''})`,
        `Tapped GHS ${tapAmount} from '${record.sourceName}' for ${txType || 'Transaction'}. Remaining reserve: GHS ${record.remainingAmount}`
      );
    }

    if (totalTapped > 0) {
      this.save();
    }

    return totalTapped;
  }

  computeActiveShiftExpectedCash(shiftId: string, userName: string): number {
    const shift = this.data.shifts.find(s => s.id === shiftId);
    if (!shift) return 0;

    const shiftTransactions = this.data.transactions.filter(t => t.shiftId === shiftId && t.status === "ACTIVE");

    let depositsSum = 0;
    let withdrawalsSum = 0;
    let commissionsSum = 0;

    shiftTransactions.forEach(t => {
      if (t.type === "deposit") {
        depositsSum += t.amount;
        commissionsSum += (t.commission || 0);
      } else if (t.type === "withdrawal") {
        withdrawalsSum += t.amount;
        commissionsSum += (t.commission || 0);
      } else if (t.type === "send_money") {
        depositsSum += t.amount;
        commissionsSum += (t.commission || 0);
      } else if (t.type === "airtime") {
        depositsSum += t.amount;
        commissionsSum += (t.commission || 0);
      }
    });

    const shiftDebtsIssued = this.data.debts.filter(
      d => d.recordedByUserName.includes(userName) && d.branchId === shift.branchId && d.status === "OUTSTANDING" && !d.clearedAt
    );
    const debtsIssuedSum = shiftDebtsIssued.reduce((sum, d) => sum + d.amount, 0);

    // Physical Cash External Capital Injected or Tapped into shift
    const externalCashAdded = (shift.injectedExternalCash || 0) + (shift.tappedExternalCash || 0);

    const expectedCash = shift.openingCash + depositsSum + commissionsSum + externalCashAdded - withdrawalsSum - debtsIssuedSum;
    return Number(expectedCash.toFixed(2));
  }

  closeShift(
    userId: string, 
    userName: string, 
    shiftId: string, 
    actualCashCounted: number,
    actualFloatMtn: number = 0,
    actualFloatTelecel: number = 0,
    actualFloatAirtelTigo: number = 0
  ): Shift {
    const shiftIndex = this.data.shifts.findIndex(s => s.id === shiftId && s.userId === userId && s.status === "OPEN");
    if (shiftIndex === -1) {
      throw new Error("Active shift not found or already closed");
    }

    const shift = this.data.shifts[shiftIndex];

    // Compute Expected Cash:
    const expectedCash = this.computeActiveShiftExpectedCash(shiftId, userName);
    const differenceCash = Number((actualCashCounted - expectedCash).toFixed(2));

    // Get expected float balances for the branch
    const currentFloat = this.data.floats.find(f => f.branchId === shift.branchId);
    const expectedFloatMtn = currentFloat ? currentFloat.mtnFloat : shift.openingFloatMtn;
    const expectedFloatTelecel = currentFloat ? currentFloat.telecelFloat : shift.openingFloatTelecel;
    const expectedFloatAirtelTigo = currentFloat ? currentFloat.airtelTigoFloat : shift.openingFloatAirtelTigo;

    const differenceFloatMtn = Number((actualFloatMtn - expectedFloatMtn).toFixed(2));
    const differenceFloatTelecel = Number((actualFloatTelecel - expectedFloatTelecel).toFixed(2));
    const differenceFloatAirtelTigo = Number((actualFloatAirtelTigo - expectedFloatAirtelTigo).toFixed(2));

    shift.expectedCash = expectedCash;
    shift.actualCash = actualCashCounted;
    shift.difference = differenceCash;

    shift.expectedFloatMtn = expectedFloatMtn;
    shift.actualFloatMtn = actualFloatMtn;
    shift.differenceFloatMtn = differenceFloatMtn;

    shift.expectedFloatTelecel = expectedFloatTelecel;
    shift.actualFloatTelecel = actualFloatTelecel;
    shift.differenceFloatTelecel = differenceFloatTelecel;

    shift.expectedFloatAirtelTigo = expectedFloatAirtelTigo;
    shift.actualFloatAirtelTigo = actualFloatAirtelTigo;
    shift.differenceFloatAirtelTigo = differenceFloatAirtelTigo;

    shift.status = "CLOSED";
    shift.endTime = new Date().toTimeString().split(" ")[0];

    // Compare all figures and raise alarm notifications to Admin if any discrepancies exist
    const mismatches: string[] = [];
    if (differenceCash !== 0) {
      mismatches.push(`Physical Cash: Expected GHS ${expectedCash.toLocaleString()}, Entered GHS ${actualCashCounted.toLocaleString()} (Variance: GHS ${differenceCash > 0 ? '+' : ''}${differenceCash})`);
    }
    if (differenceFloatMtn !== 0) {
      mismatches.push(`MTN Float: Expected GHS ${expectedFloatMtn.toLocaleString()}, Entered GHS ${actualFloatMtn.toLocaleString()} (Variance: GHS ${differenceFloatMtn > 0 ? '+' : ''}${differenceFloatMtn})`);
    }
    if (differenceFloatTelecel !== 0) {
      mismatches.push(`Telecel Float: Expected GHS ${expectedFloatTelecel.toLocaleString()}, Entered GHS ${actualFloatTelecel.toLocaleString()} (Variance: GHS ${differenceFloatTelecel > 0 ? '+' : ''}${differenceFloatTelecel})`);
    }
    if (differenceFloatAirtelTigo !== 0) {
      mismatches.push(`AirtelTigo Float: Expected GHS ${expectedFloatAirtelTigo.toLocaleString()}, Entered GHS ${actualFloatAirtelTigo.toLocaleString()} (Variance: GHS ${differenceFloatAirtelTigo > 0 ? '+' : ''}${differenceFloatAirtelTigo})`);
    }

    if (mismatches.length > 0) {
      if (!this.data.notifications) {
        this.data.notifications = [];
      }
      const branch = this.data.branches.find(b => b.id === shift.branchId);
      const branchName = branch ? branch.name : shift.branchId;
      
      const alarmNotification: Notification = {
        id: `noti-${Date.now()}`,
        branchId: shift.branchId,
        branchName,
        message: `🚨 Shift Closing Alarm: Agent ${userName} closed shift at ${branchName} with ${mismatches.length} figure mismatch(es): ${mismatches.join(" | ")}.`,
        type: "shortage",
        timestamp: new Date().toISOString(),
        isRead: false,
        shiftId: shift.id,
        difference: differenceCash
      };
      this.data.notifications.unshift(alarmNotification);
    }

    this.logAction(
      userId, 
      userName, 
      "Shift Closed", 
      `Cash: GHS ${expectedCash} exp / ${actualCashCounted} act | MTN: ${expectedFloatMtn}/${actualFloatMtn} | Telecel: ${expectedFloatTelecel}/${actualFloatTelecel} | AirtelTigo: ${expectedFloatAirtelTigo}/${actualFloatAirtelTigo}`, 
      mismatches.length > 0 ? `🚨 DISCREPANCIES DETECTED: ${mismatches.join("; ")}` : "All closing figures verified perfectly matching expected balances."
    );
    this.save();
    return shift;
  }

  // --- TRANSACTIONS ---
  getTransactionsByBranch(branchId: string, role: string, userId: string) {
    let filtered = this.data.transactions;
    if (role !== "ADMIN") {
      // Workers can only see transactions from their own shifts
      const activeShift = this.getActiveShift(userId);
      if (activeShift) {
        filtered = filtered.filter(t => t.shiftId === activeShift.id);
      } else {
        return [];
      }
    } else {
      if (branchId && branchId !== "all") {
        filtered = filtered.filter(t => t.branchId === branchId);
      }
    }
    return filtered.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }

  createTransaction(
    userId: string,
    userName: string,
    params: {
      type: TransactionType;
      network?: NetworkType;
      customerNumber?: string;
      senderNumber?: string;
      receiverNumber?: string;
      amount: number;
      commission?: number;
    }
  ): Transaction {
    const activeShift = this.getActiveShift(userId);
    const user = this.data.users.find(u => u.id === userId);
    const isAdmin = user && user.role === "ADMIN";

    if (isAdmin) {
      throw new Error("Access Denied: Administrators are strictly prohibited from entering operational transactions.");
    }

    if (!activeShift) {
      throw new Error("Access Denied: You must open a shift before entering any transaction.");
    }

    const { type, network, customerNumber, senderNumber, receiverNumber, amount, commission: customCommission } = params;

    // Validation
    if (amount <= 0) {
      throw new Error("Amount must be greater than zero GHS");
    }

    // Determine commission: use worker defined commission (customCommission), otherwise fallback to computed.
    let commission = 0;
    if (customCommission !== undefined) {
      commission = Number(customCommission);
    } else if (type === "withdrawal" || type === "send_money") {
      commission = this.calculateCommission(amount);
    }

    const branchId = activeShift ? activeShift.branchId : (user ? user.branchId : "branch-a");
    const fl = this.getFloatByBranch(branchId);

    // Network validation if required
    if (type !== "send_money" && !network) {
      throw new Error("Network is required for this transaction type");
    }

    const approvalSet = this.getApprovalSettings();
    const needsApproval = amount >= approvalSet.approvalThreshold;

    // Process system balance logic in-memory prior to logging & saving
    if (type === "deposit") {
      // DEPOSIT: Reduce Float, Increase Cash in drawer
      const currFloat = network === "MTN" ? fl.mtnFloat : network === "TELECEL" ? fl.telecelFloat : fl.airtelTigoFloat;
      if (currFloat < amount) {
        // Tap external electronic capital automatically to cover shortfall
        const shortfall = amount - currFloat;
        this.tapExternalCapitalIfNeeded(branchId, "ELECTRONIC", shortfall, network, userId, userName, "DEPOSIT", activeShift?.id);
      }

      if (network === "MTN" && fl.mtnFloat < amount) throw new Error(`Insufficient MTN float balance (GHS ${fl.mtnFloat.toLocaleString()} available)`);
      if (network === "TELECEL" && fl.telecelFloat < amount) throw new Error(`Insufficient Telecel float balance (GHS ${fl.telecelFloat.toLocaleString()} available)`);
      if (network === "AIRTELTIGO" && fl.airtelTigoFloat < amount) throw new Error(`Insufficient AirtelTigo float balance (GHS ${fl.airtelTigoFloat.toLocaleString()} available)`);

      if (network === "MTN") fl.mtnFloat = Number((fl.mtnFloat - amount).toFixed(2));
      else if (network === "TELECEL") fl.telecelFloat = Number((fl.telecelFloat - amount).toFixed(2));
      else if (network === "AIRTELTIGO") fl.airtelTigoFloat = Number((fl.airtelTigoFloat - amount).toFixed(2));

    } else if (type === "withdrawal") {
      // WITHDRAWAL: Increase Float, Deduct Cash (give out physical cash to customer)
      if (activeShift) {
        const currentDrawerCash = this.computeActiveShiftExpectedCash(activeShift.id, activeShift.userName);
        if (currentDrawerCash < amount) {
          const shortfall = amount - currentDrawerCash;
          this.tapExternalCapitalIfNeeded(branchId, "PHYSICAL", shortfall, undefined, userId, userName, "WITHDRAWAL", activeShift.id);
        }
      }

      if (network === "MTN") fl.mtnFloat = Number((fl.mtnFloat + amount).toFixed(2));
      else if (network === "TELECEL") fl.telecelFloat = Number((fl.telecelFloat + amount).toFixed(2));
      else if (network === "AIRTELTIGO") fl.airtelTigoFloat = Number((fl.airtelTigoFloat + amount).toFixed(2));

    } else if (type === "send_money") {
      // SEND MONEY: Reduces operator float and takes equivalent physical cash from customer
      const net = network || "MTN";
      const currFloat = net === "MTN" ? fl.mtnFloat : net === "TELECEL" ? fl.telecelFloat : fl.airtelTigoFloat;
      if (currFloat < amount) {
        const shortfall = amount - currFloat;
        this.tapExternalCapitalIfNeeded(branchId, "ELECTRONIC", shortfall, net, userId, userName, "SEND_MONEY", activeShift?.id);
      }

      if (net === "MTN" && fl.mtnFloat < amount) throw new Error(`Insufficient MTN float balance to execute send money (GHS ${fl.mtnFloat.toLocaleString()} available)`);
      if (net === "TELECEL" && fl.telecelFloat < amount) throw new Error(`Insufficient Telecel float balance to execute send money (GHS ${fl.telecelFloat.toLocaleString()} available)`);
      if (net === "AIRTELTIGO" && fl.airtelTigoFloat < amount) throw new Error(`Insufficient AirtelTigo float balance to execute send money (GHS ${fl.airtelTigoFloat.toLocaleString()} available)`);

      if (net === "MTN") fl.mtnFloat = Number((fl.mtnFloat - amount).toFixed(2));
      else if (net === "TELECEL") fl.telecelFloat = Number((fl.telecelFloat - amount).toFixed(2));
      else if (net === "AIRTELTIGO") fl.airtelTigoFloat = Number((fl.airtelTigoFloat - amount).toFixed(2));

    } else if (type === "airtime") {
      // AIRTIME: Sold from float wallet directly to customer, cash received in drawer
      const currFloat = network === "MTN" ? fl.mtnFloat : network === "TELECEL" ? fl.telecelFloat : fl.airtelTigoFloat;
      if (currFloat < amount) {
        const shortfall = amount - currFloat;
        this.tapExternalCapitalIfNeeded(branchId, "ELECTRONIC", shortfall, network, userId, userName, "AIRTIME", activeShift?.id);
      }

      if (network === "MTN" && fl.mtnFloat < amount) throw new Error(`Insufficient MTN float to perform airtime sale (GHS ${fl.mtnFloat.toLocaleString()} available)`);
      if (network === "TELECEL" && fl.telecelFloat < amount) throw new Error(`Insufficient Telecel float to perform airtime sale (GHS ${fl.telecelFloat.toLocaleString()} available)`);
      if (network === "AIRTELTIGO" && fl.airtelTigoFloat < amount) throw new Error(`Insufficient AirtelTigo float to perform airtime sale (GHS ${fl.airtelTigoFloat.toLocaleString()} available)`);

      if (network === "MTN") fl.mtnFloat = Number((fl.mtnFloat - amount).toFixed(2));
      else if (network === "TELECEL") fl.telecelFloat = Number((fl.telecelFloat - amount).toFixed(2));
      else if (network === "AIRTELTIGO") fl.airtelTigoFloat = Number((fl.airtelTigoFloat - amount).toFixed(2));
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      shiftId: activeShift ? activeShift.id : "admin-shift",
      branchId,
      userId,
      userName,
      type,
      network,
      customerNumber,
      senderNumber,
      receiverNumber,
      amount,
      commission,
      recordedAt: new Date().toISOString(),
      status: "ACTIVE"
    };

    this.data.transactions.push(newTx);

    if (needsApproval) {
      // Create a notification in-app for administrators/super users
      const branches = this.getBranches();
      const branch = branches.find(b => b.id === branchId);
      const branchName = branch ? branch.name : "System Base";

      const message = `High-Value Warning: A transaction of GHS ${amount.toLocaleString()} (${type.toUpperCase()}) was performed and proceeded at ${branchName} by ${userName}. It exceeds the approval threshold of GHS ${approvalSet.approvalThreshold.toLocaleString()}.`;
      
      const newNotification: Notification = {
        id: `noti-app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        branchId,
        branchName,
        message,
        type: "approval",
        timestamp: new Date().toISOString(),
        isRead: false,
        transactionId: newTx.id
      };

      if (!this.data.notifications) {
        this.data.notifications = [];
      }
      this.data.notifications.unshift(newNotification);

      this.logAction(
        userId,
        userName,
        "High-Value Transaction Executed",
        undefined,
        `Processed high-value ${type.toUpperCase()} of GHS ${amount} (${network || "MTN"}) exceeding threshold of GHS ${approvalSet.approvalThreshold}.`
      );
    }

    if (activeShift) {
      activeShift.expectedCash = this.computeActiveShiftExpectedCash(activeShift.id, activeShift.userName);
    }
    
    this.logAction(
      userId, 
      userName, 
      "Transaction Created", 
      undefined, 
      `Entered ${type.toUpperCase()} of GHS ${amount} (${network || "MTN"}). Comm: GHS ${commission}`
    );

    this.checkFloatThresholds(branchId);
    this.save();
    return newTx;
  }

  reverseTransaction(adminId: string, adminName: string, transactionId: string, reason: string): Transaction {
    const txIndex = this.data.transactions.findIndex(t => t.id === transactionId);
    if (txIndex === -1) {
      throw new Error("Transaction not found");
    }

    const tx = this.data.transactions[txIndex];
    if (tx.status === "REVERSED") {
      throw new Error("Transaction is already marked reversed");
    }

    tx.status = "REVERSED";
    tx.correctedBy = adminName;
    tx.correctionReason = reason;

    // Refund float balance adjustments
    const fl = this.getFloatByBranch(tx.branchId);
    const amount = tx.amount;
    const network = tx.network || "MTN";

    if (tx.type === "deposit") {
      // Refund reduced float back to branch wallet
      if (network === "MTN") fl.mtnFloat += amount;
      else if (network === "TELECEL") fl.telecelFloat += amount;
      else if (network === "AIRTELTIGO") fl.airtelTigoFloat += amount;
    } else if (tx.type === "withdrawal") {
      // Deduct increased float back out of branch wallet
      if (network === "MTN") fl.mtnFloat = Math.max(0, fl.mtnFloat - amount);
      else if (network === "TELECEL") fl.telecelFloat = Math.max(0, fl.telecelFloat - amount);
      else if (network === "AIRTELTIGO") fl.airtelTigoFloat = Math.max(0, fl.airtelTigoFloat - amount);
    } else if (tx.type === "send_money") {
      // Refund float used for sending
      if (network === "MTN") fl.mtnFloat += amount;
      else if (network === "TELECEL") fl.telecelFloat += amount;
      else if (network === "AIRTELTIGO") fl.airtelTigoFloat += amount;
    } else if (tx.type === "airtime") {
      // Refund float used for airtime
      if (network === "MTN") fl.mtnFloat += amount;
      else if (network === "TELECEL") fl.telecelFloat += amount;
      else if (network === "AIRTELTIGO") fl.airtelTigoFloat += amount;
    }
    
    const shift = this.data.shifts.find(s => s.id === tx.shiftId);
    if (shift) {
      shift.expectedCash = this.computeActiveShiftExpectedCash(shift.id, shift.userName);
      if (shift.status === "CLOSED" && shift.actualCash !== undefined) {
        shift.difference = Number((shift.actualCash - shift.expectedCash).toFixed(2));
      }
    }

    tx.correctedAt = new Date().toISOString();

    this.logAction(
      adminId, 
      adminName, 
      "Transaction Reversed", 
      `Transaction ${tx.id} active`, 
      `Reversed reason: ${reason}. System balances recalculated.`
    );
    this.checkFloatThresholds(tx.branchId);
    this.save();
    return tx;
  }

  correctTransaction(
    adminId: string,
    adminName: string,
    transactionId: string,
    updates: {
      type?: TransactionType;
      network?: NetworkType;
      customerNumber?: string;
      senderNumber?: string;
      receiverNumber?: string;
      amount?: number;
      commission?: number;
      status?: "ACTIVE" | "REVERSED" | "PENDING_APPROVAL" | "REJECTED";
      reason: string;
    }
  ): Transaction {
    const adminUser = this.data.users.find(u => u.id === adminId);
    if (adminUser && adminUser.role !== "ADMIN") {
      throw new Error("Access Denied: Only administrators are authorized to correct transactions.");
    }

    const txIndex = this.data.transactions.findIndex(t => t.id === transactionId);
    if (txIndex === -1) {
      throw new Error("Transaction not found");
    }

    const tx = this.data.transactions[txIndex];
    if (!updates.reason || !updates.reason.trim()) {
      throw new Error("A detailed correction reason is required for audit logging.");
    }

    // Save snapshot of previous values for audit logging & float rollback
    const oldBranchId = tx.branchId;
    const oldType = tx.type;
    const oldNetwork = tx.network || "MTN";
    const oldAmount = tx.amount;
    const oldStatus = tx.status;
    const oldCommission = tx.commission;

    // 1. If previous status was ACTIVE, un-apply its float effect
    if (oldStatus === "ACTIVE") {
      const fl = this.getFloatByBranch(oldBranchId);
      if (oldType === "deposit" || oldType === "send_money" || oldType === "airtime") {
        if (oldNetwork === "MTN") fl.mtnFloat += oldAmount;
        else if (oldNetwork === "TELECEL") fl.telecelFloat += oldAmount;
        else if (oldNetwork === "AIRTELTIGO") fl.airtelTigoFloat += oldAmount;
      } else if (oldType === "withdrawal") {
        if (oldNetwork === "MTN") fl.mtnFloat = Math.max(0, fl.mtnFloat - oldAmount);
        else if (oldNetwork === "TELECEL") fl.telecelFloat = Math.max(0, fl.telecelFloat - oldAmount);
        else if (oldNetwork === "AIRTELTIGO") fl.airtelTigoFloat = Math.max(0, fl.airtelTigoFloat - oldAmount);
      }
    }

    // 2. Apply field updates
    if (updates.type) tx.type = updates.type;
    if (updates.network) tx.network = updates.network;
    if (updates.customerNumber !== undefined) tx.customerNumber = updates.customerNumber;
    if (updates.senderNumber !== undefined) tx.senderNumber = updates.senderNumber;
    if (updates.receiverNumber !== undefined) tx.receiverNumber = updates.receiverNumber;
    if (updates.amount !== undefined && !isNaN(Number(updates.amount))) {
      const newAmt = Number(updates.amount);
      if (newAmt <= 0) throw new Error("Amount must be greater than zero GHS");
      tx.amount = newAmt;
    }
    if (updates.commission !== undefined && !isNaN(Number(updates.commission))) {
      tx.commission = Number(updates.commission);
    }
    if (updates.status) tx.status = updates.status;

    tx.correctedBy = adminName;
    tx.correctionReason = updates.reason.trim();
    tx.correctedAt = new Date().toISOString();

    // 3. If new status is ACTIVE, apply its new float effect
    if (tx.status === "ACTIVE") {
      const fl = this.getFloatByBranch(tx.branchId);
      const newNetwork = tx.network || "MTN";
      const newAmount = tx.amount;

      if (tx.type === "deposit" || tx.type === "send_money" || tx.type === "airtime") {
        if (newNetwork === "MTN") fl.mtnFloat -= newAmount;
        else if (newNetwork === "TELECEL") fl.telecelFloat -= newAmount;
        else if (newNetwork === "AIRTELTIGO") fl.airtelTigoFloat -= newAmount;
      } else if (tx.type === "withdrawal") {
        if (newNetwork === "MTN") fl.mtnFloat += newAmount;
        else if (newNetwork === "TELECEL") fl.telecelFloat += newAmount;
        else if (newNetwork === "AIRTELTIGO") fl.airtelTigoFloat += newAmount;
      }
    }

    // 4. Recalculate shift expected cash for affected shift
    const shift = this.data.shifts.find(s => s.id === tx.shiftId);
    if (shift) {
      shift.expectedCash = this.computeActiveShiftExpectedCash(shift.id, shift.userName);
      if (shift.status === "CLOSED" && shift.actualCash !== undefined) {
        shift.difference = Number((shift.actualCash - shift.expectedCash).toFixed(2));
      }
    }

    // 5. Audit Logging
    const changeSummary = `GHS ${oldAmount} (${oldType}/${oldNetwork}) -> GHS ${tx.amount} (${tx.type}/${tx.network || "MTN"}) [Status: ${oldStatus} -> ${tx.status}]`;
    this.logAction(
      adminId,
      adminName,
      "Transaction Corrected",
      `Tx ID: ${tx.id} | Previous: GHS ${oldAmount} Comm: GHS ${oldCommission}`,
      `Corrected by Admin ${adminName}. Reason: ${updates.reason}. Changes: ${changeSummary}. Float & shift expected cash auto-recalculated.`
    );

    this.checkFloatThresholds(tx.branchId);
    this.save();
    return tx;
  }

  approveTransaction(adminId: string, adminName: string, transactionId: string): Transaction {
    const txIndex = this.data.transactions.findIndex(t => t.id === transactionId);
    if (txIndex === -1) {
      throw new Error("Transaction not found");
    }

    const tx = this.data.transactions[txIndex];
    if (tx.status !== "PENDING_APPROVAL") {
      throw new Error(`Transaction is not pending approval (current status: ${tx.status})`);
    }

    // Apply float adjustments
    const fl = this.getFloatByBranch(tx.branchId);
    const { type, network, amount } = tx;

    if (type === "deposit") {
      if (network === "MTN" && fl.mtnFloat < amount) throw new Error("Insufficient MTN float balance");
      if (network === "TELECEL" && fl.telecelFloat < amount) throw new Error("Insufficient Telecel float balance");
      if (network === "AIRTELTIGO" && fl.airtelTigoFloat < amount) throw new Error("Insufficient AirtelTigo float balance");

      if (network === "MTN") fl.mtnFloat -= amount;
      else if (network === "TELECEL") fl.telecelFloat -= amount;
      else if (network === "AIRTELTIGO") fl.airtelTigoFloat -= amount;

    } else if (type === "withdrawal") {
      if (network === "MTN") fl.mtnFloat += amount;
      else if (network === "TELECEL") fl.telecelFloat += amount;
      else if (network === "AIRTELTIGO") fl.airtelTigoFloat += amount;

    } else if (type === "send_money") {
      const net = network || "MTN";
      if (net === "MTN" && fl.mtnFloat < amount) throw new Error("Insufficient MTN float balance to execute send money");
      if (net === "TELECEL" && fl.telecelFloat < amount) throw new Error("Insufficient Telecel float balance to execute send money");
      if (net === "AIRTELTIGO" && fl.airtelTigoFloat < amount) throw new Error("Insufficient AirtelTigo float balance to execute send money");

      if (net === "MTN") fl.mtnFloat -= amount;
      else if (net === "TELECEL") fl.telecelFloat -= amount;
      else if (net === "AIRTELTIGO") fl.airtelTigoFloat -= amount;

    } else if (type === "airtime") {
      if (network === "MTN" && fl.mtnFloat < amount) throw new Error("Insufficient MTN float to perform airtime sale");
      if (network === "TELECEL" && fl.telecelFloat < amount) throw new Error("Insufficient Telecel float to perform airtime sale");
      if (network === "AIRTELTIGO" && fl.airtelTigoFloat < amount) throw new Error("Insufficient AirtelTigo float to perform airtime sale");

      if (network === "MTN") fl.mtnFloat -= amount;
      else if (network === "TELECEL") fl.telecelFloat -= amount;
      else if (network === "AIRTELTIGO") fl.airtelTigoFloat -= amount;
    }

    tx.status = "ACTIVE";
    tx.correctedBy = adminName; // Store who approved it

    const shift = this.data.shifts.find(s => s.id === tx.shiftId);
    if (shift) {
      shift.expectedCash = this.computeActiveShiftExpectedCash(shift.id, shift.userName);
    }

    this.logAction(
      adminId,
      adminName,
      "Transaction Approved",
      `Transaction ${tx.id} pending`,
      `Approved high-value transaction of GHS ${amount}. Float updated.`
    );

    // Update notification status if exists
    if (this.data.notifications) {
      const noti = this.data.notifications.find(n => n.transactionId === tx.id);
      if (noti) {
        noti.isRead = true;
        noti.message += ` (Approved by ${adminName})`;
      }
    }

    this.checkFloatThresholds(tx.branchId);
    this.save();
    return tx;
  }

  rejectTransaction(adminId: string, adminName: string, transactionId: string): Transaction {
    const txIndex = this.data.transactions.findIndex(t => t.id === transactionId);
    if (txIndex === -1) {
      throw new Error("Transaction not found");
    }

    const tx = this.data.transactions[txIndex];
    if (tx.status !== "PENDING_APPROVAL") {
      throw new Error(`Transaction is not pending approval (current status: ${tx.status})`);
    }

    tx.status = "REJECTED";
    tx.correctedBy = adminName;

    this.logAction(
      adminId,
      adminName,
      "Transaction Rejected",
      `Transaction ${tx.id} pending`,
      `Rejected high-value transaction of GHS ${tx.amount} by ${tx.userName}.`
    );

    // Update notification status if exists
    if (this.data.notifications) {
      const noti = this.data.notifications.find(n => n.transactionId === tx.id);
      if (noti) {
        noti.isRead = true;
        noti.message += ` (Rejected by ${adminName})`;
      }
    }

    this.save();
    return tx;
  }

  async triggerEscalationAlert(tx: Transaction, branchName: string, settings: ApprovalSettings) {
    try {
      const { sendEscalationAlert } = await import("./email");
      await sendEscalationAlert(tx, branchName, settings);
    } catch (err) {
      console.error("Failed to dynamically import and call sendEscalationAlert:", err);
    }
  }

  checkPendingEscalations() {
    const settings = this.getApprovalSettings();
    if (!settings.escalationRulesEnabled) return;

    const timeoutMs = settings.escalationTimeoutMinutes * 60 * 1000;
    const now = new Date();

    this.data.transactions.forEach(tx => {
      if (tx.status === "PENDING_APPROVAL") {
        const elapsed = now.getTime() - new Date(tx.recordedAt).getTime();
        if (elapsed > timeoutMs) {
          // Check if we have already escalated this
          const alreadyEscalated = this.data.notifications?.some(
            n => n.transactionId === tx.id && n.type === "escalation"
          );

          if (!alreadyEscalated) {
            // Escalate!
            const branch = this.data.branches.find(b => b.id === tx.branchId);
            const branchName = branch ? branch.name : "System Base";
            
            const message = `Escalation: High-value transaction ${tx.id} (GHS ${tx.amount.toLocaleString()}) at ${branchName} has been pending approval for over ${settings.escalationTimeoutMinutes} minutes! Entered by ${tx.userName}.`;
            
            const newNoti: Notification = {
              id: `noti-esc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              branchId: tx.branchId,
              branchName,
              message,
              type: "escalation",
              timestamp: new Date().toISOString(),
              isRead: false,
              transactionId: tx.id
            };

            if (!this.data.notifications) this.data.notifications = [];
            this.data.notifications.unshift(newNoti);

            this.logAction(
              "system",
              "System Scheduler",
              "Transaction Escalated",
              `Transaction ${tx.id} pending for ${Math.round(elapsed / 60000)} mins`,
              message
            );

            this.triggerEscalationAlert(tx, branchName, settings).catch(err => {
              console.error("Failed to trigger escalation alert:", err);
            });
          }
        }
      }
    });

    this.save();
  }

  // --- DEBT MANAGEMENT ---
  getDebts(branchId?: string): Debt[] {
    this.cleanOldPaidDebts();
    let list = this.data.debts;
    if (branchId && branchId !== "all") {
      list = list.filter(d => d.branchId === branchId);
    }
    const getEntryTime = (d: Debt): number => {
      if (d.createdAt) {
        const t = new Date(d.createdAt).getTime();
        if (!isNaN(t)) return t;
      }
      if (d.id && d.id.startsWith("debt-")) {
        const tStr = d.id.replace("debt-", "");
        const parsed = parseInt(tStr, 10);
        if (!isNaN(parsed) && parsed > 1000000000) return parsed;
      }
      if (d.dueDate) {
        const t = new Date(d.dueDate).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };
    return list.sort((a, b) => getEntryTime(b) - getEntryTime(a));
  }

  addDebt(
    userId: string, 
    userName: string, 
    branchId: string, 
    customerName: string, 
    customerNumber: string, 
    amount: number, 
    reason: string, 
    dueDate: string, 
    commission: number = 0, 
    paymentMode: "PHYSICAL_CASH" | "ELECTRONIC_MONEY" = "PHYSICAL_CASH",
    paymentNetwork?: "MTN" | "TELECEL" | "AIRTELTIGO"
  ): Debt {
    const newDebt: Debt = {
      id: `debt-${Date.now()}`,
      branchId,
      customerName,
      customerNumber,
      amount,
      commission: commission || 0,
      paymentMode: paymentMode || "PHYSICAL_CASH",
      paymentNetwork: paymentMode === "ELECTRONIC_MONEY" ? paymentNetwork : undefined,
      reason,
      dueDate,
      recordedByUserName: userName,
      status: "OUTSTANDING",
      createdAt: new Date().toISOString()
    };

    // If disbursed via Electronic Money, deduct from float balance of selected network
    if (paymentMode === "ELECTRONIC_MONEY" && paymentNetwork) {
      const fl = this.getFloatByBranch(branchId);
      if (paymentNetwork === "MTN") {
        fl.mtnFloat = Math.max(0, Number((fl.mtnFloat - amount).toFixed(2)));
      } else if (paymentNetwork === "TELECEL") {
        fl.telecelFloat = Math.max(0, Number((fl.telecelFloat - amount).toFixed(2)));
      } else if (paymentNetwork === "AIRTELTIGO") {
        fl.airtelTigoFloat = Math.max(0, Number((fl.airtelTigoFloat - amount).toFixed(2)));
      }
    }

    this.data.debts.push(newDebt);
    const netLabel = paymentNetwork ? ` (${paymentNetwork})` : "";
    const modeLabel = paymentMode === "ELECTRONIC_MONEY" ? `Electronic Money${netLabel}` : "Physical Cash";
    this.logAction(userId, userName, "Debt Added", undefined, `Debt of GHS ${amount} [${modeLabel}] (Comm: GHS ${commission || 0}) added for ${customerName}, due by ${dueDate}`);
    this.save();
    return newDebt;
  }

  markDebtPaid(
    adminId: string, 
    adminName: string, 
    debtId: string, 
    clearedPaymentMode: "PHYSICAL_CASH" | "ELECTRONIC_MONEY" = "PHYSICAL_CASH",
    clearedPaymentNetwork?: "MTN" | "TELECEL" | "AIRTELTIGO"
  ): Debt {
    const debtIndex = this.data.debts.findIndex(d => d.id === debtId);
    if (debtIndex === -1) {
      throw new Error("Debt record not found");
    }

    const debt = this.data.debts[debtIndex];
    if (debt.status === "PAID") {
      throw new Error("Debt is already paid");
    }
    if (debt.status === "CANCELLED") {
      throw new Error("Debt is already cancelled");
    }

    debt.status = "PAID";
    debt.clearedAt = new Date().toISOString();
    debt.clearedByUserName = adminName;
    debt.clearedPaymentMode = clearedPaymentMode;
    if (clearedPaymentMode === "ELECTRONIC_MONEY" && clearedPaymentNetwork) {
      debt.clearedPaymentNetwork = clearedPaymentNetwork;
      
      // Credit electronic float wallet for the selected network
      const fl = this.getFloatByBranch(debt.branchId);
      if (clearedPaymentNetwork === "MTN") {
        fl.mtnFloat = Number((fl.mtnFloat + debt.amount).toFixed(2));
      } else if (clearedPaymentNetwork === "TELECEL") {
        fl.telecelFloat = Number((fl.telecelFloat + debt.amount).toFixed(2));
      } else if (clearedPaymentNetwork === "AIRTELTIGO") {
        fl.airtelTigoFloat = Number((fl.airtelTigoFloat + debt.amount).toFixed(2));
      }
    }

    const netStr = (clearedPaymentMode === "ELECTRONIC_MONEY" && clearedPaymentNetwork) ? ` (${clearedPaymentNetwork})` : "";
    const clearModeStr = ` via ${clearedPaymentMode === "ELECTRONIC_MONEY" ? "Electronic Money" + netStr : "Physical Cash"}`;
    this.logAction(adminId, adminName, "Debt Paid", `GHS ${debt.amount} Outstanding`, `Marked paid by ${adminName}${clearModeStr}. Recorded customer name: ${debt.customerName}`);
    this.save();
    return debt;
  }

  cancelDebt(
    adminId: string, 
    adminName: string, 
    debtId: string, 
    cancellationMode: "PHYSICAL_CASH" | "ELECTRONIC_MONEY" = "PHYSICAL_CASH",
    cancellationNetwork?: "MTN" | "TELECEL" | "AIRTELTIGO",
    cancellationReason?: string
  ): Debt {
    const debtIndex = this.data.debts.findIndex(d => d.id === debtId);
    if (debtIndex === -1) {
      throw new Error("Debt record not found");
    }

    const debt = this.data.debts[debtIndex];
    if (debt.status === "PAID") {
      throw new Error("Cannot cancel a debt that is already marked paid");
    }
    if (debt.status === "CANCELLED") {
      throw new Error("Debt is already cancelled");
    }

    debt.status = "CANCELLED";
    debt.clearedAt = new Date().toISOString();
    debt.clearedByUserName = adminName;
    debt.clearedPaymentMode = cancellationMode;
    
    // If debt cancellation involves electronic float reversal/repayment, restore float to selected network
    if (cancellationMode === "ELECTRONIC_MONEY" && cancellationNetwork) {
      debt.clearedPaymentNetwork = cancellationNetwork;
      const fl = this.getFloatByBranch(debt.branchId);
      if (cancellationNetwork === "MTN") {
        fl.mtnFloat = Number((fl.mtnFloat + debt.amount).toFixed(2));
      } else if (cancellationNetwork === "TELECEL") {
        fl.telecelFloat = Number((fl.telecelFloat + debt.amount).toFixed(2));
      } else if (cancellationNetwork === "AIRTELTIGO") {
        fl.airtelTigoFloat = Number((fl.airtelTigoFloat + debt.amount).toFixed(2));
      }
    } else if (debt.paymentMode === "ELECTRONIC_MONEY" && debt.paymentNetwork) {
      // Reversal of original electronic debt issuance: add float back to original network
      const fl = this.getFloatByBranch(debt.branchId);
      if (debt.paymentNetwork === "MTN") {
        fl.mtnFloat = Number((fl.mtnFloat + debt.amount).toFixed(2));
      } else if (debt.paymentNetwork === "TELECEL") {
        fl.telecelFloat = Number((fl.telecelFloat + debt.amount).toFixed(2));
      } else if (debt.paymentNetwork === "AIRTELTIGO") {
        fl.airtelTigoFloat = Number((fl.airtelTigoFloat + debt.amount).toFixed(2));
      }
    }

    const netStr = cancellationNetwork ? ` (${cancellationNetwork})` : "";
    const cancelModeStr = ` via ${cancellationMode === "ELECTRONIC_MONEY" ? "Electronic Money" + netStr : "Physical Cash"}`;
    this.logAction(adminId, adminName, "Debt Cancelled", `GHS ${debt.amount} Cancelled`, `Cancelled by ${adminName}${cancelModeStr}. Reason: ${cancellationReason || "N/A"}`);
    this.save();
    return debt;
  }

  // --- DASHBOARD ANALYTICS ---
  getDashboardStats(branchId: string = "all", userId?: string, role?: string): DashboardStats {
    this.cleanOldPaidDebts();
    const today = new Date().toISOString().split("T")[0];
    
    // Filter transactions
    let filteredTxs = this.data.transactions.filter(t => t.status === "ACTIVE");
    
    if (role !== "ADMIN" && userId) {
      const activeShift = this.getActiveShift(userId);
      if (activeShift) {
        filteredTxs = filteredTxs.filter(t => t.shiftId === activeShift.id);
      } else {
        filteredTxs = [];
      }
    } else {
      if (branchId && branchId !== "all") {
        filteredTxs = filteredTxs.filter(t => t.branchId === branchId);
      }
    }

    const todayTxs = filteredTxs.filter(t => t.recordedAt.startsWith(today));

    // Today's Profit (total commissions on transactions entered by the worker)
    let todayProfit = 0;
    todayTxs.forEach(t => {
      todayProfit += (t.commission || 0);
    });

    // Total counts and sums
    const todayTransactionsCount = todayTxs.length;

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalSendMoney = 0;
    let totalAirtime = 0;

    filteredTxs.forEach(t => {
      if (t.type === "deposit") totalDeposits += t.amount;
      else if (t.type === "withdrawal") totalWithdrawals += t.amount;
      else if (t.type === "send_money") totalSendMoney += t.amount;
      else if (t.type === "airtime") totalAirtime += t.amount;
    });

    // Outstanding Debts
    let activeDebtsList = this.data.debts.filter(d => d.status === "OUTSTANDING");
    if (branchId && branchId !== "all") {
      activeDebtsList = activeDebtsList.filter(d => d.branchId === branchId);
    }
    const outstandingDebts = activeDebtsList.reduce((sum, d) => sum + d.amount, 0);

    // Current Cash Balance in Active shifts
    let currentCashBalance = 0;
    const activeShifts = this.data.shifts.filter(s => s.status === "OPEN" && (branchId === "all" || s.branchId === branchId));
    
    activeShifts.forEach(s => {
      currentCashBalance += this.computeActiveShiftExpectedCash(s.id, s.userName);
    });

    if (activeShifts.length === 0) {
      const closedShifts = this.data.shifts.filter(s => s.status === "CLOSED" && (branchId === "all" || s.branchId === branchId));
      if (closedShifts.length > 0) {
        currentCashBalance = closedShifts[0].actualCash || 0;
      } else {
        currentCashBalance = 0;
      }
    }

    // Sum Float Balances
    let currentMtnFloat = 0;
    let currentTelecelFloat = 0;
    let currentAirtelTigoFloat = 0;

    let targetFloats = this.data.floats;
    if (branchId && branchId !== "all") {
      targetFloats = targetFloats.filter(f => f.branchId === branchId);
    }

    targetFloats.forEach(f => {
      currentMtnFloat += f.mtnFloat;
      currentTelecelFloat += f.telecelFloat;
      currentAirtelTigoFloat += f.airtelTigoFloat;
    });

    const branchNetProfits = this.data.branches.map(branch => {
      const branchTodayTxs = this.data.transactions.filter(t => t.status === "ACTIVE" && t.branchId === branch.id && t.recordedAt.startsWith(today));
      let todayBProfit = 0;
      branchTodayTxs.forEach(t => {
        todayBProfit += (t.commission || 0);
      });

      const branchAllTxs = this.data.transactions.filter(t => t.status === "ACTIVE" && t.branchId === branch.id);
      let cumulativeBProfit = 0;
      branchAllTxs.forEach(t => {
        cumulativeBProfit += (t.commission || 0);
      });

      // Branch debts entered at branch
      const bDebts = this.data.debts
        .filter(d => d.status === "OUTSTANDING" && d.branchId === branch.id)
        .reduce((sum, d) => sum + d.amount, 0);

      // Branch floats
      const bFloat = this.data.floats.find(f => f.branchId === branch.id);
      const bMtnFloat = bFloat ? bFloat.mtnFloat : 0;
      const bTelecelFloat = bFloat ? bFloat.telecelFloat : 0;
      const bAirtelTigoFloat = bFloat ? bFloat.airtelTigoFloat : 0;
      const bMtnAirtime = bFloat ? (bFloat.mtnAirtimeFloat || 0) : 0;
      const bTelecelAirtime = bFloat ? (bFloat.telecelAirtimeFloat || 0) : 0;
      const bAirtelTigoAirtime = bFloat ? (bFloat.airtelTigoAirtimeFloat || 0) : 0;
      const bTotalFloats = bMtnFloat + bTelecelFloat + bAirtelTigoFloat;

      // Branch available physical cash
      const bOpenShifts = this.data.shifts.filter(s => s.status === "OPEN" && s.branchId === branch.id);
      let bCash = 0;
      if (bOpenShifts.length > 0) {
        bOpenShifts.forEach(s => {
          bCash += this.computeActiveShiftExpectedCash(s.id, s.userName);
        });
      } else {
        const bClosedShifts = this.data.shifts.filter(s => s.status === "CLOSED" && s.branchId === branch.id);
        if (bClosedShifts.length > 0) {
          bCash = bClosedShifts[0].actualCash || 0;
        }
      }

      const bWorkingCapital = bDebts + bTotalFloats + bCash;

      return {
        branchId: branch.id,
        branchName: branch.name,
        location: branch.location || "N/A",
        todayProfit: Number(todayBProfit.toFixed(2)),
        cumulativeProfit: Number(cumulativeBProfit.toFixed(2)),
        transactionCount: branchAllTxs.length,
        todayTxCount: branchTodayTxs.length,
        workingCapital: Number(bWorkingCapital.toFixed(2)),
        outstandingDebts: Number(bDebts.toFixed(2)),
        totalFloats: Number(bTotalFloats.toFixed(2)),
        cashBalance: Number(bCash.toFixed(2)),
        mtnFloat: Number(bMtnFloat.toFixed(2)),
        telecelFloat: Number(bTelecelFloat.toFixed(2)),
        airtelTigoFloat: Number(bAirtelTigoFloat.toFixed(2)),
        mtnAirtimeFloat: Number(bMtnAirtime.toFixed(2)),
        telecelAirtimeFloat: Number(bTelecelAirtime.toFixed(2)),
        airtelTigoAirtimeFloat: Number(bAirtelTigoAirtime.toFixed(2))
      };
    });

    const externalCaps = this.data.externalCapitals || [];
    let filteredCapitals = externalCaps;
    if (branchId && branchId !== "all") {
      filteredCapitals = filteredCapitals.filter(e => e.branchId === branchId || e.branchId === "all");
    }

    const totalExternalCapital = filteredCapitals.reduce((sum, e) => sum + e.amount, 0);
    const externalElectronicCapital = filteredCapitals
      .filter(e => e.type === "ELECTRONIC" && e.status === "ACTIVE")
      .reduce((sum, e) => sum + e.remainingAmount, 0);
    const externalPhysicalCapital = filteredCapitals
      .filter(e => e.type === "PHYSICAL" && e.status === "ACTIVE")
      .reduce((sum, e) => sum + e.remainingAmount, 0);
    const tappedExternalCapital = filteredCapitals.reduce((sum, e) => sum + e.tappedAmount, 0);
    const remainingExternalCapital = filteredCapitals
      .filter(e => e.status === "ACTIVE")
      .reduce((sum, e) => sum + e.remainingAmount, 0);

    const totalWorkingCapital = Number((outstandingDebts + (currentMtnFloat + currentTelecelFloat + currentAirtelTigoFloat) + currentCashBalance).toFixed(2));
    const combinedTotalCapital = Number((totalWorkingCapital + remainingExternalCapital).toFixed(2));

    return {
      todayProfit: Number(todayProfit.toFixed(2)),
      todayTransactionsCount,
      totalDeposits,
      totalWithdrawals,
      totalSendMoney,
      totalAirtime,
      outstandingDebts,
      currentCashBalance,
      currentMtnFloat,
      currentTelecelFloat,
      currentAirtelTigoFloat,
      totalWorkingCapital,
      combinedTotalCapital,
      totalExternalCapital: Number(totalExternalCapital.toFixed(2)),
      externalElectronicCapital: Number(externalElectronicCapital.toFixed(2)),
      externalPhysicalCapital: Number(externalPhysicalCapital.toFixed(2)),
      tappedExternalCapital: Number(tappedExternalCapital.toFixed(2)),
      remainingExternalCapital: Number(remainingExternalCapital.toFixed(2)),
      externalCapitals: filteredCapitals,
      branchNetProfits
    };
  }

  // --- CHART DATA GENERATION ---
  getChartData(branchId: string = "all") {
    const days = [6, 5, 4, 3, 2, 1, 0];
    const trendData = days.map(day => {
      const dateStr = getPastDate(day, "00:00:00").split("T")[0];
      const dateObj = new Date(dateStr);
      const label = dateObj.toLocaleDateString("en-US", { weekday: 'short' });

      let txList = this.data.transactions.filter(t => t.status === "ACTIVE" && t.recordedAt.startsWith(dateStr));
      if (branchId && branchId !== "all") {
        txList = txList.filter(t => t.branchId === branchId);
      }

      let profit = 0;
      let depositVolume = 0;
      let withdrawalVolume = 0;
      let sendVolume = 0;
      let volumeCount = txList.length;

      txList.forEach(t => {
        if (t.type === "deposit") depositVolume += t.amount;
        else if (t.type === "withdrawal") {
          withdrawalVolume += t.amount;
          profit += t.commission;
        }
        else if (t.type === "send_money") {
          sendVolume += t.amount;
          profit += t.commission;
        }
        else if (t.type === "airtime") {
          profit += (t.commission || 0);
        }
      });

      return {
        name: label,
        date: dateStr,
        profit: Number(profit.toFixed(2)),
        deposits: depositVolume,
        withdrawals: withdrawalVolume,
        send: sendVolume,
        volume: volumeCount
      };
    });

    return trendData;
  }

  // --- COMPREHENSIVE REPORTS ENGINE ---
  getReports(filterType: "daily" | "weekly" | "monthly", branchId: string = "all") {
    let txs = this.data.transactions;
    if (branchId && branchId !== "all") {
      txs = txs.filter(t => t.branchId === branchId);
    }

    const todayDate = new Date();
    
    // Group transactions by Date/Week/Month
    const recordMap: Record<string, {
      deposits: number;
      withdrawals: number;
      sendMoney: number;
      airtime: number;
      commission: number;
      netProfit: number;
      totalTransactions: number;
    }> = {};

    txs.forEach(t => {
      let key = "";
      const dateObj = new Date(t.recordedAt);
      
      if (filterType === "daily") {
        key = t.recordedAt.split("T")[0];
      } else if (filterType === "weekly") {
        // Simple representation of week using start of week
        const diff = dateObj.getDate() - dateObj.getDay();
        const startOfWeek = new Date(dateObj.setDate(diff));
        key = `Week of ${startOfWeek.toISOString().split("T")[0]}`;
      } else {
        // monthly
        key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!recordMap[key]) {
        recordMap[key] = {
          deposits: 0,
          withdrawals: 0,
          sendMoney: 0,
          airtime: 0,
          commission: 0,
          netProfit: 0,
          totalTransactions: 0
        };
      }

      const active = t.status === "ACTIVE";
      if (active) {
        recordMap[key].totalTransactions += 1;
        
        if (t.type === "deposit") {
          recordMap[key].deposits += t.amount;
        } else if (t.type === "withdrawal") {
          recordMap[key].withdrawals += t.amount;
          recordMap[key].commission += t.commission;
          recordMap[key].netProfit += t.commission;
        } else if (t.type === "send_money") {
          recordMap[key].sendMoney += t.amount;
          recordMap[key].commission += t.commission;
          recordMap[key].netProfit += t.commission;
        } else if (t.type === "airtime") {
          recordMap[key].airtime += t.amount;
          recordMap[key].commission += (t.commission || 0);
          recordMap[key].netProfit += (t.commission || 0);
        }
      }
    });

    const reportRows = Object.entries(recordMap).map(([key, data]) => ({
      period: key,
      ...data,
      deposits: Number(data.deposits.toFixed(2)),
      withdrawals: Number(data.withdrawals.toFixed(2)),
      sendMoney: Number(data.sendMoney.toFixed(2)),
      airtime: Number(data.airtime.toFixed(2)),
      commission: Number(data.commission.toFixed(2)),
      netProfit: Number(data.netProfit.toFixed(2))
    }));

    // Sort descending
    return reportRows.sort((a, b) => b.period.localeCompare(a.period));
  }

  getAuditLogs() {
    return this.data.auditLogs;
  }

  getPermanentlySavedClosingReports(branchId: string = "all") {
    let closedShifts = this.data.shifts.filter(s => s.status === "CLOSED");
    if (branchId && branchId !== "all") {
      closedShifts = closedShifts.filter(s => s.branchId === branchId);
    }
    return closedShifts.sort((a, b) => {
      const aDate = `${a.date}T${a.endTime || '23:59:59'}`;
      const bDate = `${b.date}T${b.endTime || '23:59:59'}`;
      return bDate.localeCompare(aDate);
    });
  }

  // --- NOTIFICATIONS CONTROLS ---
  getNotifications(branchId?: string): Notification[] {
    if (!this.data.notifications) {
      this.data.notifications = [];
    }
    if (branchId && branchId !== "all") {
      return this.data.notifications.filter(n => n.branchId === branchId);
    }
    return this.data.notifications;
  }

  markNotificationAsRead(id: string) {
    if (!this.data.notifications) {
      this.data.notifications = [];
    }
    const noti = this.data.notifications.find(n => n.id === id);
    if (noti) {
      noti.isRead = true;
      this.save();
    }
    return noti;
  }

  clearAllNotifications(branchId?: string) {
    if (!this.data.notifications) {
      this.data.notifications = [];
    }
    if (branchId && branchId !== "all") {
      this.data.notifications = this.data.notifications.filter(n => n.branchId !== branchId);
    } else {
      this.data.notifications = [];
    }
    this.save();
  }
}

export const db = new JSONDatabase();
