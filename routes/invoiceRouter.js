import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const { appointmentGroup = [], customer = {} } = req.body;
    if (!appointmentGroup.length) return res.status(400).send("No appointments");

    const firstAppointment = appointmentGroup[0];
    const { rawDate, time } = firstAppointment;

    const totalCost = appointmentGroup.reduce((acc, a) => acc + Number(a.cost || 0), 0);
    const totalPaid = appointmentGroup.reduce((acc, a) => acc + Number(a.paid || 0), 0);
    const totalDue = appointmentGroup.reduce((acc, a) => acc + Number(a.due || 0), 0);

    // Colors
    const BLACK = "#000000", WHITE = "#ffffff", GOLD = "#d4af37", LIGHT_GRAY = "#f7f7f7", DARK_GRAY = "#e4e4e4";
    const DARK_TEXT = "#282828", MUTED_TEXT = "#646464", RED = "#ff4949", GREEN = "#007800";

    const formatUSD = (amount) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

    const doc = new PDFDocument({ size: "A4", margin: 20 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=invoice_${Date.now()}.pdf`);
      res.send(pdfBuffer);
    });

    const pageWidth = doc.page.width;

    // --- HEADER ---
    doc.rect(0, 0, pageWidth, 40).fill(BLACK);
    const logoPath = path.join(process.cwd(), "public", "LUSTRE.jpg");
    if (fs.existsSync(logoPath)) doc.image(logoPath, 15, 8, { width: 30, height: 28 });

    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(18).text("LUSTRE SALON", pageWidth - 15, 15, { align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor("#e6e6e6").text("Your Premium Grooming Partner", pageWidth - 15, 22, { align: "right" });
    doc.font("Helvetica-Bold").fontSize(20).fillColor(GOLD).text("INVOICE", pageWidth - 15, 30, { align: "right" });

    let currentY = 52;

    // --- CUSTOMER + APPOINTMENT BOX ---
    const boxWidth = pageWidth * 0.85;
    const boxX = (pageWidth - boxWidth) / 2;
    const boxHeight = 35;
    doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 4).fill(LIGHT_GRAY);

    doc.fillColor(DARK_TEXT).font("Helvetica-Bold").fontSize(10);
    doc.text("BILL TO", boxX + 10, currentY + 6);
    doc.text("APPOINTMENT DETAILS", boxX + boxWidth / 2 + 10, currentY + 6);

    doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(9);
    doc.text(`Name: ${customer.name || "Valued Customer"}`, boxX + 10, currentY + 13);
    doc.text(`Mobile: ${customer.mobileNumber || "(555) 555-5555"}`, boxX + 10, currentY + 19);
    doc.text(`Email: ${customer.email || "customer@email.com"}`, boxX + 10, currentY + 25);

    doc.text(`Invoice Date: ${dayjs().format("DD MMM YYYY")}`, boxX + boxWidth / 2 + 10, currentY + 13);
    doc.text(`Appointment Date: ${dayjs(rawDate).format("DD MMM YYYY")}`, boxX + boxWidth / 2 + 10, currentY + 19);
    doc.text(`Time: ${time}`, boxX + boxWidth / 2 + 10, currentY + 25);

    currentY += boxHeight + 10;

    // --- SERVICES TABLE ---
    doc.fillColor(DARK_TEXT).font("Helvetica-Bold").fontSize(9);
    const tableX = boxX;
    const colWidths = [20, 80, 60, 60, 40, 50, 50, 50];
    const headers = ["#", "Services", "Sub Names", "Stylist", "Time", "Total", "Paid", "Due"];

    let x = tableX;
    headers.forEach((h, i) => {
      doc.text(h, x, currentY, { width: colWidths[i], align: "center" });
      x += colWidths[i];
    });
    currentY += 12;
    doc.moveTo(tableX, currentY).lineTo(tableX + colWidths.reduce((a, b) => a + b, 0), currentY).strokeColor(DARK_GRAY).stroke();

    doc.font("Helvetica").fontSize(8);
    appointmentGroup.forEach((apt, idx) => {
      let x = tableX;
      const row = [
        idx + 1,
        apt.service || "-",
        apt.subName || "-",
        apt.stylist || "-",
        apt.time || "-",
        formatUSD(apt.cost),
        formatUSD(apt.paid),
        formatUSD(apt.due),
      ];
      row.forEach((cell, i) => {
        doc.text(cell, x, currentY + 4, { width: colWidths[i], align: ["center","left","left","left","center","right","right","right"][i] });
        x += colWidths[i];
      });
      currentY += 12;
    });

    currentY += 20;

    // --- PAYMENT SUMMARY BOX ---
    const sumBoxW = boxWidth;
    const sumBoxH = 48;
    doc.roundedRect(boxX, currentY, sumBoxW, sumBoxH, 3).fill(WHITE);

    let y = currentY + 12;
    const innerPad = 10;
    doc.fillColor(DARK_TEXT).font("Helvetica-Bold").text("Payment Summary", boxX + innerPad, y - 2);
    doc.moveTo(boxX + innerPad, y + 2).lineTo(boxX + sumBoxW - innerPad, y + 2).stroke(DARK_GRAY);

    y += 12;
    doc.fillColor(MUTED_TEXT).font("Helvetica").text("Total Cost", boxX + innerPad, y);
    doc.font("Helvetica-Bold").text(formatUSD(totalCost), boxX + sumBoxW - innerPad, y, { align: "right" });

    y += 10;
    doc.fillColor(GREEN).font("Helvetica").text("Amount Paid", boxX + innerPad, y);
    doc.font("Helvetica-Bold").text(formatUSD(totalPaid), boxX + sumBoxW - innerPad, y, { align: "right" });

    y += 10;
    doc.fillColor(RED).font("Helvetica").text("Amount Due", boxX + innerPad, y);
    doc.font("Helvetica-Bold").text(formatUSD(totalDue), boxX + sumBoxW - innerPad, y, { align: "right" });

    currentY += sumBoxH + 10;

    // --- MESSAGE ---
    const msgBoxH = 22;
    doc.roundedRect(boxX, currentY, boxWidth, msgBoxH, 3).fill("#fffaf0");
    doc.fillColor(MUTED_TEXT).font("Helvetica-Oblique").fontSize(8);
    const msg = "Please arrive 10 minutes before your scheduled appointment time. Selecting multiple services increases total duration.";
    doc.text(msg, boxX + 10, currentY + 6, { width: boxWidth - 20, align: "center" });

    currentY += msgBoxH + 10;

    // --- FOOTER ---
    const footerHeight = 32;
    const footerY = doc.page.height - footerHeight;
    doc.rect(0, footerY, pageWidth, footerHeight).fill(LIGHT_GRAY);
    doc.fillColor(BLACK).font("Helvetica").fontSize(7);
    doc.text("123 Main Street, New York, NY 10001 | info@lustresalon.com | www.lustresalon.com", pageWidth/2, footerY+10, { align: "center" });
    doc.text("Hotline: (800) 555-0199", pageWidth/2, footerY+17, { align: "center" });
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(8).text("Thank you for choosing LUSTRE SALON!", pageWidth/2, footerY+26, { align: "center" });

    doc.end();

  } catch (err) {
    console.error("Invoice generation error:", err);
    res.status(500).json({ success: false, message: "Failed to generate invoice" });
  }
});

export default router;
