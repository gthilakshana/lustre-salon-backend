// routes/invoiceRouter.js
import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";

const router = express.Router();

/**
 * POST /api/invoices/generate
 * Body: { appointmentGroup: [...], customer: {...}, company?: {...} }
 */
router.post("/generate", async (req, res) => {
  try {
    const { appointmentGroup = [], customer = {}, company = {} } = req.body;

    if (!appointmentGroup || appointmentGroup.length === 0) {
      return res.status(400).json({ success: false, message: "No appointment data provided." });
    }

    const companyInfo = {
      name: company.name || "LUSTRE SALON",
      address: company.address || "123 Main Street, New York, NY 10001",
      phone: company.phone || "(800) 555-0199",
      email: company.email || "info@lustresalon.com",
      website: company.website || "www.lustresalon.com",
      logoPath: path.join(process.cwd(), "public", "LUSTRE.jpg"),
    };

    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice_${Date.now()}.pdf`
      );
      res.send(pdfBuffer);
    });

    const pageWidth = doc.page.width;

    // --- Header ---
    doc.rect(0, 0, pageWidth, 110).fill("#0b0b0b");
    try {
      if (fs.existsSync(companyInfo.logoPath)) {
        doc.image(companyInfo.logoPath, 40, 18, { width: 56, height: 56 });
      }
    } catch {
      console.warn("Logo not found");
    }
    doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text(companyInfo.name, 0, 28, { align: "center" });
    doc.fontSize(9).font("Helvetica").fillColor("#e6e6e6").text(companyInfo.website, 0, 48, { align: "center" });
    doc.fontSize(18).fillColor("#d4af37").font("Helvetica-Bold").text("INVOICE", pageWidth - 110, 30, { align: "left" });

    let currentY = 120;

    // --- Customer / Appointment Box ---
    const boxX = 36;
    const boxWidth = pageWidth - boxX * 2;
    const boxHeight = 70;
    doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 8).fill("#f7f7f7").stroke("#e8e8e8");

    doc.fillColor("#222").fontSize(10).font("Helvetica-Bold").text("BILL TO", boxX + 12, currentY + 12);
    doc.font("Helvetica").fontSize(9).fillColor("#555").text(customer.name || "Valued Customer", boxX + 12, currentY + 28);
    doc.text(customer.mobileNumber || customer.mobile || "(000) 000-0000", boxX + 12, currentY + 42);
    doc.text(customer.email || "customer@email.com", boxX + 12, currentY + 56);

    const metaX = boxX + boxWidth / 2 + 12;
    doc.font("Helvetica-Bold").fillColor("#222").text("Invoice Date:", metaX, currentY + 12);
    doc.font("Helvetica").fillColor("#555").text(dayjs().format("DD MMM YYYY"), metaX + 85, currentY + 12);
    const rawDate = appointmentGroup[0]?.rawDate || appointmentGroup[0]?.date;
    doc.font("Helvetica-Bold").fillColor("#222").text("Appointment Date:", metaX, currentY + 30);
    doc.font("Helvetica").fillColor("#555").text(rawDate ? dayjs(rawDate).format("DD MMM YYYY") : "-", metaX + 110, currentY + 30);
    doc.font("Helvetica-Bold").fillColor("#222").text("Time:", metaX, currentY + 48);
    doc.font("Helvetica").fillColor("#555").text(appointmentGroup[0]?.time || "-", metaX + 30, currentY + 48);

    currentY += boxHeight + 18;

    // --- Services Table ---
    const tableX = boxX;
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#222").text("#", tableX + 6, currentY);
    doc.text("Service", tableX + 36, currentY);
    doc.text("Stylist", tableX + 260, currentY);
    doc.text("Time", tableX + 360, currentY);
    doc.text("Total", tableX + 420, currentY, { width: 80, align: "right" });

    currentY += 14;
    doc.setLineWidth(0.5).strokeColor("#e8e8e8").moveTo(tableX, currentY).lineTo(pageWidth - boxX, currentY).stroke();
    currentY += 8;

    doc.font("Helvetica").fontSize(9).fillColor("#444");
    let subtotal = 0;
    appointmentGroup.forEach((apt, idx) => {
      const y = currentY + idx * 18;
      doc.text(String(idx + 1), tableX + 6, y);
      doc.text(apt.service || "-", tableX + 36, y, { width: 200 });
      doc.text(apt.stylist || "-", tableX + 260, y, { width: 90 });
      doc.text(apt.time || "-", tableX + 360, y);
      const cost = Number(apt.cost || apt.price || 0);
      subtotal += cost;
      doc.text(`$${cost.toFixed(2)}`, tableX + 420, y, { width: 80, align: "right" });
    });

    currentY += appointmentGroup.length * 18 + 12;

    // --- Summary Box ---
    const sumW = 220;
    const sumX = pageWidth - boxX - sumW;
    doc.roundedRect(sumX, currentY, sumW, 80, 6).fill("#ffffff").stroke("#eaeaea");
    const pad = 10;
    let sy = currentY + pad;
    doc.font("Helvetica").fontSize(9).fillColor("#666").text("Sub Total", sumX + pad, sy);
    doc.font("Helvetica-Bold").fillColor("#222").text(`$${subtotal.toFixed(2)}`, sumX + sumW - pad, sy, { align: "right" });

    sy += 18;
    const tax = Math.round(subtotal * 0.07 * 100) / 100;
    doc.font("Helvetica").fontSize(9).fillColor("#666").text("Tax (7%)", sumX + pad, sy);
    doc.font("Helvetica-Bold").fillColor("#222").text(`$${tax.toFixed(2)}`, sumX + sumW - pad, sy, { align: "right" });

    sy += 18;
    const total = subtotal + tax;
    doc.font("Helvetica").fontSize(10).fillColor("#222").text("Total", sumX + pad, sy);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#d4af37").text(`$${total.toFixed(2)}`, sumX + sumW - pad, sy, { align: "right" });

    currentY += 100;

    // --- Message Bar ---
    const msgH = 36;
    doc.roundedRect(boxX, currentY, boxWidth, msgH, 6).fill("#fff8f0").stroke("#f0e6da");
    doc.fillColor("#444").font("Helvetica-Oblique").fontSize(8).text(
      "Please arrive 10 minutes before your scheduled appointment time. Selecting multiple services increases total duration.",
      boxX + 12,
      currentY + 8,
      { width: boxWidth - 24 }
    );

    currentY += msgH + 18;

    // --- Footer ---
    doc.fontSize(8).fillColor("#777").font("Helvetica").text(
      `${companyInfo.address} | ${companyInfo.email} | ${companyInfo.phone}`,
      boxX,
      doc.page.height - 40,
      { width: pageWidth - boxX * 2, align: "center" }
    );

    doc.font("Helvetica-Bold").fillColor("#d4af37").fontSize(9)
      .text("Thank you for choosing LUSTRE SALON!", boxX, doc.page.height - 26, { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Invoice generation error:", err);
    res.status(500).json({ success: false, message: "Failed to generate invoice." });
  }
});

export default router;
