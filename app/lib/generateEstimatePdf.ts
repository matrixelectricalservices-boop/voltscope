// lib/generateEstimatePdf.ts
// Usage: import { generateEstimatePdf } from "@/lib/generateEstimatePdf"
// Requires: npm install jspdf jspdf-autotable

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type MaterialLine = {
  item:      string;
  qty:       number;
  unit:      string;
  unitCost:  number;
  lineTotal: number;
  notes?:    string;
  category:  string;
};

type LaborLine = {
  description: string;
  hours:       number;
  rate:        number;
  total:       number;
};

type EstimatePdfInput = {
  // Company / job info
  companyName:    string;
  companyPhone?:  string;
  companyEmail?:  string;
  customerName:   string;
  jobType?:       string;
  jobDescription: string;
  estimateDate:   string;
  estimateNumber?: string;
  // Scope
  summary:     string;
  assumptions: string[];
  scopeType:   "line_item" | "assembly";
  sqft?:       number;
  // Line items
  materials:   MaterialLine[];
  labor:       LaborLine[];
  laborHours:  number;
  laborRate:   number;
  // Totals
  materialTotal: number;
  laborTotal:    number;
  subtotal:      number;
  markup:        number;
  markupPct:     number;
  permitFee:     number;
  finalTotal:    number;
  ratePerSqft?:  number;
};

function r2(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Brand colors
const NAVY   = [0,   48,  87]  as [number, number, number];
const TEAL   = [0,  119, 139]  as [number, number, number];
const GOLD   = [200, 169, 110] as [number, number, number];
const LIGHT  = [224, 244, 247] as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];
const INK    = [10,  31,  51]  as [number, number, number];
const MUTED  = [100, 120, 140] as [number, number, number];
const DIVIDER= [220, 232, 235] as [number, number, number];

export function generateEstimatePdf(input: EstimatePdfInput): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const PW  = 612; // page width
  const ML  = 48;  // margin left
  const MR  = 48;  // margin right
  const CW  = PW - ML - MR; // content width
  let   y   = 0;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 72, "F");

  // Gold accent bar
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 5, 72, "F");

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text(input.companyName, ML + 12, 30);

  // Contact info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 220, 225);
  const contactParts = [input.companyPhone, input.companyEmail].filter(Boolean);
  if (contactParts.length) doc.text(contactParts.join("  ·  "), ML + 12, 44);

  // Estimate label (right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...GOLD);
  doc.text("ESTIMATE", PW - MR, 28, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 220, 225);
  doc.text(`Date: ${input.estimateDate}`, PW - MR, 42, { align: "right" });
  if (input.estimateNumber) {
    doc.text(`#${input.estimateNumber}`, PW - MR, 54, { align: "right" });
  }

  y = 90;

  // ── Job info row ─────────────────────────────────────────────────────────────
  // Customer block (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("PREPARED FOR", ML, y);
  y += 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(input.customerName, ML, y);
  y += 14;
  if (input.jobType) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(input.jobType, ML, y);
    y += 12;
  }

  // Scope type badge (right)
  const badgeLabel = input.scopeType === "assembly" ? "ASSEMBLY ESTIMATE" : "LINE-ITEM ESTIMATE";
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...TEAL);
  doc.roundedRect(PW - MR - 120, 88, 120, 18, 4, 4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEAL);
  doc.text(badgeLabel, PW - MR - 60, 100, { align: "center" });

  y = Math.max(y, 122);

  // Divider
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.5);
  doc.line(ML, y, PW - MR, y);
  y += 16;

  // ── Scope summary ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("Scope of Work", ML, y);
  y += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const summaryLines = doc.splitTextToSize(input.summary, CW);
  doc.text(summaryLines, ML, y);
  y += summaryLines.length * 12 + 6;

  // Square footage badge
  if (input.sqft) {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(ML, y, 120, 16, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...TEAL);
    doc.text(`${input.sqft.toLocaleString()} sq ft`, ML + 60, y + 10, { align: "center" });
    y += 22;
  }

  // Assumptions
  if (input.assumptions.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    for (const a of input.assumptions) {
      const lines = doc.splitTextToSize(`· ${a}`, CW - 10);
      doc.text(lines, ML + 6, y);
      y += lines.length * 10 + 2;
    }
  }
  y += 10;

  // ── Materials table ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("Materials", ML, y);
  y += 6;

  const matRows = input.materials.map((m) => [
    m.item + (m.notes ? `\n${m.notes}` : ""),
    m.qty.toString(),
    m.unit,
    `$${r2(m.unitCost)}`,
    `$${r2(m.lineTotal)}`,
  ]);

  autoTable(doc, {
    startY:        y,
    head:          [["Item", "Qty", "Unit", "Unit Cost", "Total"]],
    body:          matRows,
    margin:        { left: ML, right: MR },
    headStyles: {
      fillColor:   NAVY,
      textColor:   WHITE,
      fontStyle:   "bold",
      fontSize:    8,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize:    8.5,
      textColor:   INK,
      cellPadding: 5,
    },
    alternateRowStyles: { fillColor: [245, 250, 252] as [number,number,number] },
    columnStyles: {
      0: { cellWidth: CW * 0.42 },
      1: { cellWidth: CW * 0.09, halign: "right" },
      2: { cellWidth: CW * 0.09, halign: "center" },
      3: { cellWidth: CW * 0.18, halign: "right" },
      4: { cellWidth: CW * 0.18, halign: "right", fontStyle: "bold" },
    },
    didDrawPage: () => { y = 48; },
  });

  y = (doc as any).lastAutoTable.finalY + 14;

  // ── Labor table ──────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("Labor", ML, y);
  y += 6;

  const laborRows = input.labor.map((l) => [
    l.description,
    l.hours.toString(),
    `$${r2(input.laborRate)}/hr`,
    `$${r2(l.hours * input.laborRate)}`,
  ]);

  autoTable(doc, {
    startY:        y,
    head:          [["Task", "Hours", "Rate", "Total"]],
    body:          laborRows,
    margin:        { left: ML, right: MR },
    headStyles: {
      fillColor:   [0, 80, 100] as [number,number,number],
      textColor:   WHITE,
      fontStyle:   "bold",
      fontSize:    8,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize:    8.5,
      textColor:   INK,
      cellPadding: 5,
    },
    alternateRowStyles: { fillColor: [250, 247, 242] as [number,number,number] },
    columnStyles: {
      0: { cellWidth: CW * 0.50 },
      1: { cellWidth: CW * 0.15, halign: "right" },
      2: { cellWidth: CW * 0.18, halign: "right" },
      3: { cellWidth: CW * 0.17, halign: "right", fontStyle: "bold" },
    },
    didDrawPage: () => { y = 48; },
  });

  y = (doc as any).lastAutoTable.finalY + 20;

  // ── Totals block ─────────────────────────────────────────────────────────────
  // Check if we need a new page
  if (y > 680) {
    doc.addPage();
    y = 48;
  }

  const totalsX  = PW - MR - 200;
  const totalsW  = 200;
  const rowH     = 20;
  const labelX   = totalsX + 10;
  const valueX   = PW - MR - 10;

  const totalsRows: [string, string, boolean][] = [
    ["Material Total", `$${r2(input.materialTotal)}`,  false],
    ["Labor Total",    `$${r2(input.laborTotal)}`,     false],
    ...(input.permitFee > 0 ? [["Permit Fee", `$${r2(input.permitFee)}`, false] as [string, string, boolean]] : []),
    ["Subtotal",       `$${r2(input.subtotal)}`,       false],
    [`Markup (${input.markupPct}%)`, `$${r2(input.markup)}`, false],
  ];

  // Background
  doc.setFillColor(248, 252, 253);
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.5);
  doc.roundedRect(totalsX, y - 6, totalsW, rowH * totalsRows.length + 8, 6, 6, "FD");

  totalsRows.forEach(([label, value], i) => {
    const rowY = y + i * rowH + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, labelX, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(value, valueX, rowY, { align: "right" });

    if (i < totalsRows.length - 1) {
      doc.setDrawColor(...DIVIDER);
      doc.setLineWidth(0.3);
      doc.line(totalsX + 8, rowY + 6, PW - MR - 8, rowY + 6);
    }
  });

  y += rowH * totalsRows.length + 16;

  // Final total box
  doc.setFillColor(...NAVY);
  doc.roundedRect(totalsX, y, totalsW, 36, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...GOLD);
  doc.text("TOTAL ESTIMATE", labelX, y + 12);
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text(`$${r2(input.finalTotal)}`, valueX, y + 26, { align: "right" });

  if (input.ratePerSqft) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 210, 220);
    doc.text(`$${input.ratePerSqft.toFixed(2)}/sq ft`, totalsX + 10, y + 26);
  }

  y += 52;

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageCount = (doc as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.5);
    doc.line(ML, 770, PW - MR, 770);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(input.companyName, ML, 782);
    doc.text(`Page ${i} of ${pageCount}`, PW - MR, 782, { align: "right" });
    doc.text("This estimate is valid for 30 days from the date above.", PW / 2, 782, { align: "center" });
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const filename = `estimate-${input.customerName.replace(/\s+/g, "-").toLowerCase()}-${input.estimateDate}.pdf`;
  doc.save(filename);
}