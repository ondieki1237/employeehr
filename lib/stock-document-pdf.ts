import { jsPDF } from "jspdf";

export interface TenantBranding {
  name?: string;
  logo?: string;           // base64 or url
  primaryColor?: string;
  secondaryColor?: string;
  invoiceEmail?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface InvoiceDocumentSettings {
  invoiceEmail?: string;
  contactPhone?: string;
  officeLocation?: string;
  contactEmail?: string;
  website?: string;
  vatNumber?: string;
  pinNumber?: string;
  termsAndConditions?: string;
  includeQuotationReference?: boolean;
  includeDeliveryNoteNumber?: boolean;
  includePreparedBy?: boolean;
  includeVat?: boolean;
  includePaymentChannels?: boolean;
  paymentChannels?: Array<{
    channelName?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    branch?: string;
    notes?: string;
  }>;
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
  taxRate?: number;
  totalAfterTax?: number;
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
  const hasLogo = Boolean(args.branding?.logo);

  const logoX = 12;
  const logoY = 10;

  // Logo
  if (hasLogo) {
    try {
      const lower = args.branding!.logo!.toLowerCase();
      const format = lower.includes("jpg") || lower.includes("jpeg") ? "JPEG" : "PNG";
      const maxLogoWidth = 38;
      const maxLogoHeight = 16;
      let imageWidth = 0;
      let imageHeight = 0;

      try {
        const imageProps = doc.getImageProperties(args.branding!.logo!);
        imageWidth = Number(imageProps?.width || 0);
        imageHeight = Number(imageProps?.height || 0);
      } catch {
        imageWidth = 3;
        imageHeight = 1;
      }

      let drawWidth = maxLogoWidth;
      let drawHeight = maxLogoHeight;

      if (imageWidth > 0 && imageHeight > 0) {
        const ratio = imageWidth / imageHeight;
        if (ratio >= 1) {
          drawWidth = maxLogoWidth;
          drawHeight = Math.min(maxLogoHeight, drawWidth / ratio);
        } else {
          drawHeight = maxLogoHeight;
          drawWidth = Math.min(maxLogoWidth, drawHeight * ratio);
        }
      }

      const alignedY = logoY + (maxLogoHeight - drawHeight) / 2;
      doc.addImage(args.branding!.logo!, format, logoX, alignedY, drawWidth, drawHeight);
    } catch (e) {
      console.warn("Logo failed to load", e);
    }
  }

  // Document title - right side
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setColorFromHex(doc, primary, "text");
  doc.text(args.title.toUpperCase(), 198, 18, { align: "right" });

  // Meta table - right side
  const metaW = 117;
  const metaH = 27;
  const metaX = 198 - metaW;
  const metaY = 30;
  const metaSplitX = metaX + 45;
  const metaRowH = metaH / 2;

  setColorFromHex(doc, primary, "draw");
  doc.setLineWidth(0.6);
  doc.rect(metaX, metaY, metaW, metaH);
  doc.line(metaSplitX, metaY, metaSplitX, metaY + metaH);
  doc.line(metaX, metaY + metaRowH, metaX + metaW, metaY + metaRowH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text(args.numberLabel, metaX + 3, metaY + 9.5);
  doc.text("Issued", metaX + 3, metaY + metaRowH + 9.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text(args.numberValue, metaX + metaW - 3, metaY + 9.5, { align: "right" });
  doc.text(new Date(args.createdAt).toLocaleDateString("en-KE"), metaX + metaW - 3, metaY + metaRowH + 9.5, { align: "right" });

  drawThinDivider(doc, 56);
}

function drawContactSlotBelowLogo(
  doc: jsPDF,
  branding?: TenantBranding,
  settings?: InvoiceDocumentSettings,
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const phone = String(settings?.contactPhone || branding?.phone || "").trim();
  const location = String(settings?.officeLocation || buildCompanyAddress(branding) || "").trim();
  const email = String(settings?.contactEmail || settings?.invoiceEmail || branding?.email || "").trim();
  const website = String(settings?.website || branding?.website || "").trim();
  const vatNumber = String(settings?.vatNumber || "").trim();
  const pinNumber = String(settings?.pinNumber || "").trim();

  const rows = [
    { label: "Phone", value: phone },
    { label: "Email", value: email },
    { label: "Website", value: website },
    { label: "Address", value: location },
    { label: "VAT", value: vatNumber },
    { label: "PIN", value: pinNumber },
  ].filter((row) => row.value);

  if (!rows.length) return 51;

  const boxX = 12;
  const boxY = 52;
  const rowHeight = 4.2;
  const boxHeight = Math.max(13, rows.length * rowHeight + 3);

  setColorFromHex(doc, primary, "draw");
  doc.setLineWidth(0.5);
  doc.rect(boxX, boxY, 98, boxHeight);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.7);
  setColorFromHex(doc, DEFAULT_GRAY, "text");

  let y = boxY + 4.2;
  rows.forEach((row) => {
    const wrapped = doc.splitTextToSize(row.value, 88);
    doc.text(`${row.label}: ${wrapped[0] || ""}`, boxX + 3, y);
    y += rowHeight;
  });

  return boxY + boxHeight + 1;
}

function drawPartiesSection(
  doc: jsPDF,
  client: DocumentClient,
  preparedBy: string,
  branding?: TenantBranding,
  rightTitle = "Payment Terms",
  startY = 68,
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const leftX = 12;
  const rightX = 106;
  const boxY = Math.max(startY, 58);
  const boxW = 92;

  const headerH = 6;
  const lineH = 4.2;
  const padX = 4;
  const padY = 3;

  const nameLines = doc.splitTextToSize(client.name || "Client Name", 82);
  const preparedLines = doc.splitTextToSize(`Prepared by: ${preparedBy}`, 82);
  const companyLines = doc.splitTextToSize(`Company: ${branding?.name || "—"}`, 82);
  const contact = branding?.phone || branding?.email || "—";
  const contactLines = doc.splitTextToSize(`Contact: ${contact}`, 82);

  const leftContentLines = nameLines.length + 2;
  const rightContentLines = preparedLines.length + companyLines.length + contactLines.length;
  const leftHeight = headerH + padY + leftContentLines * lineH + 2;
  const rightHeight = headerH + padY + rightContentLines * lineH + 2;
  const boxH = Math.max(leftHeight, rightHeight, headerH + 14);

  setColorFromHex(doc, primary, "draw");
  doc.setLineWidth(0.6);
  doc.rect(leftX, boxY, boxW, boxH);
  doc.rect(rightX, boxY, boxW, boxH);
  setColorFromHex(doc, DEFAULT_LIGHT, "fill");
  doc.rect(leftX, boxY, boxW, headerH, "F");
  doc.rect(rightX, boxY, boxW, headerH, "F");
  doc.line(leftX, boxY + headerH, leftX + boxW, boxY + headerH);
  doc.line(rightX, boxY + headerH, rightX + boxW, boxY + headerH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text("Bill To", leftX + padX, boxY + 4.5);
  doc.text(rightTitle, rightX + padX, boxY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  setColorFromHex(doc, DEFAULT_GRAY, "text");

  let ly = boxY + headerH + padY + 3.2;
  doc.setFont("helvetica", "bold");
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text(nameLines, leftX + padX, ly);
  ly += nameLines.length * lineH;
  doc.setFont("helvetica", "normal");
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text(`Phone: ${client.number || "—"}`, leftX + padX, ly);
  ly += lineH;
  doc.text(`Location: ${client.location || "—"}`, leftX + padX, ly);

  let ry = boxY + headerH + padY + 3.2;
  doc.text(preparedLines, rightX + padX, ry);
  ry += preparedLines.length * lineH;
  doc.text(companyLines, rightX + padX, ry);
  ry += companyLines.length * lineH;
  doc.text(contactLines, rightX + padX, ry);

  return boxY + boxH + 3;
}

function drawItemsTable(
  doc: jsPDF,
  startY: number,
  items: DocumentItem[],
  branding?: TenantBranding,
  compact = false,
  includeTax = false
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const tableX = 12;
  const tableWidth = 186;
  const headerHeight = 9.5;
  const rowHeight = 9;

  const columns = compact
    ? [
        { key: "index", label: "#", width: 14, align: "left" as const },
        { key: "description", label: "Description", width: 128, align: "left" as const },
        { key: "quantity", label: "Qty", width: 44, align: "right" as const },
      ]
    : includeTax
      ? [
          { key: "index", label: "#", width: 14, align: "left" as const },
          { key: "description", label: "Description", width: 70, align: "left" as const },
          { key: "quantity", label: "Qty", width: 16, align: "right" as const },
          { key: "unitPrice", label: "Unit Price", width: 28, align: "right" as const },
          { key: "tax", label: "Tax %", width: 18, align: "right" as const },
          { key: "totalAfterTax", label: "Total", width: 40, align: "right" as const },
        ]
      : [
          { key: "index", label: "#", width: 14, align: "left" as const },
          { key: "description", label: "Description", width: 88, align: "left" as const },
          { key: "quantity", label: "Qty", width: 20, align: "right" as const },
          { key: "unitPrice", label: "Unit Price", width: 32, align: "right" as const },
          { key: "total", label: "Total", width: 32, align: "right" as const },
        ];

  const columnStartX = columns.map((_, index) => {
    return tableX + columns.slice(0, index).reduce((sum, c) => sum + c.width, 0);
  });

  const drawTableHeader = (headerY: number) => {
    setColorFromHex(doc, primary, "fill");
    doc.rect(tableX, headerY, tableWidth, headerHeight, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    columns.forEach((column, index) => {
      const startX = columnStartX[index];
      const endX = startX + column.width;
      if (column.align === "right") {
        doc.text(column.label, endX - 2, headerY + 7, { align: "right" });
      } else {
        doc.text(column.label, startX + 2, headerY + 7);
      }
    });

    setColorFromHex(doc, primary, "draw");
    doc.setLineWidth(0.6);
    doc.rect(tableX, headerY, tableWidth, headerHeight);
    columns.forEach((_, index) => {
      if (index === 0) return;
      const x = columnStartX[index];
      doc.line(x, headerY, x, headerY + headerHeight);
    });
  };

  const drawRowGrid = (rowY: number) => {
    setColorFromHex(doc, primary, "draw");
    doc.setLineWidth(0.35);
    doc.rect(tableX, rowY, tableWidth, rowHeight);
    columns.forEach((_, index) => {
      if (index === 0) return;
      const x = columnStartX[index];
      doc.line(x, rowY, x, rowY + rowHeight);
    });
  };

  let y = startY;
  drawTableHeader(y);

  y += headerHeight;

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);

  items.forEach((item, i) => {
    if (y > 246) {
      doc.addPage();
      y = 20;
      drawTableHeader(y);
      y += headerHeight;
    }

    // Light row stripe
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y, tableWidth, rowHeight, "F");
    }

    const maxNameLength = compact ? 76 : includeTax ? 40 : 52;
    const name = item.productName.length > maxNameLength
      ? item.productName.slice(0, maxNameLength - 3) + "..."
      : item.productName;

    drawRowGrid(y);

    doc.text(String(i + 1).padStart(2, "0"), columnStartX[0] + 2, y + 7.1);
    doc.text(name, columnStartX[1] + 2, y + 7.1);

    if (compact) {
      const qtyCol = columns[2];
      doc.text(String(item.quantity), tableX + qtyCol.width + columns[0].width + columns[1].width - 2, y + 7.1, { align: "right" });
    } else if (includeTax) {
      const taxRate = Number(item.taxRate || 0);
      const baseTotal = Number(item.lineTotal || 0);
      const totalAfterTax = Number(item.totalAfterTax || (baseTotal + baseTotal * (taxRate / 100)));

      doc.text(String(item.quantity), columnStartX[2] + columns[2].width - 2, y + 7.1, { align: "right" });
      doc.text(formatKsh(item.unitPrice), columnStartX[3] + columns[3].width - 2, y + 7.1, { align: "right" });
      doc.text(`${taxRate.toFixed(2)}%`, columnStartX[4] + columns[4].width - 2, y + 7.1, { align: "right" });
      doc.text(formatKsh(totalAfterTax), columnStartX[5] + columns[5].width - 2, y + 7.1, { align: "right" });
    } else {
      doc.text(String(item.quantity), columnStartX[2] + columns[2].width - 2, y + 7.1, { align: "right" });
      doc.text(formatKsh(item.unitPrice), columnStartX[3] + columns[3].width - 2, y + 7.1, { align: "right" });
      doc.text(formatKsh(item.lineTotal), columnStartX[4] + columns[4].width - 2, y + 7.1, { align: "right" });
    }

    y += rowHeight;
  });

  return y + 6;
}

function drawTotalsSection(
  doc: jsPDF,
  subtotal: number,
  startY: number,
  branding?: TenantBranding,
  settings?: InvoiceDocumentSettings,
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const showVat = settings?.includeVat !== false
  const vat = showVat ? subtotal * 0.16 : 0
  const grandTotal = subtotal + vat

  let y = startY + 1;
  if (y + 50 > 280) {
    doc.addPage();
    y = 20;
  }

  const boxX = 118;
  const boxW = 80;
  const rowH = 6;
  const rows = showVat ? 3 : 2;
  const boxH = rows * rowH + 2;
  const splitX = boxX + 46;

  // Totals table
  doc.setFillColor(255, 255, 255);
  setColorFromHex(doc, primary, "draw");
  doc.setLineWidth(0.6);
  doc.rect(boxX, y, boxW, boxH, "FD");
  doc.line(splitX, y, splitX, y + boxH);
  for (let i = 1; i < rows; i += 1) {
    doc.line(boxX, y + i * rowH, boxX + boxW, y + i * rowH);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_TEXT, "text");

  const labelX = boxX + 3;
  const valueX = boxX + boxW - 3;
  let rowY = y + 4.2;

  doc.text("Subtotal", labelX, rowY);
  doc.text(formatKsh(subtotal), valueX, rowY, { align: "right" });

  if (showVat) {
    rowY += rowH;
    doc.text("VAT (16%)", labelX, rowY);
    doc.text(formatKsh(vat), valueX, rowY, { align: "right" });
  }

  rowY = y + rowH * (rows - 1) + 4.2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setColorFromHex(doc, primary, "text");
  doc.text("Grand Total", labelX, rowY);
  doc.text(formatKsh(grandTotal), valueX, rowY, { align: "right" });

  return y + boxH + 4;
}

function drawBottomFooter(
  doc: jsPDF,
  branding?: TenantBranding,
  settings?: InvoiceDocumentSettings,
  preparedBy?: string,
) {
  const footerY = 286;
  drawThinDivider(doc, footerY - 4, "#dbe4ee");

  const footerEmail = String(settings?.contactEmail || settings?.invoiceEmail || branding?.email || "").trim();
  const footerPhone = String(settings?.contactPhone || branding?.phone || "").trim();
  const footerLocation = String(settings?.officeLocation || buildCompanyAddress(branding) || "").trim();

  const left = [footerPhone, footerLocation, footerEmail].filter(Boolean).join("   •   ") || "";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  if (left) {
    doc.text(left, 12, footerY);
  }

  if (preparedBy) {
    doc.text(`Prepared by: ${preparedBy}`, 198, footerY, { align: "right" });
  }
}

function drawTermsAndPaymentChannelsSection(
  doc: jsPDF,
  startY: number,
  settings?: InvoiceDocumentSettings,
  branding?: TenantBranding,
) {
  const availableBottom = 284
  let y = startY + 4
  const terms = String(settings?.termsAndConditions || "").trim()
  const channels = Array.isArray(settings?.paymentChannels) ? settings!.paymentChannels : []
  const primary = branding?.primaryColor || DEFAULT_PRIMARY

  if (!terms && !(settings?.includePaymentChannels !== false && channels.length)) {
    return y
  }

  const leftX = 12
  const rightX = 106
  const boxW = 92
  const lineH = 4
  const headerH = 6
  const padX = 4
  const padY = 3

  const termsLines = terms ? doc.splitTextToSize(terms, 84) : []
  const termsHeight = terms ? headerH + padY + termsLines.length * lineH + 2 : headerH + 8

  const channelLines: string[] = []
  if (settings?.includePaymentChannels !== false && channels.length) {
    channels.forEach((channel, index) => {
      const title = [channel.channelName || channel.bankName].filter(Boolean).join(" - ") || "Payment Channel"
      channelLines.push(title)

      const details = [
        channel.accountName ? `Account Name: ${channel.accountName}` : "",
        channel.accountNumber ? `Account No: ${channel.accountNumber}` : "",
        channel.branch ? `Branch: ${channel.branch}` : "",
        channel.notes ? `${channel.notes}` : "",
      ].filter(Boolean)

      details.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, 84)
        wrapped.forEach((item: string) => channelLines.push(item))
      })

      if (index < channels.length - 1) {
        channelLines.push("")
      }
    })
  }

  const channelsHeight = channelLines.length ? headerH + padY + channelLines.length * lineH + 2 : headerH + 8
  const contentHeight = Math.max(termsHeight, channelsHeight, headerH + 10)

  const bottomY = availableBottom - contentHeight
  y = Math.max(y, bottomY)

  if (y + contentHeight > availableBottom) {
    doc.addPage()
    y = 20
  }

  setColorFromHex(doc, primary, "draw")
  doc.setLineWidth(0.6)
  doc.rect(leftX, y - 2, boxW, contentHeight)
  doc.rect(rightX, y - 2, boxW, contentHeight)
  setColorFromHex(doc, DEFAULT_LIGHT, "fill")
  doc.rect(leftX, y - 2, boxW, headerH, "F")
  doc.rect(rightX, y - 2, boxW, headerH, "F")
  doc.line(leftX, y - 2 + headerH, leftX + boxW, y - 2 + headerH)
  doc.line(rightX, y - 2 + headerH, rightX + boxW, y - 2 + headerH)

  if (terms) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    setColorFromHex(doc, DEFAULT_TEXT, "text")
    doc.text("Terms & Conditions", leftX + padX, y + 2.6)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.2)
    setColorFromHex(doc, DEFAULT_GRAY, "text")
    let ty = y + headerH + padY + 1
    termsLines.forEach((line: string) => {
      doc.text(line, leftX + padX, ty)
      ty += lineH
    })
  }

  if (channelLines.length) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    setColorFromHex(doc, DEFAULT_TEXT, "text")
    doc.text("Payment Channels", rightX + padX, y + 2.6)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.2)
    setColorFromHex(doc, DEFAULT_GRAY, "text")
    let cy = y + headerH + padY + 1
    channelLines.forEach((line: string) => {
      if (!line) {
        cy += lineH * 0.6
        return
      }
      doc.text(line, rightX + padX, cy)
      cy += lineH
    })
  }

  return y + contentHeight + 2
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
  invoiceSettings?: InvoiceDocumentSettings;
  preparedBy: string;
  watermarkText?: string;
  autoSave?: boolean;
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
  const contactBottom = drawContactSlotBelowLogo(doc, params.branding, params.invoiceSettings);

  const tableY = drawPartiesSection(doc, params.client, params.preparedBy, params.branding, "Quotation Info", contactBottom + 1);
  const endY = drawItemsTable(doc, tableY, params.items, params.branding);

  drawTotalsSection(doc, params.subTotal, endY, params.branding, params.invoiceSettings);
  drawBottomFooter(doc, params.branding, params.invoiceSettings, params.preparedBy);

  if (params.autoSave !== false) {
    doc.save(`quotation-${params.quotationNumber}.pdf`);
  }

  return doc;
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
  invoiceSettings?: InvoiceDocumentSettings;
  preparedBy: string;
  watermarkText?: string;
  autoSave?: boolean;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawWatermark(doc, params.watermarkText);

  drawModernHeader(doc, {
    title: "Invoice",
    numberLabel: "Invoice No",
    numberValue: params.invoiceNumber,
    createdAt: params.createdAt,
    branding: {
      ...params.branding,
      invoiceEmail: params.invoiceSettings?.invoiceEmail || params.branding?.invoiceEmail,
    },
  });

  const contactBottom = drawContactSlotBelowLogo(doc, params.branding, params.invoiceSettings);

  let tableY = drawPartiesSection(
    doc,
    params.client,
    params.preparedBy,
    {
      ...params.branding,
      invoiceEmail: params.invoiceSettings?.invoiceEmail || params.branding?.invoiceEmail,
    },
    "Prepared By",
    contactBottom + 1,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  const showDelivery = params.invoiceSettings?.includeDeliveryNoteNumber !== false
  const showQuote = params.invoiceSettings?.includeQuotationReference !== false
  if (showDelivery || showQuote) {
    const refsY = tableY + 1;
    if (showDelivery) {
      doc.text(`Delivery Note: ${params.deliveryNoteNumber}`, 12, refsY);
    }
    if (showQuote) {
      doc.text(`Quotation Ref: ${params.quotationNumber || "N/A"}`, 198, refsY, { align: "right" });
    }
    tableY = refsY + 6;
  }

  const endY = drawItemsTable(doc, tableY, params.items, params.branding);

  const totalsY = drawTotalsSection(doc, params.subTotal, endY, params.branding, params.invoiceSettings);
  const termsEndY = drawTermsAndPaymentChannelsSection(doc, totalsY, params.invoiceSettings, params.branding)

  drawBottomFooter(
    doc,
    params.branding,
    params.invoiceSettings,
    params.invoiceSettings?.includePreparedBy !== false ? params.preparedBy : undefined,
  );

  if (params.autoSave !== false) {
    doc.save(`invoice-${params.invoiceNumber}.pdf`);
  }

  return doc;
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
  autoSave?: boolean;
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

  if (params.autoSave !== false) {
    doc.save(`delivery-note-${params.deliveryNoteNumber}.pdf`);
  }

  return doc;
}

/**
 * Apply a stamp to an existing PDF document
 * @param doc - jsPDF document instance
 * @param stampData - SVG stamp data or URL
 * @param x - X coordinate in mm
 * @param y - Y coordinate in mm
 * @param width - Width of stamp in mm (default 30)
 * @param height - Height of stamp in mm (default 30)
 */
export async function applyStampToPdf(
  doc: jsPDF,
  stampData: string,
  x: number,
  y: number,
  width: number = 30,
  height: number = 30
): Promise<void> {
  try {
    // If stampData is a URL, fetch it
    let svgContent = stampData;
    if (stampData.startsWith("http")) {
      const response = await fetch(stampData);
      if (!response.ok) throw new Error(`Failed to fetch SVG: ${response.statusText}`);
      svgContent = await response.text();
    }

    // Clean SVG content: remove XML declarations and trim
    svgContent = svgContent
      .replace(/^\s*<\?xml[^?]*\?>\s*/i, "") // Remove XML declaration
      .trim();

    // Fix partially quoted attributes: attribute="value1" value2 value3 -> attribute="value1 value2 value3"
    svgContent = svgContent.replace(/(\s[a-zA-Z\-:]+)="([^"]*)"(\s+[^=\s>][^=]*?)(?=\s+[a-zA-Z\-:]+\s*=|\s*>)/g, '$1="$2$3"');

    // Fix simple unquoted attributes: attribute=value -> attribute="value"
    svgContent = svgContent.replace(/\s([a-zA-Z\-:]+)=([a-zA-Z0-9#:\-._\/]+)(?=\s|>)/g, ' $1="$2"');

    // Remove xmlns:xlink (not needed for canvas rendering)
    svgContent = svgContent.replace(/\s+xmlns:xlink="[^"]*"/g, "");

    // Remove zoomAndPan (not applicable in canvas context)
    svgContent = svgContent.replace(/\s+zoomAndPan="[^"]*"/g, "");

    // Ensure SVG has xmlns if missing (required for proper rendering)
    if (!svgContent.includes('xmlns="')) {
      svgContent = svgContent.replace(/<svg\s+/, '<svg xmlns="http://www.w3.org/2000/svg" ');
    }

    // Fix or validate viewBox
    const viewBoxMatch = svgContent.match(/viewBox="([^"]*)"/);
    if (viewBoxMatch) {
      const viewBoxValue = viewBoxMatch[1];
      const boxParts = viewBoxValue.trim().split(/\s+/);
      if (boxParts.length !== 4 || boxParts.some(p => isNaN(parseFloat(p)))) {
        svgContent = svgContent.replace(/viewBox="[^"]*"/, 'viewBox="0 0 200 200"');
      }
    } else if (!svgContent.includes("viewBox=")) {
      svgContent = svgContent.replace(/<svg/, '<svg viewBox="0 0 200 200"');
    }

    // Convert SVG to canvas then to image data
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Use data URL approach with proper encoding (more reliable than blob URLs)
    const encodedSvg = encodeURIComponent(svgContent);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0);
          const imgData = canvas.toDataURL("image/png");
          doc.addImage(imgData, "PNG", x, y, width, height);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        console.error("Failed to load SVG image. SVG content preview:", svgContent.substring(0, 150));
        reject(new Error("Failed to load stamp SVG image - ensure SVG is valid"));
      };
      img.src = dataUrl;
    });
  } catch (error) {
    console.error("Error applying stamp to PDF:", error);
  }
}

/**
 * Apply predesigned stamp text overlay to PDF (for simple text-based stamps)
 * @param doc - jsPDF document instance
 * @param text - Stamp text (e.g., "APPROVED")
 * @param x - X coordinate in mm
 * @param y - Y coordinate in mm
 * @param color - Hex color code
 * @param opacity - Opacity 0-1
 * @param rotation - Rotation in degrees
 * @param fontSize - Font size in pt
 */
export function applyTextStampToPdf(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  color: string = "#8B0000",
  opacity: number = 0.2,
  rotation: number = 12,
  fontSize: number = 48
): void {
  const rgb = hexToRgb(color);

  // Save current state
  const currentPage = doc.getNumberOfPages();

  // Apply stamp
  setColorFromHex(doc, color, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);

  // Use GState for opacity (if supported)
  try {
    const pdfWithGState = doc as any;
    if (pdfWithGState.setGState) {
      pdfWithGState.setGState(new pdfWithGState.GState({ opacity }));
    }
  } catch (e) {
    // Fallback if GState not available
  }

  // Rotate and draw text
  doc.text(text, x, y, {
    align: "center",
    angle: rotation,
  });
}
