// import nodemailer from "nodemailer";
// import PDFDocument from "pdfkit";
// import fs from "fs";
// import path from "path";

// export async function sendInvoiceEmail(customerEmail, appointmentIds, amount) {
//   const invoicesDir = path.join(process.cwd(), "invoices");
//   fs.mkdirSync(invoicesDir, { recursive: true });

//   const invoicePath = path.join(invoicesDir, `invoice-${Date.now()}.pdf`);
//   const doc = new PDFDocument();
//   doc.pipe(fs.createWriteStream(invoicePath));

//   doc.fontSize(20).text("Lustre Salon Payment Invoice", { align: "center" });
//   doc.moveDown();
//   doc.fontSize(14).text(`Customer Email: ${customerEmail}`);
//   doc.text(`Amount Paid: LKR ${amount}`);
//   doc.text(`Appointments: ${appointmentIds.join(", ")}`);
//   doc.text(`Date: ${new Date().toLocaleString()}`);
//   doc.end();

//   //  Wait until PDF is fully written
//   await new Promise((resolve) => doc.on("finish", resolve));

//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   const mailOptions = {
//     from: `"Lustre Salon" <${process.env.EMAIL_USER}>`,
//     to: customerEmail,
//     subject: "Your Payment Invoice",
//     text: "Thank you for your payment! Please find your invoice attached.",
//     attachments: [{ filename: "invoice.pdf", path: invoicePath }],
//   };

//   await transporter.sendMail(mailOptions);
//   console.log(`📧 Invoice sent to ${customerEmail}`);

//   // (Optional) Clean up the invoice file after sending
//   fs.unlink(invoicePath, (err) => {
//     if (err) console.error("Failed to delete invoice:", err);
//   });
// }
