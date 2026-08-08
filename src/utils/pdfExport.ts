import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Transaction, Debt, Shift, Branch, DashboardStats } from "../types";

// Company Header helper for PDF
const addPDFHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background bar
  doc.setFillColor(30, 58, 138); // Blue 900
  doc.rect(0, 0, pageWidth, 28, "F");

  // Accent gold line
  doc.setFillColor(250, 204, 21); // Yellow 400
  doc.rect(0, 28, pageWidth, 3, "F");

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ENAKOMOOR VENTURES", 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("GHANA MOBILE MONEY BUSINESS PLATFORM", 14, 21);

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), pageWidth - 14, 15, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, pageWidth - 14, 21, { align: "right" });

  if (subtitle) {
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(subtitle, 14, 38);
  }
};

// Footer helper
const addPDFFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Enakomoor Ventures • Official Audit & Financial Statement", 14, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  }
};

/**
 * Export Transactions Report as PDF
 */
export const exportTransactionsPDF = (
  transactions: Transaction[],
  branches: Branch[],
  category: "MOMO" | "AIRTIME" | "ALL" = "ALL",
  action: "download" | "print" = "download"
) => {
  const doc = new jsPDF({ orientation: "landscape" });

  let filtered = transactions;
  let catTitle = "All Transactions Audit Report";
  if (category === "MOMO") {
    filtered = transactions.filter(t => t.type !== "airtime");
    catTitle = "Mobile Money (MoMo) Transactions Audit";
  } else if (category === "AIRTIME") {
    filtered = transactions.filter(t => t.type === "airtime");
    catTitle = "Airtime Top-Up Transactions Audit";
  }

  addPDFHeader(doc, "TRANSACTIONS AUDIT REPORT", catTitle);

  // Stats Summary Box
  const totalCount = filtered.length;
  const totalVolume = filtered.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalCommission = filtered.reduce((acc, t) => acc + Number(t.commission || 0), 0);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(`Summary: ${totalCount} Records | Total Volume: GHS ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} | Net Commission: GHS ${totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 42);

  const tableData = filtered.map(t => {
    const branchName = branches.find(b => b.id === t.branchId)?.name || t.branchId;
    const dateStr = new Date(t.recordedAt).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    let phoneDetails = "N/A";
    if (t.customerNumber) phoneDetails = t.customerNumber;
    else if (t.senderNumber || t.receiverNumber) phoneDetails = `S:${t.senderNumber || "-"} R:${t.receiverNumber || "-"}`;

    return [
      t.id.slice(0, 12),
      dateStr,
      branchName,
      t.userName || "Operator",
      t.type.toUpperCase(),
      t.network || "N/A",
      phoneDetails,
      `GHS ${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `GHS ${Number(t.commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      t.status
    ];
  });

  autoTable(doc, {
    startY: 48,
    head: [["Tx ID", "Date & Time", "Branch", "Operator", "Type", "Network", "Customer / Numbers", "Amount", "Commission", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  addPDFFooter(doc);

  if (action === "print") {
    doc.autoPrint();
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  } else {
    const filename = `${category.toLowerCase()}_transactions_report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }
};

/**
 * Export Debt / Loan Ledger as PDF
 */
export const exportDebtsPDF = (
  debts: Debt[],
  branches: Branch[],
  action: "download" | "print" = "download"
) => {
  const doc = new jsPDF({ orientation: "landscape" });

  addPDFHeader(doc, "CUSTOMER LOAN & DEBT LEDGER", "Official Record of Outstanding & Cleared Customer Balances");

  const totalDebts = debts.length;
  const outstandingList = debts.filter(d => d.status === "OUTSTANDING");
  const totalOutstandingAmount = outstandingList.reduce((acc, d) => acc + Number(d.amount || 0), 0);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(`Summary: ${totalDebts} Total Entries | ${outstandingList.length} Outstanding | Total Unpaid Balance: GHS ${totalOutstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 42);

  const tableData = debts.map(d => {
    const branchName = branches.find(b => b.id === d.branchId)?.name || d.branchId;
    const modeStr = d.paymentMode === "ELECTRONIC_MONEY" ? `MoMo (${d.paymentNetwork || "E-Money"})` : "Physical Cash";

    return [
      d.customerName,
      d.customerNumber,
      branchName,
      `GHS ${Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `GHS ${Number(d.commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      modeStr,
      d.recordedByUserName,
      d.dueDate,
      d.reason || "N/A",
      d.status
    ];
  });

  autoTable(doc, {
    startY: 48,
    head: [["Customer Name", "Phone", "Branch", "Amount", "Commission", "Source", "Logged By", "Due Date", "Reason", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  addPDFFooter(doc);

  if (action === "print") {
    doc.autoPrint();
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  } else {
    doc.save(`debt_ledger_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
};

/**
 * Export Shift Closing Audit Reports as PDF
 */
export const exportShiftsPDF = (
  shifts: Shift[],
  branches: Branch[],
  action: "download" | "print" = "download"
) => {
  const doc = new jsPDF({ orientation: "landscape" });

  addPDFHeader(doc, "SHIFT CLOSING & RECONCILIATION AUDIT", "Operator Drawer Cash Handover & Float Balance Reconciliations");

  const tableData = shifts.map(s => {
    const branchName = branches.find(b => b.id === s.branchId)?.name || s.branchId;

    return [
      s.id.slice(0, 10),
      s.date,
      branchName,
      s.userName,
      `GHS ${Number(s.openingCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `GHS ${Number(s.openingFloatMtn || 0).toLocaleString()}`,
      `GHS ${Number(s.openingFloatTelecel || 0).toLocaleString()}`,
      `GHS ${Number(s.openingFloatAirtelTigo || 0).toLocaleString()}`,
      `GHS ${Number(s.expectedCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `GHS ${Number(s.actualCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `GHS ${Number(s.difference || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      s.status
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [["Shift ID", "Date", "Branch", "Operator", "Start Cash", "Start MTN", "Start Telecel", "Start AT", "Expected Cash", "Handed Cash", "Variance", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5
    },
    styles: {
      fontSize: 7,
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  addPDFFooter(doc);

  if (action === "print") {
    doc.autoPrint();
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  } else {
    doc.save(`shift_reconciliation_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
};

/**
 * Export Consolidated Financial Statement as PDF
 */
export const exportFinancialStatementPDF = (
  stats: DashboardStats | null,
  branches: Branch[],
  reportsRange: string,
  transactions: Transaction[],
  action: "download" | "print" = "download"
) => {
  const doc = new jsPDF({ orientation: "portrait" });

  addPDFHeader(doc, "FINANCIAL STATEMENT & CLOSING REPORT", `Consolidated Period: ${reportsRange.toUpperCase()}`);

  if (!stats) {
    doc.text("No stats available to render financial statement.", 14, 50);
    doc.save("financial_statement.pdf");
    return;
  }

  let y = 38;

  // Key Financial Highlights Cards
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, y, 182, 38, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, 182, 38, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("KEY FINANCIAL PERFORMANCE METRICS", 20, y + 8);

  const totalVolume = (stats.totalDeposits || 0) + (stats.totalWithdrawals || 0) + (stats.totalSendMoney || 0) + (stats.totalAirtime || 0);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  
  doc.text(`Total Transaction Volume:`, 20, y + 17);
  doc.setFont("helvetica", "bold");
  doc.text(`GHS ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 85, y + 17);

  doc.setFont("helvetica", "normal");
  doc.text(`Net Commissions / Profit:`, 20, y + 24);
  doc.setFont("helvetica", "bold");
  doc.text(`GHS ${(stats.todayProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 85, y + 24);

  doc.setFont("helvetica", "normal");
  doc.text(`Total Physical Cash in Drawers:`, 20, y + 31);
  doc.setFont("helvetica", "bold");
  doc.text(`GHS ${(stats.currentCashBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 85, y + 31);

  doc.setFont("helvetica", "normal");
  doc.text(`Total Combined Capital:`, 110, y + 17);
  doc.setFont("helvetica", "bold");
  doc.text(`GHS ${(stats.combinedTotalCapital || stats.totalWorkingCapital || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 165, y + 17);

  doc.setFont("helvetica", "normal");
  doc.text(`MTN Float Balance:`, 110, y + 24);
  doc.setFont("helvetica", "bold");
  doc.text(`GHS ${(stats.currentMtnFloat || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 165, y + 24);

  doc.setFont("helvetica", "normal");
  doc.text(`Telecel + AT Floats:`, 110, y + 31);
  doc.setFont("helvetica", "bold");
  doc.text(`GHS ${((stats.currentTelecelFloat || 0) + (stats.currentAirtelTigoFloat || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 165, y + 31);

  y += 46;

  // Branch Performance Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("PER-BRANCH BREAKDOWN", 14, y);

  const branchRows = (stats.branchNetProfits || []).map(b => [
    b.branchName,
    `GHS ${(b.todayProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `GHS ${(b.cashBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `GHS ${(b.mtnFloat || 0).toLocaleString()}`,
    `GHS ${(b.telecelFloat || 0).toLocaleString()}`,
    `GHS ${(b.airtelTigoFloat || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [["Branch Outlet", "Net Commission", "Physical Cash", "MTN Float", "Telecel Float", "AT Float"]],
    body: branchRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8
    },
    styles: {
      fontSize: 8,
      cellPadding: 3
    }
  });

  // Recent Transactions Sample
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("RECENT AUDITED TRANSACTIONS RECORD", 14, finalY);

  const txSample = transactions.slice(0, 15).map(t => [
    new Date(t.recordedAt).toLocaleDateString("en-GB") + " " + new Date(t.recordedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    t.type.toUpperCase(),
    t.network || "N/A",
    t.customerNumber || "N/A",
    `GHS ${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `GHS ${Number(t.commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: [["Timestamp", "Type", "Network", "Customer Number", "Amount", "Commission"]],
    body: txSample,
    theme: "striped",
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2
    }
  });

  addPDFFooter(doc);

  if (action === "print") {
    doc.autoPrint();
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  } else {
    doc.save(`financial_statement_${reportsRange}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
};
