const STORAGE_KEY = "fridgeflow-products";
const CHART_DAYS = 14;
const NAME_KEY = "fridgeflow-name";
const ABOUT_KEY = "fridgeflow-about";
const RECIPE_USES_KEY = "fridgeflow-recipe-uses";
const BANNED = ["хуй", "пизд", "еба", "ёба", "ебл", "бля", "сука", "муда", "пидор", "пидар", "гандон", "fuck", "shit", "bitch"];
const UNITS = { g: "г", kg: "кг", ml: "мл", l: "л", pcs: "шт" };

const currencySelect = document.querySelector("#currency");
const dayChart = document.querySelector("#day-chart");
const savedList = document.querySelector("#saved-list");
const savedAmount = document.querySelector("#saved-amount");
const scaleFill = document.querySelector("#scale-fill");
const scaleTrack = document.querySelector("#scale-track");
const scaleNote = document.querySelector("#scale-note");

FridgePrices.CURRENCIES.forEach((currency) => {
  const option = document.createElement("option");
  option.value = currency.code;
  option.textContent = `${currency.label} (${currency.code})`;
  currencySelect.append(option);
});
currencySelect.value = FridgePrices.currentCurrency();
currencySelect.addEventListener("change", () => {
  FridgePrices.saveCurrency(currencySelect.value);
  render();
});

render();

function render() {
  const products = loadProducts();
  const currency = FridgePrices.currentCurrency();
  const used = products.filter((product) => product.used);
  const expired = products.filter((product) => !product.used && daysUntil(product.expiry) < 0);

  document.querySelector("#used-total").textContent = String(used.length);
  document.querySelector("#expired-total").textContent = String(expired.length);
  renderChart(used, expired);
  renderSavings(used, expired, currency);
}

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  const stored = JSON.parse(saved);
  let changed = false;
  const products = stored.map((product) => {
    if (product.used && !product.usedOn) {
      changed = true;
      return { ...product, usedOn: FridgePrices.todayISO() };
    }
    return product;
  });
  if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  return products;
}

function renderChart(used, expired) {
  const days = lastDays(CHART_DAYS);
  const usedCounts = days.map((day) => used.filter((product) => product.usedOn === day).length);
  const expiredCounts = days.map((day) =>
    expired.filter((product) => product.expiry === day).length,
  );
  const max = Math.max(1, ...usedCounts, ...expiredCounts);
  dayChart.replaceChildren();

  days.forEach((day, index) => {
    const column = document.createElement("div");
    column.className = "day";

    const bars = document.createElement("div");
    bars.className = "day-bars";
    bars.append(bar("day-used", usedCounts[index], max), bar("day-expired", expiredCounts[index], max));

    const label = document.createElement("span");
    label.className = "day-label";
    label.textContent = day.slice(8, 10) + "." + day.slice(5, 7);

    column.append(bars, label);
    dayChart.append(column);
  });
}

function bar(className, value, max) {
  const column = document.createElement("span");
  column.className = "day-col";

  const share = max ? value / max : 0;

  const spacer = document.createElement("span");
  spacer.className = "day-spacer";
  spacer.style.setProperty("--grow", String(1 - share));

  const count = document.createElement("span");
  count.className = "day-count";
  count.textContent = String(value);

  const element = document.createElement("span");
  element.className = className;
  element.style.setProperty("--grow", String(share));

  column.append(spacer, count, element);
  return column;
}

function renderSavings(used, expired, currency) {
  const savedRows = priced(used, currency);
  const lostRows = priced(expired, currency);
  const saved = sum(savedRows);
  const lost = sum(lostRows);
  const scaleMax = saved + lost;

  savedAmount.textContent = FridgePrices.formatMoney(saved, currency);
  const percent = scaleMax ? Math.round((saved / scaleMax) * 100) : 0;
  scaleFill.style.width = `${percent}%`;
  scaleTrack.setAttribute("aria-valuemax", String(Math.round(scaleMax)));
  scaleTrack.setAttribute("aria-valuenow", String(Math.round(saved)));
  scaleNote.textContent = scaleMax
    ? `${percent}% от стоимости использованных и просроченных. Просрочено на ${FridgePrices.formatMoney(lost, currency)}.`
    : "Отметьте продукты как использованные, чтобы увидеть сумму.";

  savedList.replaceChildren();
  if (!savedRows.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Пока нет использованных продуктов с известной ценой.";
    savedList.append(empty);
    return;
  }

  savedRows.forEach((row) => {
    const item = document.createElement("article");
    item.className = "saved-row";

    const title = document.createElement("h3");
    title.textContent = row.product.name;

    const detail = document.createElement("p");
    detail.textContent = `${row.product.amount} ${UNITS[row.product.unit] || ""}, ${row.source}`.trim();

    const money = document.createElement("strong");
    money.textContent = FridgePrices.formatMoney(row.amount, currency);

    item.append(title, detail, money);
    savedList.append(item);
  });
}

function priced(products, currency) {
  return products
    .map((product) => {
      const money = FridgePrices.moneyIn(product, currency);
      return money ? { product, ...money } : null;
    })
    .filter(Boolean);
}

function sum(rows) {
  return rows.reduce((total, row) => total + row.amount, 0);
}

function lastDays(count) {
  return Array.from({ length: count }, (_, index) => shiftISO(FridgePrices.todayISO(), index - count + 1));
}

function shiftISO(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysUntil(isoDate) {
  const today = new Date(`${FridgePrices.todayISO()}T00:00:00`);
  const expiry = new Date(`${isoDate}T00:00:00`);
  return Math.round((expiry - today) / 86400000);
}

const accountOpen = document.querySelector("#account-open");
const accountForm = document.querySelector("#account-form");
const accountAbout = document.querySelector("#account-about");
const accountError = document.querySelector("#account-error");

renderAccount();
renderUsedRecipes();

accountOpen.addEventListener("click", () => {
  accountForm.hidden = false;
  accountForm.elements.name.value = localStorage.getItem(NAME_KEY) || "Алия";
  accountForm.elements.about.value = localStorage.getItem(ABOUT_KEY) || "";
  accountError.hidden = true;
});

document.querySelector("#account-cancel").addEventListener("click", () => {
  accountForm.hidden = true;
});

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = accountForm.elements.name.value.trim();
  const about = accountForm.elements.about.value.trim().replace(/\s+/g, " ");
  const words = about ? about.split(" ") : [];
  if (words.length > 15) {
    showAccountError("Описание должно быть не длиннее 15 слов.");
    return;
  }
  if (isBanned(about) || isBanned(name)) {
    showAccountError("В тексте есть недопустимые слова. Перепишите его.");
    return;
  }
  localStorage.setItem(NAME_KEY, name);
  localStorage.setItem(ABOUT_KEY, about);
  accountForm.hidden = true;
  renderAccount();
});

function renderAccount() {
  const about = localStorage.getItem(ABOUT_KEY) || "";
  accountAbout.hidden = !about;
  accountAbout.textContent = about;
}

function showAccountError(message) {
  accountError.hidden = false;
  accountError.textContent = message;
}

function isBanned(text) {
  const value = text.toLocaleLowerCase("ru").replaceAll("ё", "е");
  return BANNED.some((word) => value.includes(word.replaceAll("ё", "е")));
}

function timesWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "раз" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "раза" : "раз";
  return `${count} ${word}`;
}

function renderUsedRecipes() {
  const node = document.querySelector("#used-recipes");
  let uses = {};
  try {
    uses = JSON.parse(localStorage.getItem(RECIPE_USES_KEY) || "{}");
  } catch {
    uses = {};
  }
  const frequent = window.FridgeRecipes.book.filter((recipe) => Number(uses[recipe.id]) >= 3);
  node.replaceChildren();
  if (!frequent.length) {
    const empty = document.createElement("p");
    empty.className = "field-hint";
    empty.textContent = "Здесь появятся рецепты, которые вы открыли кнопкой «Использовать этот» три раза или больше.";
    node.append(empty);
    return;
  }
  frequent
    .sort((a, b) => uses[b.id] - uses[a.id] || a.title.localeCompare(b.title, "ru"))
    .forEach((recipe) => {
      const row = document.createElement("a");
      row.className = "saved-row";
      row.href = `recipe.html?id=${encodeURIComponent(recipe.id)}`;
      const title = document.createElement("h3");
      title.textContent = recipe.title;
      const detail = document.createElement("p");
      detail.textContent = timesWord(Number(uses[recipe.id]));
      row.append(title, detail);
      node.append(row);
    });
}
