import { jsPDF } from 'jspdf'

export interface DocumentClient {
  name: string
  number: string
  location: string
}

export interface DocumentItem {
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

const DEFAULT_PRIMARY = "#0f766e"
const DEFAULT_GRAY = "#6b7280"
const DEFAULT_TEXT = "#1f2937"
const DEFAULT_LIGHT = "#f1f5f9"

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function setColorFromHex(doc: jsPDF, hex: string, kind: "fill" | "text" | "draw") {
  const { r, g, b } = hexToRgb(hex)
  if (kind === "fill") doc.setFillColor(r, g, b)
  if (kind === "text") doc.setTextColor(r, g, b)
  if (kind === "draw") doc.setDrawColor(r, g, b)
}

function drawThinDivider(doc: jsPDF, y: number, colorHex = "#e2e8f0") {
  setColorFromHex(doc, colorHex, "draw")
  doc.setLineWidth(0.4)
  doc.line(12, y, 198, y)
}

// server-side credit note generator does not apply a watermark

function drawModernHeader(
  doc: jsPDF,
  title: string,
  numberLabel: string,
  numberValue: string,
  createdAt: string,
  branding?: { logo?: string; primaryColor?: string }
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY
  const hasLogo = Boolean(branding?.logo)

  const logoX = 12
  const logoY = 12

  // Logo
  if (hasLogo) {
    try {
      const lower = (branding!.logo || "").toLowerCase()
      const format = lower.includes("jpg") || lower.includes("jpeg") ? "JPEG" : "PNG"
      const maxLogoWidth = 44
      const maxLogoHeight = 20
      let imageWidth = 0
      let imageHeight = 0

      try {
        const imageProps = doc.getImageProperties(branding!.logo!)
        imageWidth = Number(imageProps?.width || 0)
        imageHeight = Number(imageProps?.height || 0)
      } catch {
        imageWidth = 3
        imageHeight = 1
      }

      let drawWidth = maxLogoWidth
      let drawHeight = maxLogoHeight

      if (imageWidth > 0 && imageHeight > 0) {
        const ratio = imageWidth / imageHeight
        if (ratio >= 1) {
          drawWidth = maxLogoWidth
          drawHeight = Math.min(maxLogoHeight, drawWidth / ratio)
        } else {
          drawHeight = maxLogoHeight
          drawWidth = Math.min(maxLogoWidth, drawHeight * ratio)
        }
      }

      const alignedY = logoY + (maxLogoHeight - drawHeight) / 2
      doc.addImage(branding!.logo!, format, logoX, alignedY, drawWidth, drawHeight)
    } catch (e) {
      // ignore logo failures
    }
  }

  // Document title - right side (larger, more prominent)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(32)
  setColorFromHex(doc, primary, "text")
  doc.text(title.toUpperCase(), 198, 25, { align: "right" })

  // Invoice details - right side
  const metaX = 106
  const metaY = 38

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  setColorFromHex(doc, DEFAULT_GRAY, "text")
  doc.text(numberLabel, metaX, metaY)
  doc.text("Issued", metaX, metaY + 12)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  setColorFromHex(doc, DEFAULT_TEXT, "text")
  doc.text(numberValue, 198, metaY, { align: "right" })
  doc.text(new Date(createdAt).toLocaleDateString("en-KE"), 198, metaY + 12, { align: "right" })

  drawThinDivider(doc, 68)
}

function drawPartiesSection(doc: jsPDF, client: DocumentClient, startY = 90, branding?: { primaryColor?: string }) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY
  const leftX = 12
  const rightX = 106
  const boxY = Math.max(startY, 72)
  const boxW = 92

  const headerH = 6.5
  const lineH = 4
  const padX = 3.5
  const padY = 3

  const nameLines = doc.splitTextToSize(client.name || "Client Name", 84)
  const locationLines = doc.splitTextToSize(`Location: ${client.location}`, 84)
  const phone = client.number || "—"
  const phoneLines = doc.splitTextToSize(`Phone: ${phone}`, 84)

  const leftHeight = headerH + padY + (nameLines.length + locationLines.length) * lineH + 1
  const rightHeight = headerH + padY + phoneLines.length * lineH + 1
  const boxH = Math.max(leftHeight, rightHeight, headerH + 12)

  setColorFromHex(doc, primary, "draw")
  doc.setLineWidth(0.35)
  doc.rect(leftX, boxY, boxW, boxH)
  doc.rect(rightX, boxY, boxW, boxH)
  setColorFromHex(doc, DEFAULT_LIGHT, "fill")
  doc.rect(leftX, boxY, boxW, headerH, "F")
  doc.rect(rightX, boxY, boxW, headerH, "F")
  doc.line(leftX, boxY + headerH, leftX + boxW, boxY + headerH)
  doc.line(rightX, boxY + headerH, rightX + boxW, boxY + headerH)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  setColorFromHex(doc, DEFAULT_TEXT, "text")
  doc.text("Bill To", leftX + padX, boxY + 4.5)
  doc.text("Contact Info", rightX + padX, boxY + 4.5)

  let ly = boxY + headerH + padY + 2.8
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.8)
  setColorFromHex(doc, DEFAULT_TEXT, "text")
  doc.text(nameLines, leftX + padX, ly)
  ly += nameLines.length * lineH
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  setColorFromHex(doc, DEFAULT_GRAY, "text")
  doc.text(locationLines, leftX + padX, ly)
  ly += locationLines.length * lineH

  let ry = boxY + headerH + padY + 2.8
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  setColorFromHex(doc, DEFAULT_GRAY, "text")
  doc.text(phoneLines, rightX + padX, ry)

  return boxY + boxH
}

function drawItemsTable(doc: jsPDF, startY: number, items: DocumentItem[], branding?: { primaryColor?: string }) {
  const tableX = 12
  const tableW = 186
  const colWidth = [80, 24, 41, 41]
  const headerH = 7
  const rowH = 5

  let y = startY

  // Header
  const primary = branding?.primaryColor || DEFAULT_PRIMARY
  setColorFromHex(doc, primary, "fill")
  doc.rect(tableX, y, tableW, headerH, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  setColorFromHex(doc, "ffffff", "text")

  let x = tableX
  const headers = ["Item", "Qty", "Unit Price", "Total"]
  headers.forEach((header, idx) => {
    const align = idx === 0 ? "left" : "right"
    const offset = idx === 0 ? 2 : colWidth[idx] - 2
    doc.text(header, x + offset, y + 5, { align })
    x += colWidth[idx]
  })

  y += headerH
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  setColorFromHex(doc, DEFAULT_TEXT, "text")

  // Items
  items.forEach((item, idx) => {
    if (y > 250) {
      doc.addPage()
      y = 15
    }

    if (idx % 2 === 0) {
      setColorFromHex(doc, DEFAULT_LIGHT, "fill")
      doc.rect(tableX, y, tableW, rowH, "F")
    }

    x = tableX
    const itemName = doc.splitTextToSize(item.productName, colWidth[0] - 4)
    doc.text(itemName[0] || "", x + 2, y + 3.5)

    x += colWidth[0]
    doc.text(String(item.quantity), x + colWidth[1] - 4, y + 3.5, { align: "right" })

    x += colWidth[1]
    doc.text(`KSh ${Number(item.unitPrice).toLocaleString()}`, x + colWidth[2] - 4, y + 3.5, { align: "right" })

    x += colWidth[2]
    doc.text(`KSh ${Number(item.lineTotal).toLocaleString()}`, x + colWidth[3] - 4, y + 3.5, { align: "right" })

    y += rowH
  })

  return y + 2
}

function drawTotalsSection(doc: jsPDF, subTotal: number, startY: number, branding?: { primaryColor?: string }) {
  const rightX = 12 + 186 - 60
  let y = startY + 3

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  setColorFromHex(doc, DEFAULT_TEXT, "text")

  doc.text("Subtotal", rightX, y)
  doc.text(`KSh ${Number(subTotal).toLocaleString()}`, 198, y, { align: "right" })

  y += 7

  const primary = branding?.primaryColor || DEFAULT_PRIMARY
  setColorFromHex(doc, primary, "draw")
  doc.setLineWidth(0.5)
  doc.line(rightX - 5, y - 1, 198, y - 1)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  setColorFromHex(doc, primary, "text")
  doc.text("Total Credit", rightX, y + 5)
  doc.text(`KSh ${Number(subTotal).toLocaleString()}`, 198, y + 5, { align: "right" })

  return y + 12
}

export function generateCreditNotePdf(params: {
  creditNoteNumber: string
  invoiceNumber: string
  createdAt: Date | string
  client: DocumentClient
  items: DocumentItem[]
  subTotal: number
  reason: string
  reasonDetails?: string
  branding?: { logo?: string; primaryColor?: string }
}): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" })

  // No watermark for credit notes; use company branding in header instead
  drawModernHeader(
    doc,
    "Credit Note",
    "Credit Note No",
    params.creditNoteNumber,
    String(params.createdAt),
    params.branding
  )

  let tableY = drawPartiesSection(doc, params.client, 90, params.branding)

  // Add reference to original invoice
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  setColorFromHex(doc, DEFAULT_GRAY, "text")
  doc.text(`Reference Invoice: ${params.invoiceNumber}`, 12, tableY + 2)

  // Add reason section
  const reasonY = tableY + 8
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  setColorFromHex(doc, DEFAULT_TEXT, "text")
  doc.text("Reason for Credit:", 12, reasonY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  setColorFromHex(doc, DEFAULT_GRAY, "text")
  doc.text(params.reason, 15, reasonY + 5)

  if (params.reasonDetails) {
    const detailsLines = doc.splitTextToSize(params.reasonDetails, 180)
    doc.text("Details: " + detailsLines[0], 15, reasonY + 9)
    if (detailsLines.length > 1) {
      detailsLines.slice(1).forEach((line: string, idx: number) => {
        doc.text(line, 15, reasonY + 13 + idx * 4)
      })
    }
  }

  tableY = reasonY + (params.reasonDetails ? 20 : 12)

  const endY = drawItemsTable(doc, tableY, params.items, params.branding)

  drawTotalsSection(doc, params.subTotal, endY, params.branding)

  // Convert to buffer
  return Buffer.from(doc.output("arraybuffer"))
}
