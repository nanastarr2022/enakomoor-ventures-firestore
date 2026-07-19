import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/server/db";
import { TransactionType, NetworkType } from "./src/types";
import { sendHighValueAlert, sendApprovalAlert, sendEscalationAlert } from "./src/server/email";

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
          name: parts[4] ? decodeURIComponent(parts[4]) : parts[1]
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

    const { user, branch } = authResult;
    // Formulate a secure self-describing Bearer token using selected active branchId for this session
    const token = `${user.id}:${user.username}:${user.role}:${user.branchId}:${encodeURIComponent(user.name)}`;
    
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
    const { shiftId, actualCashCounted } = req.body;

    if (!shiftId || actualCashCounted === undefined) {
      return res.status(400).json({ error: "Active shift ID and actual cash drawer counts are required" });
    }

    try {
      const shift = db.closeShift(user.id, user.name, shiftId, Number(actualCashCounted));
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
    const { customerName, customerNumber, amount, reason, dueDate, branchId } = req.body;

    if (!customerName || !customerNumber || !amount || !reason || !dueDate) {
      return res.status(400).json({ error: "All debt field entities are required" });
    }

    // Determine the branch from where the entry was made:
    // 1. Explicitly passed branchId from UI (active branch selector)
    // 2. Active open shift branch for the worker
    // 3. Fallback to default user branchId
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
        dueDate
      );
      res.status(201).json(debt);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/debts/:id/clear", requireAuth, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;

    try {
      const debt = db.markDebtPaid(user.id, user.name, id);
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
    const { branchId } = req.query;
    res.json(db.getDashboardStats(branchId as string || "all"));
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
