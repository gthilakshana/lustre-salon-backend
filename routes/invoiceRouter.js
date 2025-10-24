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
        // Calculation logic - Keep as is
        const totalCost = appointmentGroup.reduce((acc, a) => acc + Number(a.cost || 0), 0);
        const totalPaid = appointmentGroup.reduce((acc, a) => acc + Number(a.paid || 0), 0);
        const totalDue = totalCost - totalPaid;

        // Colors
        const BLACK = "#000000", WHITE = "#ffffff", GOLD = "#a87f2e", 
              LIGHT_GRAY = "#f7f7f7", BORDER_GRAY = "#e4e4e4";
        const DARK_TEXT = "#333333", MUTED_TEXT = "#666666", RED = "#cc3333", GREEN = "#007700";

        // Helper function
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
        let currentY = 36;

        // ##################################################################
        // 1. HEADER (Unchanged from last version)
        // ##################################################################

        doc.fillColor(DARK_TEXT).fontSize(28).font("Helvetica-Bold").text("LUSTRE SALON", 36, currentY);
        doc.fillColor(GOLD).fontSize(10).font("Helvetica-Bold").text("INVOICE", pageWidth - 100, currentY, { align: "right" });
        currentY += 15;
        doc.fillColor(DARK_TEXT).fontSize(18).font("Helvetica-Bold").text(dayjs().format("YYYY-MM-DD"), pageWidth - 100, currentY, { align: "right" });
        currentY += 25;
        doc.strokeColor(BORDER_GRAY).lineWidth(1).moveTo(36, currentY).lineTo(pageWidth - 36, currentY).stroke();
        currentY += 20;

        // ##################################################################
        // 2. CUSTOMER + APPOINTMENT BOXES (Unchanged from last version)
        // ##################################################################

        const detailsBoxX = 36;
        const detailsBoxWidth = (pageWidth - 72) / 2 - 5;
        const detailsBoxHeight = 75;
        const detailsBoxGap = 10;
        
        // BILL TO BOX
        doc.roundedRect(detailsBoxX, currentY, detailsBoxWidth, detailsBoxHeight, 6).stroke(BORDER_GRAY).fill(LIGHT_GRAY);
        doc.fillColor(DARK_TEXT).fontSize(10).font("Helvetica-Bold").text("BILL TO", detailsBoxX + 15, currentY + 10);
        doc.font("Helvetica").fontSize(9).fillColor(MUTED_TEXT)
            .text(`Name: ${customer.name || "Valued Customer"}`, detailsBoxX + 15, currentY + 30, { width: detailsBoxWidth - 30 })
            .text(`Mobile: ${customer.mobileNumber || "(555) 555-5555"}`, detailsBoxX + 15, currentY + 45, { width: detailsBoxWidth - 30 })
            .text(`Email: ${customer.email || "customer@email.com"}`, detailsBoxX + 15, currentY + 60, { width: detailsBoxWidth - 30 });

        // APPOINTMENT DETAILS BOX
        const aptBoxX = detailsBoxX + detailsBoxWidth + detailsBoxGap;
        doc.roundedRect(aptBoxX, currentY, detailsBoxWidth, detailsBoxHeight, 6).stroke(BORDER_GRAY).fill(LIGHT_GRAY);
        doc.font("Helvetica-Bold").fillColor(DARK_TEXT).text("APPOINTMENT DETAILS", aptBoxX + 15, currentY + 10);
        doc.font("Helvetica").fontSize(9).fillColor(MUTED_TEXT)
            .text(`Invoice Date: ${dayjs().format("DD MMM YYYY")}`, aptBoxX + 15, currentY + 30, { width: detailsBoxWidth - 30 })
            .text(`Appointment Date: ${dayjs(firstAppointment.rawDate).format("DD MMM YYYY")}`, aptBoxX + 15, currentY + 45, { width: detailsBoxWidth - 30 })
            .text(`Time: ${firstAppointment.time}`, aptBoxX + 15, currentY + 60, { width: detailsBoxWidth - 30 });

        currentY += detailsBoxHeight + 30;

        // ##################################################################
        // 3. SERVICES TABLE - FIXING COLUMN ALIGNMENT 🎯
        // ##################################################################

        const tableTop = currentY;
        const tableWidth = pageWidth - 72;
        // Adjusted colWidths to accommodate all columns clearly (especially Time, Total, Paid)
        // [#, Service, Sub Name, Stylist, Time, Total, Paid]
        const colWidths = [20, 110, 100, 80, 50, 80, 80]; 
        const colHeaders = ["#", "Service", "Sub Name", "Stylist", "Time", "Total", "Paid"];
        const rowHeight = 25;
        let x = 36;
        
        // HEADER ROW BACKGROUND
        doc.rect(36, tableTop, tableWidth, rowHeight).fill(GOLD);
        
        // HEADER ROW TEXT
        doc.font("Helvetica-Bold").fillColor(WHITE).fontSize(9);
        colHeaders.forEach((h, i) => {
            // Align Total and Paid to the right
            const align = ["Total", "Paid"].includes(h) ? "right" : "left";
            const currentX = x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            
            // Adding a buffer of 5px for left-aligned, and offsetting by -5px for right-aligned
            const textX = align === "right" ? currentX + colWidths[i] - 5 : currentX + 5;
            
            doc.text(h, textX, tableTop + 8, { width: colWidths[i] - 10, align: align });
        });
        currentY += rowHeight;

        // TABLE ROWS
        appointmentGroup.forEach((apt, idx) => {
            x = 36;
            const bgColor = idx % 2 === 0 ? WHITE : LIGHT_GRAY;
            
            // Row background and border
            doc.rect(x, currentY, tableWidth, rowHeight).fill(bgColor);
            doc.strokeColor(BORDER_GRAY).lineWidth(0.5).rect(x, currentY, tableWidth, rowHeight).stroke(); 

            // The row data must now match the column headers exactly
            const row = [
                idx + 1,
                apt.service || "-",
                apt.subName || "-",
                apt.stylist || "-",
                apt.time || "-",
                formatUSD(apt.cost),
                formatUSD(apt.paid),
            ];
            
            doc.fillColor(DARK_TEXT).font("Helvetica").fontSize(8);
            row.forEach((cell, i) => { 
                const align = ["Total", "Paid"].includes(colHeaders[i]) ? "right" : "left";
                const currentX = x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
                
                const textX = align === "right" ? currentX + colWidths[i] - 5 : currentX + 5;
                
                doc.text(cell, textX, currentY + 8, { width: colWidths[i] - 10, align: align });
            });
            
            currentY += rowHeight;
        });

        currentY += 20;

        // ##################################################################
        // 4. PAYMENT SUMMARY (Unchanged from last version)
        // ##################################################################

        const summaryBoxWidth = 250;
        const summaryBoxX = pageWidth - 36 - summaryBoxWidth; 

        // Border and Title
        doc.roundedRect(summaryBoxX, currentY, summaryBoxWidth, 90, 6).stroke(BORDER_GRAY).fill(WHITE);
        doc.fillColor(DARK_TEXT).fontSize(11).font("Helvetica-Bold").text("Payment Summary", summaryBoxX + 10, currentY + 10);
        
        let summaryY = currentY + 30;
        const labelX = summaryBoxX + 10;
        const amountX = summaryBoxX + summaryBoxWidth - 100;

        // Total Cost
        doc.font("Helvetica-Bold").fontSize(10).fillColor(DARK_TEXT).text("Total Cost:", labelX, summaryY);
        doc.text(formatUSD(totalCost), amountX, summaryY, { width: 80, align: "right" });
        summaryY += 20;

        // Amount Paid
        doc.font("Helvetica").fontSize(10).fillColor(GREEN).text("Amount Paid:", labelX, summaryY);
        doc.text(formatUSD(totalPaid), amountX, summaryY, { width: 80, align: "right" });
        summaryY += 25; 

        // Amount Due (Highlighted)
        doc.rect(summaryBoxX, summaryY, summaryBoxWidth, 20).fill(RED); 
        doc.font("Helvetica-Bold").fontSize(11).fillColor(WHITE).text("Amount Due:", labelX, summaryY + 5);
        doc.text(formatUSD(totalDue), amountX, summaryY + 5, { width: 80, align: "right" });
        
        currentY = summaryY + 40;

        // ##################################################################
        // 5. MESSAGE / NOTES (Unchanged from last version)
        // ##################################################################

        const messageY = Math.max(currentY, detailsBoxX + detailsBoxHeight + 50); 
        
        doc.roundedRect(36, messageY, pageWidth-72, 40, 6).fill(LIGHT_GRAY).stroke(BORDER_GRAY);
        doc.fillColor(MUTED_TEXT).font("Helvetica-Oblique").fontSize(8)
            .text("Please arrive 10 minutes before your scheduled appointment time. Selecting multiple services increases total duration.", 50, messageY + 10, { width: pageWidth-100 });

        // ##################################################################
        // 6. FOOTER (Fixed to the bottom of the page - Unchanged from last version)
        // ##################################################################

        const footerY = pageHeight - 50;
        
        // Separator line
        doc.strokeColor(BORDER_GRAY).lineWidth(0.5).moveTo(36, footerY - 5).lineTo(pageWidth - 36, footerY - 5).stroke();

        // Contact Info
        doc.fontSize(8).fillColor(MUTED_TEXT).font("Helvetica")
            .text("123 Main Street, New York, NY 10001 | info@lustresalon.com | Hotline: (800) 555-0199", 36, footerY, { width: pageWidth-72, align: "center" });
        
        // Thank You Message
        doc.font("Helvetica-Bold").fillColor(GOLD).fontSize(9)
            .text("Thank you for choosing LUSTRE SALON!", 36, footerY + 15, { width: pageWidth-72, align: "center" });

        doc.end();

    } catch (err) {
        console.error("Invoice generation error:", err);
        res.status(500).json({ success: false, message: "Failed to generate invoice" });
    }
});

export default router;