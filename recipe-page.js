const { book, types, loadFridge, assess } = window.FridgeRecipes;

const PHOTOS = {
  "tomato-yogurt-salad": "images/greens.jpg",
  "cucumber-tomato-salad": "images/vegetables.jpg",
  "egg-salad": "images/prep.jpg",
  "tomato-soup": "images/vegetables.jpg",
  "cold-yogurt-soup": "images/pantry.jpg",
  "milk-rice-soup": "images/pantry.jpg",
  "cheese-soup": "images/pantry.jpg",
  omelet: "images/meal.jpg",
  "eggs-tomato": "images/prep.jpg",
  "cheese-bake": "images/meal.jpg",
  "yogurt-breakfast": "images/pantry.jpg",
  "fried-eggs": "images/meal.jpg",
  "milk-porridge": "images/pantry.jpg",
  "tomato-cheese-snack": "images/vegetables.jpg",
  "cucumber-snack": "images/vegetables.jpg",
  "boiled-egg-snack": "images/meal.jpg",
  "stewed-tomatoes": "images/vegetables.jpg",
  "vegetable-side": "images/vegetables.jpg",
  "boiled-potatoes": "images/vegetables.jpg",
  "yogurt-dessert": "images/pantry.jpg",
  "baked-apples": "images/roast.jpg",
  "milk-drink": "images/pantry.jpg",
  ayran: "images/pantry.jpg",
  "tomato-drink": "images/vegetables.jpg",
};
const root = document.querySelector("#recipe-detail");
const id = new URLSearchParams(location.search).get("id");
const recipe = book.find((entry) => entry.id === id);

if (!recipe) {
  const note = document.createElement("p");
  note.className = "field-hint";
  note.textContent = "Такого рецепта нет. Вернитесь к списку и выберите блюдо снова.";
  root.append(note);
} else {
  const fridge = loadFridge();
  const { have, missing } = assess(recipe, fridge);
  renderRecipe(recipe, have, missing);
}

function renderRecipe(recipe, have, missing) {
  const photo = document.createElement("figure");
  photo.className = "recipe-photo";
  const image = document.createElement("img");
  image.src = PHOTOS[recipe.id] || "images/meal.jpg";
  image.alt = recipe.title;
  photo.append(image);

  const title = document.createElement("h2");
  title.textContent = recipe.title;
  const meta = document.createElement("p");
  meta.className = "recipe-meta";
  meta.textContent = `${types[recipe.type]} · ${recipe.minutes} мин`;
  const summary = document.createElement("p");
  summary.className = "recipe-summary";
  summary.textContent = recipe.summary;
  root.append(photo, title, meta, summary);

  if (missing.length) {
    const mark = document.createElement("p");
    mark.className = "recipe-miss";
    mark.textContent = `Перед готовкой докупите: ${missing.map((item) => `${item.name.toLocaleLowerCase("ru")} — ${item.amount}`).join(", ")}.`;
    root.append(mark);
  }

  const haveTitle = document.createElement("h3");
  haveTitle.textContent = "Продукты";
  const list = document.createElement("ul");
  list.className = "recipe-list";
  have.forEach(({ item, product }) => {
    const row = document.createElement("li");
    row.textContent = `${item.name} — в рецепте ${item.amount}, в холодильнике ${formatAmount(product)}`;
    list.append(row);
  });
  missing.forEach((item) => {
    const row = document.createElement("li");
    row.className = "recipe-miss";
    row.textContent = `${item.name} — ${item.amount}, в холодильнике нет`;
    list.append(row);
  });

  const stepsTitle = document.createElement("h3");
  stepsTitle.textContent = "Как приготовить";
  const intro = document.createElement("p");
  intro.className = "field-hint";
  intro.textContent = "Порядок обычный для этого домашнего блюда. Сначала соберите отмеченные продукты, затем идите по шагам.";
  const steps = document.createElement("ol");
  steps.className = "recipe-list";
  recipe.steps.forEach((text) => {
    const row = document.createElement("li");
    row.textContent = text;
    steps.append(row);
  });

  root.append(haveTitle, list, stepsTitle, intro, steps);
}

function formatAmount(product) {
  const units = { g: "г", kg: "кг", ml: "мл", l: "л", pcs: "шт" };
  const unit = units[product.unit] || product.unit || "";
  return `${product.amount} ${unit}`.trim();
}
