import Papa from "papaparse";

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

function asCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function buildFilename(baseName: string, extension: string): string {
  const stamp = new Date().toISOString().split("T")[0];
  return `${baseName}-${stamp}.${extension}`;
}

async function captureElementImage(element: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}

function normalizeCloneForExport(root: HTMLElement): void {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

  nodes.forEach((node) => {
    const styles = window.getComputedStyle(node);
    const scrollsVertically = node.scrollHeight > node.clientHeight + 1;
    const scrollsHorizontally = node.scrollWidth > node.clientWidth + 1;

    if (scrollsVertically || styles.maxHeight !== "none") {
      node.style.maxHeight = "none";
      node.style.height = "auto";
      node.style.overflowY = "visible";
    }

    if (scrollsHorizontally) {
      node.style.maxWidth = "none";
      node.style.width = "auto";
      node.style.overflowX = "visible";
    }

    if (styles.position === "sticky" || styles.position === "fixed") {
      node.style.position = "static";
      node.style.top = "auto";
      node.style.left = "auto";
      node.style.right = "auto";
      node.style.bottom = "auto";
      node.style.zIndex = "auto";
    }
  });
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function captureElementFullContent(element: HTMLElement, title?: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const bounds = element.getBoundingClientRect();
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.background = "#ffffff";
  host.style.padding = "16px";
  // Preserve element width for better scaling, capped at reasonable size
  const elementWidth = Math.ceil(bounds.width);
  const targetWidth = Math.min(elementWidth, 1200); // Cap at reasonable width for readability
  host.style.width = `${Math.max(320, targetWidth)}px`;
  host.style.boxSizing = "border-box";
  host.style.zIndex = "-1";

  if (title) {
    const titleEl = document.createElement("h2");
    titleEl.style.margin = "0 0 12px 0";
    titleEl.style.fontSize = "16px";
    titleEl.style.fontWeight = "bold";
    titleEl.style.color = "#000000";
    titleEl.textContent = title;
    host.appendChild(titleEl);
  }

  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.style.margin = "0";
  normalizeCloneForExport(clonedElement);
  host.appendChild(clonedElement);
  document.body.appendChild(host);

  try {
    await waitForPaint();
    return await captureElementImage(host);
  } finally {
    document.body.removeChild(host);
  }
}

function getElementOrThrow(elementId: string): HTMLElement {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Could not find export target: ${elementId}`);
  }
  return element;
}

export function exportRowsToCsv(rows: ExportRow[], baseName: string): void {
  if (rows.length === 0) return;

  const csv = Papa.unparse(
    rows.map((row) => {
      const normalized: Record<string, string> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[key] = asCell(value);
      });
      return normalized;
    })
  );

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildFilename(baseName, "csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportRowsToExcel(rows: ExportRow[], baseName: string): Promise<void> {
  if (rows.length === 0) return;

  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, buildFilename(baseName, "xlsx"));
}

export async function exportElementToPng(elementId: string, baseName: string, title?: string): Promise<void> {
  const element = getElementOrThrow(elementId);
  const image = await captureElementFullContent(element, title);
  const link = document.createElement("a");
  link.href = image.dataUrl;
  link.download = buildFilename(baseName, "png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportElementToPdf(elementId: string, title: string, baseName: string): Promise<void> {
  const element = getElementOrThrow(elementId);
  const image = await captureElementFullContent(element);
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const titleHeight = 8;

  pdf.setFontSize(14);
  pdf.text(title, margin, margin);

  // Calculate available space
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2 - titleHeight;

  // Determine if we need multiple pages based on aspect ratio
  const imageRatio = image.width / image.height;
  let renderWidth = availableWidth;
  let renderHeight = renderWidth / imageRatio;

  // If image is too tall, use multiple pages
  const pagesNeeded = Math.ceil(renderHeight / availableHeight);

  if (pagesNeeded > 1) {
    renderHeight = availableHeight;
    renderWidth = renderHeight * imageRatio;
    for (let page = 0; page < pagesNeeded; page++) {
      if (page > 0) {
        pdf.addPage();
        pdf.setFontSize(12);
        pdf.text(`${title} (continued)`, margin, margin);
      }
      const renderY = margin + (page === 0 ? titleHeight : 0);
      pdf.addImage(image.dataUrl, "PNG", margin, renderY, renderWidth, renderHeight);
    }
  } else {
    if (renderHeight > availableHeight) {
      renderHeight = availableHeight;
      renderWidth = renderHeight * imageRatio;
    }
    pdf.addImage(image.dataUrl, "PNG", margin, margin + titleHeight, renderWidth, renderHeight);
  }

  pdf.save(buildFilename(baseName, "pdf"));
}

export async function exportRowsToPdf(rows: ExportRow[], title: string, baseName: string): Promise<void> {
  if (rows.length === 0) return;

  const { jsPDF } = await import("jspdf");
  const keys = Object.keys(rows[0]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = Math.max(30, usableWidth / Math.max(keys.length, 1)); // wider columns for date ranges

  let y = 16;
  pdf.setFontSize(14);
  pdf.text(title, margin, y);
  y += 8;

  const drawHeader = () => {
    pdf.setFontSize(10);
    keys.forEach((key, idx) => {
      const x = margin + idx * colWidth;
      pdf.text(key.slice(0, 24), x, y); // allow longer date range labels
    });
    y += 5;
    pdf.line(margin, y - 3, pageWidth - margin, y - 3);
  };

  drawHeader();

  rows.forEach((row) => {
    if (y > pageHeight - 10) {
      pdf.addPage();
      y = 16;
      drawHeader();
    }

    pdf.setFontSize(9);
    keys.forEach((key, idx) => {
      const x = margin + idx * colWidth;
      const value = asCell(row[key]);
      pdf.text(value.slice(0, 24), x, y);
    });
    y += 4.5;
  });

  pdf.save(buildFilename(baseName, "pdf"));
}

export async function exportRowsAndElementToPdf(
  rows: ExportRow[],
  elementId: string,
  title: string,
  baseName: string,
  statusFilter?: string[]
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = Math.max(30, usableWidth / Math.max(Object.keys(rows[0] || {}).length, 1));

  // Filter rows by status if provided
  let filteredRows = rows;
  if (statusFilter && statusFilter.length > 0) {
    filteredRows = rows.filter(row => statusFilter.includes(String(row.Status).toLowerCase()));
  }

  // Paginate: 2 clients per page
  const clientsPerPage = 2;
  for (let i = 0; i < filteredRows.length; i += clientsPerPage) {
    pdf.addPage();
    let y = 16;
    pdf.setFontSize(14);
    pdf.text(`${title} - Data`, margin, y);
    y += 8;

    // Draw header
    pdf.setFontSize(10);
    const keys = Object.keys(filteredRows[0]);
    keys.forEach((key, idx) => {
      const x = margin + idx * colWidth;
      pdf.text(key.slice(0, 24), x, y);
    });
    y += 5;
    pdf.line(margin, y - 3, pageWidth - margin, y - 3);

    // Draw up to 2 clients
    for (let j = 0; j < clientsPerPage && i + j < filteredRows.length; j++) {
      const row = filteredRows[i + j];
      pdf.setFontSize(9);
      keys.forEach((key, idx) => {
        const x = margin + idx * colWidth;
        const value = asCell(row[key]);
        pdf.text(value.slice(0, 24), x, y);
      });
      y += 4.5;
    }

    // Render graph for these clients
    const element = getElementOrThrow(elementId);
    const image = await captureElementFullContent(element);
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2 - 6;
    const imageRatio = image.width / image.height;
    let renderWidth = maxWidth;
    let renderHeight = renderWidth / imageRatio;
    if (renderHeight > maxHeight) {
      renderHeight = maxHeight;
      renderWidth = renderHeight * imageRatio;
    }
    pdf.setFontSize(12);
    pdf.text(`${title} - Graph`, margin, y + 8);
    pdf.addImage(image.dataUrl, "PNG", margin, y + 16, maxWidth, maxHeight);
  }

  pdf.save(buildFilename(baseName, "pdf"));
}

export async function exportAtRiskAccountsPdf(elementId: string, baseName: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const container = getElementOrThrow(elementId);
  const accountCards = Array.from(container.querySelectorAll("[data-account-card]")) as HTMLElement[];
  
  if (accountCards.length === 0) return;

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const cardsPerPage = 2; // 2-3 cards per page for reasonable sizing
  
  let currentPageCardCount = 0;
  let isFirstPage = true;

  for (let i = 0; i < accountCards.length; i++) {
    const card = accountCards[i];
    
    // Add new page if needed
    if (currentPageCardCount >= cardsPerPage) {
      pdf.addPage();
      currentPageCardCount = 0;
    }

    // Capture card image
    const image = await captureElementFullContent(card);
    
    // Calculate sizing
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = (pageHeight - margin * 2) / cardsPerPage - 8; // Space for 2-3 cards
    const imageRatio = image.width / image.height;
    
    let renderWidth = maxWidth;
    let renderHeight = renderWidth / imageRatio;
    
    if (renderHeight > maxHeight) {
      renderHeight = maxHeight;
      renderWidth = renderHeight * imageRatio;
    }

    // Calculate Y position for current card on page
    const cardYOffset = currentPageCardCount * (maxHeight + 8) + margin;
    const cardXOffset = (pageWidth - renderWidth) / 2;

    // Add title if first page
    if (isFirstPage && currentPageCardCount === 0) {
      pdf.setFontSize(12);
      pdf.text("Accounts Needing Attention", margin, margin);
      isFirstPage = false;
    }

    // Add card image
    pdf.addImage(image.dataUrl, "PNG", cardXOffset, cardYOffset, renderWidth, renderHeight);
    currentPageCardCount++;
  }

  pdf.save(buildFilename(baseName, "png-to-pdf"));
}

export async function exportAtRiskAccountsPng(elementId: string, baseName: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const container = getElementOrThrow(elementId);
  const accountCards = Array.from(container.querySelectorAll("[data-account-card]")) as HTMLElement[];
  
  if (accountCards.length === 0) return;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const cardsPerPage = 2;

  let currentPageCardCount = 0;
  let isFirstPage = true;

  for (let i = 0; i < accountCards.length; i++) {
    const card = accountCards[i];

    if (currentPageCardCount >= cardsPerPage) {
      pdf.addPage();
      currentPageCardCount = 0;
    }

    const image = await captureElementFullContent(card);
    
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = (pageHeight - margin * 2) / cardsPerPage - 8;
    const imageRatio = image.width / image.height;
    
    let renderWidth = maxWidth;
    let renderHeight = renderWidth / imageRatio;
    
    if (renderHeight > maxHeight) {
      renderHeight = maxHeight;
      renderWidth = renderHeight * imageRatio;
    }

    const cardYOffset = currentPageCardCount * (maxHeight + 8) + margin;
    const cardXOffset = (pageWidth - renderWidth) / 2;

    if (isFirstPage && currentPageCardCount === 0) {
      pdf.setFontSize(12);
      pdf.text("Accounts Needing Attention", margin, margin);
      isFirstPage = false;
    }

    pdf.addImage(image.dataUrl, "PNG", cardXOffset, cardYOffset, renderWidth, renderHeight);
    currentPageCardCount++;
  }

  pdf.save(buildFilename(baseName, "png"));
}
