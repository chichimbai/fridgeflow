const STORAGE_KEY = "fridgeflow-products";
const RECOMMEND_KEY = "fridgeflow-recommendations";
const NAME_KEY = "fridgeflow-name";
const EXPIRED_MAX_DAYS = 2;
const SOON_MAX_DAYS = 5;
const UNITS = {
  g: "г",
  kg: "кг",
  ml: "мл",
  l: "л",
  pcs: "шт",
};

const form = document.querySelector("#product-form");
const formTitle = document.querySelector("#form-title");
const cancelEdit = document.querySelector("#cancel-edit");
const listPanel = document.querySelector("#product-list");
const list = document.querySelector("#product-list-inner");
const toggleList = document.querySelector("#toggle-list");
const recommend = document.querySelector("#recommend");
const recommendToggle = document.querySelector("#recommend-toggle");
const recommendList = document.querySelector("#recommend-list");
const recommendSave = document.querySelector("#recommend-save");
const statusText = document.querySelector("#fridge-status");
const donut = document.querySelector("#usage-donut");
const usagePercent = document.querySelector("#usage-percent");
const usageNote = document.querySelector("#usage-note");
const expiredDonut = document.querySelector("#expired-donut");
const expiredPercent = document.querySelector("#expired-percent");
const expiredNote = document.querySelector("#expired-note");
const bars = document.querySelector("#usage-bars");
const nameNode = document.querySelector("#user-name");
const nameForm = document.querySelector("#name-form");
const renameButton = document.querySelector("#rename");

let products = loadProducts();
let editingId = null;

nameNode.textContent = localStorage.getItem(NAME_KEY) || "Алия";
document.querySelector("#rule-total").textContent = "Любой продукт из списка.";
document.querySelector("#rule-soon").textContent =
  "Не использован, до конца срока от 3 до 5 дней.";
document.querySelector("#rule-used").textContent = "Отмечен кнопкой «Использовано».";
document.querySelector("#rule-almost").textContent =
  "Не использован, до конца срока осталось от 0 до 2 дней.";
document.querySelector("#rule-expired").textContent =
  "Не использован, срок годности уже прошёл.";

toggleList.addEventListener("click", () => {
  const open = listPanel.classList.toggle("is-open");
  toggleList.setAttribute("aria-expanded", String(open));
  toggleList.textContent = open ? "Свернуть список" : "Развернуть список";
});

recommendToggle.addEventListener("click", () => {
  const open = recommend.classList.toggle("is-open");
  recommendToggle.setAttribute("aria-expanded", String(open));
});

recommendList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-recommend]");
  if (!button) return;
  const suggestion = suggestions().find((item) => productKey(item.name) === button.dataset.recommend);
  if (!suggestion) return;
  form.elements.name.value = suggestion.name;
  form.elements.amount.value = suggestion.amount ? String(suggestion.amount) : "";
  if (suggestion.unit) form.elements.unit.value = suggestion.unit;
  form.elements.price.value = suggestion.price == null ? "" : priceForForm(suggestion);
  form.elements.expiry.focus();
});

recommendSave.addEventListener("click", () => {
  const name = form.elements.name.value.trim();
  if (!name) {
    form.elements.name.focus();
    return;
  }
  addRecommendation({
    name,
    amount: Number(form.elements.amount.value) || null,
    unit: form.elements.unit.value,
    price: readPrice(form.elements.price.value),
    priceCurrency: readPrice(form.elements.price.value) == null ? null : FridgePrices.currentCurrency(),
  });
});

renameButton.addEventListener("click", () => {
  nameForm.hidden = false;
  renameButton.hidden = true;
  nameForm.elements.userName.value = nameNode.textContent;
  nameForm.elements.userName.focus();
});

document.querySelector("#cancel-name").addEventListener("click", closeNameForm);

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const next = String(nameForm.elements.userName.value).trim();
  if (!next) {
    return;
  }
  localStorage.setItem(NAME_KEY, next);
  nameNode.textContent = next;
  closeNameForm();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = readForm();

  if (editingId) {
    products = products.map((product) =>
      product.id === editingId ? { ...product, ...data } : product,
    );
  } else {
    products.push({ id: crypto.randomUUID(), used: false, ...data });
  }

  resetForm();
  persist();
});

cancelEdit.addEventListener("click", resetForm);

list.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const row = event.target.closest("[data-id]");
  if (!button || !row) {
    return;
  }

  const id = row.dataset.id;
  const action = button.dataset.action;

  if (action === "edit") {
    startEdit(id);
  }

  if (action === "delete") {
    products = products.filter((product) => product.id !== id);
    if (editingId === id) {
      resetForm();
    }
    persist();
  }

  if (action === "recommend") {
    const current = products.find((product) => product.id === id);
    if (!current) return;
    fillFromProduct(current);
    addRecommendation({
      name: current.name.trim(),
      amount: current.amount,
      unit: current.unit,
      price: current.price ?? null,
      priceCurrency: current.priceCurrency ?? null,
    });
  }

  if (action === "use") {
    const current = products.find((product) => product.id === id);
    if (current) rememberUse(current);
    products = products.map((product) =>
      product.id === id ? { ...product, used: true, usedOn: product.usedOn || FridgePrices.todayISO() } : product,
    );
    persist();
  }
});

render();
renderRecommendations();

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const stored = JSON.parse(saved);
    let changed = false;
    const migrated = stored.map((product) => {
      if (product.used && !product.usedOn) {
        changed = true;
        return { ...product, usedOn: FridgePrices.todayISO() };
      }
      return product;
    });
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  return [
    item("Молоко", 250, "ml", 2),
    item("Помидоры", 500, "g", 3),
    item("Йогурт", 200, "g", 4),
    item("Сыр", 180, "g", -1),
    item("Яйца", 10, "pcs", 12, true),
    item("Огурец", 2, "pcs", 6, true),
  ];
}

function item(name, amount, unit, dayOffset, used = false) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + dayOffset);

  return {
    id: crypto.randomUUID(),
    name,
    amount,
    unit,
    expiry: expiry.toISOString().slice(0, 10),
    used,
    usedOn: used ? FridgePrices.todayISO() : null,
    price: null,
    priceCurrency: null,
  };
}

function addRecommendation(entry) {
  const data = loadRecommendations();
  const key = productKey(entry.name);
  if (!key) return;
  data.manual = data.manual.filter((item) => productKey(item.name) !== key);
  data.manual.push(entry);
  data.templates[key] = entry;
  saveRecommendations(data);
  renderRecommendations();
}

function fillFromProduct(product) {
  form.elements.name.value = product.name;
  form.elements.amount.value = product.amount ? String(product.amount) : "";
  if (product.unit) form.elements.unit.value = product.unit;
  form.elements.price.value = product.price == null ? "" : priceForForm(product);
  form.elements.name.focus();
}

function loadRecommendations() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECOMMEND_KEY) || "");
    return {
      log: Array.isArray(saved.log) ? saved.log : [],
      manual: Array.isArray(saved.manual) ? saved.manual : [],
      templates: saved.templates && typeof saved.templates === "object" ? saved.templates : {},
    };
  } catch {
    return { log: [], manual: [], templates: {} };
  }
}

function saveRecommendations(data) {
  localStorage.setItem(RECOMMEND_KEY, JSON.stringify(data));
}

function productKey(name) {
  return String(name || "").trim().toLocaleLowerCase("ru").replaceAll("ё", "е");
}

function rememberUse(product) {
  const data = loadRecommendations();
  const name = product.name.trim();
  if (!name) return;
  data.log.push(name);
  data.templates[productKey(name)] = {
    name,
    amount: product.amount,
    unit: product.unit,
    price: product.price ?? null,
    priceCurrency: product.priceCurrency ?? null,
  };
  saveRecommendations(data);
  renderRecommendations();
}

function suggestions() {
  const data = loadRecommendations();
  const repeated = new Set();
  let run = 1;
  for (let index = 1; index < data.log.length; index += 1) {
    const current = productKey(data.log[index]);
    const previous = productKey(data.log[index - 1]);
    if (current && current === previous) {
      run += 1;
      if (run >= 2) repeated.add(current);
    } else {
      run = 1;
    }
  }

  const counts = new Map();
  data.log.forEach((name) => {
    const key = productKey(name);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const items = new Map();
  repeated.forEach((key) => {
    const template = data.templates[key] || { name: key };
    items.set(key, { ...template, count: counts.get(key) || 0 });
  });
  data.manual.forEach((item) => {
    const key = productKey(item.name);
    if (!key) return;
    const existing = items.get(key);
    items.set(key, {
      ...(existing || {}),
      ...item,
      count: counts.get(key) || existing?.count || 0,
    });
  });

  return [...items.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"),
  );
}

function timesLabel(count) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 > 10 && mod100 < 20) return `${count} раз`;
  if (mod10 === 1) return `${count} раз`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} раза`;
  return `${count} раз`;
}

function renderRecommendations() {
  const items = suggestions();
  recommendList.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "recommend-empty";
    empty.textContent = "Пока пусто. Отметьте один продукт два раза подряд или добавьте его из формы.";
    recommendList.append(empty);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.recommend = productKey(item.name);
    const times = item.count ? `, ${timesLabel(item.count)}` : "";
    button.textContent = `${item.name}${times}`;
    row.append(button);
    recommendList.append(row);
  });
}

function readForm() {
  const data = new FormData(form);
  return {
    name: String(data.get("name")).trim(),
    amount: Number(data.get("amount")),
    unit: String(data.get("unit")),
    expiry: String(data.get("expiry")),
    price: readPrice(data.get("price")),
    priceCurrency: readPrice(data.get("price")) == null ? null : FridgePrices.currentCurrency(),
  };
}

function priceForForm(product) {
  if (product.price == null) return "";
  const code = FridgePrices.currentCurrency();
  const kzt = FridgePrices.toKzt(Number(product.price), product.priceCurrency || "KZT");
  return String(Math.round(FridgePrices.fromKzt(kzt, code) * 100) / 100);
}

function readPrice(value) {
  if (value == null || String(value).trim() === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function startEdit(id) {
  const product = products.find((entry) => entry.id === id);
  if (!product) {
    return;
  }

  editingId = id;
  form.elements.name.value = product.name;
  form.elements.amount.value = String(product.amount);
  form.elements.unit.value = product.unit;
  form.elements.expiry.value = product.expiry;
  form.elements.price.value = priceForForm(product);
  formTitle.textContent = "Изменить продукт";
  form.querySelector("[type='submit']").textContent = "Сохранить";
  cancelEdit.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function closeNameForm() {
  nameForm.hidden = true;
  renameButton.hidden = false;
  nameForm.reset();
}

function resetForm() {
  editingId = null;
  form.reset();
  formTitle.textContent = "Добавить продукт";
  form.querySelector("[type='submit']").textContent = "Добавить";
  cancelEdit.hidden = true;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  render();
}

function render() {
  const active = products
    .filter((product) => !product.used)
    .sort((a, b) => a.expiry.localeCompare(b.expiry));
  const used = products.filter((product) => product.used);
  const soon = active.filter((product) => classify(product) === "soon");
  const almost = active.filter((product) => classify(product) === "almost");
  const expired = active.filter((product) => classify(product) === "expired");

  document.querySelector("#count-total").textContent = String(products.length);
  document.querySelector("#count-soon").textContent = String(soon.length);
  document.querySelector("#count-used").textContent = String(used.length);
  document.querySelector("#count-almost").textContent = String(almost.length);
  document.querySelector("#count-expired").textContent = String(expired.length);
  fillCounter("items-total", products);
  fillCounter("items-soon", soon);
  fillCounter("items-used", used);
  fillCounter("items-almost", almost);
  fillCounter("items-expired", expired);

  statusText.textContent =
    soon.length || almost.length || expired.length
      ? "Есть продукты, на которые стоит взглянуть"
      : "Твой холодильник в порядке";

  const percent = share(used.length);
  donut.style.setProperty("--share", String(percent));
  usagePercent.textContent = `${percent}%`;
  usageNote.textContent = `${percent}% от всех`;

  const expiredShare = share(expired.length);
  expiredDonut.style.setProperty("--share", String(expiredShare));
  expiredPercent.textContent = `${expiredShare}%`;
  expiredNote.textContent = `${expiredShare}% от всех`;

  renderBars([
    { label: "Всего", value: products.length },
    { label: "Скоро", value: soon.length },
    { label: "Готово", value: used.length },
    { label: "Вот-вот", value: almost.length },
    { label: "Истёк", value: expired.length },
  ]);
  renderList(active, used);
}

function share(count) {
  return products.length ? Math.round((count / products.length) * 100) : 0;
}

function fillCounter(id, items) {
  const node = document.querySelector(`#${id}`);
  node.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "counter-empty";
    empty.textContent = "Пока нет таких продуктов.";
    node.append(empty);
    return;
  }

  items.forEach((product) => {
    const item = document.createElement("li");
    item.textContent = `${product.name}, ${product.amount} ${UNITS[product.unit] || ""}`.trim();
    node.append(item);
  });
}

function renderBars(groups) {
  const max = Math.max(1, ...groups.map((group) => group.value));
  bars.replaceChildren();

  groups.forEach((group) => {
    const bar = document.createElement("div");
    bar.className = "bar";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.setProperty("--size", `${(group.value / max) * 100}%`);

    const label = document.createElement("span");
    label.textContent = group.label;

    bar.append(fill, label);
    bars.append(bar);
  });
}

function renderList(active, used) {
  list.replaceChildren();

  if (!active.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "В холодильнике пока нет продуктов.";
    list.append(empty);
  }

  active.forEach((product) => list.append(renderProduct(product)));

  if (!used.length) {
    return;
  }

  const title = document.createElement("h3");
  title.className = "used-title";
  title.textContent = "Уже использовано";
  list.append(title);
  used.forEach((product) => list.append(renderProduct(product)));
}

function renderProduct(product) {
  const row = document.createElement("article");
  row.className = product.used ? "product product-used" : "product";
  row.dataset.id = product.id;

  const main = document.createElement("div");
  main.className = "product-main";

  const heading = document.createElement("h3");
  heading.textContent = product.name;

  const amount = document.createElement("p");
  const ownPrice =
    product.price == null
      ? ""
      : `, ${FridgePrices.formatMoney(product.price, product.priceCurrency || "KZT")}`;
  amount.textContent = `${product.amount} ${UNITS[product.unit] || ""}${ownPrice}`.trim();
  main.append(heading, amount);

  const expiry = document.createElement("p");
  expiry.textContent = expiryLabel(product);
  expiry.className = expiryClass(product);

  const actions = document.createElement("div");
  actions.className = "row-actions";
  actions.append(button("Изменить", "edit", "action action-quiet"));
  actions.append(button("В список", "recommend", "action action-quiet"));
  if (!product.used) {
    actions.append(button("Использовано", "use", "action"));
  }
  actions.append(button("Удалить", "delete", "action action-quiet action-warn"));

  row.append(main, expiry, actions);
  return row;
}

function button(text, action, className) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.dataset.action = action;
  element.textContent = text;
  return element;
}

function classify(product) {
  const days = daysUntil(product.expiry);
  if (days < 0) return "expired";
  if (days <= EXPIRED_MAX_DAYS) return "almost";
  if (days <= SOON_MAX_DAYS) return "soon";
  return "fresh";
}

function expiryClass(product) {
  if (product.used) {
    return "";
  }
  const state = classify(product);
  if (state === "soon" || state === "almost") return "soon-text";
  if (state === "expired") return "expired-text";
  return "";
}

function expiryLabel(product) {
  if (product.used) {
    return "Использовано";
  }

  const days = daysUntil(product.expiry);
  if (days < 0) {
    return `Просрочено на ${Math.abs(days)} дн.`;
  }
  if (days === 0) {
    return "Срок сегодня";
  }
  if (days === 1) {
    return "Остался 1 день";
  }
  return `Осталось ${days} дн.`;
}

function daysUntil(isoDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${isoDate}T00:00:00`);
  return Math.round((expiry - today) / 86400000);
}
