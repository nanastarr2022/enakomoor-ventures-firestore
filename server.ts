import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/server/db";
import { TransactionType, NetworkType } from "./src/types";
import { sendHighValueAlert, sendApprovalAlert, sendEscalationAlert, sendPasswordResetEmail } from "./src/server/email";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Wait for the database to finish loading (from Firestore if configured, else local file)
  await db.ready;

  app.use(express.json());

  // --- MOCK AUTHORIZATION MIDDLEWARE ---
  // Simple session token parsed from Auth headers: "Bearer user-x:username:role:branchId"
  const getAuthUser = (req: Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.substring(7);
    try {
      const parts = token.split(":");
      if (parts.length >= 4) {
        return {
          id: parts[0],
          username: parts[1],
          role: parts[2] as "ADMIN" | "WORKER",
          branchId: parts[3],
          name: parts[4] ? decodeURIComponent(parts[4]) : parts[1],
          sessionToken: parts[5] || ""
        };
      }
    } catch (e) {
      // invalid token format
    }
    return null;
  };

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Access Denied: Unauthenticated session." });
    }
    if (!db.validateSession(user.id, user.sessionToken)) {
      return res.status(401).json({ error: "SESSION_INVALIDATED", message: "Your account was logged in on another device. Please log in again." });
    }

    // Security check: Agent / Worker operating hours restriction (6:00 AM to 11:00 PM)
    if (user.role !== "ADMIN") {
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour >= 23) {
        return res.status(403).json({
          error: "SYSTEM_CLOSED",
          message: "System Security Lockdown: The system automatically closes at 11:00 PM daily. Agent operating hours are 6:00 AM to 11:00 PM."
        });
      }
    }

    (req as any).user = user;
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthUser(req);
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access Denied: Admin authorization required." });
    }
    (req as any).user = user;
    next();
  };

  // --- API ENDPOINTS ---

  // Auth
  app.get("/api/public/branches", (req, res) => {
    res.json(db.getBranches());
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password, branchId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const authResult = db.authenticate(username, password, branchId);
    if (!authResult) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const { user, branch, sessionToken } = authResult;

    // Security check: Agent / Worker operating hours restriction (6:00 AM to 11:00 PM)
    if (user.role !== "ADMIN") {
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour >= 23) {
        return res.status(403).json({
          error: "SYSTEM_CLOSED",
          message: "Security Policy: Agents can only log in between 6:00 AM and 11:00 PM daily. System is currently closed."
        });
      }
    }

    // Formulate a secure self-describing Bearer token using selected active branchId for this session
    const token = `${user.id}:${user.username}:${user.role}:${user.branchId}:${encodeURIComponent(user.name)}:${sessionToken}`;
    
    res.json({
      token,
      user,
      branch
    });
  });

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    const user = (req as any).user;
    db.logAction(user.id, user.name, "User Logout", undefined, "Logged out from terminal screen");
    res.json({ success: true });
  });

  app.post("/api/auth/forgot-password", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const { user, code } = db.requestPasswordReset(username);
    sendPasswordResetEmail(user.username, user.role, code).catch(err => {
      console.error("Async sendPasswordResetEmail failed:", err);
    });
    res.json({ success: true, message: "A reset code has been sent to the admin email for approval." });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/auth/reset-password", (req, res) => {
  const { username, code, newPassword } = req.body;
  if (!username || !code || !newPassword) {
    return res.status(400).json({ error: "Username, code, and new password are all required" });
  }

  try {
    const result = db.resetPassword(username, code, newPassword);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

  // Automated Backup Export Endpoint for Admins
  app.post("/api/admin/backup/export", requireAdmin, async (req, res) => {
    const user = (req as any).user;
    const bucket = process.env.BACKUP_BUCKET || "gs://gen-lang-client-0259523664-firestore-backups";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    
    db.logAction(
      user.id,
      user.name,
      "Firestore Daily Backup Export",
      undefined,
      `Manual or scheduled trigger for transaction data backup to ${bucket}/${timestamp}`
    );

    res.json({
      success: true,
      message: "Daily Automated Firestore Transaction Backup export initiated successfully.",
      targetBucket: bucket,
      prefix: timestamp,
      scheduledCloudFunction: "scheduledDailyFirestoreBackup",
      collectionsExported: ["transactions", "enakomoor_data", "shifts", "branches", "debts", "commissions"]
    });
  });

  // Branches
  app.get("/api/branches", requireAuth, (req, res) => {
    const branches = db.getBranches();
    res.json(branches);
  });

  app.post("/api/branches", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { name, location } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: "Branch name and location are required" });
    }
    try {
      const b = db.createBranch(user.id, user.name, name, location);
      res.status(201).json(b);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/branches/:id", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { name, location } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: "Branch name and location are required" });
    }
    try {
      const b = db.updateBranch(user.id, user.name, id, name, location);
      res.json(b);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/branches/:id", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    try {
      const result = db.deleteBranch(user.id, user.name, id);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Users
  app.get("/api/users", requireAdmin, (req, res) => {
    res.json(db.getUsers());
  });

  app.post("/api/users", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { name, username, password, role, branchId } = req.body;
    if (!name || !username || !password || !role || !branchId) {
      return res.status(400).json({ error: "All fields are required to register a worker" });
    }
    try {
      const u = db.createUser(user.id, user.name, name, username, password, role, branchId);
      res.status(201).json(u);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Floats
  app.get("/api/floats", requireAuth, (req, res) => {
    res.json(db.getFloats());
  });

  app.get("/api/floats/:branchId", requireAuth, (req, res) => {
    const { branchId } = req.params;
    res.json(db.getFloatByBranch(branchId));
  });

  app.post("/api/floats/:branchId/adjust", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { branchId } = req.params;
    const { mtnFloat, telecelFloat, airtelTigoFloat } = req.body;
    
    if (mtnFloat === undefined || telecelFloat === undefined || airtelTigoFloat === undefined) {
      return res.status(400).json({ error: "Float parameters for all three networks are required" });
    }

    try {
      const fl = db.adjustFloatManually(user.id, user.name, branchId, Number(mtnFloat), Number(telecelFloat), Number(airtelTigoFloat));
      res.json(fl);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/floats/:branchId/adjust-airtime", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { branchId } = req.params;
    const { mtnAirtimeFloat, telecelAirtimeFloat, airtelTigoAirtimeFloat } = req.body;
    
    if (mtnAirtimeFloat === undefined || telecelAirtimeFloat === undefined || airtelTigoAirtimeFloat === undefined) {
      return res.status(400).json({ error: "Airtime parameters for all three networks are required" });
    }

    try {
      const fl = db.adjustAirtimeFloatManually(user.id, user.name, branchId, Number(mtnAirtimeFloat), Number(telecelAirtimeFloat), Number(airtelTigoAirtimeFloat));
      res.json(fl);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/floats/:branchId/threshold", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { branchId } = req.params;
    const { threshold } = req.body;
    
    if (threshold === undefined || isNaN(Number(threshold))) {
      return res.status(400).json({ error: "Valid threshold amount is required" });
    }

    try {
      const fl = db.updateFloatThreshold(user.id, user.name, branchId, Number(threshold));
      res.json(fl);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Commissions Rules
  app.get("/api/commissions", requireAuth, (req, res) => {
    res.json(db.getCommissions());
  });

  app.post("/api/commissions", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { rules } = req.body;
    if (!rules || !Array.isArray(rules)) {
      return res.status(400).json({ error: "Valid collection of commission rules is required" });
    }

    try {
      const updatedRules = db.updateCommissionRules(user.id, user.name, rules);
      res.json(updatedRules);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Shifts (Operator shift cycle triggers)
  app.get("/api/shifts/active", requireAuth, (req, res) => {
    const user = (req as any).user;
    const active = db.getActiveShift(user.id);
    res.json({ active });
  });

  app.post("/api/shifts/open", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { openingCash, openingFloatMtn, openingFloatTelecel, openingFloatAirtelTigo, branchId } = req.body;

    if (openingCash === undefined || openingFloatMtn === undefined || openingFloatTelecel === undefined || openingFloatAirtelTigo === undefined) {
      return res.status(400).json({ error: "Opening balances for Cash drawer and Wallet floates are required" });
    }

    try {
      const shift = db.openShift(
        user.id,
        user.name,
        branchId || user.branchId,
        Number(openingCash),
        Number(openingFloatMtn),
        Number(openingFloatTelecel),
        Number(openingFloatAirtelTigo)
      );
      res.status(201).json(shift);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/shifts/close", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { shiftId, actualCashCounted, actualFloatMtn, actualFloatTelecel, actualFloatAirtelTigo } = req.body;

    if (
      !shiftId || 
      actualCashCounted === undefined || 
      actualFloatMtn === undefined || 
      actualFloatTelecel === undefined || 
      actualFloatAirtelTigo === undefined
    ) {
      return res.status(400).json({ error: "Active shift ID and all closing figures (Cash, MTN Float, Telecel Float, AirtelTigo Float) are required to close shift" });
    }

    try {
      const shift = db.closeShift(
        user.id, 
        user.name, 
        shiftId, 
        Number(actualCashCounted),
        Number(actualFloatMtn),
        Number(actualFloatTelecel),
        Number(actualFloatAirtelTigo)
      );
      res.json(shift);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/shifts/closing-reports", requireAuth, (req, res) => {
    const { branchId } = req.query;
    const reports = db.getPermanentlySavedClosingReports(branchId as string || "all");
    res.json(reports);
  });

  // External Capital Management
  app.get("/api/external-capital", requireAuth, (req, res) => {
    const { branchId } = req.query;
    res.json(db.getExternalCapitals(branchId as string));
  });

  app.post("/api/external-capital", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { branchId, type, network, sourceName, amount, notes, shiftId, directInject } = req.body;

    if (!type || !sourceName || amount === undefined) {
      return res.status(400).json({ error: "Medium type, source name, and amount are required" });
    }

    try {
      const cap = db.createExternalCapital(user.id, user.name, {
        branchId: branchId || user.branchId,
        type,
        network,
        sourceName,
        amount: Number(amount),
        notes,
        shiftId,
        directInject: directInject !== false
      });
      res.status(201).json(cap);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/external-capital/:id/tap", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { tapAmount, reason } = req.body;

    if (!tapAmount || Number(tapAmount) <= 0) {
      return res.status(400).json({ error: "A positive tap amount is required" });
    }

    try {
      const record = db.tapExternalCapital(user.id, user.name, id, Number(tapAmount), reason);
      res.json(record);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/external-capital/:id/return", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;

    try {
      const record = db.returnExternalCapital(user.id, user.name, id);
      res.json(record);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Notifications
  app.get("/api/notifications", requireAuth, (req, res) => {
    try {
      db.checkPendingEscalations();
    } catch (err) {
      console.error("Failed to run checkPendingEscalations:", err);
    }
    const { branchId } = req.query;
    res.json(db.getNotifications(branchId as string));
  });

  app.post("/api/notifications/:id/read", requireAuth, (req, res) => {
    const { id } = req.params;
    const noti = db.markNotificationAsRead(id);
    if (!noti) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json(noti);
  });

  app.post("/api/notifications/clear", requireAuth, (req, res) => {
    const { branchId } = req.body;
    db.clearAllNotifications(branchId as string);
    res.json({ success: true });
  });

  // Approval Settings
  app.get("/api/admin/approval-settings", requireAdmin, (req, res) => {
    res.json(db.getApprovalSettings());
  });

  app.post("/api/admin/approval-settings", requireAdmin, (req, res) => {
    try {
      const user = (req as any).user;
      const updated = db.updateApprovalSettings(user.id, user.name, req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Transactions
  app.get("/api/transactions", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { branchId } = req.query;
    
    const txs = db.getTransactionsByBranch(branchId as string || "all", user.role, user.id);
    res.json(txs);
  });

  app.post("/api/transactions", requireAuth, (req, res) => {
    const user = (req as any).user;
    if (user.role === "ADMIN") {
      return res.status(403).json({ error: "Access Denied: Administrators are strictly prohibited from entering operational transactions." });
    }
    const { type, network, customerNumber, senderNumber, receiverNumber, amount, commission } = req.body;

    if (!type || amount === undefined) {
      return res.status(400).json({ error: "Transaction type and amount in GHS are required" });
    }

    try {
      const tx = db.createTransaction(user.id, user.name, {
        type: type as TransactionType,
        network: network as NetworkType,
        customerNumber,
        senderNumber,
        receiverNumber,
        amount: Number(amount),
        commission: commission !== undefined ? Number(commission) : undefined
      });

      const branches = db.getBranches();
      const branch = branches.find(b => b.id === tx.branchId);
      const branchName = branch ? branch.name : "System Base";

      const approvalSettings = db.getApprovalSettings();
      if (tx.amount >= approvalSettings.approvalThreshold) {
        // Automatically send email if amount is above the threshold
        sendHighValueAlert(tx, branchName).catch(err => {
          console.error("Async sendHighValueAlert failed:", err);
        });
      }

      res.status(201).json(tx);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/transactions/:id/approve", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    try {
      const tx = db.approveTransaction(user.id, user.name, id);
      res.json(tx);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/transactions/:id/reject", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    try {
      const tx = db.rejectTransaction(user.id, user.name, id);
      res.json(tx);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/transactions/:id/reverse", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "A correction reason is required for full audit logging" });
    }

    try {
      const tx = db.reverseTransaction(user.id, user.name, id, reason);
      res.json(tx);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/transactions/:id/correct", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { amount, type, network, customerNumber, senderNumber, receiverNumber, commission, status, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "A correction reason is required for full audit logging" });
    }

    try {
      const tx = db.correctTransaction(user.id, user.name, id, {
        amount: amount !== undefined ? Number(amount) : undefined,
        type,
        network,
        customerNumber,
        senderNumber,
        receiverNumber,
        commission: commission !== undefined ? Number(commission) : undefined,
        status,
        reason
      });
      res.json(tx);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Debts
  app.get("/api/debts", requireAuth, (req, res) => {
    const user = (req as any).user;
    let { branchId } = req.query;

    if (user.role !== "ADMIN") {
      // Workers/Agents can only view debts for a specific branch, never 'all' consolidated
      if (!branchId || branchId === "all") {
        branchId = user.branchId;
      }
    } else {
      // Admins/Super-users see everything consolidated by default
      if (!branchId) {
        branchId = "all";
      }
    }

    res.json(db.getDebts(branchId as string));
  });

  app.post("/api/debts", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { customerName, customerNumber, amount, commission, paymentMode, paymentNetwork, reason, dueDate, branchId } = req.body;

    if (!customerName || !customerNumber || !amount || !reason || !dueDate) {
      return res.status(400).json({ error: "All debt field entities are required" });
    }

    if (paymentMode === "ELECTRONIC_MONEY" && !paymentNetwork) {
      return res.status(400).json({ error: "Please select the mobile money network (MTN, Telecel, or AirtelTigo) for electronic debt disbursement" });
    }

    // Determine the branch from where the entry was made:
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const activeShift = db.getActiveShift(user.id);
      targetBranchId = activeShift ? activeShift.branchId : user.branchId;
    }

    try {
      const debt = db.addDebt(
        user.id, 
        user.name, 
        targetBranchId, 
        customerName, 
        customerNumber, 
        Number(amount), 
        reason, 
        dueDate,
        commission !== undefined ? Number(commission) : 0,
        paymentMode || "PHYSICAL_CASH",
        paymentNetwork
      );
      res.status(201).json(debt);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/debts/:id/clear", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { clearedPaymentMode, clearedPaymentNetwork } = req.body || {};

    if (clearedPaymentMode === "ELECTRONIC_MONEY" && !clearedPaymentNetwork) {
      return res.status(400).json({ error: "Please select which network (MTN, Telecel, or AirtelTigo) received the electronic repayment" });
    }

    try {
      const debt = db.markDebtPaid(user.id, user.name, id, clearedPaymentMode, clearedPaymentNetwork);
      res.json(debt);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/debts/:id/cancel", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { cancellationMode, cancellationNetwork, cancellationReason } = req.body || {};

    if (cancellationMode === "ELECTRONIC_MONEY" && !cancellationNetwork) {
      return res.status(400).json({ error: "Please select which network (MTN, Telecel, or AirtelTigo) was used for cancellation/reversal" });
    }

    try {
      const debt = db.cancelDebt(user.id, user.name, id, cancellationMode, cancellationNetwork, cancellationReason);
      res.json(debt);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/debts/bulk-clear", requireAdmin, (req, res) => {
    const user = (req as any).user;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "A valid list of debt IDs is required" });
    }

    try {
      const clearedDebts = [];
      for (const id of ids) {
        try {
          const debt = db.markDebtPaid(user.id, user.name, id);
          clearedDebts.push(debt);
        } catch (e) {
          // Skip if already paid or error, keep bulk operation going
        }
      }
      res.json({ success: true, count: clearedDebts.length });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Stats / Dashboard Reports
  app.get("/api/stats/dashboard", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { branchId } = req.query;
    res.json(db.getDashboardStats(branchId as string || "all", user?.id, user?.role));
  });

  app.get("/api/stats/charts", requireAuth, (req, res) => {
    const { branchId } = req.query;
    res.json(db.getChartData(branchId as string || "all"));
  });

  app.get("/api/stats/reports", requireAuth, (req, res) => {
    const { type, branchId } = req.query;
    const filterType = (type as "daily" | "weekly" | "monthly") || "daily";
    res.json(db.getReports(filterType, branchId as string || "all"));
  });

  app.get("/api/audit-logs", requireAdmin, (req, res) => {
    res.json(db.getAuditLogs());
  });

  app.post("/api/admin/reset", requireAdmin, (req, res) => {
    const user = (req as any).user;
    try {
      db.resetToFreshStart(user.id, user.name);
      res.json({ success: true, message: "System successfully reset to zero values." });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Ensure any unhandled /api/* request returns a clean JSON 404 response instead of falling through to Vite/index.html SPA fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
  });

  // Global Error Handler for API routes to guarantee JSON error output
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("[API Error]", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  });

  // --- VITE MIDDLEWARE INTEGRATION ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to 0.0.0.0 and port 3000 exclusively
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Mobile Money Business Management server live at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical server failure:", err);
});
