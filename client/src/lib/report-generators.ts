/**
 * Report Generation Utilities
 * Handles PDF/Excel export, formatting, and data transformation
 */

import { sanitizeHtml } from './sanitizer';

// Format currency
export function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

// Format date
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

// Format date with time
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR");
}

// Format CPF/CNPJ
export function formatDocument(doc: string): string {
  const cleanDoc = doc.replace(/\D/g, "");
  if (cleanDoc.length === 11) {
    // CPF: 000.000.000-00
    return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (cleanDoc.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return doc;
}

// Export to CSV
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Print document
export function printDocument(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  // Sanitizar HTML antes de escrever no documento de impressão
  const sanitizedHtml = sanitizeHtml(element.innerHTML, {
    allowedTags: ['p', 'div', 'span', 'strong', 'em', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'br', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li'],
    allowedAttributes: ['class', 'style', 'id'],
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Impressão</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 20px;
            margin: 0;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${sanitizedHtml}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

// Generate PDF using html2canvas + jsPDF (client-side)
export async function generatePDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // Dynamic import to reduce bundle size
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

// Commission report data transformer
export interface CommissionReportData {
  date: string;
  type: "sale" | "rental" | "Venda" | "Locação";
  propertyTitle: string;
  clientName: string;
  transactionValue: string;
  commissionRate: string;
  commissionValue: string;
  brokerName: string;
  status: "pending" | "paid" | "Pendente" | "Pago";
}

export function transformCommissionsForExport(commissions: any[]): CommissionReportData[] {
  return commissions.map((c) => ({
    date: formatDate(c.date || c.saleDate || c.createdAt),
    type: c.type === "sale" ? "Venda" : "Locação",
    propertyTitle: c.property?.title || c.propertyTitle || "N/A",
    clientName: c.client?.name || c.buyerName || c.renterName || "N/A",
    transactionValue: formatCurrency(c.saleValue || c.rentValue || 0),
    commissionRate: `${c.commissionRate || 0}%`,
    commissionValue: formatCurrency(c.commissionValue || 0),
    brokerName: c.broker?.name || c.brokerName || "N/A",
    status: c.status === "paid" ? "Pago" : "Pendente",
  }));
}

// Calculate commission statistics
export interface CommissionStats {
  total: number;
  pending: number;
  paid: number;
  average: number;
  topBroker: { name: string; total: number };
  byType: { sales: number; rentals: number };
}

export function calculateCommissionStats(commissions: any[]): CommissionStats {
  const total = commissions.reduce(
    (sum, c) => sum + parseFloat(c.commissionValue || "0"),
    0
  );
  const pending = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + parseFloat(c.commissionValue || "0"), 0);
  const paid = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + parseFloat(c.commissionValue || "0"), 0);
  const average = commissions.length > 0 ? total / commissions.length : 0;

  // Top broker
  const brokerTotals: Record<string, number> = {};
  commissions.forEach((c) => {
    const brokerName = c.broker?.name || c.brokerName || "Sem corretor";
    brokerTotals[brokerName] =
      (brokerTotals[brokerName] || 0) + parseFloat(c.commissionValue || "0");
  });
  const topBrokerEntry = Object.entries(brokerTotals).sort(
    ([, a], [, b]) => b - a
  )[0];
  const topBroker = topBrokerEntry
    ? { name: topBrokerEntry[0], total: topBrokerEntry[1] }
    : { name: "N/A", total: 0 };

  // By type
  const sales = commissions
    .filter((c) => c.type === "sale")
    .reduce((sum, c) => sum + parseFloat(c.commissionValue || "0"), 0);
  const rentals = commissions
    .filter((c) => c.type === "rental")
    .reduce((sum, c) => sum + parseFloat(c.commissionValue || "0"), 0);

  return {
    total,
    pending,
    paid,
    average,
    topBroker,
    byType: { sales, rentals },
  };
}
