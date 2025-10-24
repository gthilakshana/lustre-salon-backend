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

// HEADER
doc.rect(0, 0, pageWidth, 50).fill("#000");
doc.fillColor("#fff").fontSize(20).font("Helvetica-Bold").text("LUSTRE SALON", 50, 15);
doc.fillColor("#d4af37").fontSize(22).text("INVOICE", pageWidth - 150, 15);

// CUSTOMER + APPOINTMENT BOX
let currentY = 60;
const boxHeight = 60;
doc.roundedRect(36, currentY, pageWidth - 72, boxHeight, 6).fill("#f7f7f7").stroke("#e8e8e8");
doc.fillColor("#222").fontSize(10).font("Helvetica-Bold").text("BILL TO", 50, currentY + 10);
doc.font("Helvetica").fontSize(9).fillColor("#555")
   .text(`Name: ${customer.name || "Valued Customer"}`, 50, currentY + 25)
   .text(`Mobile: ${customer.mobileNumber || "(555) 555-5555"}`, 50, currentY + 40)
   .text(`Email: ${customer.email || "customer@email.com"}`, 50, currentY + 55);

doc.font("Helvetica-Bold").fillColor("#222").text("APPOINTMENT DETAILS", pageWidth/2, currentY + 10);
doc.font("Helvetica").fontSize(9).fillColor("#555")
   .text(`Invoice Date: ${dayjs().format("DD MMM YYYY")}`, pageWidth/2, currentY + 25)
   .text(`Appointment Date: ${dayjs(firstAppointment.rawDate).format("DD MMM YYYY")}`, pageWidth/2, currentY + 40)
   .text(`Time: ${firstAppointment.time}`, pageWidth/2, currentY + 55);

currentY += boxHeight + 20;

// SERVICES TABLE
const tableTop = currentY;
const colWidths = [20, 120, 120, 80, 50, 60, 60, 60];
const rowHeight = 20;

// HEADER ROW
doc.font("Helvetica-Bold").fillColor("#222");
let x = 36;
["#", "Service", "Sub Name", "Stylist", "Time", "Total", "Paid", "Due"].forEach((h, i) => {
  doc.text(h, x + 2, currentY, { width: colWidths[i], align: i>4 ? "right" : "left" });
  x += colWidths[i];
});
currentY += rowHeight;

// TABLE ROWS
appointmentGroup.forEach((apt, idx) => {
  x = 36;
  const bgColor = idx % 2 === 0 ? "#fff" : "#f2f2f2";
  doc.rect(x, currentY, colWidths.reduce((a,b)=>a+b,0), rowHeight).fill(bgColor).stroke();
  
  const row = [
    idx + 1,
    apt.service || "-",
    apt.subName || "-",
    apt.stylist || "-",
    apt.time || "-",
    formatUSD(apt.cost),
    formatUSD(apt.paid),
    formatUSD(apt.due)
  ];
  row.forEach((cell, i) => {
    doc.fillColor("#222").font("Helvetica").text(cell, x + 2, currentY + 5, { width: colWidths[i], align: i>4 ? "right" : "left" });
    x += colWidths[i];
  });
  currentY += rowHeight;

  // Add page break if exceeds
  if(currentY > pageHeight - 150){
    doc.addPage();
    currentY = 50;
  }
});

// PAYMENT SUMMARY
currentY += 10;
doc.roundedRect(36, currentY, pageWidth-72, 60, 6).fill("#fff").stroke("#e8e8e8");
doc.font("Helvetica-Bold").fillColor("#222").text("Payment Summary", 50, currentY + 10);
doc.font("Helvetica").fontSize(9).fillColor("#222")
   .text(`Total Cost: ${formatUSD(totalCost)}`, 50, currentY + 25)
   .fillColor(GREEN).text(`Amount Paid: ${formatUSD(totalPaid)}`, 50, currentY + 40)
   .fillColor(RED).text(`Amount Due: ${formatUSD(totalDue)}`, 200, currentY + 40);

currentY += 80;

// MESSAGE
doc.roundedRect(36, currentY, pageWidth-72, 40, 6).fill("#fff8f0");
doc.fillColor("#555").font("Helvetica-Oblique").fontSize(8)
   .text("Please arrive 10 minutes before your scheduled appointment time. Selecting multiple services increases total duration.", 50, currentY + 10, { width: pageWidth-100 });

// FOOTER
doc.fontSize(8).fillColor("#777").text("123 Main Street, New York, NY 10001 | info@lustresalon.com | Hotline: (800) 555-0199", 36, pageHeight-50, { width: pageWidth-72, align: "center" });
doc.font("Helvetica-Bold").fillColor("#d4af37").text("Thank you for choosing LUSTRE SALON!", 36, pageHeight-35, { width: pageWidth-72, align: "center" });

doc.end();


  } catch (err) {
    console.error("Invoice generation error:", err);
    res.status(500).json({ success: false, message: "Failed to generate invoice" });
  }
});

export default router;
