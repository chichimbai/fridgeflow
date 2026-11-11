const form = document.querySelector("#recipe-form");
const result = document.querySelector("#recipe-result");
const { book, types, loadFridge, assess } = window.FridgeRecipes;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const wish = form.elements.wish.value.trim();
  const selected = [...form.querySelectorAll('input[name="dish"]:checked')].map((input) => input.value);
  showList(selected, wish);
});

function showList(selected, wish) {
  result.hidden = false;
  result.replaceChildren();

  if (!selected.length) {
    const note = document.createElement("p");
    note.className = "field-hint";
    note.textContent = "Выберите хотя бы один тип блюда. Можно отметить несколько сразу.";
    result.append(note);
    return;
  }

  const flags = readFlags(wish);
  const products = loadFridge();
  const recipes = book
    .filter((recipe) => selected.includes(recipe.type))
    .map((recipe) => ({ recipe, ...assess(recipe, products) }))
    .filter((entry) => entry.have.length > 0 && entry.missing.length <= 3)
    .sort((a, b) => compareRecipes(a, b, flags));

  if (wish) {
    const query = document.createElement("p");
    query.className = "field-hint";
    query.textContent = `запрос: ${wish}`;
    result.append(query);
  }

  if (!recipes.length) {
    const empty = document.createElement("p");
    empty.className = "field-hint";
    empty.textContent = products.length
      ? "Для выбранных типов нет блюда, которое можно собрать из холодильника даже с двумя-тремя недостающими продуктами."
      : "В холодильнике нет свободных продуктов. Добавьте их во вкладке «Мой холодильник».";
    result.append(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "recipe-grid";
  recipes.forEach((entry) => grid.append(card(entry)));
  result.append(grid);
}

function card(entry) {
  const cardNode = document.createElement("article");
  cardNode.className = "recipe-card";

  const title = document.createElement("h3");
  title.textContent = entry.recipe.title;
  const meta = document.createElement("p");
  meta.className = "recipe-meta";
  meta.textContent = `${types[entry.recipe.type]} · ${entry.recipe.minutes} мин`;
  const summary = document.createElement("p");
  summary.className = "recipe-summary";
  summary.textContent = entry.recipe.summary;
  cardNode.append(title, meta, summary);

  if (entry.missing.length) {
    const mark = document.createElement("p");
    mark.className = "recipe-miss";
    mark.textContent = `Не хватает: ${entry.missing.map((item) => item.name.toLocaleLowerCase("ru")).join(", ")}`;
    cardNode.append(mark);
  }

  const open = document.createElement("a");
  open.className = "action";
  open.href = `recipe.html?id=${encodeURIComponent(entry.recipe.id)}`;
  const label = document.createElement("span");
  label.textContent = "Использовать этот";
  open.append(label);
  open.addEventListener("click", () => rememberRecipe(entry.recipe.id));
  cardNode.append(open);
  return cardNode;
}

function rememberRecipe(id) {
  const key = "fridgeflow-recipe-uses";
  let uses = {};
  try {
    uses = JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    uses = {};
  }
  uses[id] = Number(uses[id] || 0) + 1;
  localStorage.setItem(key, JSON.stringify(uses));
}

function compareRecipes(a, b, flags) {
  const score = (entry) => {
    let value = entry.missing.length * 10 - entry.have.length;
    if (flags.diet && entry.recipe.tags.includes("diet")) value -= 3;
    if (flags.hearty && entry.recipe.tags.includes("hearty")) value -= 3;
    if (flags.quick && entry.recipe.tags.includes("quick")) value -= 3;
    if (flags.cheap) value += recipeCost(entry.recipe) / 1000;
    return value;
  };
  return soonRank(a) - soonRank(b) || score(a) - score(b) || a.recipe.title.localeCompare(b.recipe.title, "ru");
}

function soonRank(entry) {
  const days = nearestExpiry(entry);
  return days <= 5 ? days : 100 + days;
}

function nearestExpiry(entry) {
  const required = entry.have.filter((part) => !part.item.optional);
  const pool = required.length ? required : entry.have;
  if (!pool.length) return 99;
  return Math.min(...pool.map((part) => recipeDaysUntil(part.product.expiry)));
}

function recipeDaysUntil(isoDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${isoDate}T00:00:00`);
  return Math.round((expiry - today) / 86400000);
}

function recipeCost(recipe) {
  return recipe.ingredients.reduce((total, item) => {
    if (item.optional) return total;
    const parsed = parseAmount(item.amount);
    if (!parsed || !window.FridgePrices) return total + 400;
    const cost = FridgePrices.marketKzt({ name: item.name, amount: parsed.amount, unit: parsed.unit });
    return total + (cost == null ? 400 : cost);
  }, 0);
}

function parseAmount(text) {
  const match = String(text).match(/(\d+(?:[.,]\d+)?)\s*(кг|г|мл|л|шт)/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  const unit = { кг: "kg", г: "g", мл: "ml", л: "l", шт: "pcs" }[match[2]];
  return { amount, unit };
}

function readFlags(wish) {
  const text = wish.toLocaleLowerCase("ru");
  return {
    diet: /диет|лёгк|легк|низкокалор|полезн/.test(text),
    hearty: /сытн|плотн|нажорист/.test(text),
    quick: /быстр|скор|минут|на скорую/.test(text),
    cheap: /дешев|недорог|бюджет|эконом/.test(text),
  };
}
