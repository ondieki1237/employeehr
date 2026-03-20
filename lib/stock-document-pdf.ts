import { jsPDF } from "jspdf";

export interface TenantBranding {
  name?: string;
  logo?: string;           // base64 or url
  primaryColor?: string;
  secondaryColor?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface DocumentClient {
  name: string;
  number: string;         // phone
  location: string;
}

export interface DocumentItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface HeaderArgs {
  title: string;
  numberLabel: string;
  numberValue: string;
  createdAt: string;
  branding?: TenantBranding;
}

const DEFAULT_PRIMARY = "#0f766e";    // teal - modern & professional
const DEFAULT_SECONDARY = "#14b8a6";
const DEFAULT_TEXT = "#1f2937";
const DEFAULT_LIGHT = "#f1f5f9";
const DEFAULT_GRAY = "#6b7280";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function setColorFromHex(doc: jsPDF, hex: string, kind: "fill" | "text" | "draw") {
  const { r, g, b } = hexToRgb(hex);
  if (kind === "fill") doc.setFillColor(r, g, b);
  if (kind === "text") doc.setTextColor(r, g, b);
  if (kind === "draw") doc.setDrawColor(r, g, b);
}

function formatKsh(value: number): string {
  return `KSh ${value.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function drawThinDivider(doc: jsPDF, y: number, colorHex = "#e2e8f0") {
  setColorFromHex(doc, colorHex, "draw");
  doc.setLineWidth(0.4);
  doc.line(12, y, 198, y);
}

function drawWatermark(doc: jsPDF, value?: string) {
  if (!value) return;
  doc.setTextColor(220, 220, 220);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(48);
  doc.text(value.toUpperCase(), 105, 150, { angle: 45, align: "center" });
}

function buildCompanyAddress(branding?: TenantBranding): string {
  const parts = [branding?.city, branding?.state, branding?.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "";
}

function drawModernHeader(doc: jsPDF, args: HeaderArgs) {
  const primary = args.branding?.primaryColor || DEFAULT_PRIMARY;
  const companyName = args.branding?.name || "Your Company";
  const hasLogo = Boolean(args.branding?.logo);

  // Thin accent bar at top
  setColorFromHex(doc, primary, "fill");
  doc.rect(0, 0, 210, 4, "F");

  let logoX = 12;
  let contentX = hasLogo ? 38 : 12;

  // Logo
  if (hasLogo) {
    try {
      const lower = args.branding!.logo!.toLowerCase();
      const format = lower.includes("jpg") || lower.includes("jpeg") ? "JPEG" : "PNG";
      doc.addImage(args.branding!.logo!, format, logoX, 10, 24, 24);
    } catch (e) {
      console.warn("Logo failed to load", e);
    }
  }

  // Company info - left side
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text(companyName, contentX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_GRAY, "text");

  let infoY = 24;
  if (args.branding?.website) {
    doc.text(args.branding.website, contentX, infoY);
    infoY += 5;
  }
  if (args.branding?.email) {
    doc.text(args.branding.email, contentX, infoY);
    infoY += 5;
  }
  if (args.branding?.phone) {
    doc.text(`Phone: ${args.branding.phone}`, contentX, infoY);
    infoY += 5;
  }
  const addr = buildCompanyAddress(args.branding);
  if (addr) doc.text(addr, contentX, infoY);

  // Document meta - right side
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setColorFromHex(doc, primary, "text");
  doc.text(args.title.toUpperCase(), 198, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColorFromHex(doc, DEFAULT_GRAY, "text");

  doc.text(`${args.numberLabel}:`, 140, 32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(args.numberValue, 198, 32, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("Issued:", 140, 39);
  doc.text(new Date(args.createdAt).toLocaleDateString("en-KE"), 198, 39, { align: "right" });

  drawThinDivider(doc, 54);
}

function drawPartiesSection(
  doc: jsPDF,
  client: DocumentClient,
  preparedBy: string,
  branding?: TenantBranding,
  rightTitle = "Payment Terms"
) {
  let y = 62;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text("Bill To", 12, y);
  doc.text(rightTitle, 110, y);

  y += 7;

  // Left - Client
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(client.name || "Client Name", 12, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  y += 6;
  doc.text(`Phone: ${client.number || "—"}`, 12, y);
  y += 5;
  doc.text(`Location: ${client.location || "—"}`, 12, y);

  // Right - Prepared / Account info
  y = 69; // reset for right column
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Prepared by: ${preparedBy}`, 110, y);
  y += 5;
  doc.text(`Company: ${branding?.name || "—"}`, 110, y);
  y += 5;
  const contact = branding?.phone || branding?.email || "—";
  doc.text(`Contact: ${contact}`, 110, y);

  drawThinDivider(doc, 92);

  return 98;
}

function drawItemsTable(
  doc: jsPDF,
  startY: number,
  items: DocumentItem[],
  branding?: TenantBranding,
  compact = false
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  let y = startY;

  // Header row
  setColorFromHex(doc, primary, "fill");
  doc.rect(12, y, 186, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);

  doc.text("#", 16, y + 7);
  doc.text("Description", 26, y + 7);
  doc.text("Qty", 130, y + 7);
  if (!compact) {
    doc.text("Unit Price", 160, y + 7, { align: "right" });
    doc.text("Total", 198, y + 7, { align: "right" });
  }

  y += 10;

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);

  items.forEach((item, i) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
      drawThinDivider(doc, 15);
    }

    // Very light row stripe
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, 186, 11, "F");
    }

    const name = item.productName.length > 60
      ? item.productName.slice(0, 57) + "..."
      : item.productName;

    doc.text(String(i + 1).padStart(2, "0"), 16, y + 7.5);
    doc.text(name, 26, y + 7.5);
    doc.text(String(item.quantity), 130, y + 7.5, { align: "left" });

    if (!compact) {
      doc.text(formatKsh(item.unitPrice), 160, y + 7.5, { align: "right" });
      doc.text(formatKsh(item.lineTotal), 198, y + 7.5, { align: "right" });
    }

    setColorFromHex(doc, "#e2e8f0", "draw");
    doc.line(12, y + 11, 198, y + 11);

    y += 11;
  });

  drawThinDivider(doc, y + 2);
  return y + 8;
}

function drawTotalsSection(doc: jsPDF, subtotal: number, startY: number, branding?: TenantBranding) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const vat = subtotal * 0.16;
  const grandTotal = subtotal + vat;

  let y = Math.max(startY, 220);

  // Totals box - right aligned
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(110, y, 88, 52, 3, 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColorFromHex(doc, DEFAULT_TEXT, "text");

  doc.text("Subtotal", 114, y + 10);
  doc.text(formatKsh(subtotal), 194, y + 10, { align: "right" });

  doc.text("VAT (16%)", 114, y + 18);
  doc.text(formatKsh(vat), 194, y + 18, { align: "right" });

  doc.setLineWidth(0.6);
  doc.line(114, y + 24, 194, y + 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Grand Total", 114, y + 34);
  setColorFromHex(doc, primary, "fill");
  doc.roundedRect(140, y + 27, 52, 12, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(formatKsh(grandTotal), 194, y + 36, { align: "right" });

  // Terms
  y += 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text("Terms & Conditions", 12, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  y += 6;
  doc.text("• Payment due within 7 days", 12, y);
  y += 5;
  doc.text("• Once sold, items are non-refundable", 12, y);
  y += 5;
  doc.text("• Warranty as per mutual agreement", 12, y);

  return y + 12;
}

function drawDeliverySignatures(doc: jsPDF, startY: number, preparedBy: string) {
  let y = Math.max(startY + 10, 240);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColorFromHex(doc, DEFAULT_GRAY, "text");

  doc.text("Received By", 14, y);
  doc.line(14, y + 12, 90, y + 12);
  doc.setFontSize(8);
  doc.text("Name & Signature", 14, y + 18);

  doc.setFontSize(10);
  doc.text("Delivered By", 110, y);
  doc.line(110, y + 12, 190, y + 12);
  doc.setFontSize(8);
  doc.text(preparedBy, 110, y + 18);
}

export function generateQuotationPdf(params: {
  quotationNumber: string;
  createdAt: string;
  client: DocumentClient;
  items: DocumentItem[];
  subTotal: number;
  branding?: TenantBranding;
  preparedBy: string;
  watermarkText?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawWatermark(doc, params.watermarkText);

  drawModernHeader(doc, {
    title: "Quotation",
    numberLabel: "Quotation No",
    numberValue: params.quotationNumber,
    createdAt: params.createdAt,
    branding: params.branding,
  });

  const tableY = drawPartiesSection(doc, params.client, params.preparedBy, params.branding, "Quotation Info");

  const endY = drawItemsTable(doc, tableY, params.items, params.branding);

  drawTotalsSection(doc, params.subTotal, endY, params.branding);

  doc.save(`quotation-${params.quotationNumber}.pdf`);
}

export function generateInvoicePdf(params: {
  invoiceNumber: string;
  deliveryNoteNumber: string;
  quotationNumber?: string;
  createdAt: string;
  client: DocumentClient;
  items: DocumentItem[];
  subTotal: number;
  branding?: TenantBranding;
  preparedBy: string;
  watermarkText?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawWatermark(doc, params.watermarkText);

  drawModernHeader(doc, {
    title: "Invoice",
    numberLabel: "Invoice No",
    numberValue: params.invoiceNumber,
    createdAt: params.createdAt,
    branding: params.branding,
  });

  let tableY = drawPartiesSection(doc, params.client, params.preparedBy, params.branding);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text(`Delivery Note: ${params.deliveryNoteNumber}`, 12, tableY - 8);
  doc.text(`Quotation Ref: ${params.quotationNumber || "N/A"}`, 12, tableY - 3);

  const endY = drawItemsTable(doc, tableY, params.items, params.branding);

  drawTotalsSection(doc, params.subTotal, endY, params.branding);

  doc.save(`invoice-${params.invoiceNumber}.pdf`);
}

export function generateDeliveryNotePdf(params: {
  invoiceNumber: string;
  deliveryNoteNumber: string;
  createdAt: string;
  client: DocumentClient;
  items: DocumentItem[];
  branding?: TenantBranding;
  preparedBy: string;
  watermarkText?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawWatermark(doc, params.watermarkText);

  drawModernHeader(doc, {
    title: "Delivery Note",
    numberLabel: "D/N No",
    numberValue: params.deliveryNoteNumber,
    createdAt: params.createdAt,
    branding: params.branding,
  });

  let tableY = drawPartiesSection(doc, params.client, params.preparedBy, params.branding, "Delivery Info");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text(`Related Invoice: ${params.invoiceNumber}`, 12, tableY - 5);

  const endY = drawItemsTable(doc, tableY, params.items, params.branding, true); // compact mode

  drawDeliverySignatures(doc, endY, params.preparedBy);

  doc.save(`delivery-note-${params.deliveryNoteNumber}.pdf`);
}