const moneyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

const get = (id) => document.getElementById(id);
const quoteForm = get("quoteForm");
const itemsList = get("itemsList");
const suppliesList = get("suppliesList");
const formMessage = get("formMessage");
const downloadButton = get("downloadBtn");

let nextRowId = 1;
let workItems = [];
let supplyItems = [];

function uniqueId(prefix) {
  const id = `${prefix}-${nextRowId}`;
  nextRowId += 1;
  return id;
}

function createWorkItem() {
  return {
    id: uniqueId("work"),
    description: "",
    quantity: "1",
    price: "",
  };
}

function createSupplyItem() {
  return {
    id: uniqueId("supply"),
    description: "",
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function formatMoney(value) {
  return moneyFormatter.format(safeNumber(value));
}

function lineTotal(item) {
  return safeNumber(item.quantity) * safeNumber(item.price);
}

function renderWorkItems() {
  itemsList.innerHTML = workItems.map((item, index) => `
    <article class="custom-quote-row" data-work-id="${item.id}">
      <label class="description-input-wrap">
        <span class="row-number">${String(index + 1).padStart(2, "0")}</span>
        <span class="sr-only">Item ${index + 1} description</span>
        <input
          class="description-input"
          type="text"
          data-field="description"
          value="${escapeHtml(item.description)}"
          placeholder="Add item"
          autocomplete="off"
        />
      </label>
      <label class="compact-field">
        <span>Quantity</span>
        <input
          class="quantity-input"
          type="number"
          data-field="quantity"
          min="0.01"
          step="0.01"
          inputmode="decimal"
          value="${escapeHtml(item.quantity)}"
          aria-label="Quantity for item ${index + 1}"
        />
      </label>
      <label class="compact-field price-input-wrap">
        <span>Unit price</span>
        <input
          class="price-input"
          type="number"
          data-field="price"
          min="0"
          step="0.01"
          inputmode="decimal"
          value="${escapeHtml(item.price)}"
          placeholder="0.00"
          aria-label="Unit price for item ${index + 1}"
        />
      </label>
      <output class="row-amount">${formatMoney(lineTotal(item))}</output>
      <button
        class="row-remove-button"
        type="button"
        data-action="remove-work"
        aria-label="Remove item ${index + 1}"
        ${workItems.length === 1 ? "disabled" : ""}
      >Remove</button>
    </article>
  `).join("");

  get("workCount").textContent = `${workItems.length} ${workItems.length === 1 ? "item" : "items"}`;
}

function renderSupplyItems() {
  suppliesList.innerHTML = supplyItems.map((item, index) => `
    <article class="supply-row" data-supply-id="${item.id}">
      <span class="row-number">${String(index + 1).padStart(2, "0")}</span>
      <label>
        <span class="sr-only">Supply item ${index + 1}</span>
        <textarea
          class="supply-input"
          data-field="description"
          rows="1"
          placeholder="Add supply item"
        >${escapeHtml(item.description)}</textarea>
      </label>
      <button
        class="row-remove-button"
        type="button"
        data-action="remove-supply"
        aria-label="Remove supply item ${index + 1}"
        ${supplyItems.length === 1 ? "disabled" : ""}
      >Remove</button>
    </article>
  `).join("");

  suppliesList.querySelectorAll(".supply-input").forEach(resizeTextarea);
}

function resizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(46, textarea.scrollHeight)}px`;
}

function getActiveWorkItems() {
  return workItems.filter((item) => item.description.trim());
}

function calculateTotals() {
  const activeItems = getActiveWorkItems();
  const subtotal = activeItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const gst = get("includeGst").checked ? subtotal * 0.1 : 0;
  const total = subtotal + gst;
  const depositPercent = Math.min(100, safeNumber(get("depositPercent").value));
  const deposit = total * (depositPercent / 100);

  get("completedCount").textContent = String(activeItems.length);
  get("subtotalDisplay").textContent = formatMoney(subtotal);
  get("gstDisplay").textContent = formatMoney(gst);
  get("totalDisplay").textContent = formatMoney(total);
  get("depositDisplay").textContent = formatMoney(deposit);

  return { activeItems, subtotal, gst, total, depositPercent, deposit };
}

function findWorkItem(row) {
  return workItems.find((item) => item.id === row?.dataset.workId);
}

function findSupplyItem(row) {
  return supplyItems.find((item) => item.id === row?.dataset.supplyId);
}

itemsList.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const row = target.closest("[data-work-id]");
  const item = findWorkItem(row);
  const field = target.dataset.field;
  if (!item || !field) return;

  item[field] = target.value;
  const amount = row.querySelector(".row-amount");
  if (amount) amount.textContent = formatMoney(lineTotal(item));
  calculateTotals();
});

itemsList.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="remove-work"]');
  if (!(button instanceof HTMLButtonElement) || workItems.length === 1) return;
  const row = button.closest("[data-work-id]");
  workItems = workItems.filter((item) => item.id !== row?.dataset.workId);
  renderWorkItems();
  calculateTotals();
});

suppliesList.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) return;
  const row = target.closest("[data-supply-id]");
  const item = findSupplyItem(row);
  if (!item) return;
  item.description = target.value;
  resizeTextarea(target);
});

suppliesList.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="remove-supply"]');
  if (!(button instanceof HTMLButtonElement) || supplyItems.length === 1) return;
  const row = button.closest("[data-supply-id]");
  supplyItems = supplyItems.filter((item) => item.id !== row?.dataset.supplyId);
  renderSupplyItems();
});

get("addItemBtn").addEventListener("click", () => {
  const item = createWorkItem();
  workItems.push(item);
  renderWorkItems();
  requestAnimationFrame(() => {
    itemsList.querySelector(`[data-work-id="${item.id}"] .description-input`)?.focus();
  });
});

get("addSupplyBtn").addEventListener("click", () => {
  const item = createSupplyItem();
  supplyItems.push(item);
  renderSupplyItems();
  requestAnimationFrame(() => {
    suppliesList.querySelector(`[data-supply-id="${item.id}"] .supply-input`)?.focus();
  });
});

get("includeGst").addEventListener("change", calculateTotals);
get("depositPercent").addEventListener("input", calculateTotals);

function showMessage(message, type = "error") {
  formMessage.hidden = false;
  formMessage.className = `form-message ${type === "success" ? "success" : ""}`;
  formMessage.textContent = message;
  formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideMessage() {
  formMessage.hidden = true;
  formMessage.textContent = "";
}

function validateQuote() {
  hideMessage();
  document.querySelectorAll(".invalid").forEach((element) => element.classList.remove("invalid"));

  const requiredFields = [
    ["quoteNumber", "quotation number"],
    ["quoteDate", "quotation date"],
    ["customerName", "customer name"],
  ];
  const missingFields = requiredFields.filter(([id]) => !get(id).value.trim());
  missingFields.forEach(([id]) => get(id).classList.add("invalid"));

  if (missingFields.length) {
    showMessage(`Please enter the ${missingFields.map(([, label]) => label).join(", ")}.`);
    get(missingFields[0][0]).focus();
    return false;
  }

  const touchedItems = workItems.filter((item) =>
    item.description.trim() || item.price !== "" || item.quantity !== "1"
  );

  if (!touchedItems.length) {
    const firstInput = itemsList.querySelector(".description-input");
    firstInput?.classList.add("invalid");
    firstInput?.focus();
    showMessage("Add at least one description item before creating the PDF.");
    return false;
  }

  let firstInvalidInput = null;
  let invalidDescription = false;
  let invalidPriceOrQuantity = false;

  touchedItems.forEach((item) => {
    const row = itemsList.querySelector(`[data-work-id="${item.id}"]`);
    const descriptionInput = row?.querySelector(".description-input");
    const quantityInput = row?.querySelector(".quantity-input");
    const priceInput = row?.querySelector(".price-input");

    if (!item.description.trim()) {
      descriptionInput?.classList.add("invalid");
      firstInvalidInput ||= descriptionInput;
      invalidDescription = true;
    }
    if (safeNumber(item.quantity) <= 0) {
      quantityInput?.classList.add("invalid");
      firstInvalidInput ||= quantityInput;
      invalidPriceOrQuantity = true;
    }
    const parsedPrice = Number.parseFloat(item.price);
    if (item.price === "" || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      priceInput?.classList.add("invalid");
      firstInvalidInput ||= priceInput;
      invalidPriceOrQuantity = true;
    }
  });

  if (invalidDescription || invalidPriceOrQuantity) {
    const message = invalidDescription
      ? "Enter a description for every item you started."
      : "Every description item needs a quantity greater than zero and a unit price.";
    showMessage(message);
    firstInvalidInput?.focus();
    return false;
  }

  return true;
}

function formatDateForQuote(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

async function getReadyLogo() {
  const logo = document.querySelector(".site-brand-logo");
  if (!(logo instanceof HTMLImageElement)) return null;
  if (!logo.complete) {
    await Promise.race([
      new Promise((resolve) => logo.addEventListener("load", resolve, { once: true })),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
  }
  return logo.naturalWidth > 0 ? logo : null;
}

function addQuoteHeader(doc, logo) {
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 25, 11, 68, 28, undefined, "FAST");
    } catch (error) {
      console.warn("Logo could not be added to PDF", error);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(27);
    doc.setTextColor(176, 46, 52);
    doc.text("ATLAS", 25, 29);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(22);
  doc.text("Quotation", 148, 25);
  doc.setLineWidth(0.55);
  doc.line(147, 27, 190, 27);

  doc.setTextColor(100, 100, 100);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(13);
  doc.text("Atlas Tiling", 148, 34);
  doc.setFont("times", "italic");
  doc.setFontSize(8.2);
  [
    "Licence: CPC 31311",
    "Insurance: 2674838",
    "ABN: 52 660 525 413",
    "Mill Point Road,",
    "South Perth WA 6152",
  ].forEach((line, index) => doc.text(line, 148, 39 + index * 4));
}

function addContinuationHeader(doc, title) {
  doc.setDrawColor(170, 170, 170);
  doc.setLineWidth(0.35);
  doc.line(25, 15, 190, 15);
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(65, 65, 65);
  doc.text(title, 25, 12);
  return 22;
}

function ensureSpace(doc, y, height, continuationTitle) {
  if (y + height <= 278) return y;
  doc.addPage();
  return addContinuationHeader(doc, continuationTitle);
}

function addTerms(doc, startY) {
  const standardTerms = [
    "If the quote is accepted, then a 5% deposit will be required before commencement of work.",
    "Removal of waste is either by the Client or as agreed by quotation only with the Company.",
    "Door-height adjustment after tiling completion is not included unless the Client asks for it to be included.",
    "Any changes or additions will be charged accordingly.",
    "Payment is required progressively based on the value of work completed at each stage, or a lesser amount of work completed.",
    "Full payment for the shower screen must be received before production begins, as manufacturing can only commence once it has been paid in full.",
    "Final payment must be paid upon completion, except for a shower screen, which must be paid in full before production commences.",
    "All materials remain the property of Atlas Tiling until the Final Invoice is paid.",
    "Prices in this quotation are valid for 30 days from the quotation date.",
    "If a client cancels the project before the job commences, the deposit is non-refundable. It secures the booking and covers preliminary expenses such as materials, scheduling contractors and reserving resources.",
  ];

  const liabilityTerms = [
    "1.1 The Client acknowledges that plumbing services, demolition, electrical or carpentry work may require access behind walls, floors or ceilings.",
    "1.2 While the Contractor will take reasonable care, work on plasterboard, single-skin brickwork or tiled walls can cause chipping, cracking or breakage on the opposite side of the wall.",
    "1.3 The Contractor is not responsible for structural or cosmetic damage to finished surfaces, including painting, tiling or wallpapering, when accessing plumbing services.",
    "1.4 Repair or restoration of damaged areas, including the opposite side of the wall, is not included in the original quote and is the Client's responsibility and expense.",
    "1.5 The Client indemnifies the Contractor against claims and costs arising from such damage unless caused by the Contractor's proven negligence or wilful misconduct.",
  ];

  let y = ensureSpace(doc, startY, 20, "TERMS AND CONDITIONS");
  doc.setDrawColor(85, 85, 85);
  doc.setLineWidth(0.45);
  doc.line(25, y, 190, y);
  y += 6;
  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(28, 28, 28);
  doc.text("TERMS AND CONDITIONS:", 25, y);
  y += 5;

  doc.setFont("times", "normal");
  doc.setFontSize(8.1);
  standardTerms.forEach((term) => {
    const lines = doc.splitTextToSize(term, 153);
    y = ensureSpace(doc, y, lines.length * 3.7 + 2, "TERMS AND CONDITIONS");
    doc.setFont("times", "normal");
    doc.setFontSize(8.1);
    doc.setTextColor(35, 35, 35);
    doc.setFillColor(0, 0, 0);
    doc.circle(31, y - 1.1, 0.55, "F");
    doc.text(lines, 37, y);
    y += lines.length * 3.7 + 1.2;
  });

  y = ensureSpace(doc, y + 2, 17, "TERMS AND CONDITIONS");
  doc.setFont("times", "bold");
  doc.setFontSize(8.4);
  doc.text("1. Access and Wall Damage Liability", 25, y);
  y += 5;

  liabilityTerms.forEach((term) => {
    const lines = doc.splitTextToSize(term, 159);
    y = ensureSpace(doc, y, lines.length * 3.7 + 2, "TERMS AND CONDITIONS");
    doc.setFont("times", "normal");
    doc.setFontSize(8.1);
    doc.setTextColor(35, 35, 35);
    doc.text(lines, 31, y);
    y += lines.length * 3.7 + 1.2;
  });

  return y;
}

function addContactBlock(doc, startY) {
  let y = ensureSpace(doc, startY + 5, 40, "PAYMENT AND CONTACT");
  doc.setDrawColor(85, 85, 85);
  doc.setLineWidth(0.45);
  doc.line(25, y, 190, y);
  y += 9;

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(35, 35, 35);
  doc.text("Atlas Tiling and Bathroom Renovations", 25, y);
  doc.text("Sam", 125, y);
  doc.text("Bank: NAB", 25, y + 5);
  doc.text("Mob: 0450 418 618", 125, y + 5);
  doc.text("BSB: 086-479", 25, y + 10);
  doc.text("Email: atlastiling@live.com.au", 125, y + 10);
  doc.text("ACC: 56 313 3229", 25, y + 15);
  doc.text("Web: atlasbathroomrenovations.com.au", 125, y + 15);

  doc.setFont("times", "bolditalic");
  doc.setFontSize(12);
  doc.setTextColor(183, 48, 52);
  doc.text("PERFECTION IS OUR STANDARD", 105, y + 29, { align: "center" });
}

function addPageFooters(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(205, 205, 205);
    doc.setLineWidth(0.25);
    doc.line(25, 286, 190, 286);
    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.setTextColor(115, 115, 115);
    doc.text("Atlas Tiling and Bathroom Renovations", 25, 291);
    doc.text(`Page ${pageNumber} of ${pageCount}`, 190, 291, { align: "right" });
  }
}

async function downloadPdf() {
  const JsPdf = window.jspdf?.jsPDF;
  if (typeof JsPdf !== "function") throw new Error("The PDF generator did not load.");

  const totals = calculateTotals();
  const selectedSupplies = supplyItems
    .map((item) => item.description.trim())
    .filter(Boolean);
  const quoteNumber = get("quoteNumber").value.trim();
  const customerName = get("customerName").value.trim();
  const safeQuoteNumber = quoteNumber.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const safeCustomer = customerName.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const filename = `Atlas-Custom-Quotation-${safeQuoteNumber}-${safeCustomer}.pdf`;
  const doc = new JsPdf({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getReadyLogo();

  addQuoteHeader(doc, logo);

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text("Date:", 25, 56);
  doc.setFont("times", "bold");
  doc.text(formatDateForQuote(get("quoteDate").value), 36, 56);
  doc.setFont("times", "normal");
  doc.text("Quotation No:", 25, 61);
  doc.setFont("times", "bold");
  doc.text(quoteNumber, 49, 61);

  doc.setFont("times", "bold");
  doc.text("To:", 25, 76);
  doc.text(customerName, 36, 76);
  doc.text("Mob:", 25, 87);
  doc.setFont("times", "normal");
  doc.text(get("customerPhone").value.trim(), 36, 87);
  doc.setFont("times", "bold");
  doc.text("Email:", 25, 93);
  doc.setFont("times", "normal");
  doc.text(get("customerEmail").value.trim(), 40, 93);
  doc.setFont("times", "bold");
  doc.text("Add:", 25, 99);
  doc.setFont("times", "normal");
  const addressLines = doc.splitTextToSize(get("customerAddress").value.trim(), 148);
  doc.text(addressLines, 36, 99);

  if (typeof doc.autoTable !== "function") throw new Error("The PDF table generator did not load.");

  const tableBody = totals.activeItems.map((item, index) => [
    String(index + 1),
    `${item.description}\nQuantity: ${item.quantity}    Unit price: ${formatMoney(item.price)}`,
    formatMoney(lineTotal(item)),
  ]);

  if (selectedSupplies.length) {
    tableBody.push([
      "",
      { content: `Supply: ${selectedSupplies.join("\n")}`, styles: { fontStyle: "bold" } },
      "",
    ]);
  }

  const additionalNotes = get("additionalNotes").value.trim();
  if (additionalNotes) {
    tableBody.push([
      "",
      { content: `Additional notes: ${additionalNotes}`, styles: { fontStyle: "italic" } },
      "",
    ]);
  }

  const tableStartY = 105 + Math.max(0, addressLines.length - 1) * 4;
  doc.autoTable({
    startY: tableStartY,
    margin: { left: 25, right: 20, top: 18, bottom: 16 },
    head: [["Number", "Description", "Price"]],
    body: tableBody,
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 8.2,
      cellPadding: 2.5,
      lineColor: [105, 105, 105],
      lineWidth: 0.25,
      textColor: [32, 32, 32],
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [190, 207, 229],
      textColor: [38, 45, 53],
      fontStyle: "bold",
      fontSize: 8.6,
      halign: "center",
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 18, halign: "center" },
      1: { cellWidth: 121 },
      2: { cellWidth: 26, halign: "right" },
    },
    showHead: "everyPage",
  });

  let y = (doc.lastAutoTable?.finalY || tableStartY) + 5;
  y = ensureSpace(doc, y, 39, "QUOTE SUMMARY");

  const priceRows = [
    ["SUBTOTAL", formatMoney(totals.subtotal)],
    ...(get("includeGst").checked ? [["GST", formatMoney(totals.gst)]] : []),
    ["TOTAL", formatMoney(totals.total)],
    [`Deposit Required ${totals.depositPercent}%`, formatMoney(totals.deposit)],
  ];

  priceRows.forEach((row, index) => {
    const rowY = y + index * 8;
    doc.setFont("times", "bold");
    doc.setFontSize(index === priceRows.length - 1 ? 9.3 : 9);
    doc.setTextColor(35, 35, 35);
    doc.text(row[0], 153, rowY + 5.5, { align: "right" });
    doc.setFillColor(90, 204, 237);
    doc.setDrawColor(105, 105, 105);
    doc.rect(164, rowY, 31, 8, "FD");
    doc.text(row[1], 192, rowY + 5.5, { align: "right" });
  });

  y += priceRows.length * 8 + 7;
  y = addTerms(doc, y);
  addContactBlock(doc, y);
  addPageFooters(doc);
  doc.save(filename);
}

quoteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateQuote()) return;

  downloadButton.disabled = true;
  downloadButton.querySelector("span:last-child").textContent = "Creating PDF…";

  try {
    await downloadPdf();
    showMessage("Your custom quotation PDF has been created.", "success");
  } catch (error) {
    console.error(error);
    showMessage("The PDF could not be created. Please try again.");
  } finally {
    downloadButton.disabled = false;
    downloadButton.querySelector("span:last-child").textContent = "Download quotation PDF";
  }
});

function setToday() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  get("quoteDate").value = localDate.toISOString().slice(0, 10);
}

function resetQuote() {
  quoteForm.reset();
  setToday();
  get("includeGst").checked = true;
  get("depositPercent").value = "5";
  nextRowId = 1;
  workItems = [createWorkItem()];
  supplyItems = [createSupplyItem()];
  hideMessage();
  renderWorkItems();
  renderSupplyItems();
  calculateTotals();
}

get("resetBtn").addEventListener("click", () => {
  if (!window.confirm("Clear all customer details, items, supplies and prices?")) return;
  resetQuote();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const siteNavButton = document.querySelector("[data-site-menu-button]");
const siteMobileNavigation = get("site-mobile-navigation");

function setSiteMenu(open) {
  if (!siteNavButton || !siteMobileNavigation) return;
  siteMobileNavigation.classList.toggle("is-open", open);
  siteNavButton.setAttribute("aria-expanded", String(open));
  siteNavButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
}

if (siteNavButton && siteMobileNavigation) {
  siteNavButton.addEventListener("click", () => {
    setSiteMenu(siteNavButton.getAttribute("aria-expanded") !== "true");
  });
  siteMobileNavigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setSiteMenu(false));
  });
}

document.querySelectorAll('.site-header a[aria-disabled="true"]').forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});

resetQuote();
