import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  User,
  Lock,
  LogOut,
  Users,
  Settings,
  History,
  FileText,
  CheckCircle,
  XCircle,
  PlusCircle,
  Percent,
  ShieldCheck,
  Building,
  Search,
  Smartphone,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
  Printer,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Bell,
  X,
  Volume2,
  VolumeX,
  Coins
} from "lucide-react";
import { 
  User as UserType, 
  Branch, 
  Shift, 
  Transaction, 
  CommissionRule, 
  Debt, 
  FloatBalance, 
  AuditLog, 
  DashboardStats,
  Notification
} from "./types";
import { motion, AnimatePresence } from "motion/react";


interface AnimatedValueProps {
  value: number;
  isCurrency?: boolean;
  className?: string;
}

const AnimatedValue: React.FC<AnimatedValueProps> = ({ value, isCurrency = false, className = "" }) => {
  const prevValueRef = useRef<number>(value);
  const [direction, setDirection] = useState<"up" | "down" | "none">("none");

  useEffect(() => {
    if (value > prevValueRef.current) {
      setDirection("up");
    } else if (value < prevValueRef.current) {
      setDirection("down");
    } else {
      setDirection("none");
    }
    prevValueRef.current = value;
  }, [value]);

  const displayValue = isCurrency ? `₵${value.toLocaleString()}` : value.toLocaleString();

  const variants = {
    initial: (dir: "up" | "down" | "none") => ({
      y: dir === "none" ? 0 : dir === "up" ? 20 : -20,
      opacity: dir === "none" ? 1 : 0
    }),
    animate: {
      y: 0,
      opacity: 1
    },
    exit: (dir: "up" | "down" | "none") => ({
      y: dir === "none" ? 0 : dir === "up" ? -20 : 20,
      opacity: dir === "none" ? 1 : 0
    })
  };

  return (
    <span className={`relative inline-flex overflow-hidden items-center ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          custom={direction}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: "spring", stiffness: 350, damping: 20 }}
          className="inline-block font-mono font-black"
        >
          {displayValue}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default function App() {
  // Authentication & Session
  const [token, setToken] = useState<string | null>(localStorage.getItem("momo_token"));
  const [currentUser, setCurrentUser] = useState<UserType | null>(
    localStorage.getItem("momo_user") ? JSON.parse(localStorage.getItem("momo_user")!) : null
  );
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(
    localStorage.getItem("momo_branch") ? JSON.parse(localStorage.getItem("momo_branch")!) : null
  );

  // Login credentials and branch selections
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginBranchId, setLoginBranchId] = useState<string>("");
  const [publicBranches, setPublicBranches] = useState<Branch[]>([]);
  const [authView, setAuthView] = useState<"login" | "forgot" | "reset">("login");
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Core navigation tabs
  // "dashboard" | "transactions" | "debts" | "closing" | "commissions" | "reports" | "branches_workers" | "audit"
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Subtle pulse animation for the branch context selector on first load
  const [pulseBranchSelector, setPulseBranchSelector] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPulseBranchSelector(false);
    }, 4500); // Pulse for 4.5 seconds to anchor attention, then fade back to normal
    return () => clearTimeout(timer);
  }, []);

  // Admin filter variables
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    try {
      const cachedUser = localStorage.getItem("momo_user");
      const cachedBranch = localStorage.getItem("momo_branch");
      if (cachedUser && cachedBranch) {
        const user = JSON.parse(cachedUser);
        const branch = JSON.parse(cachedBranch);
        if (user.role === "WORKER") {
          return branch.id;
        }
      }
    } catch (e) {
      // safe fallback
    }
    return "all";
  });

  // State for searchable branch dropdown
  const [isBranchSearchOpen, setIsBranchSearchOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState("");

  // Master Data State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartMetric, setChartMetric] = useState<"profit" | "volume">("profit");
  const [isSimplifiedMode, setIsSimplifiedMode] = useState<boolean>(() => localStorage.getItem("momo_simplified_mode") === "true");

  const toggleSimplifiedMode = () => {
    setIsSimplifiedMode(prev => {
      const next = !prev;
      localStorage.setItem("momo_simplified_mode", String(next));
      return next;
    });
  };

  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [commissions, setCommissions] = useState<CommissionRule[]>([]);
  const [floatBalances, setFloatBalances] = useState<FloatBalance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [closingReports, setClosingReports] = useState<Shift[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [approvalSettings, setApprovalSettings] = useState<any>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState<boolean>(false);
  const [isAlarmMuted, setIsAlarmMuted] = useState<boolean>(false);

  const overdueDebtsCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return debts.filter(d => {
      if (d.status !== "OUTSTANDING") return false;
      const due = new Date(d.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).length;
  }, [debts]);

  const pendingApprovalsCount = useMemo(() => {
    return transactions.filter(t => t.status === "PENDING_APPROVAL").length;
  }, [transactions]);

  const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("enakomoor_theme");
    return (saved as "light" | "dark") || "light";
  });

  useEffect(() => {
    localStorage.setItem("enakomoor_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Visual highlights and feedback states
  const [profitHighlight, setProfitHighlight] = useState(false);

  useEffect(() => {
    if (profitHighlight) {
      const timer = setTimeout(() => {
        setProfitHighlight(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [profitHighlight]);

  // Low-float state and alert systems
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({});

  const lowFloatAlerts = useMemo(() => {
    if (!token || !currentUser || floatBalances.length === 0) return [];
    
    // Filter by currently selected branch. If 'all', check all branches.
    const targetBalances = floatBalances.filter(f => {
      if (selectedBranchId !== "all") {
        return f.branchId === selectedBranchId;
      }
      return true;
    });

    const alerts: Array<{
      branchId: string;
      branchName: string;
      network: string;
      balance: number;
      threshold: number;
    }> = [];

    targetBalances.forEach(f => {
      const branch = branches.find(b => b.id === f.branchId);
      const branchName = branch ? branch.name : f.branchId;

      // MTN Threshold: 2000 GHS
      if (f.mtnFloat < 2000) {
        alerts.push({
          branchId: f.branchId,
          branchName,
          network: "MTN",
          balance: f.mtnFloat,
          threshold: 2000
        });
      }
      // Telecel Threshold: 1000 GHS
      if (f.telecelFloat < 1000) {
        alerts.push({
          branchId: f.branchId,
          branchName,
          network: "Telecel",
          balance: f.telecelFloat,
          threshold: 1000
        });
      }
      // AirtelTigo Threshold: 500 GHS
      if (f.airtelTigoFloat < 500) {
        alerts.push({
          branchId: f.branchId,
          branchName,
          network: "AirtelTigo",
          balance: f.airtelTigoFloat,
          threshold: 500
        });
      }
    });

    return alerts;
  }, [floatBalances, currentUser, selectedBranchId, branches, token]);

  // Automatic Audio Alarm for low float alerts
  useEffect(() => {
    if (lowFloatAlerts.length === 0 || isAlarmMuted) return;

    const playSiren = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        
        // Pulse 1
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0.12, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.15);

        // Pulse 2 (slight delay)
        setTimeout(() => {
          try {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(880, ctx.currentTime);
            gain2.gain.setValueAtTime(0.12, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.15);
          } catch (err) {}
        }, 200);
      } catch (e) {
        console.warn("Audio Context not supported or blocked by user gesture", e);
      }
    };

    // Play once immediately
    playSiren();

    // Loop every 3.5 seconds
    const interval = setInterval(playSiren, 3500);
    return () => clearInterval(interval);
  }, [lowFloatAlerts, isAlarmMuted]);

  const activeToasts = useMemo(() => {
    return lowFloatAlerts.filter(alert => {
      const key = `${alert.branchId}-${alert.network}-${alert.balance}`;
      return !dismissedAlerts[key];
    });
  }, [lowFloatAlerts, dismissedAlerts]);

  const handleDismissAlert = (branchId: string, network: string, balance: number) => {
    const key = `${branchId}-${network}-${balance}`;
    setDismissedAlerts(prev => ({
      ...prev,
      [key]: true
    }));
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      const headers = { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearNotifications = async () => {
    try {
      const headers = { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };
      const res = await fetch("/api/notifications/clear", {
        method: "POST",
        headers,
        body: JSON.stringify({ branchId: selectedBranchId })
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Form states and UI Modal triggers
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [quickBranchName, setQuickBranchName] = useState("");
  const [quickBranchLoc, setQuickBranchLoc] = useState("");
  const [quickBranchError, setQuickBranchError] = useState("");
  const [quickBranchSuccess, setQuickBranchSuccess] = useState("");
  const [txType, setTxType] = useState<"deposit" | "withdrawal" | "send_money" | "airtime">("deposit");
  const [txNetwork, setTxNetwork] = useState<"MTN" | "TELECEL" | "AIRTELTIGO">("MTN");
  const [customerNumber, setCustomerNumber] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [receiverNumber, setReceiverNumber] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txCommission, setTxCommission] = useState("");
  const [txError, setTxError] = useState("");
  const [txSuccess, setTxSuccess] = useState("");

  const [openingCash, setOpeningCash] = useState("");
  const [openingMtn, setOpeningMtn] = useState("");
  const [openingTelecel, setOpeningTelecel] = useState("");
  const [openingAirtel, setOpeningAirtel] = useState("");
  const [shiftError, setShiftError] = useState("");

  const [newDebtName, setNewDebtName] = useState("");
  const [newDebtNum, setNewDebtNum] = useState("");
  const [newDebtAmt, setNewDebtAmt] = useState("");
  const [newDebtReason, setNewDebtReason] = useState("");
  const [newDebtDue, setNewDebtDue] = useState("");
  const [debtMsg, setDebtMsg] = useState("");

  const [actualCash, setActualCash] = useState("");
  const [closingSuccess, setClosingSuccess] = useState<Shift | null>(null);

  // Admin forms
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchLoc, setNewBranchLoc] = useState("");

  // Branch editing states
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState("");
  const [editingBranchName, setEditingBranchName] = useState("");
  const [editingBranchLoc, setEditingBranchLoc] = useState("");
  const [editBranchError, setEditBranchError] = useState("");
  const [editBranchSuccess, setEditBranchSuccess] = useState("");
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerUser, setNewWorkerUser] = useState("");
  const [newWorkerPass, setNewWorkerPass] = useState("");
  const [showWorkerRegPass, setShowWorkerRegPass] = useState(false);
  const [newWorkerRole, setNewWorkerRole] = useState<"ADMIN" | "WORKER">("WORKER");
  const [newWorkerBranch, setNewWorkerBranch] = useState("");

  const [thresholdVal, setThresholdVal] = useState("");
  const [customFloats, setCustomFloats] = useState<Record<string, { mtn: string; tel: string; art: string }>>({});
  const [customAirtimeFloats, setCustomAirtimeFloats] = useState<Record<string, { mtn: string; tel: string; art: string }>>({});

  // Search/Filters
  const [phoneSearch, setPhoneSearch] = useState("");
  const [reportsRange, setReportsRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const [reportRows, setReportRows] = useState<any[]>([]);

  // Correction flow states
  const [selectedTxForCorrection, setSelectedTxForCorrection] = useState<Transaction | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionError, setCorrectionError] = useState("");

  // Print view or summary export
  const [isPrinting, setIsPrinting] = useState(false);

  // Initialize
  useEffect(() => {
    if (!token) {
      fetch("/api/public/branches")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPublicBranches(data);
            if (data.length > 0) {
              setLoginBranchId(data[0].id);
            } else {
              setLoginBranchId("all");
            }
          }
        })
        .catch(err => console.error("Could not fetch login branches", err));
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMasterData();
      checkActiveShift();

      const intervalId = setInterval(() => {
        fetchMasterData();
        checkActiveShift();
      }, 5000); // Poll every 5 seconds for real-time updates and live alerts

      return () => clearInterval(intervalId);
    }
  }, [token, selectedBranchId, activeTab]);

  const fetchMasterData = async () => {
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      
      // Load branches
      const branchRes = await fetch("/api/branches", { headers });
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(branchData);
        if (branchData.length > 0 && !newWorkerBranch) {
          setNewWorkerBranch(branchData[0].id);
        }
      }

      // Load Statistics
      const statRes = await fetch(`/api/stats/dashboard?branchId=${selectedBranchId}`, { headers });
      if (statRes.ok) {
        setStats(await statRes.json());
      }

      // Load chart figures
      const chartRes = await fetch(`/api/stats/charts?branchId=${selectedBranchId}`, { headers });
      if (chartRes.ok) {
        setChartData(await chartRes.json());
      }

      // Load Transactions
      const txRes = await fetch(`/api/transactions?branchId=${selectedBranchId}`, { headers });
      if (txRes.ok) {
        setTransactions(await txRes.json());
      }

      // Load Debts
      const debtRes = await fetch(`/api/debts?branchId=${selectedBranchId}`, { headers });
      if (debtRes.ok) {
        setDebts(await debtRes.json());
      }

      // Load Commissions Rules
      const commRes = await fetch("/api/commissions", { headers });
      if (commRes.ok) {
        setCommissions(await commRes.json());
      }

      // Load Floats
      const floatRes = await fetch("/api/floats", { headers });
      if (floatRes.ok) {
        const fList = await floatRes.json();
        setFloatBalances(fList);
        
        // Setup state variables for custom float adjustments
        const states: any = {};
        fList.forEach((f: FloatBalance) => {
          states[f.branchId] = {
            mtn: String(f.mtnFloat),
            tel: String(f.telecelFloat),
            art: String(f.airtelTigoFloat)
          };
        });
        setCustomFloats(states);
      }

      // Load Audit logs if Admin
      if (currentUser?.role === "ADMIN") {
        const logRes = await fetch("/api/audit-logs", { headers });
        if (logRes.ok) {
          setAuditLogs(await logRes.json());
        }
      }

      // Load closing reports
      const reportsRes = await fetch(`/api/shifts/closing-reports?branchId=${selectedBranchId}`, { headers });
      if (reportsRes.ok) {
        setClosingReports(await reportsRes.json());
      }

      // Load shortage notifications if Admin
      if (currentUser?.role === "ADMIN") {
        const notiRes = await fetch(`/api/notifications?branchId=${selectedBranchId}`, { headers });
        if (notiRes.ok) {
          setNotifications(await notiRes.json());
        }

        const appRes = await fetch("/api/admin/approval-settings", { headers });
        if (appRes.ok) {
          setApprovalSettings(await appRes.json());
        }
      }

      // Load parameterized reports table
      const parameterizedReportsRes = await fetch(`/api/stats/reports?type=${reportsRange}&branchId=${selectedBranchId}`, { headers });
      if (parameterizedReportsRes.ok) {
        setReportRows(await parameterizedReportsRes.json());
      }

    } catch (e) {
      console.error("Networking payload error", e);
    }
  };

  const checkActiveShift = async () => {
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      const shiftRes = await fetch("/api/shifts/active", { headers });
      if (shiftRes.ok) {
        const data = await shiftRes.json();
        setActiveShift(data.active);
        if (data.active) {
          // Prepopulate floats based on current open shift configuration
          setOpeningCash(String(data.active.openingCash));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, branchId: loginBranchId })
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Authentication failed. Try again.");
        setIsLoggingIn(false);
        return;
      }

      // Save token state
      setToken(data.token);
      setCurrentUser(data.user);
      setCurrentBranch(data.branch);

      if (data.user.role === "WORKER") {
        setSelectedBranchId(data.branch.id);
      } else {
        setSelectedBranchId("all");
      }

      if (rememberMe) {
        localStorage.setItem("momo_token", data.token);
        localStorage.setItem("momo_user", JSON.stringify(data.user));
        localStorage.setItem("momo_branch", JSON.stringify(data.branch));
      }

    } catch (e) {
      setLoginError("Could not reach auth server");
    } finally {
      setIsLoggingIn(false);
    }
  };
  const handleForgotPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setForgotError("");
  setForgotSuccess("");
  setIsSubmittingForgot(true);
  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: forgotUsername })
    });
    const data = await res.json();
    if (!res.ok) {
      setForgotError(data.error || "Could not process request.");
      setIsSubmittingForgot(false);
      return;
    }
    setForgotSuccess(data.message || "A reset code has been sent.");
    setAuthView("reset");
  } catch (e) {
    setForgotError("Could not reach server.");
  } finally {
    setIsSubmittingForgot(false);
  }
};

const handleResetPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setResetError("");
  setResetSuccess("");
  setIsSubmittingReset(true);
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: forgotUsername, code: resetCode, newPassword: resetNewPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      setResetError(data.error || "Could not reset password.");
      setIsSubmittingReset(false);
      return;
    }
    setResetSuccess("Password reset successfully! You can now log in.");
    setTimeout(() => {
      setAuthView("login");
      setForgotUsername("");
      setResetCode("");
      setResetNewPassword("");
      setResetSuccess("");
    }, 2000);
  } catch (e) {
    setResetError("Could not reach server.");
  } finally {
    setIsSubmittingReset(false);
  }
};
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
    } catch (e) {
      // safe fallback
    }

    setToken(null);
    setCurrentUser(null);
    setCurrentBranch(null);
    setActiveShift(null);
    setSelectedBranchId("all");
    localStorage.removeItem("momo_token");
    localStorage.removeItem("momo_user");
    localStorage.removeItem("momo_branch");
    setActiveTab("dashboard");
  };
  const handleBranchSwitch = (newBranchId: string) => {
  if (currentUser?.role === "WORKER" && newBranchId !== selectedBranchId) {
    alert("Switching branches requires you to log in again for security purposes.");
    handleLogout();
    return;
  }
  setSelectedBranchId(newBranchId);
  setPulseBranchSelector(false);
};
  
  const handleSessionInvalidated = () => {
    alert("You have been logged out because your account was used to log in on another device.");
    handleLogout();
  };
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setShiftError("");

    if (!openingCash || !openingMtn || !openingTelecel || !openingAirtel) {
      setShiftError("Please enter all opening cash and float balances");
      return;
    }

    try {
      const res = await fetch("/api/shifts/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
      });
        if (branchRes.status === 401) {
        const errData = await branchRes.json();
        if (errData.error === "SESSION_INVALIDATED") {
          handleSessionInvalidated();
          return;
        }
      }
        body: JSON.stringify({
          openingCash: Number(openingCash),
          openingFloatMtn: Number(openingMtn),
          openingFloatTelecel: Number(openingTelecel),
          openingFloatAirtelTigo: Number(openingAirtel),
          branchId: selectedBranchId !== "all" ? selectedBranchId : (currentBranch?.id || "branch-a")
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setShiftError(data.error || "Could not initialize shift.");
        return;
      }

      setActiveShift(data);
      setShiftError("");
      fetchMasterData();
    } catch (err) {
      setShiftError("Connection failure while opening shift.");
    }
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCash) {
      alert("Please enter the actual cash counted from the drawer.");
      return;
    }

    try {
      const res = await fetch("/api/shifts/close", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          shiftId: activeShift?.id,
          actualCashCounted: Number(actualCash)
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "Could not complete shift closing");
        return;
      }

      const closedReport = await res.json();
      setClosingSuccess(closedReport);
      setActiveShift(null);
      setActualCash("");
      fetchMasterData();
    } catch (err) {
      alert("Error logging and storing closed report");
    }
  };

  const handleAmountChange = (amountVal: string, typeVal: typeof txType) => {
    setTxAmount(amountVal);
  };

  const handleTypeChange = (newType: typeof txType) => {
    setTxType(newType);
    setTxError("");
    handleAmountChange(txAmount, newType);
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError("");
    setTxSuccess("");

    if (!txAmount) {
      setTxError("Please specify a transaction amount.");
      return;
    }

    const payload: any = {
      type: txType,
      amount: Number(txAmount)
    };

    if (txCommission !== "") {
      payload.commission = Number(txCommission);
    }

    payload.network = txNetwork;

    if (!customerNumber) {
      setTxError("Customer handset phone number is required.");
      return;
    }
    payload.customerNumber = customerNumber;

    if (txType === "send_money") {
      // Set sender and receiver numbers as well for backwards compatibility
      payload.senderNumber = customerNumber;
      payload.receiverNumber = customerNumber;
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setTxError(data.error || "Failed to save transaction.");
        return;
      }

      setTxSuccess(`Transaction recorded successfully! ID: ${data.id}`);
      // clear relevant inputs
      setTxAmount("");
      setTxCommission("");
      setCustomerNumber("");
      setSenderNumber("");
      setReceiverNumber("");
      setProfitHighlight(true);
      fetchMasterData();
    } catch (err) {
      setTxError("Internal system network error");
    }
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebtMsg("");
    if (!newDebtName || !newDebtNum || !newDebtAmt || !newDebtReason || !newDebtDue) {
      setDebtMsg("All fields are required to secure an outstanding debt log.");
      return;
    }

    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          customerName: newDebtName,
          customerNumber: newDebtNum,
          amount: Number(newDebtAmt),
          reason: newDebtReason,
          dueDate: newDebtDue,
          branchId: activeBranch?.id || currentBranch?.id || "branch-a"
        })
      });

      if (res.ok) {
        setDebtMsg("Debt entered into records successfully.");
        setNewDebtName("");
        setNewDebtNum("");
        setNewDebtAmt("");
        setNewDebtReason("");
        setNewDebtDue("");
        fetchMasterData();
      } else {
        const error = await res.json();
        setDebtMsg(error.error || "Could not log debt");
      }
    } catch (err) {
      setDebtMsg("Connection error adding customer debt");
    }
  };

  const handleClearDebt = async (debtId: string) => {
    try {
      const res = await fetch(`/api/debts/${debtId}/clear`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        setDebtMsg("Debt payoff approved successfully.");
        fetchMasterData();
      } else {
        const error = await res.json();
        setDebtMsg(error.error || "Failed to clear debt");
      }
    } catch (err) {
      setDebtMsg("Connection issue executing task");
    }
  };

  const handleBulkClearDebts = async () => {
    if (selectedDebtIds.length === 0) return;

    try {
      const res = await fetch("/api/debts/bulk-clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedDebtIds })
      });

      if (res.ok) {
        setSelectedDebtIds([]);
        setDebtMsg("Selected debts bulk cleared successfully.");
        fetchMasterData();
      } else {
        const error = await res.json();
        setDebtMsg(error.error || "Failed to bulk clear debts");
      }
    } catch (err) {
      setDebtMsg("Connection issue executing task");
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchLoc) {
      alert("Specify branch name and location.");
      return;
    }

    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: newBranchName, location: newBranchLoc })
      });

      if (res.ok) {
        alert("Branch successfully added to network!");
        setNewBranchName("");
        setNewBranchLoc("");
        fetchMasterData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      alert("Network failure processing request");
    }
  };

  const handleCreateBranchQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBranchName || !quickBranchLoc) {
      setQuickBranchError("Please fill in both branch name and location.");
      return;
    }
    setQuickBranchError("");
    setQuickBranchSuccess("");

    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: quickBranchName, location: quickBranchLoc })
      });

      if (res.ok) {
        setQuickBranchSuccess("Branch successfully added to network!");
        setQuickBranchName("");
        setQuickBranchLoc("");
        fetchMasterData();
        // Auto close after 1.5s
        setTimeout(() => {
          setIsAddBranchOpen(false);
          setQuickBranchSuccess("");
        }, 1500);
      } else {
        const data = await res.json();
        setQuickBranchError(data.error || "Failed to create branch");
      }
    } catch (e) {
      setQuickBranchError("Network failure processing request");
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranchName || !editingBranchLoc) {
      setEditBranchError("Please fill in both branch name and location.");
      return;
    }
    setEditBranchError("");
    setEditBranchSuccess("");

    try {
      const res = await fetch(`/api/branches/${editingBranchId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: editingBranchName, location: editingBranchLoc })
      });

      if (res.ok) {
        setEditBranchSuccess("Branch updated successfully!");
        fetchMasterData();
        // Auto close after 1.5s
        setTimeout(() => {
          setIsEditBranchOpen(false);
          setEditBranchSuccess("");
        }, 1500);
      } else {
        const data = await res.json();
        setEditBranchError(data.error || "Failed to update branch");
      }
    } catch (e) {
      setEditBranchError("Network failure processing request");
    }
  };

  const handleDeleteBranch = async () => {
    if (!editingBranchId) return;
    if (!window.confirm(`Are you sure you want to delete "${editingBranchName}"? This action cannot be undone and will delete associated float parameters.`)) {
      return;
    }
    
    setEditBranchError("");
    setEditBranchSuccess("");

    try {
      const res = await fetch(`/api/branches/${editingBranchId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        setEditBranchSuccess("Branch deleted successfully!");
        fetchMasterData();
        if (selectedBranchId === editingBranchId) {
          setSelectedBranchId("all");
        }
        setTimeout(() => {
          setIsEditBranchOpen(false);
          setEditBranchSuccess("");
        }, 1500);
      } else {
        const data = await res.json();
        setEditBranchError(data.error || "Failed to delete branch");
      }
    } catch (e) {
      setEditBranchError("Network failure processing request");
    }
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName || !newWorkerUser || !newWorkerPass || !newWorkerBranch) {
      alert("All fields are required to register a worker.");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newWorkerName,
          username: newWorkerUser,
          password: newWorkerPass,
          role: newWorkerRole,
          branchId: newWorkerBranch
        })
      });

      if (res.ok) {
        alert("User successfully added to system database.");
        setNewWorkerName("");
        setNewWorkerUser("");
        setNewWorkerPass("");
        fetchMasterData();
      } else {
        const data = await res.json();
        alert(data.error || "Could not register worker profile");
      }
    } catch (e) {
      alert("Process abort error");
    }
  };

  const handleAdjustFloat = async (branchId: string) => {
    const vals = customFloats[branchId];
    if (!vals || vals.mtn === "" || vals.tel === "" || vals.art === "") {
      alert("Enter the float values first.");
      return;
    }

    try {
      const res = await fetch(`/api/floats/${branchId}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mtnFloat: Number(vals.mtn),
          telecelFloat: Number(vals.tel),
          airtelTigoFloat: Number(vals.art)
        })
      });

      if (res.ok) {
        alert("Branch floats updated in system records!");
        fetchMasterData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      alert("Error pushing balance adjustments");
    }
  };

  const handleAdjustAirtimeFloat = async (branchId: string) => {
    const vals = customAirtimeFloats[branchId];
    if (!vals || vals.mtn === "" || vals.tel === "" || vals.art === "") {
      alert("Enter the airtime float values first.");
      return;
    }

    try {
      const res = await fetch(`/api/floats/${branchId}/adjust-airtime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mtnAirtimeFloat: Number(vals.mtn),
          telecelAirtimeFloat: Number(vals.tel),
          airtelTigoAirtimeFloat: Number(vals.art)
        })
      });

      if (res.ok) {
        alert("Branch airtime wallet balances updated successfully!");
        fetchMasterData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      alert("Error pushing airtime adjustments");
    }
  };

  const handleAdjustThreshold = async (branchId: string) => {
    if (!thresholdVal) {
      alert("Please specify a threshold amount");
      return;
    }

    try {
      const res = await fetch(`/api/floats/${branchId}/threshold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ threshold: Number(thresholdVal) })
      });

      if (res.ok) {
        alert("Low-float threshold updated successfully!");
        setThresholdVal("");
        fetchMasterData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      alert("Error updating threshold value");
    }
  };

  const [isExportingTxs, setIsExportingTxs] = useState(false);
  const [isExportingDebts, setIsExportingDebts] = useState(false);
  const [isExportingShifts, setIsExportingShifts] = useState(false);

  const downloadCSVFile = (csvContent: string, filename: string) => {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const escapeCSVValue = (val: any) => {
    const str = String(val === undefined || val === null ? "" : val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportTransactionsCSV = async () => {
    setIsExportingTxs(true);
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      const res = await fetch("/api/transactions?branchId=all", { headers });
      if (!res.ok) throw new Error("Failed to fetch global transactions list.");
      const allTxs: Transaction[] = await res.json();
      
      const csvHeaders = [
        "Transaction ID",
        "Timestamp (ISO)",
        "Formatted Local Date & Time",
        "Shift ID",
        "Branch ID",
        "Branch Name",
        "Operator ID",
        "Operator Name",
        "Transaction Type",
        "Network Provider",
        "Customer Momo Number",
        "Sender Mobile Number",
        "Receiver Mobile Number",
        "Amount (GHS)",
        "Worker Earned Commission (GHS)",
        "Record Status",
        "Corrected By",
        "Correction Reason"
      ];

      const csvRows = allTxs.map(t => {
        const branchName = branches.find(b => b.id === t.branchId)?.name || t.branchId;
        return [
          t.id,
          t.recordedAt,
          new Date(t.recordedAt).toLocaleString(),
          t.shiftId,
          t.branchId,
          branchName,
          t.userId,
          t.userName,
          t.type.toUpperCase(),
          t.network || "N/A",
          t.customerNumber || "N/A",
          t.senderNumber || "N/A",
          t.receiverNumber || "N/A",
          t.amount,
          t.commission,
          t.status,
          t.correctedBy || "N/A",
          t.correctionReason || "N/A"
        ].map(escapeCSVValue).join(",");
      });

      const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
      downloadCSVFile(csvContent, `historical_transactions_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error: any) {
      alert("Error exporting transactions: " + error.message);
    } finally {
      setIsExportingTxs(false);
    }
  };

  const handleExportDebtsCSV = async () => {
    setIsExportingDebts(true);
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      const res = await fetch("/api/debts?branchId=all", { headers });
      if (!res.ok) throw new Error("Failed to fetch global debtor list.");
      const allDebts: Debt[] = await res.json();

      const csvHeaders = [
        "Debt Record ID",
        "Branch ID",
        "Branch Name",
        "Customer Full Name",
        "Customer Active Mobile",
        "Loan/Debt Amount (GHS)",
        "Reason for Debt / Narrative",
        "Due Settlement Date (YYYY-MM-DD)",
        "Recorded By Worker",
        "Settlement Status",
        "Cleared At Timestamp",
        "Cleared By User"
      ];

      const csvRows = allDebts.map(d => {
        const branchName = branches.find(b => b.id === d.branchId)?.name || d.branchId;
        return [
          d.id,
          d.branchId,
          branchName,
          d.customerName,
          d.customerNumber,
          d.amount,
          d.reason,
          d.dueDate,
          d.recordedByUserName,
          d.status,
          d.clearedAt ? new Date(d.clearedAt).toLocaleString() : "N/A",
          d.clearedByUserName || "N/A"
        ].map(escapeCSVValue).join(",");
      });

      const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
      downloadCSVFile(csvContent, `debt_records_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error: any) {
      alert("Error exporting debt records: " + error.message);
    } finally {
      setIsExportingDebts(false);
    }
  };

  const handleExportShiftsCSV = async () => {
    setIsExportingShifts(true);
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      const res = await fetch("/api/shifts/closing-reports?branchId=all", { headers });
      if (!res.ok) throw new Error("Failed to fetch global shift logs.");
      const allShifts: Shift[] = await res.json();

      const csvHeaders = [
        "Shift Log ID",
        "Business Date",
        "Shift Start Timestamp",
        "Shift End Timestamp",
        "Branch ID",
        "Branch Name",
        "Worker User ID",
        "Worker Full Name",
        "Opening Cash Drawer (GHS)",
        "Opening MTN MOMO Float (GHS)",
        "Opening Telecel MOMO Float (GHS)",
        "Opening AirtelTigo MOMO Float (GHS)",
        "Calculated Expected Cash (GHS)",
        "Worker Counted Handed Cash (GHS)",
        "Discrepancy / Variance (GHS)",
        "Current Handover Status"
      ];

      const csvRows = allShifts.map(s => {
        const branchName = branches.find(b => b.id === s.branchId)?.name || s.branchId;
        return [
          s.id,
          s.date,
          s.startTime,
          s.endTime || "N/A",
          s.branchId,
          branchName,
          s.userId,
          s.userName,
          s.openingCash,
          s.openingFloatMtn,
          s.openingFloatTelecel,
          s.openingFloatAirtelTigo,
          s.expectedCash || 0,
          s.actualCash || 0,
          s.difference || 0,
          s.status
        ].map(escapeCSVValue).join(",");
      });

      const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
      downloadCSVFile(csvContent, `shift_closing_reports_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error: any) {
      alert("Error exporting shift reports: " + error.message);
    } finally {
      setIsExportingShifts(false);
    }
  };

  const handleReverseTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrectionError("");
    if (!selectedTxForCorrection) return;
    if (!correctionReason) {
      setCorrectionError("A valid correction reason is required for audit logs.");
      return;
    }

    try {
      const res = await fetch(`/api/transactions/${selectedTxForCorrection.id}/reverse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ reason: correctionReason })
      });

      if (res.ok) {
        alert("Transaction status set to REVERSED. Balances adjusted.");
        setSelectedTxForCorrection(null);
        setCorrectionReason("");
        fetchMasterData();
      } else {
        const data = await res.json();
        setCorrectionError(data.error);
      }
    } catch (e) {
      setCorrectionError("Internal communication error");
    }
  };

  const handleApproveTransaction = async (txId: string) => {
    try {
      const res = await fetch(`/api/transactions/${txId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert("Transaction approved successfully!");
        fetchMasterData();
      } else {
        const data = await res.json();
        alert(`Failed to approve: ${data.error}`);
      }
    } catch (err) {
      alert("Communication error.");
    }
  };

  const handleRejectTransaction = async (txId: string) => {
    try {
      const res = await fetch(`/api/transactions/${txId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert("Transaction rejected and cancelled successfully.");
        fetchMasterData();
      } else {
        const data = await res.json();
        alert(`Failed to reject: ${data.error}`);
      }
    } catch (err) {
      alert("Communication error.");
    }
  };

  const handleSaveApprovalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalSettings) return;
    setIsUpdatingSettings(true);
    try {
      const res = await fetch("/api/admin/approval-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(approvalSettings)
      });
      if (res.ok) {
        setApprovalSettings(await res.json());
        alert("Security and approval settings saved successfully!");
      } else {
        const data = await res.json();
        alert(`Error saving settings: ${data.error}`);
      }
    } catch (err) {
      alert("Communication error.");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const updateSettingsField = (key: string, value: any) => {
    setApprovalSettings((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetToFreshStart = async () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will permanently wipe out all shifts, transactions, debtor records, and audit logs. The system will reset all float balances to GHS 0.00 for a completely clean testing slate. Are you absolutely sure you want to proceed?"
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        alert("❇️ System reset complete! All figures have been set to 0. You can now start entering fresh testing figures!");
        fetchMasterData();
        checkActiveShift();
      } else {
        const err = await res.json();
        alert(`Could not reset system: ${err.error}`);
      }
    } catch (e) {
      alert("Network payload error resetting values.");
    }
  };

  const printReport = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  // Filter transactions by phone search
  const filteredTxs = transactions.filter(t => {
    if (!phoneSearch) return true;
    const query = phoneSearch.toLowerCase();
    return (
      (t.customerNumber && t.customerNumber.includes(query)) ||
      (t.senderNumber && t.senderNumber.includes(query)) ||
      (t.receiverNumber && t.receiverNumber.includes(query))
    );
  });

  // Dynamic active branch based on selector, falling back to currentBranch
  const activeBranch = (selectedBranchId !== "all") 
    ? (branches.find(b => b.id === selectedBranchId) || currentBranch) 
    : currentBranch;

  // Distribution of transactions by network
  const networkDistribution = useMemo(() => {
    let mtnCount = 0;
    let telecelCount = 0;
    let airtelCount = 0;
    let mtnVol = 0;
    let telecelVol = 0;
    let airtelVol = 0;

    transactions.forEach(t => {
      if (t.status === "ACTIVE") {
        const net = t.network?.toUpperCase();
        if (net === "MTN") {
          mtnCount++;
          mtnVol += t.amount;
        } else if (net === "TELECEL") {
          telecelCount++;
          telecelVol += t.amount;
        } else if (net === "AIRTELTIGO") {
          airtelCount++;
          airtelVol += t.amount;
        }
      }
    });

    const totalCount = mtnCount + telecelCount + airtelCount;
    const totalVol = mtnVol + telecelVol + airtelVol;

    const total = totalCount || 1;
    const pctMtn = (mtnCount / total) * 100;
    const pctTelecel = (telecelCount / total) * 100;
    const pctAirtel = (airtelCount / total) * 100;

    return {
      mtnCount,
      telecelCount,
      airtelCount,
      mtnVol,
      telecelVol,
      airtelVol,
      totalCount,
      totalVol,
      pctMtn,
      pctTelecel,
      pctAirtel
    };
  }, [transactions]);

  // Current branch float balance read-outs and low alerts
  const currentBranchFloat = activeBranch ? floatBalances.find(f => f.branchId === activeBranch.id) : null;
  const isBranchLowFloatMTN = currentBranchFloat ? currentBranchFloat.mtnFloat < currentBranchFloat.lowFloatThreshold : false;
  const isBranchLowFloatTELECEL = currentBranchFloat ? currentBranchFloat.telecelFloat < currentBranchFloat.lowFloatThreshold : false;
  const isBranchLowFloatAIRTEL = currentBranchFloat ? currentBranchFloat.airtelTigoFloat < currentBranchFloat.lowFloatThreshold : false;

  // Render Login page if not authorized
  if (!token) {
    return (
      <div id="login_container" className="min-h-screen bg-neutral-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-4 right-4">
          <button
            id="login_theme_toggle_btn"
            onClick={() => setTheme(t => t.startsWith("light") ? "dark" : "light")}
            className="p-2.5 rounded-lg bg-white border border-neutral-200 text-neutral-600 shadow hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center"
            title={theme.startsWith("light") ? "Switch to Dark Theme" : "Switch to Light Theme"}
          >
            {theme.startsWith("light") ? <Moon className="size-5 text-slate-700" /> : <Sun className="size-5 text-amber-500" />}
          </button>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Momo themed badge */}
          <div className="flex justify-center flex-col items-center">
            <div className="h-20 w-20 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/10 border-4 border-yellow-400 overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/d/1PP4GNDHD-BNRrBd6Y3q_Fwq1wX4tzG8k" 
                alt="Enakomoor Ventures Logo" 
                className="w-full h-full object-cover animate-fade-in"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('login_logo_fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div id="login_logo_fallback" className="hidden font-black text-3xl text-blue-600 font-sans">
                ₵
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-navy-dark tracking-tight">
              Enakomoor Ventures
            </h2>
            <p className="mt-2 text-center text-xs font-semibold text-blue-600 uppercase tracking-wider">
              GHANA MOBILE MONEY BUSINESS PLATFORM
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl border border-neutral-200 rounded-2xl sm:px-10">
            {authView === "login" && (
            <form id="login_form" onSubmit={handleLogin} className="space-y-6">
              {loginError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 flex items-start gap-2 rounded-r-lg">
                  <AlertTriangle className="size-5 shrink-0 text-red-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700">Username</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="username_field"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Enter operator username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="password_field"
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 focus:outline-none cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Select Branch Terminal</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-neutral-400" />
                  </div>
                  <select
                    id="login_branch_selector"
                    required
                    value={loginBranchId}
                    onChange={(e) => setLoginBranchId(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {publicBranches.length === 0 ? (
                      <option value="all">🏢 System Base (New Setup)</option>
                    ) : (
                      publicBranches.map(b => (
                        <option key={b.id} value={b.id}>🏢 {b.name} ({b.location})</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember_me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
                  />
                  <label htmlFor="remember_me" className="ml-2 block text-sm text-neutral-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
  <button
    type="button"
    onClick={() => {
      setAuthView("forgot");
      setForgotError("");
      setForgotSuccess("");
    }}
    className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
  >
    Forgot password?
  </button>
</div>
              </div>

              <button
                id="submit_login_btn"
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? "Verifying..." : "Login to Terminal"}
              </button>
              
            </form>
          )}

          {authView === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-navy-dark">Reset Your Password</h3>
                <p className="text-xs text-neutral-500 mt-1">Enter your username. A reset code will be sent to the admin email for approval.</p>
              </div>

              {forgotError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 flex items-start gap-2 rounded-r-lg">
                  <AlertTriangle className="size-5 shrink-0 text-red-600" />
                  <span>{forgotError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700">Username</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingForgot}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingForgot ? "Sending..." : "Send Reset Code"}
              </button>

              <button
                type="button"
                onClick={() => setAuthView("login")}
                className="w-full text-xs text-neutral-500 hover:text-neutral-700 font-semibold hover:underline cursor-pointer"
              >
                ← Back to login
              </button>
            </form>
          )}

          {authView === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-navy-dark">Enter Reset Code</h3>
                <p className="text-xs text-neutral-500 mt-1">Enter the 6-digit code sent to the admin email, and choose a new password.</p>
              </div>

              {forgotSuccess && !resetError && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 text-sm text-emerald-700 rounded-r-lg">
                  {forgotSuccess}
                </div>
              )}

              {resetError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 flex items-start gap-2 rounded-r-lg">
                  <AlertTriangle className="size-5 shrink-0 text-red-600" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 text-sm text-emerald-700 rounded-r-lg">
                  {resetSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700">Reset Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center font-mono text-lg tracking-widest"
                  placeholder="000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">New Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingReset}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingReset ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => setAuthView("login")}
                className="w-full text-xs text-neutral-500 hover:text-neutral-700 font-semibold hover:underline cursor-pointer"
              >
                ← Back to login
              </button>
            </form>
          )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-blue-900 text-white shadow-md border-b-4 border-yellow-400 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow overflow-hidden border border-slate-300">
              <img 
                src="https://lh3.googleusercontent.com/d/1PP4GNDHD-BNRrBd6Y3q_Fwq1wX4tzG8k" 
                alt="Enakomoor Ventures Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('header_logo_fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div id="header_logo_fallback" className="hidden font-extrabold text-lg text-blue-950 font-sans">
                ₵
              </div>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight uppercase tracking-tight">Enakomoor Ventures</h1>
              <p className="text-xs text-blue-200">Ghanaian Agent Ledger System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Operator Branch badge */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-blue-200 font-semibold uppercase">{currentUser?.role} TERMINAL</span>
              <span id="current_operator_branch" className="text-sm font-bold text-yellow-400">
                {selectedBranchId === "all" && currentUser?.role === "ADMIN" ? "🌐 All Branches" : `🏢 ${activeBranch?.name}`}
              </span>
            </div>

            {/* Operator User Profile */}
            <div className="flex items-center gap-2 bg-blue-800/60 p-2 rounded-lg border border-blue-700">
              <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center">
                <User className="size-4 text-white" />
              </div>
              <span className="text-sm font-semibold hidden sm:inline">{currentUser?.name}</span>
            </div>

            {/* Simplified View Toggler */}
            <div className="flex items-center bg-blue-950/60 rounded-lg p-0.5 border border-blue-800/80">
              <button
                type="button"
                onClick={() => setIsSimplifiedMode(false)}
                className={`px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-md transition-all cursor-pointer ${
                  !isSimplifiedMode ? "bg-yellow-400 text-blue-950 shadow-sm" : "text-blue-200 hover:text-white"
                }`}
                title="Full Advanced Console View"
              >
                Full
              </button>
              <button
                type="button"
                onClick={() => setIsSimplifiedMode(true)}
                className={`px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-md transition-all cursor-pointer ${
                  isSimplifiedMode ? "bg-yellow-400 text-blue-950 shadow-sm" : "text-blue-200 hover:text-white"
                }`}
                title="Very Simplified Clean View"
              >
                Simple
              </button>
            </div>

            {/* Global Theme Toggle */}
            <button
              id="global_theme_toggle_btn"
              onClick={() => setTheme(t => t.startsWith("light") ? "dark" : "light")}
              className="text-white hover:text-yellow-300 p-1.5 hover:bg-blue-800 rounded-lg transition-all cursor-pointer flex items-center justify-center"
              title={theme.startsWith("light") ? "Switch to Dark Theme" : "Switch to Light Theme"}
            >
              {theme.startsWith("light") ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </button>

            {/* Manual Page Refresh */}
            <button
              onClick={() => window.location.reload()}
              className="text-white hover:text-emerald-300 p-1.5 hover:bg-blue-800 rounded-lg transition-all cursor-pointer flex items-center justify-center group"
              title="Refresh Page & Sync Data"
            >
              <RefreshCw className="size-5 transition-transform duration-500 group-hover:rotate-180" />
            </button>

            <button
              onClick={handleLogout}
              className="text-white hover:text-red-300 p-1.5 hover:bg-blue-800 rounded-lg transition"
              title="Logout from Terminal"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Active Branch Selection strip (Accessible to both Admins and Workers) */}
      <section className="bg-white border-b border-slate-200 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {currentUser?.role === "ADMIN" ? "Branch Filter (Admin view)" : "Active Branch Outlet"}
            </span>
            {branches.length > 5 ? (
              <div className="relative inline-block z-30">
                <button
                  type="button"
                  id="admin_branch_selector"
                  onClick={() => setIsBranchSearchOpen(!isBranchSearchOpen)}
                  className={`font-bold text-sm border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer flex items-center justify-between gap-3 ${
                    selectedBranchId === "all"
                      ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                      : "bg-blue-600 border-blue-700 text-white hover:bg-blue-700 shadow-md shadow-blue-600/10"
                  } ${pulseBranchSelector ? "animate-pulse ring-2 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.4)]" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    {selectedBranchId === "all" ? (
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>🌐</span>
                        <span>All Branches Consolidated</span>
                        <span className="bg-slate-700 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1">
                          FULL VIEW
                        </span>
                      </span>
                    ) : (
                      <>
                        {(() => {
                          const activeB = branches.find(b => b.id === selectedBranchId);
                          if (!activeB) return "🏢 Choose Branch";
                          const getBranchEmoji = (name: string, i: number) => {
                            const lower = name.toLowerCase();
                            if (lower.includes("accra") || lower.includes("mall")) return "🛍️";
                            if (lower.includes("kumasi") || lower.includes("kejetia")) return "🕌";
                            if (lower.includes("takoradi") || lower.includes("circle")) return "⚓";
                            if (lower.includes("office") || lower.includes("head")) return "🏢";
                            if (lower.includes("main")) return "🏛️";
                            const ems = ["🏬", "🏪", "🏫", "🏗️", "🛖", "🏡", "🏠"];
                            return ems[i % ems.length];
                          };
                          const idx = branches.findIndex(b => b.id === selectedBranchId);
                          return (
                            <span className="flex items-center gap-1.5 font-extrabold">
                              <span>{getBranchEmoji(activeB.name, idx)}</span>
                              <span>{activeB.name}</span>
                              <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 shadow-sm ring-1 ring-white/20">
                                ACTIVE CONTEXT
                              </span>
                            </span>
                          );
                        })()}
                      </>
                    )}
                  </span>
                  <ChevronRight className={`size-4 transition-transform duration-200 shrink-0 ${selectedBranchId === "all" ? "text-slate-500" : "text-white"} ${isBranchSearchOpen ? "rotate-90" : ""}`} />
                </button>

                <AnimatePresence>
                  {isBranchSearchOpen && (
                    <>
                      {/* Click catcher background */}
                      <div 
                        className="fixed inset-0 z-40 bg-transparent" 
                        onClick={() => {
                          setIsBranchSearchOpen(false);
                          setBranchSearchQuery("");
                        }}
                      />
                      
                      {/* Popover Dropdown */}
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2.5 w-72 origin-top-left"
                      >
                        <div className="relative mb-2">
                          <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search branches..."
                            value={branchSearchQuery}
                            onChange={(e) => setBranchSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-800"
                            autoFocus
                          />
                          {branchSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setBranchSearchQuery("")}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                          {currentUser?.role === "ADMIN" && (
                            ("all branches consolidated".includes(branchSearchQuery.toLowerCase().trim()) || branchSearchQuery.trim() === "")
                          ) && (
                            <button
                              type="button"
                              onClick={() => {
                                handleBranchSwitch("all");
                                setIsBranchSearchOpen(false);
                                setBranchSearchQuery("");
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-md flex items-center justify-between transition-colors ${
                                selectedBranchId === "all"
                                  ? "bg-blue-500 text-white font-bold"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span>🌐 All Branches Consolidated</span>
                              {selectedBranchId === "all" && <CheckCircle className="size-3.5 shrink-0" />}
                            </button>
                          )}
                          
                          {branches
                          
                          {branches
                            .filter(b => b.name.toLowerCase().includes(branchSearchQuery.toLowerCase().trim()))
                            .map((b, idx) => {
                              const getBranchEmoji = (name: string, i: number) => {
                                const lower = name.toLowerCase();
                                if (lower.includes("accra") || lower.includes("mall")) return "🛍️";
                                if (lower.includes("kumasi") || lower.includes("kejetia")) return "🕌";
                                if (lower.includes("takoradi") || lower.includes("circle")) return "⚓";
                                if (lower.includes("office") || lower.includes("head")) return "🏢";
                                if (lower.includes("main")) return "🏛️";
                                const ems = ["🏬", "🏪", "🏫", "🏗️", "🛖", "🏡", "🏠"];
                                return ems[i % ems.length];
                              };
                              const emoji = getBranchEmoji(b.name, idx);
                              const isSelected = selectedBranchId === b.id;
                              
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                 onClick={() => {
                                handleBranchSwitch(b.id);
                                setIsBranchSearchOpen(false);
                                setBranchSearchQuery("");
                                }}
                                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-md flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? "bg-blue-500 text-white font-bold"
                                      : "text-slate-700 hover:bg-slate-100"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <span>{emoji}</span>
                                    <span>{b.name}</span>
                                  </span>
                                  {isSelected && <CheckCircle className="size-3.5 shrink-0" />}
                                </button>
                              );
                            })}
                          
                          {branches.filter(b => b.name.toLowerCase().includes(branchSearchQuery.toLowerCase().trim())).length === 0 && 
                            !(currentUser?.role === "ADMIN" && ("all branches consolidated".includes(branchSearchQuery.toLowerCase().trim()) || branchSearchQuery.trim() === "")) && (
                            <div className="text-center py-4 text-slate-400 text-xs">
                              No branches match "{branchSearchQuery}"
                            </div>
                          )}
                        </div>

                        {branchSearchQuery && (
                          <div className="pt-2 mt-2 border-t border-slate-100 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setBranchSearchQuery("")}
                              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors px-2.5 py-1 rounded hover:bg-blue-50"
                            >
                              <X className="size-3" />
                              Clear Search
                            </button>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <select
                id="admin_branch_selector"
                value={selectedBranchId}
                onChange={(e) => {
                 handleBranchSwitch(e.target.value);
                }}
                className={`font-bold text-sm border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer ${
                  selectedBranchId === "all"
                    ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                    : "bg-blue-600 border-blue-700 text-white hover:bg-blue-700"
                } ${pulseBranchSelector ? "animate-pulse ring-2 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.4)]" : ""}`}
              >
                {currentUser?.role === "ADMIN" && <option value="all">🌐 All Branches Consolidated</option>}
                {branches.map((b, idx) => {
                  const getBranchEmoji = (name: string, i: number) => {
                    const lower = name.toLowerCase();
                    if (lower.includes("accra") || lower.includes("mall")) return "🛍️";
                    if (lower.includes("kumasi") || lower.includes("kejetia")) return "🕌";
                    if (lower.includes("takoradi") || lower.includes("circle")) return "⚓";
                    if (lower.includes("office") || lower.includes("head")) return "🏢";
                    if (lower.includes("main")) return "🏛️";
                    const ems = ["🏬", "🏪", "🏫", "🏗️", "🛖", "🏡", "🏠"];
                    return ems[i % ems.length];
                  };
                  return (
                    <option key={b.id} value={b.id}>
                      {getBranchEmoji(b.name, idx)} {b.name}
                    </option>
                  );
                })}
              </select>
            )}

            {currentUser?.role === "ADMIN" && (
              <button
                id="add_branch_header_btn"
                onClick={() => {
                  setQuickBranchError("");
                  setQuickBranchSuccess("");
                  setIsAddBranchOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 shadow transition-all cursor-pointer hover:shadow-md active:scale-95"
                title="Create a new branch outlet"
              >
                <Plus className="size-3.5" />
                <span>Add Branch</span>
              </button>
            )}
          </div>

          {currentUser?.role === "ADMIN" ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-blue-50 text-blue-900 text-xs px-3 py-1.5 rounded-md border border-blue-100 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-blue-700 shrink-0" />
                <span>Owner Access Enabled: You have permissions to correct agent transactions and clear consumer debts.</span>
              </div>
              <button
                id="reset_system_btn"
                onClick={handleResetToFreshStart}
                className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-md border border-red-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer group"
                title="Wipe out all operational transactions, shifts, debts, and logs to test on clean sheets"
              >
                <RefreshCw className="size-3.5 group-hover:rotate-180 transition-transform duration-500" />
                <span>Reset ₵0 Figures (Fresh Start)</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              <span>Logged in as <strong>{currentUser?.name}</strong> (Agent Operator)</span>
            </div>
          )}
        </div>
      </section>

      {/* Floats Threshold Alert banner for Operator */}
      {currentUser?.role === "WORKER" && (isBranchLowFloatMTN || isBranchLowFloatTELECEL || isBranchLowFloatAIRTEL) && (
        <section className="bg-amber-100 border-b border-amber-200 py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-neutral-900">Low Float Threshold Alert</p>
              <p className="text-xs text-amber-800">
                The current wallet balances of this branch fall below the safe operation limits set by the Owner. 
                {isBranchLowFloatMTN && ` MTN: GHS ${currentBranchFloat?.mtnFloat.toLocaleString()}`}
                {isBranchLowFloatTELECEL && ` Telecel: GHS ${currentBranchFloat?.telecelFloat.toLocaleString()}`}
                {isBranchLowFloatAIRTEL && ` AirtelTigo: GHS ${currentBranchFloat?.airtelTigoFloat.toLocaleString()}`}
                . Please contact Admin immediately for float financing.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Main Body */}
      <main className={`flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex ${isSimplifiedMode ? "flex-col" : "flex-col md:flex-row"} gap-6`}>
        {isSimplifiedMode ? (
          <div className="w-full space-y-6">
            {/* VERY SIMPLIFIED INTERFACE COMPONENT */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-navy-dark font-sans">Operator Quick Console</h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Branch: <span className="font-bold text-blue-600">{activeBranch?.name || "System"}</span> • Role: <span className="font-bold uppercase text-slate-700">{currentUser?.role}</span>
                  </p>
                </div>
                {/* Horizontal compact floats */}
                {currentBranchFloat && (
                  <div className="flex flex-wrap gap-2.5 items-center">
                    <div className="bg-yellow-50 px-3 py-2 rounded-xl border border-yellow-200 flex items-center gap-1.5 shadow-xs">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 block shrink-0"></span>
                      <div className="text-left">
                        <p className="text-[10px] text-yellow-800 font-extrabold leading-none">MTN FLOAT</p>
                        <p className="text-xs font-mono font-bold text-yellow-950 mt-0.5">GHS {currentBranchFloat.mtnFloat?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-red-50 px-3 py-2 rounded-xl border border-red-200 flex items-center gap-1.5 shadow-xs">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 block shrink-0"></span>
                      <div className="text-left">
                        <p className="text-[10px] text-red-800 font-extrabold leading-none">TELECEL</p>
                        <p className="text-xs font-mono font-bold text-red-955 mt-0.5">GHS {currentBranchFloat.telecelFloat?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-blue-50 px-3 py-2 rounded-xl border border-blue-200 flex items-center gap-1.5 shadow-xs">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600 block shrink-0"></span>
                      <div className="text-left">
                        <p className="text-[10px] text-blue-800 font-extrabold leading-none">AIRTELTIGO</p>
                        <p className="text-xs font-mono font-bold text-blue-955 mt-0.5">GHS {currentBranchFloat.airtelTigoFloat?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Transaction Desk (Col Span 7) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Enter Transaction Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        <Smartphone className="size-4" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Fast Transaction Desk</h3>
                        <p className="text-[11px] text-slate-400">Record consumer mobile money transactions instantly</p>
                      </div>
                    </div>
                    {activeShift ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Shift Active
                      </span>
                    ) : currentUser?.role === "ADMIN" ? (
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Admin Bypass
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Shift Locked
                      </span>
                    )}
                  </div>

                  {!activeShift && currentUser?.role !== "ADMIN" ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-3">
                      <Lock className="size-8 text-slate-400 mx-auto" />
                      <div>
                        <p className="font-bold text-slate-700 text-sm">Operational Session is Locked</p>
                        <p className="text-xs text-slate-500 mt-1">You must open/initialize a new shift session in the right panel to begin transactions.</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateTransaction} className="space-y-4">
                      {/* Tx Type Selector */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tx Type</label>
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => handleTypeChange("deposit")}
                            className={`py-2 px-1 rounded-lg border font-bold text-xs transition-all uppercase tracking-wider cursor-pointer ${
                              txType === "deposit" ? "bg-blue-605 bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            📥 Deposit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTypeChange("withdrawal")}
                            className={`py-2 px-1 rounded-lg border font-bold text-xs transition-all uppercase tracking-wider cursor-pointer ${
                              txType === "withdrawal" ? "bg-blue-605 bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            📤 Withdraw
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTypeChange("send_money")}
                            className={`py-2 px-1 rounded-lg border font-bold text-xs transition-all uppercase tracking-wider cursor-pointer ${
                              txType === "send_money" ? "bg-blue-605 bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            💸 Send
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTypeChange("airtime")}
                            className={`py-2 px-1 rounded-lg border font-bold text-xs transition-all uppercase tracking-wider cursor-pointer ${
                              txType === "airtime" ? "bg-blue-605 bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            📱 Airtime
                          </button>
                        </div>
                      </div>

                      {/* Network Selector */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Network</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setTxNetwork("MTN")}
                            className={`py-2.5 px-3 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                              txNetwork === "MTN" ? "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-sm" : "bg-white text-slate-750 border-slate-200"
                            }`}
                          >
                            MTN
                          </button>
                          <button
                            type="button"
                            onClick={() => setTxNetwork("TELECEL")}
                            className={`py-2.5 px-3 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                              txNetwork === "TELECEL" ? "bg-red-600 text-white border-red-700 shadow-sm" : "bg-white text-slate-755 border-slate-200"
                            }`}
                          >
                            Telecel
                          </button>
                          <button
                            type="button"
                            onClick={() => setTxNetwork("AIRTELTIGO")}
                            className={`py-2.5 px-3 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                              txNetwork === "AIRTELTIGO" ? "bg-blue-600 text-white border-blue-700 shadow-sm" : "bg-white text-slate-760 border-slate-200"
                            }`}
                          >
                            AirtelTigo
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Amount */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount (GHS)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={txAmount}
                            onChange={(e) => handleAmountChange(e.target.value, txType)}
                            className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Commission */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Commission (GHS)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={txCommission}
                            onChange={(e) => setTxCommission(e.target.value)}
                            className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-bold bg-amber-50 text-amber-950 border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Customer Number */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Number</label>
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={customerNumber}
                          onChange={(e) => setCustomerNumber(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. 0244123456"
                        />
                      </div>

                      {txError && (
                        <div className="bg-red-50 text-red-800 p-2.5 rounded-lg text-xs font-bold border border-red-200">
                          ⚠ {txError}
                        </div>
                      )}
                      {txSuccess && (
                        <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg text-xs font-bold border border-emerald-250">
                          ✓ {txSuccess}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs tracking-wider uppercase rounded-lg transition-all shadow cursor-pointer"
                      >
                        Submit Transaction Entry
                      </button>
                    </form>
                  )}
                </div>

                {/* Today's Transactions List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Today's Shift Activity</h3>
                      <p className="text-[11px] text-slate-400">Showing recent branch records</p>
                    </div>
                    <div className="relative">
                      <Search className="size-3.5 absolute right-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter phone..."
                        value={phoneSearch}
                        onChange={(e) => setPhoneSearch(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded font-semibold text-[11px] px-2.5 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {filteredTxs.length > 0 ? (
                      filteredTxs.map((t, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                          t.status === "REVERSED" ? "bg-red-50/40 border-red-100 opacity-60" : "bg-slate-50 border-slate-150"
                        }`}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                t.type === "deposit" ? "bg-emerald-100 text-emerald-800" : 
                                t.type === "withdrawal" ? "bg-orange-100 text-orange-805" : 
                                t.type === "airtime" ? "bg-indigo-100 text-indigo-805" : "bg-blue-100 text-blue-805"
                              }`}>
                                {t.type}
                              </span>
                              <span className="font-bold text-xs text-slate-800">{t.customerNumber}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({t.network})</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">{new Date(t.recordedAt).toLocaleTimeString()}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-bold text-slate-900 text-sm">₵{t.amount}</p>
                            {t.status === "REVERSED" ? (
                              <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">REVERSED</span>
                            ) : currentUser?.role === "ADMIN" ? (
                              <button
                                type="button"
                                onClick={() => setSelectedTxForCorrection(t)}
                                className="text-[10px] text-red-600 hover:text-red-800 hover:underline cursor-pointer font-bold"
                              >
                                Reverse
                              </button>
                            ) : (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">OK</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 text-xs py-4">No operations logged today yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Shift Management and Debts (Col Span 5) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Active Shift Lock Desk */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                    <span className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                      <History className="size-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Shift & Lock Desk</h3>
                      <p className="text-[11px] text-slate-400">Control operating locks and shift cash handovers</p>
                    </div>
                  </div>

                  {currentUser?.role === "ADMIN" ? (
                    <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-xl border border-slate-800 p-4 relative overflow-hidden">
                      <p className="bg-emerald-500 text-slate-950 text-[9px] uppercase font-black px-2 py-0.5 rounded tracking-widest inline-block mb-2">
                        Admin Session Override
                      </p>
                      <h4 className="font-bold text-xs tracking-tight font-sans">Privilege Active</h4>
                      <p className="text-slate-300 text-[11px] leading-relaxed mt-1">
                        Any records or reversals logged from this administrator console instantly bypass shift locks.
                      </p>
                    </div>
                  ) : !activeShift ? (
                    <div className="space-y-4">
                      {closingSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-[11px] space-y-1">
                          <p className="font-bold text-emerald-900">Shift Closed Successfully</p>
                          <div className="font-mono text-slate-700 flex justify-between">
                            <span>Counted Cash:</span>
                            <span className="font-bold">GHS {closingSuccess.actualCash}</span>
                          </div>
                          <div className="font-mono text-slate-700 flex justify-between">
                            <span>Expected Cash:</span>
                            <span className="font-bold">GHS {closingSuccess.expectedCash}</span>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleOpenShift} className="space-y-3.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase">Opening Physical Cash (GHS)</label>
                          <input
                            type="number"
                            required
                            value={openingCash}
                            onChange={(e) => setOpeningCash(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs font-bold"
                            placeholder="e.g. 500.00"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">MTN (GHS)</label>
                            <input
                              type="number"
                              required
                              value={openingMtn}
                              onChange={(e) => setOpeningMtn(e.target.value)}
                              className="w-full mt-1 px-2 py-1.5 border rounded text-xs text-center font-bold"
                              placeholder="MTN"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Telecel</label>
                            <input
                              type="number"
                              required
                              value={openingTelecel}
                              onChange={(e) => setOpeningTelecel(e.target.value)}
                              className="w-full mt-1 px-2 py-1.5 border rounded text-xs text-center font-bold"
                              placeholder="Telecel"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Airtel</label>
                            <input
                              type="number"
                              required
                              value={openingAirtel}
                              onChange={(e) => setOpeningAirtel(e.target.value)}
                              className="w-full mt-1 px-2 py-1.5 border rounded text-xs text-center font-bold"
                              placeholder="AirtelTigo"
                            />
                          </div>
                        </div>

                        {shiftError && <span className="text-[11px] text-red-600 font-bold block">{shiftError}</span>}

                        <button
                          type="submit"
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-md cursor-pointer"
                        >
                          🔓 Open Shift Session
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-2.5 text-[11px]">
                        ✓ Session started today at {activeShift.startTime}
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1 font-mono text-slate-700">
                        <div className="flex justify-between">
                          <span>Opening Locker Cash:</span>
                          <span className="font-bold text-slate-900">GHS {activeShift.openingCash}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>MTN Wallet:</span>
                          <span className="font-bold text-slate-900">GHS {activeShift.openingFloatMtn}</span>
                        </div>
                      </div>

                      <form onSubmit={handleCloseShiftSubmit} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase">Actual Physical Cash Counted (GHS)</label>
                          <input
                            type="number"
                            required
                            value={actualCash}
                            onChange={(e) => setActualCash(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-bold text-blue-900 focus:outline-none"
                            placeholder="Drawer cash value..."
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-md cursor-pointer"
                        >
                          🔐 Close Shift / EOD Lock
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Outstanding Debts Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                        <Layers className="size-4" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Customer Debts</h3>
                        <p className="text-[11px] text-slate-400">Keep account of consumer credit</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {debts.filter(d => d.status === "OUTSTANDING").length > 0 ? (
                      debts.filter(d => d.status === "OUTSTANDING").map((d, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{d.customerName}</p>
                            <p className="text-[10px] text-slate-400">{d.customerNumber || (d as any).customerPhone} • Due {d.dueDate}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-bold text-red-600 font-mono">GHS {d.amount}</p>
                            <button
                              type="button"
                              onClick={() => handleClearDebt(d.id)}
                              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded cursor-pointer transition-colors"
                            >
                              Paid ✔
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 text-[11px] py-4">No outstanding debts registered.</p>
                    )}
                  </div>

                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSimplifiedMode(false);
                        setActiveTab("debts");
                      }}
                      className="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                    >
                      View & Manage Full Debt Ledger →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Sidebar */}
            <aside className="w-full md:w-64 shrink-0 space-y-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <span className="block px-3 pt-1 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Operational Menu</span>
            <nav className="space-y-1">
              <button
                onClick={() => { setActiveTab("dashboard"); setClosingSuccess(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "dashboard" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <TrendingUp className="size-5" />
                <span>Dashboard Home</span>
              </button>

              <button
                onClick={() => { setActiveTab("transactions"); setClosingSuccess(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "transactions" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="size-5" />
                  <span>Enter Transaction</span>
                </div>
                {activeShift ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500 animate-pulse"></span>
                ) : null}
              </button>

              <button
                onClick={() => { setActiveTab("debts"); setClosingSuccess(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "debts" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Layers className="size-5" />
                <span>Debt Ledger Book</span>
              </button>

              <button
                onClick={() => { setActiveTab("closing"); setClosingSuccess(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "closing" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <History className="size-5" />
                  <span>Shift Close / EOD</span>
                </div>
                {currentUser?.role === "ADMIN" ? (
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-extrabold uppercase tracking-wider">BYPASS</span>
                ) : !activeShift ? (
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">OFF</span>
                ) : (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">ON</span>
                )}
              </button>
            </nav>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <span className="block px-3 pt-1 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Management & Logs</span>
            <nav className="space-y-1">
              <button
                onClick={() => { setActiveTab("reports"); setClosingSuccess(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "reports" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <FileText className="size-5" />
                <span>Financial Reports</span>
              </button>



              {currentUser?.role === "ADMIN" && (
                <>
                  <button
                    onClick={() => { setActiveTab("branches_workers"); setClosingSuccess(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === "branches_workers" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Building className="size-5" />
                    <span>Branches & Staff</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("audit"); setClosingSuccess(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === "audit" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <History className="size-5" />
                    <span>Audit Trail Logs</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("approvals_security"); setClosingSuccess(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === "approvals_security" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="size-5 text-amber-500 fill-amber-500/10" />
                      <span>Security approvals</span>
                    </div>
                    {pendingApprovalsCount > 0 && (
                      <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ring-2 ring-white animate-pulse">
                        {pendingApprovalsCount}
                      </span>
                    )}
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Quick Realtime Balance widgets in Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-center">
                <span>MOMO Cash Floats</span>
                <span className="text-[9px] bg-sky-100 text-sky-800 rounded px-1.5 py-0.5 font-bold font-sans">MOMO</span>
              </h3>
              {currentBranchFloat ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                      <span className="text-xs font-bold text-yellow-900">MTN Float</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-yellow-950">GHS {currentBranchFloat.mtnFloat?.toLocaleString() || "0"}</span>
                  </div>

                  <div className="flex justify-between items-center bg-red-50 p-2 rounded-lg border border-red-200">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      <span className="text-xs font-bold text-red-900">Telecel Float</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-red-955">GHS {currentBranchFloat.telecelFloat?.toLocaleString() || "0"}</span>
                  </div>

                  <div className="flex justify-between items-center bg-blue-50 p-2 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                      <span className="text-xs font-bold text-blue-900">AirtelTigo</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-955">GHS {currentBranchFloat.airtelTigoFloat?.toLocaleString() || "0"}</span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Loading branch MoMo stats...</span>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-center">
                <span>Separate Airtime Wallets</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 rounded px-1.5 py-0.5 font-bold font-sans">Airtime</span>
              </h3>
              {currentBranchFloat ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                      <span className="text-xs font-semibold text-amber-900">MTN Airtime</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-950 font-sans">GHS {currentBranchFloat.mtnAirtimeFloat?.toLocaleString() || "0"}</span>
                  </div>

                  <div className="flex justify-between items-center bg-rose-50 p-2 rounded-lg border border-rose-200">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                      <span className="text-xs font-semibold text-rose-900">Telecel Airtime</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-955 font-sans">GHS {currentBranchFloat.telecelAirtimeFloat?.toLocaleString() || "0"}</span>
                  </div>

                  <div className="flex justify-between items-center bg-teal-50 p-2 rounded-lg border border-teal-200">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-teal-600"></span>
                      <span className="text-xs font-semibold text-teal-900">AirtelTigo Airtime</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-teal-955 font-sans">GHS {currentBranchFloat.airtelTigoAirtimeFloat?.toLocaleString() || "0"}</span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Loading airtime stats...</span>
              )}
            </div>
          </div>
        </aside>

        {/* Dynamic Display Area */}
        <section className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
          
          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-bold text-navy-dark">Enakomoor Ventures Dashboard</h2>
                <p className="text-slate-500 text-sm">Consolidated figures for: <span className="font-semibold text-blue-600">{selectedBranchId === "all" ? "All Operating Branches" : branches.find(b => b.id === selectedBranchId)?.name}</span></p>
              </div>

              {/* ADMIN PAST DUE ALERT BANNER */}
              {currentUser?.role === "ADMIN" && overdueDebtsCount > 0 && (
                <div id="past-due-alert-banner" className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-pulse-slow">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shrink-0">
                      <AlertTriangle className="size-6 text-red-600 animate-bounce" />
                    </span>
                    <div>
                      <h4 className="font-bold text-rose-950 text-sm sm:text-base flex items-center gap-2">
                        <span>Past Due Debts Detected</span>
                        <span className="bg-red-600 text-white text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold animate-pulse">
                          {overdueDebtsCount} Overdue
                        </span>
                      </h4>
                      <p className="text-xs text-rose-700 font-medium">There are currently <span className="font-bold text-rose-900">{overdueDebtsCount}</span> 'Past Due' outstanding customer balances requiring administrator attention.</p>
                    </div>
                  </div>
                  <button 
                    id="past-due-go-view-btn"
                    onClick={() => setActiveTab("debts")} 
                    className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all uppercase tracking-wider cursor-pointer"
                  >
                    Resolve Ledger
                  </button>
                </div>
              )}

              {/* ADMIN CASH SHORTAGE NOTIFICATIONS */}
              {/* ADMIN SYSTEM ALERTS & REAL-TIME NOTIFICATIONS */}
              {currentUser?.role === "ADMIN" && notifications.length > 0 && (
                <div id="cash-shortage-notifications-panel" className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-5 rounded-xl space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                        <Bell className="size-5" />
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-950 dark:text-white text-sm sm:text-base flex items-center gap-2">
                          <span>Real-Time System Alerts & Notifications</span>
                          {notifications.filter(n => !n.isRead).length > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold animate-pulse">
                              {notifications.filter(n => !n.isRead).length} New
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Monitor live operational notifications and high-value threshold alerts.</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleClearNotifications}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Dismiss All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {notifications.map((noti) => {
                      const isHighValue = noti.type === "approval" || noti.type === "escalation";
                      return (
                        <div 
                          key={noti.id} 
                          className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
                            noti.isRead 
                              ? "bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800" 
                              : isHighValue 
                                ? "bg-amber-50/70 dark:bg-amber-950/20 text-slate-900 dark:text-slate-100 border-amber-200 dark:border-amber-900/60 shadow-sm"
                                : "bg-red-50/70 dark:bg-red-950/20 text-slate-900 dark:text-slate-100 border-red-200 dark:border-red-900/60 shadow-sm"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {isHighValue ? (
                                <span className="font-extrabold uppercase tracking-wider text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded shadow-sm">
                                  ⚠️ High Value Alert
                                </span>
                              ) : (
                                <span className="font-extrabold uppercase tracking-wider text-[10px] bg-red-500 text-white px-2 py-0.5 rounded shadow-sm">
                                  💸 Shortage
                                </span>
                              )}
                              <span className="text-slate-400 font-mono text-[10px]">
                                {new Date(noti.timestamp).toLocaleString()}
                              </span>
                              {!noti.isRead && (
                                <span className={`h-1.5 w-1.5 rounded-full ${isHighValue ? "bg-amber-500" : "bg-red-500"}`}></span>
                              )}
                            </div>
                            <p className="font-semibold">{noti.message}</p>
                          </div>
                          {!noti.isRead && (
                            <button
                              onClick={() => handleMarkNotificationRead(noti.id)}
                              className={`shrink-0 text-white font-bold px-3 py-1.5 rounded text-[11px] cursor-pointer shadow-sm ${
                                isHighValue ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
                              }`}
                            >
                              Dismiss Alert
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LOW FLOAT SAFETY WARNING BANNER & ALARM SYSTEM */}
              {lowFloatAlerts.length > 0 && (
                <div id="low-float-safety-banner" className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500 text-red-950 dark:text-red-200 px-5 py-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-red-600/10 animate-pulse-slow">
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shrink-0 border border-red-200 dark:border-red-800">
                      <AlertTriangle className="size-6 text-red-600 dark:text-red-400 animate-bounce" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-red-700 dark:text-red-400 text-sm sm:text-base flex items-center gap-2">
                        <span>🚨 CRITICAL LOW FLOAT ALARM ACTIVE</span>
                        <span className="bg-red-600 text-white text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold animate-pulse">
                          {lowFloatAlerts.length} WALLETS BREACHED
                        </span>
                      </h4>
                      <div className="text-xs text-red-900 dark:text-red-300 font-medium mt-1.5 space-y-1.5">
                        <p>The following MoMo float accounts are below their strict safety limits (MTN: GHS 2,000, Telecel: GHS 1,000, AirtelTigo: GHS 500):</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {lowFloatAlerts.map((a, idx) => (
                            <span key={idx} className="font-mono font-bold bg-white dark:bg-slate-900 text-red-700 dark:text-red-400 px-2.5 py-1 rounded text-xs border border-red-200 dark:border-red-900 shadow-sm">
                              📍 {a.branchName} • <span className="underline">{a.network}</span>: GHS {a.balance.toLocaleString()} (Min: GHS {a.threshold.toLocaleString()})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-end mt-2 md:mt-0">
                    <button
                      onClick={() => setIsAlarmMuted(!isAlarmMuted)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                        isAlarmMuted 
                          ? "bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200" 
                          : "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                      }`}
                      title={isAlarmMuted ? "Unmute Alarm Siren" : "Silence Alarm Siren"}
                    >
                      {isAlarmMuted ? (
                        <>
                          <VolumeX className="size-4" />
                          <span>Siren Off</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="size-4 animate-bounce" />
                          <span>Siren Active</span>
                        </>
                      )}
                    </button>
                    <button
  onClick={() => {
    const newDismissed: Record<string, boolean> = { ...dismissedAlerts };
    lowFloatAlerts.forEach(alert => {
      const key = `${alert.branchId}-${alert.network}-${alert.balance}`;
      newDismissed[key] = true;
    });
    setDismissedAlerts(newDismissed);
  }}
  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white transition-all shadow-sm cursor-pointer"
  title="Dismiss all current low-float warnings"
>
  <X className="size-4" />
  <span>Clear All</span>
</button>

                    {currentUser?.role === "ADMIN" ? (
                      <button 
                        id="low-float-admin-manage-btn"
                        onClick={() => {
                          const el = document.getElementById("floats-management-section");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth" });
                          } else {
                            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                          }
                        }} 
                        className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-extrabold px-4 py-2 rounded-lg shadow-md transition-all uppercase tracking-wider cursor-pointer border border-transparent"
                      >
                        Refill Floats
                      </button>
                    ) : (
                      <div className="text-[10px] bg-red-600 text-white border border-red-700 rounded-lg px-3 py-2 font-bold uppercase tracking-wider animate-pulse">
                        Replenish Required
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STATS CARDS */}
              {stats ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div 
                    whileHover={{ y: -5, scale: 1.01 }} 
                    animate={profitHighlight ? {
                      scale: [1, 1.05, 0.98, 1.02, 1],
                    } : {}}
                    transition={{ 
                      type: "spring", 
                      stiffness: 350, 
                      damping: 20,
                      scale: { duration: 0.6 }
                    }}
                    className="relative bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between shadow-sm cursor-default hover:shadow-md transition-shadow duration-300 overflow-hidden"
                  >
                    <AnimatePresence>
                      {profitHighlight && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: [0, 1, 1, 0], scale: [0.98, 1.01, 1.01, 1] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.5, times: [0, 0.15, 0.85, 1] }}
                          className="absolute inset-0 border-2 border-emerald-500 rounded-xl pointer-events-none shadow-[0_0_15px_rgba(16,185,129,0.4)] z-10"
                        />
                      )}
                    </AnimatePresence>
                    <div>
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Today's Profit</span>
                      <div className="mt-1 flex items-center">
                        <AnimatedValue value={stats.todayProfit} isCurrency={true} className="text-2xl font-black font-mono text-emerald-900" />
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-700/80 mt-2 font-medium">Includes bulk airtime margin override</span>
                  </motion.div>
 
                  <motion.div 
                    whileHover={{ y: -5, scale: 1.01 }} 
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col justify-between shadow-sm cursor-default hover:shadow-md transition-shadow duration-300"
                  >
                    <div>
                      <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Today's Tx Vol.</span>
                      <div className="mt-1 flex items-center">
                        <AnimatedValue value={stats.todayTransactionsCount} className="text-2xl font-black font-mono text-blue-900" />
                      </div>
                    </div>
                    <span className="text-[10px] text-blue-700/80 mt-2 font-medium">Entries across system</span>
                  </motion.div>
 
                  <motion.div 
                    whileHover={{ y: -5, scale: 1.01 }} 
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col justify-between shadow-sm cursor-default hover:shadow-md transition-shadow duration-300"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Outstanding Debts</span>
                        {currentUser?.role === "ADMIN" && overdueDebtsCount > 0 && (
                          <span className="bg-red-600 text-white text-[9px] uppercase font-mono font-black px-1.5 py-0.5 rounded-full animate-bounce shrink-0" title="Contains Past Due debts!">
                            {overdueDebtsCount} PAST DUE
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center">
                        <AnimatedValue value={stats.outstandingDebts} isCurrency={true} className="text-2xl font-black font-mono text-amber-900" />
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-700/80 mt-2 font-semibold">GHS active in ledger</span>
                  </motion.div>
 
                  <motion.div 
                    whileHover={{ y: -5, scale: 1.01 }} 
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col justify-between shadow-sm cursor-default hover:shadow-md transition-shadow duration-300"
                  >
                    <div>
                      <span className="text-xs font-bold text-red-800 uppercase tracking-wide">Expected Cash</span>
                      <div className="mt-1 flex items-center">
                        <AnimatedValue value={stats.currentCashBalance} isCurrency={true} className="text-2xl font-black font-mono text-red-900" />
                      </div>
                    </div>
                    <span className="text-[10px] text-red-700/80 mt-2 font-medium">Float adjusted target</span>
                  </motion.div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">Retrieving stats...</div>
              )}

              {/* CONSOLIDATED MOMO FLOAT WALLET SUMMARIES */}
              {currentUser?.role === "ADMIN" && stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <motion.div 
                    whileHover={{ y: -3 }}
                    className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-yellow-800 uppercase tracking-wide">MTN Float Balance</span>
                        <span className="text-[10px] bg-yellow-200 text-yellow-900 font-bold px-1.5 py-0.5 rounded">MoMo</span>
                      </div>
                      <div className="mt-1 flex items-center">
                        <AnimatedValue value={stats.currentMtnFloat} isCurrency={true} className="text-xl font-black font-mono text-yellow-950" />
                      </div>
                    </div>
                    <span className="text-[9px] text-yellow-800/80 mt-2 font-medium">Consolidated across selected view</span>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -3 }}
                    className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-sky-800 uppercase tracking-wide">Telecel Float Balance</span>
                        <span className="text-[10px] bg-sky-200 text-sky-900 font-bold px-1.5 py-0.5 rounded">MoMo</span>
                      </div>
                      <div className="mt-1 flex items-center">
                        <AnimatedValue value={stats.currentTelecelFloat} isCurrency={true} className="text-xl font-black font-mono text-sky-950" />
                      </div>
                    </div>
                    <span className="text-[9px] text-sky-800/80 mt-2 font-medium">Consolidated across selected view</span>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -3 }}
                    className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">AirtelTigo Float Balance</span>
                        <span className="text-[10px] bg-rose-200 text-rose-900 font-bold px-1.5 py-0.5 rounded">MoMo</span>
                      </div>
                      <div className="mt-1 flex items-center">
                        <AnimatedValue value={stats.currentAirtelTigoFloat} isCurrency={true} className="text-xl font-black font-mono text-rose-950" />
                      </div>
                    </div>
                    <span className="text-[9px] text-rose-800/80 mt-2 font-medium">Consolidated across selected view</span>
                  </motion.div>
                </div>
              )}

              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-250">
                  <div className="flex justify-between p-2 bg-white rounded shadow-sm">
                    <span>Total Deposit Vol:</span>
                    <span className="font-bold text-navy-dark font-mono">GHS {stats.totalDeposits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded shadow-sm">
                    <span>Total Withdrawal Vol:</span>
                    <span className="font-bold text-navy-dark font-mono">GHS {stats.totalWithdrawals.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded shadow-sm">
                    <span>Total Send money:</span>
                    <span className="font-bold text-navy-dark font-mono">GHS {stats.totalSendMoney.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded shadow-sm">
                    <span>Total Airtime Sold:</span>
                    <span className="font-bold text-navy-dark font-mono">GHS {stats.totalAirtime.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* LIVE OUTLET MOMO FLOAT & WALLET BALANCES TABLE */}
              {currentUser?.role === "ADMIN" && floatBalances.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                  <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <span className="p-1 rounded bg-blue-100 text-blue-700">
                          <Coins className="size-4" />
                        </span>
                        Live Branch MoMo & Airtime Float Balances
                      </h3>
                      <p className="text-slate-500 text-[11px] mt-0.5">Real-time status of operating cash wallet floats and airtime reserves per branch terminal.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto">
                      <span className="text-[10px] font-bold text-slate-400 mr-1.5">SUMS:</span>
                      <span className="text-[10px] font-mono bg-yellow-100 text-yellow-800 font-extrabold px-2.5 py-1 rounded-full border border-yellow-200 shadow-sm">
                        MTN: GHS {(floatBalances.reduce((sum, f) => sum + f.mtnFloat, 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-mono bg-sky-100 text-sky-800 font-extrabold px-2.5 py-1 rounded-full border border-sky-200 shadow-sm">
                        Telecel: GHS {(floatBalances.reduce((sum, f) => sum + f.telecelFloat, 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-mono bg-rose-100 text-rose-800 font-extrabold px-2.5 py-1 rounded-full border border-rose-200 shadow-sm">
                        AirtelTigo: GHS {(floatBalances.reduce((sum, f) => sum + f.airtelTigoFloat, 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          <th className="p-3 pl-4">Branch Terminal</th>
                          <th className="p-3">MTN MoMo Cash</th>
                          <th className="p-3">Telecel Cash</th>
                          <th className="p-3">AirtelTigo Cash</th>
                          <th className="p-3">MTN Airtime</th>
                          <th className="p-3">Telecel Airtime</th>
                          <th className="p-3">AirtelTigo Airtime</th>
                          <th className="p-3 pr-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {floatBalances.map((fl) => {
                          const b = branches.find(branch => branch.id === fl.branchId);
                          const branchName = b ? b.name : fl.branchId;
                          const branchLoc = b ? b.location : "N/A";
                          
                          const mtnLow = fl.mtnFloat < 2000;
                          const telLow = fl.telecelFloat < 1000;
                          const artLow = fl.airtelTigoFloat < 500;
                          const hasAnyLow = mtnLow || telLow || artLow;

                          return (
                            <tr key={fl.branchId} className={`hover:bg-slate-50/80 transition-colors ${hasAnyLow ? "bg-red-50/10" : ""}`}>
                              <td className="p-3 pl-4">
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{branchName}</span>
                                  <span className="text-[10px] font-mono text-slate-400">{branchLoc}</span>
                                </div>
                              </td>
                              
                              {/* MTN MoMo Float */}
                              <td className="p-3 font-mono">
                                <div className="flex flex-col">
                                  <span className={`font-bold ${mtnLow ? "text-red-600 animate-pulse" : "text-slate-800"}`}>
                                    ₵{fl.mtnFloat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-sans">Min ₵2,000</span>
                                </div>
                              </td>

                              {/* Telecel MoMo Float */}
                              <td className="p-3 font-mono">
                                <div className="flex flex-col">
                                  <span className={`font-bold ${telLow ? "text-red-600 animate-pulse" : "text-slate-800"}`}>
                                    ₵{fl.telecelFloat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-sans">Min ₵1,000</span>
                                </div>
                              </td>

                              {/* AirtelTigo MoMo Float */}
                              <td className="p-3 font-mono">
                                <div className="flex flex-col">
                                  <span className={`font-bold ${artLow ? "text-red-600 animate-pulse" : "text-slate-800"}`}>
                                    ₵{fl.airtelTigoFloat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-sans">Min ₵500</span>
                                </div>
                              </td>

                              {/* MTN Airtime */}
                              <td className="p-3 font-mono text-slate-600">
                                ₵{(fl.mtnAirtimeFloat ?? 1000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>

                              {/* Telecel Airtime */}
                              <td className="p-3 font-mono text-slate-600">
                                ₵{(fl.telecelAirtimeFloat ?? 500).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>

                              {/* AirtelTigo Airtime */}
                              <td className="p-3 font-mono text-slate-600">
                                ₵{(fl.airtelTigoAirtimeFloat ?? 500).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>

                              {/* Status */}
                              <td className="p-3 pr-4 text-center">
                                {hasAnyLow ? (
                                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 font-extrabold px-2.5 py-1 rounded text-[10px] border border-red-200 shadow-sm">
                                    ⚠️ Low Float
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded text-[10px] border border-emerald-100 shadow-sm">
                                    ✅ Safe
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ADMIN OUTLET PERFORMANCE LEADERBOARD */}
              {currentUser?.role === "ADMIN" && stats?.branchNetProfits && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                  <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <span className="p-1 rounded bg-indigo-100 text-indigo-700 animate-pulse">
                          <TrendingUp className="size-4" />
                        </span>
                        Branch Performance Leaderboard
                      </h3>
                      <p className="text-slate-500 text-[11px] mt-0.5">Comparative side-by-side net profit (GHS commissions) ranking of all active operating branches.</p>
                    </div>
                    <div className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-800 font-extrabold px-2.5 py-1 rounded self-start sm:self-auto uppercase tracking-wider">
                      Sorted by Cumulative Profit
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          <th className="p-3 pl-4">Rank & Outlet</th>
                          <th className="p-3">Location</th>
                          <th className="p-3 text-right">Today's Net Profit</th>
                          <th className="p-3 text-right font-black">Cumulative Net Profit</th>
                          <th className="p-3 text-center">Tx Velocity (All-time)</th>
                          <th className="p-3 pr-4 text-right">Performance Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {[...stats.branchNetProfits]
                          .sort((a, b) => b.cumulativeProfit - a.cumulativeProfit)
                          .map((branch, idx) => {
                            const isTop = idx === 0 && branch.cumulativeProfit > 0;
                            const isRunnerUp = idx === 1 && branch.cumulativeProfit > 0;

                            return (
                              <tr key={branch.branchId} className={`hover:bg-slate-50/80 transition-colors ${isTop ? "bg-emerald-55/10" : ""}`}>
                                <td className="p-3 pl-4">
                                  <div className="flex items-center gap-3">
                                    <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold font-mono text-[11px] shrink-0 ${
                                      isTop ? "bg-yellow-100 border border-yellow-200 text-yellow-800" : 
                                      isRunnerUp ? "bg-slate-100 border border-slate-200 text-slate-700" :
                                      "bg-slate-50 text-slate-500"
                                    }`}>
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <span className="font-extrabold text-slate-900 block">{branch.branchName}</span>
                                      <span className="text-[10px] font-mono text-slate-400">ID: {branch.branchId}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 font-medium text-slate-600">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="size-3.5 text-slate-400" />
                                    <span>{branch.location}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900 font-mono">
                                  <span className={branch.todayProfit > 0 ? "text-emerald-700" : "text-slate-500"}>
                                    ₵{branch.todayProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-black text-slate-950 font-mono">
                                  ₵{branch.cumulativeProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-center text-slate-600 font-bold font-mono">
                                  {branch.transactionCount} txs
                                </td>
                                <td className="p-3 pr-4 text-right">
                                  {isTop ? (
                                    <span className="inline-flex items-center gap-1 bg-yellow-105 text-yellow-850 border border-yellow-200 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                      🏆 Top Performer
                                    </span>
                                  ) : isRunnerUp ? (
                                    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-150 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                      🥈 Strong Performer
                                    </span>
                                  ) : branch.cumulativeProfit > 0 ? (
                                    <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-150 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                      Active Outlet
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-full px-2 py-0.5 text-[9px] font-medium tracking-normal">
                                      No transactions
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DYNAMIC SHIFT WARNING */}
              {currentUser?.role === "WORKER" && !activeShift && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-6 shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <h4 className="text-lg font-bold">Welcome back, {currentUser.name}!</h4>
                    <p className="text-blue-100 text-xs mt-1">To begin processing deposits, withdrawals, and collecting commission earnings, you must initialize your opening shift ledger balances below.</p>
                    <button
                      onClick={() => setActiveTab("closing")}
                      className="mt-4 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-navy-dark font-bold text-xs rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                    >
                      🚀 Open Daily Shift
                    </button>
                  </div>
                  <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-8 opacity-10 font-bold text-[180px] pointer-events-none">₵</div>
                </div>
              )}

              {/* VISUAL DASHBOARD CHARTS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* CHART TREND SECTION (Col Span 7) */}
                <div className="lg:col-span-7 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">7-Day Business Trends (Pro-rata)</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Viewing {chartMetric === "profit" ? "Daily Profit Commissions" : "Total Cash Transaction Volume"}
                        </p>
                      </div>
                      
                      {/* Toggle Buttons */}
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setChartMetric("profit")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            chartMetric === "profit"
                              ? "bg-white text-blue-600 shadow-xs"
                              : "text-slate-600 hover:text-slate-800"
                          }`}
                        >
                          Daily Profit
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartMetric("volume")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            chartMetric === "volume"
                              ? "bg-white text-blue-600 shadow-xs"
                              : "text-slate-600 hover:text-slate-800"
                          }`}
                        >
                          Total Transaction Volume
                        </button>
                      </div>
                    </div>
                    
                    {chartData.length > 0 ? (
                      <div className="space-y-4">
                        {/* SVG Chart Visualization */}
                        <svg className="w-full h-44" viewBox="0 0 700 160">
                          {/* Grid Lines */}
                          <line x1="40" y1="20" x2="680" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="40" y1="60" x2="680" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="40" y1="100" x2="680" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="40" y1="140" x2="680" y2="140" stroke="#e2e8f0" strokeWidth="1" />

                          {/* Value plot path */}
                          <path
                            d={(() => {
                              const getMetricVal = (d: any) => chartMetric === "profit" ? d.profit : (d.deposits + d.withdrawals + d.send);
                              const maxMetricVal = Math.max(...chartData.map(cd => getMetricVal(cd)), 100);
                              const points = chartData.map((d, index) => {
                                const x = 50 + index * 100;
                                const val = getMetricVal(d);
                                const y = 140 - (val / maxMetricVal) * 110;
                                return `${x},${y}`;
                              });
                              return `M ${points.join(" L ")}`;
                            })()}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Bar Plot comparisons behind */}
                          {chartData.map((d, index) => {
                            const getMetricVal = (cd: any) => chartMetric === "profit" ? cd.profit : (cd.deposits + cd.withdrawals + cd.send);
                            const maxMetricVal = Math.max(...chartData.map(cd => getMetricVal(cd)), 100);
                            const x = 50 + index * 100;
                            const val = getMetricVal(d);
                            const y = 140 - (val / maxMetricVal) * 110;
                            const displayVal = chartMetric === "profit" ? `₵${d.profit}` : `₵${(d.deposits + d.withdrawals + d.send).toLocaleString()}`;
                            return (
                              <g key={index}>
                                {/* Circle joint */}
                                <circle cx={x} cy={y} r="5" fill="#2563eb" />
                                {/* Bar display */}
                                <rect x={x - 10} y={140 - (d.volume * 5)} width="20" height={d.volume * 5} fill="#60a5fa" opacity="0.15" rx="2" />
                                {/* X labels */}
                                <text x={x} y="155" textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">{d.name}</text>
                                {/* Value tooltips */}
                                <text x={x} y={y - 10} textAnchor="middle" className="text-[10px] font-bold fill-blue-800">{displayVal}</text>
                              </g>
                            );
                          })}
                        </svg>

                        <div className="flex justify-center gap-6 text-[11px] font-semibold">
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <span className="h-3 w-3 rounded-full bg-blue-600 block"></span>
                            <span>
                              {chartMetric === "profit" 
                                ? "Daily Profits (GHS Commissions)" 
                                : "Total Transaction Volume (GHS Flow)"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sky-400">
                            <span className="h-3 w-3 rounded bg-sky-200 block"></span>
                            <span>Transaction Flow Velocity (Count)</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">Populating dataset...</div>
                    )}
                  </div>
                </div>

                {/* NETWORK DISTRIBUTION PIE/DONUT CHART (Col Span 5) */}
                <div className="lg:col-span-5 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800 text-sm">Telco Network Marketshare</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded">Distribution Pie Chart</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {/* Interactive Donut Render */}
                      <div className="relative flex-shrink-0 mx-auto">
                        <svg className="w-36 h-36 mx-auto" viewBox="0 0 120 120">
                          {networkDistribution.totalCount === 0 ? (
                            <circle
                              cx="60"
                              cy="60"
                              r="40"
                              fill="transparent"
                              stroke="#f1f5f9"
                              strokeWidth="18"
                            />
                          ) : (
                            <>
                              {/* MTN Segment */}
                              {networkDistribution.pctMtn > 0 && (
                                <circle
                                  cx="60"
                                  cy="60"
                                  r="40"
                                  fill="transparent"
                                  stroke="#facc15"
                                  strokeWidth="18"
                                  strokeDasharray={`${networkDistribution.pctMtn} 100`}
                                  strokeDashoffset="0"
                                  pathLength="100"
                                  transform="rotate(-90 60 60)"
                                />
                              )}
                              {/* Telecel Segment */}
                              {networkDistribution.pctTelecel > 0 && (
                                <circle
                                  cx="60"
                                  cy="60"
                                  r="40"
                                  fill="transparent"
                                  stroke="#dc2626"
                                  strokeWidth="18"
                                  strokeDasharray={`${networkDistribution.pctTelecel} 100`}
                                  strokeDashoffset={-networkDistribution.pctMtn}
                                  pathLength="100"
                                  transform="rotate(-90 60 60)"
                                />
                              )}
                              {/* AirtelTigo Segment */}
                              {networkDistribution.pctAirtel > 0 && (
                                <circle
                                  cx="60"
                                  cy="60"
                                  r="40"
                                  fill="transparent"
                                  stroke="#2563eb"
                                  strokeWidth="18"
                                  strokeDasharray={`${networkDistribution.pctAirtel} 100`}
                                  strokeDashoffset={-(networkDistribution.pctMtn + networkDistribution.pctTelecel)}
                                  pathLength="100"
                                  transform="rotate(-90 60 60)"
                                />
                              )}
                            </>
                          )}
                          {/* Inner cutout to make it a donut */}
                          <circle cx="60" cy="60" r="30" fill="#ffffff" />
                          <text x="60" y="58" textAnchor="middle" className="text-[10px] font-bold fill-slate-400">TOTAL TXS</text>
                          <text x="60" y="74" textAnchor="middle" className="text-base font-black fill-slate-800">
                            {networkDistribution.totalCount}
                          </text>
                        </svg>
                      </div>

                      {/* Network Legends */}
                      <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between text-xs bg-yellow-50/70 p-2 rounded-lg border border-yellow-101">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 block"></span>
                            <span className="font-bold text-yellow-950">MTN ({networkDistribution.mtnCount})</span>
                          </div>
                          <div className="text-right font-bold text-yellow-904 font-mono">
                            {networkDistribution.pctMtn.toFixed(0)}%
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs bg-red-50/70 p-2 rounded-lg border border-red-101">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 block"></span>
                            <span className="font-bold text-red-955">Telecel ({networkDistribution.telecelCount})</span>
                          </div>
                          <div className="text-right font-bold text-red-904 font-mono">
                            {networkDistribution.pctTelecel.toFixed(0)}%
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs bg-blue-50/70 p-2 rounded-lg border border-blue-101">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block"></span>
                            <span className="font-bold text-blue-955">AirtelTigo ({networkDistribution.airtelCount})</span>
                          </div>
                          <div className="text-right font-bold text-blue-904 font-mono">
                            {networkDistribution.pctAirtel.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TRANSACTIONS MODULE TAB */}
          {activeTab === "transactions" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-bold text-navy-dark">Transaction Entry Ledger</h2>
                <p className="text-slate-500 text-sm">Post new cash flow logs. Deposits automatically subtract from the network float and simultaneously add to expected drawer cash. Entered commissions instantly expand daily profits.</p>
              </div>

              {!activeShift && currentUser?.role !== "ADMIN" ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg text-center">
                  <ShieldCheck className="size-12 text-red-600 mx-auto mb-3" />
                  <h4 className="font-bold text-navy-dark">Shift Not Opened</h4>
                  <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                    Security Mandate: Workers are strictly prohibited from performing any transactions until they initialize an active shift with opening float and cash.
                  </p>
                  <button
                    onClick={() => setActiveTab("closing")}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg uppercase transition-all"
                  >
                    Open shift now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* TRANSACTION ENTRY FORM */}
                  {currentUser?.role === "ADMIN" ? (
                    <div className="lg:col-span-7 bg-slate-50 p-8 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-4 py-16 animate-fade-in">
                      <div className="bg-amber-50 rounded-full p-4 border border-amber-200 text-amber-600 shadow-sm">
                        <Lock className="size-10" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-lg">Admin View-Only Restriction</h4>
                      <p className="text-slate-550 text-xs max-w-sm leading-relaxed">
                        Security Notice: Administrators are prohibited from entering operational transactions directly. All transaction entry is restricted to active Agent / Worker terminals during recorded shifts to maintain clean audit ledgers and correct cash balances.
                      </p>
                      <div className="bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 text-[11px] font-mono text-slate-600">
                        Outlet ID: {currentBranch?.name || "Global Head Office"}
                      </div>
                    </div>
                  ) : (
                    <div className="lg:col-span-7 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <form onSubmit={handleCreateTransaction} className="space-y-4">
                      
                      {/* Modern big buttons for Transaction type */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transaction Type</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => handleTypeChange("deposit")}
                            className={`py-3.5 px-2 rounded-xl border font-bold text-xs transition-all uppercase tracking-wider cursor-pointer ${
                              txType === "deposit" ? "bg-blue-605 bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            📥 Deposit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTypeChange("withdrawal")}
                            className={`py-3.5 px-2 rounded-xl border font-bold text-xs transition-all uppercase tracking-wider cursor-pointer ${
                              txType === "withdrawal" ? "bg-blue-605 bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            📤 Withdraw
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTypeChange("send_money")}
                            className={`py-3.5 px-2 rounded-xl border font-bold text-xs transition-all uppercase tracking-wider cursor-pointer ${
                              txType === "send_money" ? "bg-blue-605 bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            💸 Send Money
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTypeChange("airtime")}
                            className={`py-3.5 px-2 rounded-xl border font-bold text-xs transition-all uppercase tracking-wider cursor-pointer ${
                              txType === "airtime" ? "bg-blue-605 bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            📱 Airtime
                          </button>
                        </div>
                      </div>

                      {/* Network Selectors with Brand Themes */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telco Network</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setTxNetwork("MTN")}
                            className={`py-2.5 px-3 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                              txNetwork === "MTN" ? "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-sm" : "bg-white text-slate-750 border-slate-200"
                            }`}
                          >
                            📱 MTN (Yellow)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTxNetwork("TELECEL")}
                            className={`py-2.5 px-3 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                              txNetwork === "TELECEL" ? "bg-red-600 text-white border-red-700 shadow-sm" : "bg-white text-slate-755 border-slate-200"
                            }`}
                          >
                            🔴 Telecel (Vodafone)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTxNetwork("AIRTELTIGO")}
                            className={`py-2.5 px-3 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                              txNetwork === "AIRTELTIGO" ? "bg-blue-600 text-white border-blue-700 shadow-sm" : "bg-white text-slate-760 border-slate-200"
                            }`}
                          >
                            🔵 AirtelTigo
                          </button>
                        </div>
                      </div>

                      {/* Amount Field Input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Transaction Amount (GHS)</label>
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-slate-500 font-bold text-sm">GH₵</span>
                          </div>
                          <input
                            id="tx_amount_input"
                            type="number"
                            required
                            min="1"
                            value={txAmount}
                            onChange={(e) => handleAmountChange(e.target.value, txType)}
                            className="block w-full pl-12 pr-3 py-2.5 border border-slate-300 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Commission Field Input (Fully entered by worker) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Commission (GHS) <span className="text-[10px] text-blue-600 font-semibold">(Worker Enterable)</span>
                        </label>
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-slate-500 font-bold text-sm">GH₵</span>
                          </div>
                          <input
                            id="tx_commission_input"
                            type="number"
                            step="0.01"
                            value={txCommission}
                            onChange={(e) => setTxCommission(e.target.value)}
                            className="block w-full pl-12 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm font-bold bg-amber-50 text-amber-950 border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Customer Wallet Number Input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Wallet Number</label>
                        <input
                          id="customer_num_input"
                          type="text"
                          required
                          maxLength={10}
                          value={customerNumber}
                          onChange={(e) => setCustomerNumber(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. 0244123456"
                        />
                      </div>

                      {txError && (
                        <div className="bg-red-50 text-red-800 p-3 rounded-lg text-xs font-bold border border-red-200">
                          ⚠ Error: {txError}
                        </div>
                      )}

                      {txSuccess && (
                        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                          <span>{txSuccess}</span>
                        </div>
                      )}

                      <button
                        id="record_transaction_btn"
                        type="submit"
                        className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-md  shadow-blue-600/30 cursor-pointer"
                      >
                        Submit Transaction Securely
                      </button>
                    </form>
                  </div>
                  )}

                  {/* RECENT TRANSACTIONS LEDGER AND REVERSALS */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Live Entries in Shift</h4>
                        <div className="relative">
                          <Search className="size-3.5 absolute right-2 top-2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Filter phone..."
                            value={phoneSearch}
                            onChange={(e) => setPhoneSearch(e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded font-semibold text-xs px-2.5 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Transaction mapping */}
                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {filteredTxs.length > 0 ? (
                          filteredTxs.map((t, i) => (
                            <div key={i} className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                              t.status === "REVERSED" ? "bg-red-50/50 border-red-100 opacity-60" : "bg-slate-50 hover:bg-slate-100 border-slate-150"
                            }`}>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                    t.type === "deposit" ? "bg-emerald-100 text-emerald-800" :
                                    t.type === "withdrawal" ? "bg-blue-100 text-blue-800" :
                                    t.type === "send_money" ? "bg-indigo-100 text-indigo-800" :
                                    "bg-yellow-100 text-yellow-800"
                                  }`}>
                                    {t.type}
                                  </span>
                                  {t.network && (
                                    <span className="text-[9px] text-slate-400 font-bold">{t.network}</span>
                                  )}
                                  {t.status === "REVERSED" && (
                                    <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1 rounded uppercase">Reversed</span>
                                  )}
                                </div>

                                <div className="text-xs text-navy-dark font-black mt-1 font-mono">
                                  {t.type === "send_money" ? (
                                    <span>{t.senderNumber} → {t.receiverNumber}</span>
                                  ) : (
                                    <span>{t.customerNumber}</span>
                                  )}
                                </div>
                                
                                <span className="text-[10px] text-slate-400 block font-medium">Recorded at {new Date(t.recordedAt).toLocaleTimeString()}</span>
                              </div>

                              <div className="text-right">
                                <span className="text-sm font-bold font-mono text-slate-800">GHS {t.amount}</span>
                                {t.commission > 0 && (
                                  <span className="block text-[10px] text-emerald-600 font-bold">Comm: GHS {t.commission}</span>
                                )}

                                {/* Reverse/Correct Button for Super Admin */}
                                {currentUser?.role === "ADMIN" && t.status === "ACTIVE" && (
                                  <button
                                    onClick={() => setSelectedTxForCorrection(t)}
                                    className="block text-[9px] bg-red-50 hover:bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 mt-1.5 ml-auto font-bold cursor-pointer"
                                  >
                                    Revert Ledger
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-slate-400 text-xs">No matching transactions logged yet.</div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TRANS CORRECTION MODAL/POPUP (Admin ONLY) */}
              {selectedTxForCorrection && (
                <div className="fixed inset-0 bg-navy-dark/60 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-350 shadow-2xl relative">
                    <button
                      onClick={() => setSelectedTxForCorrection(null)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg"
                    >
                      ✕
                    </button>
                    <h3 className="text-lg font-bold text-navy-dark flex items-center gap-2">
                      <AlertTriangle className="size-5 text-red-600" />
                      <span>Ledger Reversal Approval</span>
                    </h3>
                    <p className="text-neutral-500 text-xs mt-1">Reversing will subtract/re-add relevant values from the branch float instantly to reverse agent leakage errors.</p>
                    
                    <div className="bg-slate-50 p-3 rounded-lg my-3 border text-xs font-mono">
                      <p>Tx ID: {selectedTxForCorrection.id}</p>
                      <p>Type: {selectedTxForCorrection.type.toUpperCase()}</p>
                      <p>Amount: GHS {selectedTxForCorrection.amount}</p>
                      <p>Entered By: {selectedTxForCorrection.userName}</p>
                    </div>

                    <form onSubmit={handleReverseTransaction} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase">Reason for Correction</label>
                        <input
                          id="correction_reason_input"
                          type="text"
                          required
                          value={correctionReason}
                          onChange={(e) => setCorrectionReason(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. Wrong customer handset number entered by Agent"
                        />
                      </div>

                      {correctionError && (
                        <span className="text-xs text-red-600 font-bold">{correctionError}</span>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTxForCorrection(null)}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded"
                        >
                          Abort
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded"
                        >
                          Execute Reversal
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* DEBT MANAGEMENT MODULE TAB */}
          {activeTab === "debts" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-bold text-navy-dark">Customer Debt Ledger Book</h2>
                <p className="text-slate-500 text-sm">Automate outstanding debts accountability to eliminate daily shortages. Only Owner can clear debts.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* NEW DEBT FORM RECORDING */}
                <div className="lg:col-span-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Record Customer Debt</h4>
                  <form onSubmit={handleAddDebt} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Customer Name</label>
                      <input
                        id="debt_cust_name"
                        type="text"
                        required
                        value={newDebtName}
                        onChange={(e) => setNewDebtName(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Naa Shika"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Customer Phone Number</label>
                      <input
                        id="debt_cust_phone"
                        type="text"
                        maxLength={10}
                        required
                        value={newDebtNum}
                        onChange={(e) => setNewDebtNum(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="024XXXXXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Amount (GHS)</label>
                      <input
                        id="debt_amount"
                        type="number"
                        required
                        value={newDebtAmt}
                        onChange={(e) => setNewDebtAmt(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded text-xs font-bold text-navy-dark focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Specific Reason/Issue</label>
                      <textarea
                        id="debt_reason"
                        required
                        value={newDebtReason}
                        onChange={(e) => setNewDebtReason(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Customer cash transfer issue, promised pay tomorrow"
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Due Repayment Date</label>
                      <input
                        id="debt_due_date"
                        type="date"
                        required
                        value={newDebtDue}
                        onChange={(e) => setNewDebtDue(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {debtMsg && (
                      <div className="bg-blue-50 text-blue-900 font-bold p-2.5 rounded text-[11px] border border-blue-200">
                        {debtMsg}
                      </div>
                    )}

                    <button
                      id="save_debt_btn"
                      type="submit"
                      className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold uppercase rounded tracking-wider cursor-pointer transition-all"
                    >
                      Commit to Debt Ledger
                    </button>
                  </form>
                </div>

                {/* VIEW OUTSTANDING & PAID DEBTS LISTING */}
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Consumer Debt Logs</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Track, audit, and clear outstanding customer loan balances.</p>
                    </div>
                    {currentUser?.role === "ADMIN" && selectedDebtIds.length > 0 && (
                      <button
                        id="bulk_clear_debts_btn"
                        onClick={handleBulkClearDebts}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer uppercase tracking-wider shrink-0 animate-pulse"
                      >
                        ✅ Bulk Clear {selectedDebtIds.length} Checked
                      </button>
                    )}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table id="debt_table" className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                          {currentUser?.role === "ADMIN" && (
                            <th className="p-3 w-10 text-center">
                              <input
                                id="select_all_outstanding_debts_chk"
                                type="checkbox"
                                checked={
                                  debts.length > 0 &&
                                  debts.filter(d => d.status === "OUTSTANDING").length > 0 &&
                                  debts.filter(d => d.status === "OUTSTANDING").every(d => selectedDebtIds.includes(d.id))
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const outstandingIds = debts.filter(d => d.status === "OUTSTANDING").map(d => d.id);
                                    setSelectedDebtIds(outstandingIds);
                                  } else {
                                    setSelectedDebtIds([]);
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer size-4"
                                title="Select All Outstanding Debts"
                              />
                            </th>
                          )}
                          <th className="p-3">Customer</th>
                          {currentUser?.role === "ADMIN" && <th className="p-3">Branch</th>}
                          <th className="p-3">Amount</th>
                          <th className="p-3">Logged By</th>
                          <th className="p-3">Due Date</th>
                          <th className="p-3">Reason</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debts.length > 0 ? (
                          debts.map((d, index) => {
                            const isOverdue = d.status === "OUTSTANDING" && (() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const due = new Date(d.dueDate);
                              due.setHours(0, 0, 0, 0);
                              return due < today;
                            })();
                            const showWarning = currentUser?.role === "ADMIN" && isOverdue;

                            return (
                              <tr key={index} className={`border-b border-rose-100 transition-colors ${showWarning ? "bg-rose-50 hover:bg-rose-100/80" : "hover:bg-slate-50"}`}>
                                {currentUser?.role === "ADMIN" && (
                                  <td className="p-3 text-center">
                                    {d.status === "OUTSTANDING" ? (
                                      <input
                                        type="checkbox"
                                        checked={selectedDebtIds.includes(d.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedDebtIds([...selectedDebtIds, d.id]);
                                          } else {
                                            setSelectedDebtIds(selectedDebtIds.filter(id => id !== d.id));
                                          }
                                        }}
                                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer size-4"
                                      />
                                    ) : (
                                      <span className="text-slate-355 font-mono font-bold">-</span>
                                    )}
                                  </td>
                                )}
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    {showWarning && (
                                      <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse shrink-0" title="OVERDUE DEBT WARN" />
                                    )}
                                    <div>
                                      <p className={`font-bold ${showWarning ? "text-red-950" : "text-navy-dark"}`}>{d.customerName}</p>
                                      <p className="text-[10px] text-slate-400 font-mono">{d.customerNumber}</p>
                                    </div>
                                  </div>
                                </td>
                                {currentUser?.role === "ADMIN" && (
                                  <td className="p-3">
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                      {branches.find(b => b.id === d.branchId)?.name || d.branchId}
                                    </span>
                                  </td>
                                )}
                                <td className={`p-3 font-bold font-mono text-sm ${showWarning ? "text-red-700" : "text-slate-800"}`}>₵{d.amount}</td>
                                <td className="p-3 text-slate-500 text-[11px]">{d.recordedByUserName}</td>
                                <td className="p-3 font-semibold text-[11px]">
                                  {showWarning ? (
                                    <div className="flex flex-col">
                                      <span className="text-red-700 font-bold">{d.dueDate}</span>
                                      <span className="text-[9px] text-red-600 font-extrabold uppercase tracking-wider animate-pulse mt-0.5">⚠️ Past Due</span>
                                    </div>
                                  ) : (
                                    <span className="text-blue-800">{d.dueDate}</span>
                                  )}
                                </td>
                                <td className={`p-3 text-slate-500 max-w-[150px] truncate ${showWarning ? "text-red-900 font-medium" : ""}`} title={d.reason}>{d.reason}</td>
                                <td className="p-3">
                                  {d.status === "OUTSTANDING" ? (
                                    showWarning ? (
                                      <span className="bg-red-200 text-red-900 border border-red-300 font-black px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">Overdue</span>
                                    ) : (
                                      <span className="bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded text-[9px] uppercase">Outstanding</span>
                                    )
                                  ) : (
                                    <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded text-[9px] uppercase">Cleared</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {d.status === "OUTSTANDING" ? (
                                    <button
                                      onClick={() => handleClearDebt(d.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-[10px] cursor-pointer transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                                    >
                                      <span>Paid ✔</span>
                                    </button>
                                  ) : (
                                    <div className="text-[9px] text-slate-400">
                                      <p>Cleared by</p>
                                      <p className="font-semibold text-emerald-700">{d.clearedByUserName}</p>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={currentUser?.role === "ADMIN" ? 9 : 7} className="text-center py-6 text-slate-400">No debts tracked at this branch yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* REPORTS EXPORT TAB */}
          {activeTab === "reports" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-navy-dark">Financial Statements & Closing Reports</h2>
                  <p className="text-slate-500 text-sm">Select periods and print or export standard ledger reports.</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={printReport}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded border cursor-pointer border-slate-300"
                  >
                    <Printer className="size-4" />
                    <span>Print PDF/Statement</span>
                  </button>
                </div>
              </div>

              {/* REPORT FILTER CHOOSE */}
              <div className="bg-slate-50 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Grouping:</span>
                  <div className="inline-flex rounded-md shadow-sm">
                    <button
                      onClick={() => { setReportsRange("daily"); fetchMasterData(); }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-l-lg border-y border-l transition-all ${
                        reportsRange === "daily" ? "bg-blue-60) bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => { setReportsRange("weekly"); fetchMasterData(); }}
                      className={`px-3 py-1.5 text-xs font-bold border-y transition-all ${
                        reportsRange === "weekly" ? "bg-blue-60) bg-blue-600 text-white border-blue-600" : "bg-white text-slate-705 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => { setReportsRange("monthly"); fetchMasterData(); }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-r-lg border-y border-r transition-all ${
                        reportsRange === "monthly" ? "bg-blue-60) bg-blue-600 text-white border-blue-600" : "bg-white text-slate-710 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-550 font-bold bg-slate-100 px-3 py-1 rounded">
                  Status: Consolidated Live Database Synchronized
                </div>
              </div>

              {/* ADMIN OFFLINE AUDITING & MASTER DATA EXPORT CENTER */}
              {currentUser?.role === "ADMIN" && (
                <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-xl border border-slate-800 p-5 shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10 pointer-events-none">
                    <FileSpreadsheet className="size-64" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-500 text-slate-950 text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-widest">
                            Admin Only Action
                          </span>
                          <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                            Offline Auditing & Master CSV Export
                          </h3>
                        </div>
                        <p className="text-slate-300 text-xs mt-1">
                          Consolidated raw worksheet downloader. Data encoded using UTF-8 (BOM included) for absolute compatibility with Microsoft Excel, macOS Numbers, and Google Sheets.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* TRANSACTIONS CARD */}
                      <div className="bg-white/[0.04] hover:bg-white/[0.06] transition-all border border-white/[0.08] p-4 rounded-lg flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold uppercase">
                              transactions.csv
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-200">Historical MOMO & Airtime Entries</h4>
                          <p className="text-[11px] text-slate-400 mt-1 mb-4">
                            Includes absolute ID, operator records, commissions, statuses, and custom client/recipient telephone data.
                          </p>
                        </div>
                        <button
                          onClick={handleExportTransactionsCSV}
                          disabled={isExportingTxs}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-xs font-bold rounded shadow transition-all cursor-pointer"
                        >
                          {isExportingTxs ? (
                            <>
                              <RefreshCw className="size-3.5 animate-spin" />
                              <span>Exporting...</span>
                            </>
                          ) : (
                            <>
                              <Download className="size-3.5" />
                              <span>Download Transactions ({transactions.length})</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* DEBTS CARD */}
                      <div className="bg-white/[0.04] hover:bg-white/[0.06] transition-all border border-white/[0.08] p-4 rounded-lg flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold uppercase">
                              debt_records.csv
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-200">Worker-Created Debts Tracker</h4>
                          <p className="text-[11px] text-slate-400 mt-1 mb-4">
                            Includes outstanding loans, borrower phone numbers, maturity due dates, recorded-by operators, and settlement clearances.
                          </p>
                        </div>
                        <button
                          onClick={handleExportDebtsCSV}
                          disabled={isExportingDebts}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-xs font-bold rounded shadow transition-all cursor-pointer"
                        >
                          {isExportingDebts ? (
                            <>
                              <RefreshCw className="size-3.5 animate-spin" />
                              <span>Exporting...</span>
                            </>
                          ) : (
                            <>
                              <Download className="size-3.5" />
                              <span>Download Loan Ledger ({debts.length})</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* SHIFT CLOSED CARD */}
                      <div className="bg-white/[0.04] hover:bg-white/[0.06] transition-all border border-white/[0.08] p-4 rounded-lg flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold uppercase">
                              shift_reports.csv
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-200">Reconciled Shift Closings</h4>
                          <p className="text-[11px] text-slate-400 mt-1 mb-4">
                            Detailed records of physical starting floats, expected drawer maths, operator cash handovers, and final discrepancies.
                          </p>
                        </div>
                        <button
                          onClick={handleExportShiftsCSV}
                          disabled={isExportingShifts}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-xs font-bold rounded shadow transition-all cursor-pointer"
                        >
                          {isExportingShifts ? (
                            <>
                              <RefreshCw className="size-3.5 animate-spin" />
                              <span>Exporting...</span>
                            </>
                          ) : (
                            <>
                              <Download className="size-3.5" />
                              <span>Download Shift Reports ({closingReports.length})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* REPORT STATEMENT TABLE PLOTTED */}
              <div id="printable_area" className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
                  <div>
                    <h4 className="font-extrabold text-sm uppercase tracking-widest">Ghana Mobile Money Business Report</h4>
                    <p className="text-[10px] text-slate-400">Generative ledger schema audit logic applied. Verified securely.</p>
                  </div>
                  <span className="text-xs font-mono bg-yellow-400 text-blue-950 font-bold px-2 py-0.5 rounded">₵ GHS CURRENCY</span>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <th className="p-3">Period / Timing Date</th>
                        <th className="p-3">Deposits Vol.</th>
                        <th className="p-3">Withdrawals Vol.</th>
                        <th className="p-3">Send Money Vol.</th>
                        <th className="p-3">Airtime Vol.</th>
                        <th className="p-3">Momo Commissions</th>
                        <th className="p-3">Est. Profit GHS</th>
                        <th className="p-3 text-center">Entries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.length > 0 ? (
                        reportRows.map((row, idx) => (
                          <tr key={idx} className="border-b transition-all border-slate-100 hover:bg-slate-50 font-medium">
                            <td className="p-4 font-bold text-navy-dark">{row.period}</td>
                            <td className="p-4 font-mono">₵{row.deposits.toLocaleString()}</td>
                            <td className="p-3 font-mono">₵{row.withdrawals.toLocaleString()}</td>
                            <td className="p-3 font-mono">₵{row.sendMoney.toLocaleString()}</td>
                            <td className="p-3 font-mono">₵{row.airtime.toLocaleString()}</td>
                            <td className="p-3 font-mono text-emerald-600 font-bold">₵{row.commission.toLocaleString()}</td>
                            <td className="p-3 font-mono text-blue-800 font-bold">₵{row.netProfit.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <span className="bg-slate-100 text-slate-800 px-2 py-1.5 rounded font-mono font-bold">{row.totalTransactions}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center py-6 text-slate-400">Loading period parameters...</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PERMANENT SHIFT CLOSING REPORTS (EOD Permanently stored tab) */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Permanently Stored Closing Reports History (EOD Audit)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {closingReports.length > 0 ? (
                    closingReports.map((c, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <div>
                            <p className="text-xs font-bold text-navy-dark">Operator: {c.userName}</p>
                            <p className="text-[10px] text-slate-400">Shift Date {c.date} (Closed {c.endTime})</p>
                          </div>
                          <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-extrabold uppercase">CLOSED</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                          <p className="text-slate-500">Opening Cash:</p>
                          <p className="text-right font-mono text-slate-800 font-semibold">GHS {c.openingCash}</p>

                          <p className="text-slate-500">Expected Cash:</p>
                          <p className="text-right font-mono text-slate-850 font-bold">GHS {c.expectedCash}</p>

                          <p className="text-slate-500">Actual Counted:</p>
                          <p className="text-right font-mono text-blue-800 font-extrabold">GHS {c.actualCash}</p>
                        </div>

                        {/* Difference Alert styling */}
                        <div className={`p-2 rounded font-bold text-center text-xs flex justify-between ${
                          (c.difference ?? 0) === 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-250" :
                          (c.difference ?? 0) < 0 ? "bg-red-55 bg-rose-50 text-rose-800 border border-rose-200" :
                          "bg-yellow-50 text-yellow-800 border border-yellow-200"
                        }`}>
                          <span>Drawer Shortage:</span>
                          <span className="font-mono">GHS {c.difference}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-4 rounded text-center text-slate-400 text-xs">No closing reports recorded yet. Close shift to generate.</div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* EOD OR START OF SHIFT MODULE TAB */}
          {activeTab === "closing" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-bold text-navy-dark font-sans">Shift Management & Closing Engine</h2>
                <p className="text-slate-500 text-sm">Lock opening cash and float figures, calculate actual cash drawer shortages at end-of-day automatically.</p>
              </div>

              {/* CASE 1: NO ACTIVE SHIFT IN WORKSPACE (OPEN PORTAL) */}
              {currentUser?.role === "ADMIN" ? (
                <div className="max-w-xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12 pointer-events-none">
                    <ShieldCheck className="size-64 text-white" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500 text-slate-950 text-[10px] uppercase font-black px-2.5 py-0.5 rounded tracking-widest">
                        Admin System Override
                      </span>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold tracking-tight">Shift Bypass Privilege Active</h3>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        Administrators have full operational override permissions. You are not required to open daily shifts or file EOD cash-drawer locks. Any transactions and ledger adjustments logged from this session bypass the shift constraints instantly.
                      </p>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-indigo-200 font-mono space-y-1">
                        <div>● Admin Status: <span className="text-emerald-400 font-bold">ACTIVE BYPASS</span></div>
                        <div>● Logged-In User: {currentUser.name}</div>
                        <div>● Target Outlet: {currentBranch?.name || "System Base"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : !activeShift ? (
                <div className="max-w-xl bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex gap-2 bg-blue-100 border border-blue-200 text-blue-900 p-3 rounded-lg text-xs font-semibold">
                    <User className="size-5 text-blue-800 shrink-0" />
                    <p>Mandatory Shift Enforcer: Enter the opening cash in locker and your beginning wallets floats. These variables will be locked instantly in database logs.</p>
                  </div>

                  {closingSuccess && (
                    <div className="bg-emerald-100 border border-emerald-250 p-4 rounded-xl text-xs space-y-2">
                      <p className="font-bold text-center text-emerald-900">SHIFT RECORDED AS CLOSED PERMANENTLY</p>
                      <div className="font-mono grid grid-cols-2 gap-1 text-slate-700">
                        <span>Expected Cash Drawer Balance:</span>
                        <span className="text-right font-bold">GHS {closingSuccess.expectedCash}</span>
                        <span>Actual counted Cash:</span>
                        <span className="text-right font-bold text-blue-700">GHS {closingSuccess.actualCash}</span>
                        <span>Shortage / Surplus margin:</span>
                        <span className={`text-right font-bold ${Number(closingSuccess.difference) < 0 ? 'text-red-600': 'text-emerald-700'}`}>GHS {closingSuccess.difference}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleOpenShift} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase">Opening Physical Cash (GHS)</label>
                      <input
                        id="open_cash_val"
                        type="number"
                        required
                        value={openingCash}
                        onChange={(e) => setOpeningCash(e.target.value)}
                        className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm font-bold text-navy-dark focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. 500.00"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">MTN Float (GHS)</label>
                        <input
                          id="open_mtn_float"
                          type="number"
                          required
                          value={openingMtn}
                          onChange={(e) => setOpeningMtn(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border rounded text-xs font-mono text-center font-bold"
                          placeholder="MTN"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Telecel Float</label>
                        <input
                          id="open_tel_float"
                          type="number"
                          required
                          value={openingTelecel}
                          onChange={(e) => setOpeningTelecel(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border rounded text-xs font-mono text-center font-bold"
                          placeholder="Telecel"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">AirtelTigo</label>
                        <input
                          id="open_art_float"
                          type="number"
                          required
                          value={openingAirtel}
                          onChange={(e) => setOpeningAirtel(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border rounded text-xs font-mono text-center font-bold"
                          placeholder="AirtelTigo"
                        />
                      </div>
                    </div>

                    {shiftError && (
                      <span className="text-xs text-red-600 font-bold block">{shiftError}</span>
                    )}

                    <button
                      id="submit_open_shift_btn"
                      type="submit"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow cursor-pointer transition-all"
                    >
                      🔓 Initialize shift balances
                    </button>
                  </form>
                </div>
              ) : (
                /* CASE 2: SHIFT ALREADY RUNNING (CLOSE PORTAL) */
                <div className="max-w-xl bg-slate-50 p-6 rounded-2xl border border-slate-205 space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-3 text-xs flex items-center gap-2">
                    <CheckCircle className="size-4 text-emerald-700" />
                    <span>Terminal Session Running: Your shift was initialized successfully today at {activeShift.startTime}.</span>
                  </div>

                  <div className="font-semibold text-xs text-slate-650 bg-white border p-4 rounded-xl space-y-2">
                    <p className="text-slate-400 font-bold border-b pb-1.5 uppercase text-[10px]">LOCKED INITIAL STATE</p>
                    <div className="grid grid-cols-2 gap-1 font-mono">
                      <span>Locker Cash:</span>
                      <span className="text-right text-slate-800">GHS {activeShift.openingCash}</span>
                      <span>MTN float:</span>
                      <span className="text-right text-slate-800">GHS {activeShift.openingFloatMtn}</span>
                      <span>Telecel float:</span>
                      <span className="text-right text-slate-800">GHS {activeShift.openingFloatTelecel}</span>
                      <span>AirtelTigo float:</span>
                      <span className="text-right text-slate-800">GHS {activeShift.openingFloatAirtelTigo}</span>
                    </div>
                  </div>

                  <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase">Actual Physical Cash Counted (GHS)</label>
                      <input
                        id="actual_counted_val"
                        type="number"
                        required
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                        className="w-full mt-1 px-3 py-2.5 border rounded-lg text-lg font-bold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Count drawers, enter cash value..."
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Math formulas automatically compile expected figures on click.</span>
                    </div>

                    <button
                      id="submit_close_shift_btn"
                      type="submit"
                      className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-750 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-all transition-all cursor-pointer"
                    >
                      🔐 Close Shift & Save Report Permanently
                    </button>
                  </form>
                </div>
              )}

            </motion.div>
          )}

          {/* ADMIN BRANCHES & WORKERS REGISTER TAB */}
          {activeTab === "branches_workers" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-bold text-navy-dark">Multiple Branches & Staff Registry</h2>
                <p className="text-slate-500 text-sm">Add multi-outlet channels and setup role-based agent authorizations.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* BRANCH CREATOR */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Add Branch to Platform</h4>
                  <form onSubmit={handleCreateBranch} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Branch Name</label>
                      <input
                        id="branch_reg_name"
                        type="text"
                        required
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border rounded text-xs"
                        placeholder="e.g. Tema Community 1 Branch"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Street Location</label>
                      <input
                        id="branch_reg_location"
                        type="text"
                        required
                        value={newBranchLoc}
                        onChange={(e) => setNewBranchLoc(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border rounded text-xs"
                        placeholder="e.g. Meridian Road, Tema"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-700 text-white text-xs font-bold uppercase rounded"
                    >
                      Add new outlet branch
                    </button>
                  </form>
                </div>

                {/* STAFF REGISTRATION Form */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Add Worker / Agent Operator</h4>
                  <form onSubmit={handleCreateWorker} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Staff Full Name</label>
                      <input
                        id="worker_reg_name"
                        type="text"
                        required
                        value={newWorkerName}
                        onChange={(e) => setNewWorkerName(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border rounded text-xs"
                        placeholder="Kojo Antwi"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Unique Username</label>
                      <input
                        id="worker_reg_user"
                        type="text"
                        required
                        value={newWorkerUser}
                        onChange={(e) => setNewWorkerUser(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border rounded text-xs font-mono font-bold"
                        placeholder="kojo1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Password</label>
                      <div className="relative mt-1">
                        <input
                          id="worker_reg_pass"
                          type={showWorkerRegPass ? "text" : "password"}
                          required
                          value={newWorkerPass}
                          onChange={(e) => setNewWorkerPass(e.target.value)}
                          className="w-full pl-3 pr-8 py-1.5 border rounded text-xs"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWorkerRegPass(!showWorkerRegPass)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                        >
                          {showWorkerRegPass ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">Role Authority</label>
                        <select
                          id="worker_reg_role"
                          value={newWorkerRole}
                          onChange={(e) => setNewWorkerRole(e.target.value as "ADMIN" | "WORKER")}
                          className="w-full mt-1 p-1.5 border rounded text-xs"
                        >
                          <option value="WORKER">Agent (Worker)</option>
                          <option value="ADMIN">Super Admin (Owner)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">Outlet Assignment</label>
                        <select
                          id="worker_reg_branch"
                          value={newWorkerBranch}
                          onChange={(e) => setNewWorkerBranch(e.target.value)}
                          className="w-full mt-1 p-1.5 border rounded text-xs"
                        >
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-700 text-white text-xs font-bold uppercase rounded"
                    >
                      Authorize operator profile
                    </button>
                  </form>
                </div>

              </div>

              {/* ACTIVE OUTLETS DIRECTORY */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="border-b pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="size-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-850">Active Outlets Directory & Editing</h3>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">{branches.length} Registered Outlets</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wide">
                        <th className="p-3">Branch ID</th>
                        <th className="p-3">Branch Name</th>
                        <th className="p-3">Street Location Address</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {branches.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-[10px] text-slate-400">{b.id}</td>
                          <td className="p-3 font-bold text-slate-800">{b.name}</td>
                          <td className="p-3 text-slate-600 font-medium">🏢 {b.location}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setEditingBranchId(b.id);
                                setEditingBranchName(b.name);
                                setEditingBranchLoc(b.location);
                                setEditBranchError("");
                                setEditBranchSuccess("");
                                setIsEditBranchOpen(true);
                              }}
                              className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2.5 py-1.5 rounded text-[11px] border border-blue-200 transition-all cursor-pointer active:scale-95"
                              title={`Edit details for ${b.name}`}
                            >
                              <Edit className="size-3" />
                              <span>Edit Details</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FLOATS MANAGER ADJUSTMENTS & THRESHOLDS FOR ADMIN */}
              <div id="floats-management-section" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="border-b pb-2 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-850">Central Floats & Safety Threshold Management</h3>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="Alarm Limit (GHS)..."
                      value={thresholdVal}
                      onChange={(e) => setThresholdVal(e.target.value)}
                      className="bg-slate-50 border rounded text-xs p-1.5 w-36"
                    />
                    <button
                      onClick={() => handleAdjustThreshold("branch-a")}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 rounded text-xs font-bold cursor-pointer"
                    >
                      Update Threshold
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {floatBalances.map((fl, i) => {
                    const branch = branches.find(b => b.id === fl.branchId);
                    const stateValues = customFloats[fl.branchId] || { mtn: String(fl.mtnFloat), tel: String(fl.telecelFloat), art: String(fl.airtelTigoFloat) };
                    const airtimeValues = customAirtimeFloats[fl.branchId] || { mtn: String(fl.mtnAirtimeFloat || 1000), tel: String(fl.telecelAirtimeFloat || 500), art: String(fl.airtelTigoAirtimeFloat || 500) };

                    return (
                      <div key={i} className="bg-slate-100 p-4 rounded-xl border border-slate-200 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-slate-200">
                          <span className="text-xs font-bold text-navy-dark">{branch ? branch.name : fl.branchId}</span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 rounded font-bold uppercase">Safe limit: {fl.lowFloatThreshold}</span>
                        </div>

                        {/* MOMO Cash Float Adjustment Box */}
                        <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center pb-1 border-b mb-1">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">MoMo Cash Float</span>
                            <span className="text-[8px] text-slate-400 font-mono">DRAWER</span>
                          </div>
                          
                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-semibold text-slate-500 w-16 text-right">MTN</span>
                            <input
                              type="number"
                              value={stateValues.mtn}
                              onChange={(e) => {
                                setCustomFloats({
                                  ...customFloats,
                                  [fl.branchId]: { ...stateValues, mtn: e.target.value }
                                });
                              }}
                              className="bg-white border rounded text-xs p-1 font-mono text-center w-full"
                            />
                          </div>

                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-semibold text-slate-500 w-16 text-right">Telecel</span>
                            <input
                              type="number"
                              value={stateValues.tel}
                              onChange={(e) => {
                                setCustomFloats({
                                  ...customFloats,
                                  [fl.branchId]: { ...stateValues, tel: e.target.value }
                                });
                              }}
                              className="bg-white border rounded text-xs p-1 font-mono text-center w-full"
                            />
                          </div>

                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-semibold text-slate-500 w-16 text-right">AirtelTigo</span>
                            <input
                              type="number"
                              value={stateValues.art}
                              onChange={(e) => {
                                setCustomFloats({
                                  ...customFloats,
                                  [fl.branchId]: { ...stateValues, art: e.target.value }
                                });
                              }}
                              className="bg-white border rounded text-xs p-1 font-mono text-center w-full"
                            />
                          </div>

                          <button
                            onClick={() => handleAdjustFloat(fl.branchId)}
                            className="w-full mt-2 text-[9px] tracking-wider uppercase font-extrabold bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded cursor-pointer transition-all"
                          >
                            💸 Sync MoMo Float
                          </button>
                        </div>

                        {/* Separated Airtime Float Adjustment Box */}
                        <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center pb-1 border-b mb-1">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Airtime Wallet</span>
                            <span className="text-[8px] text-slate-400 font-mono">DIGITAL</span>
                          </div>

                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-semibold text-slate-500 w-16 text-right">MTN</span>
                            <input
                              type="number"
                              value={airtimeValues.mtn}
                              onChange={(e) => {
                                setCustomAirtimeFloats({
                                  ...customAirtimeFloats,
                                  [fl.branchId]: { ...airtimeValues, mtn: e.target.value }
                                });
                              }}
                              className="bg-white border rounded text-xs p-1 font-mono text-center w-full"
                            />
                          </div>

                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-semibold text-slate-500 w-16 text-right">Telecel</span>
                            <input
                              type="number"
                              value={airtimeValues.tel}
                              onChange={(e) => {
                                setCustomAirtimeFloats({
                                  ...customAirtimeFloats,
                                  [fl.branchId]: { ...airtimeValues, tel: e.target.value }
                                });
                              }}
                              className="bg-white border rounded text-xs p-1 font-mono text-center w-full"
                            />
                          </div>

                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-semibold text-slate-500 w-16 text-right">AirtelTigo</span>
                            <input
                              type="number"
                              value={airtimeValues.art}
                              onChange={(e) => {
                                setCustomAirtimeFloats({
                                  ...customAirtimeFloats,
                                  [fl.branchId]: { ...airtimeValues, art: e.target.value }
                                });
                              }}
                              className="bg-white border rounded text-xs p-1 font-mono text-center w-full"
                            />
                          </div>

                          <button
                            onClick={() => handleAdjustAirtimeFloat(fl.branchId)}
                            className="w-full mt-2 text-[9px] tracking-wider uppercase font-extrabold bg-emerald-650 hover:bg-emerald-700 text-white py-1.5 rounded cursor-pointer transition-all"
                          >
                            🔋 Sync Airtime Wallet
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

            </motion.div>
          )}

          {/* AUDIT TRAIL LOG GENERAL VIEW */}
          {activeTab === "audit" && currentUser?.role === "ADMIN" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-navy-dark">Audit Trail Logs Platform Guard</h2>
                  <p className="text-slate-500 text-sm">Central immutable logging of terminal accesses, transactions lock status, and clearances.</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    onClick={handleExportTransactionsCSV}
                    disabled={isExportingTxs}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-50 text-[11px] font-semibold rounded border border-slate-300 cursor-pointer transition-all"
                    title="Export all historical transaction rows as a clean CSV table"
                  >
                    <Download className="size-3" />
                    <span>Transactions CSV</span>
                  </button>
                  <button
                    onClick={handleExportDebtsCSV}
                    disabled={isExportingDebts}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-50 text-[11px] font-semibold rounded border border-slate-300 cursor-pointer transition-all"
                    title="Export all loan & debtor records as a clean CSV table"
                  >
                    <Download className="size-3" />
                    <span>Debts CSV</span>
                  </button>
                  <button
                    onClick={handleExportShiftsCSV}
                    disabled={isExportingShifts}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-50 text-[11px] font-semibold rounded border border-slate-300 cursor-pointer transition-all"
                    title="Export all consolidated shift closing handovers as a clean CSV table"
                  >
                    <Download className="size-3" />
                    <span>Shifts CSV</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table id="audit_table" className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                        <th className="p-3">Timing Timestamp</th>
                        <th className="p-3">Operator</th>
                        <th className="p-3">Action logged</th>
                        <th className="p-3">Original locked value</th>
                        <th className="p-3">New adjusted value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 font-medium">
                          <td className="p-3 font-mono text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="p-3">
                            <p className="font-bold text-navy-dark">{log.userName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {log.userId}</p>
                          </td>
                          <td className="p-3">
                            <span className="bg-blue-50 text-blue-805 font-bold border border-blue-100 px-2 py-0.5 rounded text-[10px] uppercase">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 max-w-[200px] truncate" title={log.oldValue}>{log.oldValue || "-"}</td>
                          <td className="p-3 text-emerald-700 max-w-[200px] truncate" title={log.newValue}>{log.newValue || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* APPROVALS & SECURITY CONTROLS GENERAL VIEW */}
          {activeTab === "approvals_security" && currentUser?.role === "ADMIN" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Header Banner */}
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-navy-dark flex items-center gap-2">
                  <ShieldAlert className="size-7 text-amber-500 fill-amber-500/10" />
                  <span>Security Approvals & Platform Guard Controls</span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">Configure threshold limits, multi-channel notification dispatches, quiet hours, and process active high-value pending transactions.</p>
              </div>

              {/* Grid Layout: Pending Transactions (Left) and Configuration Panel (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Pending Approvals List (Col span 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-navy-dark text-sm">Active Approval Pipeline</h3>
                      <p className="text-xs text-slate-500">Transactions equal to or exceeding GH₵{approvalSettings?.approvalThreshold?.toLocaleString() || "5,000"} require validation.</p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">
                      {transactions.filter(t => t.status === "PENDING_APPROVAL").length} Pending
                    </span>
                  </div>

                  {transactions.filter(t => t.status === "PENDING_APPROVAL").length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                      <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 animate-pulse ring-8 ring-emerald-50">
                        <ShieldCheck className="size-9" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-navy-dark text-base">System All Clear</h4>
                        <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">There are currently no transactions in the approval queue. All agent transactions have been executed instantly.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions
                        .filter(t => t.status === "PENDING_APPROVAL")
                        .map(tx => {
                          const branch = branches.find(b => b.id === tx.branchId);
                          const branchName = branch ? branch.name : "Unknown Branch";
                          return (
                            <div key={tx.id} className="bg-white border-l-4 border-amber-500 border-y border-r border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">Awaiting Authorization</span>
                                  <h4 className="font-extrabold text-slate-800 text-sm mt-1.5 uppercase">
                                    {tx.type.replace("_", " ")} - {tx.network || "MTN"}
                                  </h4>
                                </div>
                                <span className="font-mono font-extrabold text-base text-amber-600">
                                  GHS {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-3 text-xs">
                                <div>
                                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Staff Entry</p>
                                  <p className="font-bold text-navy-dark mt-0.5">{tx.userName}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Branch Outlet</p>
                                  <p className="font-bold text-navy-dark mt-0.5">{branchName}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Timing Stamp</p>
                                  <p className="font-mono text-slate-600 mt-0.5">{new Date(tx.recordedAt).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Client Target</p>
                                  <p className="font-mono font-bold text-slate-600 mt-0.5">
                                    {tx.customerNumber || tx.receiverNumber || tx.senderNumber || "N/A"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end pt-2">
                                <button
                                  onClick={() => handleRejectTransaction(tx.id)}
                                  className="px-4 py-2 bg-rose-55 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <XCircle className="size-4" />
                                  <span>Reject & Void</span>
                                </button>
                                <button
                                  onClick={() => handleApproveTransaction(tx.id)}
                                  className="px-5 py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <CheckCircle className="size-4" />
                                  <span>Approve & Release</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Settings Panel (Col span 5) */}
                <div className="lg:col-span-5">
                  {approvalSettings && (
                    <form onSubmit={handleSaveApprovalSettings} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Settings className="size-5 text-blue-600" />
                        <h3 className="font-bold text-navy-dark text-base">Threshold & Channel Settings</h3>
                      </div>

                      {/* Configurable Threshold */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Approval Threshold (GHS)</label>
                        <div className="relative rounded-lg shadow-sm">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-slate-500 text-xs font-bold">GH₵</span>
                          </div>
                          <input
                            type="number"
                            required
                            min="1"
                            value={approvalSettings.approvalThreshold}
                            onChange={(e) => updateSettingsField("approvalThreshold", Number(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 py-2 pl-11 pr-3 text-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="5000"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">Transactions equal to or above this limit go to the approval queue automatically.</p>
                      </div>

                      {/* Channels Toggles */}
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Enabled Alert Channels</label>
                        
                        <div className="space-y-2">
                          <label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                            <input
                              type="checkbox"
                              checked={approvalSettings.browserPushEnabled}
                              onChange={(e) => updateSettingsField("browserPushEnabled", e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Browser Push Notifications</p>
                              <p className="text-[10px] text-slate-400">Receive persistent push overlays on laptops & PCs.</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                            <input
                              type="checkbox"
                              checked={approvalSettings.fcmEnabled}
                              onChange={(e) => updateSettingsField("fcmEnabled", e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Firebase Cloud Messaging</p>
                              <p className="text-[10px] text-slate-400">Instant background wakeup dispatches on tablets and phones.</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                            <input
                              type="checkbox"
                              checked={approvalSettings.emailEnabled}
                              onChange={(e) => updateSettingsField("emailEnabled", e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Email Alerts (Nodemailer)</p>
                              <p className="text-[10px] text-slate-400">Dispatches detailed HTML templates to admin emails.</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                            <input
                              type="checkbox"
                              checked={approvalSettings.smsEnabled}
                              onChange={(e) => updateSettingsField("smsEnabled", e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Optional SMS Alerts</p>
                              <p className="text-[10px] text-slate-400">Fallback cellular texts to notification contacts.</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                            <input
                              type="checkbox"
                              checked={approvalSettings.whatsappEnabled}
                              onChange={(e) => updateSettingsField("whatsappEnabled", e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">WhatsApp Business API</p>
                              <p className="text-[10px] text-slate-400">Trigger standard notification templates to administrators.</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Quiet Hours Configuration */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800">Quiet Hours suppression</p>
                            <p className="text-[10px] text-slate-400">Do not dispatch notifications during offline hours.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={approvalSettings.quietHoursEnabled}
                            onChange={(e) => updateSettingsField("quietHoursEnabled", e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4 cursor-pointer"
                          />
                        </div>

                        {approvalSettings.quietHoursEnabled && (
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 uppercase">Start hour</label>
                              <input
                                type="text"
                                placeholder="22:00"
                                value={approvalSettings.quietHoursStart}
                                onChange={(e) => updateSettingsField("quietHoursStart", e.target.value)}
                                className="mt-1 block w-full rounded border border-slate-300 bg-white p-2 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 uppercase">End hour</label>
                              <input
                                type="text"
                                placeholder="06:00"
                                value={approvalSettings.quietHoursEnd}
                                onChange={(e) => updateSettingsField("quietHoursEnd", e.target.value)}
                                className="mt-1 block w-full rounded border border-slate-300 bg-white p-2 text-xs font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Escalation Rules */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800">Escalation Rules & Timeouts</p>
                            <p className="text-[10px] text-slate-400">Escalate transaction if left pending too long.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={approvalSettings.escalationRulesEnabled}
                            onChange={(e) => updateSettingsField("escalationRulesEnabled", e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4 cursor-pointer"
                          />
                        </div>

                        {approvalSettings.escalationRulesEnabled && (
                          <div className="space-y-3 pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 uppercase">Escalation Timeout (Minutes)</label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={approvalSettings.escalationTimeoutMinutes}
                                onChange={(e) => updateSettingsField("escalationTimeoutMinutes", Number(e.target.value))}
                                className="mt-1 block w-full rounded border border-slate-300 bg-white p-2 text-xs font-mono"
                              />
                            </div>

                            {/* Recipients editing */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 uppercase">Backup Escalation Emails</label>
                              <textarea
                                value={approvalSettings.escalationRecipients?.join(", ")}
                                onChange={(e) => updateSettingsField("escalationRecipients", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                                className="mt-1 block w-full rounded border border-slate-300 bg-white p-2 text-xs font-mono"
                                rows={2}
                                placeholder="backup-admin@enakomoorventures.com"
                              />
                              <p className="text-[9px] text-slate-400 mt-1">Comma-separated list of backup admin emails.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recipients Configuration (General approval) */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Approval Notification Recipients</label>
                        <textarea
                          required
                          value={approvalSettings.notificationRecipients?.join(", ")}
                          onChange={(e) => updateSettingsField("notificationRecipients", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                          className="block w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono"
                          rows={2}
                          placeholder="enakomoorventures@gmail.com"
                        />
                        <p className="text-[9px] text-slate-400">Comma-separated list of active emails for primary alerts.</p>
                      </div>

                      <button
                        type="submit"
                        disabled={isUpdatingSettings}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        {isUpdatingSettings ? (
                          <>
                            <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <span>Save Security Settings</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>

              </div>
            </motion.div>
          )}



        </section>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-navy-dark text-slate-300 text-center py-4 border-t border-slate-800 text-xs shrink-0">
        <p>© 2026 Enakomoor Ventures. Sky Blue Professional Theme.</p>
        <p className="text-[10px] text-slate-400 mt-1">Calculators verified under Ghanaian commission standards. Permanent storage logs enabled.</p>
      </footer>

      {/* ADD BRANCH QUICK MODAL */}
      <AnimatePresence>
        {isAddBranchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddBranchOpen(false);
                setQuickBranchError("");
                setQuickBranchSuccess("");
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 z-10 overflow-hidden text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Building className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Create New Branch</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Expand Enakomoor Ventures network</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAddBranchOpen(false);
                    setQuickBranchError("");
                    setQuickBranchSuccess("");
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <XCircle className="size-5" />
                </button>
              </div>

              {/* Status alerts */}
              {quickBranchError && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs p-2.5 rounded-lg mb-3 flex items-center gap-2 font-medium">
                  <AlertTriangle className="size-4 text-rose-600" />
                  <span>{quickBranchError}</span>
                </div>
              )}
              {quickBranchSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs p-2.5 rounded-lg mb-3 flex items-center gap-2 font-medium animate-pulse">
                  <CheckCircle className="size-4 text-emerald-600" />
                  <span>{quickBranchSuccess}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleCreateBranchQuick} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Branch Name
                  </label>
                  <input
                    id="quick_branch_name"
                    type="text"
                    required
                    value={quickBranchName}
                    onChange={(e) => setQuickBranchName(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Accra Central Outlet"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Street Location Address
                  </label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-2.5 size-4 text-slate-400" />
                    <input
                      id="quick_branch_location"
                      type="text"
                      required
                      value={quickBranchLoc}
                      onChange={(e) => setQuickBranchLoc(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Ring Road Central, Accra"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddBranchOpen(false);
                      setQuickBranchError("");
                      setQuickBranchSuccess("");
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg shadow-md shadow-blue-500/10 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="size-3.5" />
                    Create Branch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT BRANCH MODAL */}
      <AnimatePresence>
        {isEditBranchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsEditBranchOpen(false);
                setEditBranchError("");
                setEditBranchSuccess("");
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 z-10 overflow-hidden text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Edit className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit Outlet Details</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Modify Enakomoor Ventures outlet properties</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditBranchOpen(false);
                    setEditBranchError("");
                    setEditBranchSuccess("");
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <XCircle className="size-5" />
                </button>
              </div>

              {/* Status alerts */}
              {editBranchError && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs p-2.5 rounded-lg mb-3 flex items-center gap-2 font-medium">
                  <AlertTriangle className="size-4 text-rose-600" />
                  <span>{editBranchError}</span>
                </div>
              )}
              {editBranchSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs p-2.5 rounded-lg mb-3 flex items-center gap-2 font-medium animate-pulse">
                  <CheckCircle className="size-4 text-emerald-600" />
                  <span>{editBranchSuccess}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleUpdateBranch} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Branch Name
                  </label>
                  <input
                    id="edit_branch_name"
                    type="text"
                    required
                    value={editingBranchName}
                    onChange={(e) => setEditingBranchName(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Accra Central Outlet"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Street Location Address
                  </label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-2.5 size-4 text-slate-400" />
                    <input
                      id="edit_branch_location"
                      type="text"
                      required
                      value={editingBranchLoc}
                      onChange={(e) => setEditingBranchLoc(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Ring Road Central, Accra"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleDeleteBranch}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 dark:text-rose-400 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditBranchOpen(false);
                        setEditBranchError("");
                        setEditBranchSuccess("");
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg shadow-md shadow-blue-500/10 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle className="size-3.5" />
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING TOAST NOTIFICATIONS FOR LOW FLOAT BALANCE WARNINGS */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {activeToasts.map((alert) => {
            const key = `${alert.branchId}-${alert.network}-${alert.balance}`;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 35, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                className="pointer-events-auto w-full bg-slate-900 text-white dark:bg-slate-950 rounded-xl shadow-2xl border border-amber-500/30 p-4 flex gap-3 relative overflow-hidden group select-none"
              >
                {/* Visual warning light accent on the side */}
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-amber-600 animate-pulse" />
                
                <div className="bg-amber-500/10 text-amber-400 rounded-full h-9 w-9 shrink-0 flex items-center justify-center border border-amber-500/20 mt-0.5 animate-bounce">
                  <Bell className="size-5 text-amber-400" />
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[13px] text-white tracking-wide uppercase">Low Float Warning</span>
                    <span className="text-[9px] font-mono font-black bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      {alert.network}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                    The {alert.network} wallet balance for <span className="text-white font-bold">{alert.branchName}</span> has dropped to <span className="text-amber-400 font-extrabold">GHS {alert.balance.toLocaleString()}</span>.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <span>Threshold Limit: GHS {alert.threshold.toLocaleString()}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismissAlert(alert.branchId, alert.network, alert.balance)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white hover:bg-slate-850 p-1 rounded-lg transition-all cursor-pointer active:scale-95"
                  title="Dismiss alert"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
