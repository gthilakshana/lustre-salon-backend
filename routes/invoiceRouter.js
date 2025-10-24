import express from "express";
import PDFDocument from "pdfkit";
import dayjs from "dayjs";

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const { appointmentGroup = [], customer = {} } = req.body;
    if (!appointmentGroup.length) return res.status(400).send("No appointments");

    const firstAppointment = appointmentGroup[0];

    const totalCost = appointmentGroup.reduce((acc, a) => acc + Number(a.cost || 0), 0);
    const totalPaid = appointmentGroup.reduce((acc, a) => acc + Number(a.paid || 0), 0);
    const totalDue = totalCost - totalPaid;

    const BLACK = "#000000";
    const WHITE = "#ffffff";
    const GOLD = "#D4AF37"; // Royal Gold
    const DARK_GRAY = "#222222";
    const LIGHT_GRAY = "#F7F7F7";
    const BORDER_GRAY = "#E6E6E6";
    const DARK_TEXT = "#222222";
    const MUTED_TEXT = "#7A7A7A";
    const RED = "#CC3333";
    const GREEN = "#007700";

    const formatUSD = (amount) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=invoice_${Date.now()}.pdf`);
      res.send(pdfBuffer);
    });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    let currentY = 46;

    // ---------- HEADER ----------
    doc.fillColor(DARK_TEXT).fontSize(20).font("Helvetica-Bold").text("LUSTRE SALON", 36, currentY);
    doc.fillColor(MUTED_TEXT).fontSize(9).font("Helvetica-Oblique").text("Beauty. Elegance. You.", 36, currentY + 30);

    const rightLabelX = pageWidth - 220;
    doc.roundedRect(rightLabelX, currentY - 4, 180, 38, 6).fill(WHITE).stroke(BORDER_GRAY);
    doc.fillColor(GOLD).fontSize(12).font("Helvetica-Bold").text("INVOICE", rightLabelX + 12, currentY + 2);
    doc.fillColor(DARK_TEXT).fontSize(9).font("Helvetica").text(dayjs().format("YYYY-MM-DD"), rightLabelX + 12, currentY + 18);

    currentY += 60;
    doc.moveTo(36, currentY).lineTo(pageWidth - 36, currentY).lineWidth(1).strokeColor(BORDER_GRAY).stroke();
    currentY += 18;

    // ---------- DETAILS BOXES ----------
    const detailsBoxX = 36;
    const detailsBoxWidth = (pageWidth - 72) / 2 - 6;
    const detailsBoxHeight = 85;
    const detailsBoxGap = 12;

    // BILL TO BOX
    doc.roundedRect(detailsBoxX, currentY, detailsBoxWidth, detailsBoxHeight, 6).fill(LIGHT_GRAY).stroke(BORDER_GRAY);
    doc.fillColor(DARK_TEXT).fontSize(10).font("Helvetica-Bold").text("BILL TO", detailsBoxX + 15, currentY + 10);
    doc.moveTo(detailsBoxX + 15, currentY + 24).lineTo(detailsBoxX + 75, currentY + 24).lineWidth(2).strokeColor(GOLD).stroke();
    doc.font("Helvetica").fontSize(9).fillColor(MUTED_TEXT)
      .text(`Name: ${customer?.name || "Valued Customer"}`, detailsBoxX + 15, currentY + 32, { width: detailsBoxWidth - 30 })
      .text(`Mobile: ${customer?.mobileNumber || "(555) 555-5555"}`, detailsBoxX + 15, currentY + 48, { width: detailsBoxWidth - 30 })
      .text(`Email: ${customer?.email || "customer@email.com"}`, detailsBoxX + 15, currentY + 64, { width: detailsBoxWidth - 30 });

    // APPOINTMENT DETAILS BOX
    const aptBoxX = detailsBoxX + detailsBoxWidth + detailsBoxGap;
    doc.roundedRect(aptBoxX, currentY, detailsBoxWidth, detailsBoxHeight, 6).fill(LIGHT_GRAY).stroke(BORDER_GRAY);
    doc.fillColor(DARK_TEXT).fontSize(10).font("Helvetica-Bold").text("APPOINTMENT DETAILS", aptBoxX + 15, currentY + 10);
    doc.moveTo(aptBoxX + 15, currentY + 24).lineTo(aptBoxX + 160, currentY + 24).lineWidth(2).strokeColor(GOLD).stroke();
    doc.font("Helvetica").fontSize(9).fillColor(MUTED_TEXT)
      .text(`Invoice Date: ${dayjs().format("DD MMM YYYY")}`, aptBoxX + 15, currentY + 32, { width: detailsBoxWidth - 30 })
      .text(`Appointment Date: ${firstAppointment?.rawDate ? dayjs(firstAppointment.rawDate).format("DD MMM YYYY") : "-"}`, aptBoxX + 15, currentY + 48, { width: detailsBoxWidth - 30 })
      .text(`Time: ${firstAppointment?.time || "-"}`, aptBoxX + 15, currentY + 64, { width: detailsBoxWidth - 30 });

    currentY += detailsBoxHeight + 26;

   const tableTop = currentY;
const tableWidth = pageWidth - 72;
const colWidths = [20, 60, 120, 60, 60, 60, 60]; 
const colHeaders = ["#", "Service", "Sub Name", "Stylist", "Time", "Total", "Paid"];
const rowHeight = 30;
let x = 36;

// Header
doc.rect(x, tableTop, tableWidth, rowHeight).fill("#D4AF37");
doc.font("Helvetica-Bold").fillColor("#FFFFFF").fontSize(10);

colHeaders.forEach((h, i) => {
  const align = ["Total", "Paid"].includes(h) ? "right" : "left";
  const currentX = x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
  const textX = align === "right" ? currentX + colWidths[i] - 6 : currentX + 6;
  doc.text(h, textX, tableTop + 8, { width: colWidths[i] - 12, align });
});

currentY += rowHeight;

// Rows
appointmentGroup.forEach((apt, idx) => {
  const bgColor = idx % 2 === 0 ? "#FFFFFF" : "#F8F8F8";
  doc.rect(x, currentY, tableWidth, rowHeight).fill(bgColor);
  doc.lineWidth(0.5).strokeColor("#D1D1D1").rect(x, currentY, tableWidth, rowHeight).stroke();

  const row = [
    idx + 1,
    apt.service || "-",
    apt.subName || "-",
    apt.stylist || "-",
    apt.time || "-",
    formatUSD(apt.cost),
    formatUSD(apt.paid),
  ];

  doc.fillColor("#333333").font("Helvetica").fontSize(9);

  row.forEach((cell, i) => {
    const align = ["Total", "Paid"].includes(colHeaders[i]) ? "right" : "left";
    const currentX = x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
    const textX = align === "right" ? currentX + colWidths[i] - 6 : currentX + 6;
    doc.text(cell, textX, currentY + 8, { width: colWidths[i] - 12, align });
  });

  currentY += rowHeight;
});

currentY += 20;



    // ---------- PAYMENT SUMMARY (Fixed at bottom-right) ----------
    const summaryBoxWidth = 250;
    const summaryBoxX = pageWidth - 36 - summaryBoxWidth;
    const summaryBoxHeight = 100;
    const summaryBoxY = pageHeight - 280;

    doc.roundedRect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight, 8).fill(WHITE).strokeColor(GOLD).lineWidth(1).stroke();
    doc.fillColor(DARK_TEXT).fontSize(12).font("Helvetica-Bold").text("Payment Summary", summaryBoxX + 12, summaryBoxY + 12);
    doc.rect(summaryBoxX + 12, summaryBoxY + 30, 60, 3).fill(GOLD);

    let summaryY = summaryBoxY + 40;
    const labelX = summaryBoxX + 14;
    const amountX = summaryBoxX + summaryBoxWidth - 14 - 80;

    doc.font("Helvetica-Bold").fontSize(10).fillColor(DARK_TEXT).text("Total Cost:", labelX, summaryY);
    doc.text(formatUSD(totalCost), amountX, summaryY, { width: 80, align: "right" });
    summaryY += 20;

    doc.font("Helvetica").fontSize(10).fillColor(GREEN).text("Amount Paid:", labelX, summaryY);
    doc.text(formatUSD(totalPaid), amountX, summaryY, { width: 80, align: "right" });
    summaryY += 35;

    doc.rect(summaryBoxX, summaryY, summaryBoxWidth, 22).fill(RED);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(WHITE).text("Amount Due:", labelX, summaryY + 6);
    doc.text(formatUSD(totalDue), amountX, summaryY + 6, { width: 80, align: "right" });

    // ---------- MESSAGE / NOTES ----------
    const messageBoxHeight = 40;
    const bottomMargin = 150;
    const messageY = pageHeight - bottomMargin;

    doc.roundedRect(36, messageY, pageWidth - 72, messageBoxHeight, 6).fill(LIGHT_GRAY).stroke(BORDER_GRAY);
    doc.fillColor(MUTED_TEXT).font("Helvetica-Oblique").fontSize(8)
      .text("Please arrive 10 minutes before your scheduled appointment time. Selecting multiple services increases total duration.", 50, messageY + 10, { width: pageWidth - 100 });

    // ---------- FOOTER ----------
    const footerY = pageHeight - 90;
    doc.strokeColor(BORDER_GRAY).lineWidth(0.5).moveTo(36, footerY - 8).lineTo(pageWidth - 36, footerY - 8).stroke();

    doc.font("Helvetica-Bold").fontSize(10).fillColor(GOLD)
      .text("LUSTRE SALON", 36, footerY + 2, { width: pageWidth - 72, align: "center" });
    doc.font("Helvetica").fontSize(8).fillColor(MUTED_TEXT)
      .text("123 Main Street, New York, NY 10001 | info@lustresalon.com | Hotline: (800) 555-0199", 36, footerY + 18, { width: pageWidth - 72, align: "center" });
    doc.font("Helvetica-Oblique").fontSize(8).fillColor("#9A9A9A")
      .text("Thank you for choosing LUSTRE — We value your trust.", 36, footerY + 36, { width: pageWidth - 72, align: "center" });

    doc.end();

  } catch (err) {
    console.error("Invoice generation error:", err);
    res.status(500).json({ success: false, message: "Failed to generate invoice" });
  }
});

export default router;
