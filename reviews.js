const STORAGE_KEY = "fridgeflow-review";
const VOTES_KEY = "fridgeflow-review-votes";
const BLOCK_KEY = "fridgeflow-review-blocked";
const NAME_KEY = "fridgeflow-name";
const ABOUT_KEY = "fridgeflow-about";
const PAGE = 3;
const BANNED = ["хуй", "пизд", "еба", "ёба", "ебл", "бля", "сука", "муда", "пидор", "пидар", "гандон", "fuck", "shit", "bitch"];

const SEEDS = [
  {
    id: "dina",
    author: "Дина",
    about: "Следит за молочным",
    stars: 4,
    text: "Пользуюсь неделю. Молоко правда перестало залёживаться, хотя список иногда лень пополнять. Для дома нормально.",
    likes: 4,
    dislikes: 1,
  },
  {
    id: "erlan",
    author: "Ерлан",
    about: "Готовит по вечерам",
    stars: 3,
    text: "Рецепты понятные, но не из каждого продукта в холодильнике получается блюдо. Когда продуктов мало, выбор тоже маленький.",
    likes: 3,
    dislikes: 1,
  },
  {
    id: "saule",
    author: "Сауле",
    about: "Считает расходы на еду",
    stars: 4,
    text: "Сроки видны сразу, это удобно. Сумма в кабинете похожа на магазин, только не копейка в копейку.",
    likes: 2,
    dislikes: 0,
  },
  {
    id: "aigerim",
    author: "Айгерим",
    about: "Ходит в магазин со списком",
    stars: 4,
    text: "Записываю продукты перед магазином. Пару раз всё равно взяла лишний йогурт, но сроки хотя бы не теряются.",
    likes: 5,
    dislikes: 1,
  },
  {
    id: "nurlan",
    author: "Нурлан",
    about: "Закупается на неделю",
    stars: 3,
    text: "Список простой. Напоминания на телефон нет, так что заходить приходится самому. Для полки с молоком хватает.",
    likes: 2,
    dislikes: 2,
  },
  {
    id: "madina",
    author: "Мадина",
    about: "Любит завтраки",
    stars: 4,
    text: "Открыла рецепт омлета, вышло обычно. Удобно, что рядом написано, какого продукта не хватает.",
    likes: 3,
    dislikes: 0,
  },
  {
    id: "timur",
    author: "Тимур",
    about: "Живёт один",
    stars: 2,
    text: "Захожу редко. Когда холодильник почти пустой, и смотреть там особо нечего. Если продуктов больше, наверное, полезнее.",
    likes: 1,
    dislikes: 1,
  },
];

const form = document.querySelector("#review-form");
const error = document.querySelector("#review-error");
const list = document.querySelector("#review-list");
const picker = document.querySelector("#star-picker");
const submit = form.querySelector("[type='submit']");
const deleteButton = document.querySelector("#review-delete");
const confirmBox = document.querySelector("#review-confirm");

let mine = loadMine();
let votes = loadVotes();
let blocked = new Set(loadBlocked());
let rating = mine && mine.stars ? mine.stars : 0;
let burst = "";
let shown = PAGE;
let showHidden = false;
let askDelete = false;
let folded = false;

buildStars();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = form.elements.text.value.trim().replace(/\s+/g, " ");
  if (rating < 1) {
    showError("Поставьте оценку от 1 до 5.");
    return;
  }
  if (!text) {
    showError("Напишите отзыв.");
    return;
  }
  if (isBanned(text)) {
    showError("В отзыве есть недопустимые слова.");
    return;
  }
  mine = { id: "mine", text, stars: rating };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mine));
  error.hidden = true;
  askDelete = false;
  render();
});

deleteButton.addEventListener("click", () => {
  askDelete = true;
  render();
});

document.querySelector("#review-delete-yes").addEventListener("click", () => {
  mine = null;
  rating = 0;
  askDelete = false;
  localStorage.removeItem(STORAGE_KEY);
  form.elements.text.value = "";
  error.hidden = true;
  render();
});

document.querySelector("#review-delete-no").addEventListener("click", () => {
  askDelete = false;
  render();
});

function render() {
  if (mine) {
    form.elements.text.value = mine.text;
    submit.textContent = "Изменить отзыв";
  } else {
    submit.textContent = "Опубликовать";
  }
  deleteButton.hidden = !mine || askDelete;
  confirmBox.hidden = !askDelete;
  paintStars();

  const open = SEEDS.filter((review) => !blocked.has(review.id));
  const hidden = SEEDS.filter((review) => blocked.has(review.id));
  const visible = open.slice(0, shown);

  list.replaceChildren();
  const foldRow = document.createElement("div");
  foldRow.className = "review-tools";
  const fold = document.createElement("button");
  fold.type = "button";
  fold.className = "action";
  fold.textContent = folded ? "Показать отзывы" : "Свернуть отзывы";
  fold.addEventListener("click", () => {
    folded = !folded;
    render();
  });
  foldRow.append(fold);
  list.append(foldRow);
  if (folded) return;

  if (mine) list.append(reviewCard(ownReview(), false));
  visible.forEach((review) => list.append(reviewCard(review, false)));

  const tools = document.createElement("div");
  tools.className = "review-tools";
  if (open.length > shown) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "action";
    more.textContent = "Показать больше";
    more.addEventListener("click", () => {
      shown += PAGE;
      render();
    });
    tools.append(more);
  }
  if (hidden.length && !showHidden) {
    const reveal = document.createElement("button");
    reveal.type = "button";
    reveal.className = "action action-quiet";
    reveal.textContent = `Скрытые у вас: ${hidden.length}`;
    reveal.addEventListener("click", () => {
      showHidden = true;
      render();
    });
    tools.append(reveal);
  }
  if (tools.childElementCount) list.append(tools);
  if (showHidden) hidden.forEach((review) => list.append(reviewCard(review, true)));
}

function ownReview() {
  return {
    id: "mine",
    author: localStorage.getItem(NAME_KEY) || "Алия",
    about: localStorage.getItem(ABOUT_KEY) || "",
    stars: rating,
    text: mine.text,
  };
}

function reviewCard(review, hidden) {
  const article = document.createElement("article");
  article.className = "review";
  const head = document.createElement("div");
  head.className = "review-head";
  const title = document.createElement("h3");
  title.textContent = review.author;
  head.append(title, starLine(review.stars));
  article.append(head);
  if (review.about) {
    const about = document.createElement("p");
    about.className = "review-about";
    about.textContent = review.about;
    article.append(about);
  }
  const text = document.createElement("p");
  text.textContent = review.text;
  article.append(text);

  const row = document.createElement("div");
  row.className = "vote-row";
  if (review.id !== "mine") {
    row.append(voteButton(review, "like", "Нравится"), voteButton(review, "dislike", "Не нравится"));
    const block = document.createElement("button");
    block.type = "button";
    block.className = "vote";
    block.textContent = hidden ? "Вернуть" : "Скрыть у себя";
    block.addEventListener("click", () => {
      if (hidden) blocked.delete(review.id);
      else blocked.add(review.id);
      localStorage.setItem(BLOCK_KEY, JSON.stringify([...blocked]));
      if (!blocked.size) showHidden = false;
      render();
    });
    row.append(block);
  }
  if (row.childElementCount) article.append(row);
  return article;
}

function voteButton(review, kind, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `vote vote-${kind}`;
  const base = kind === "like" ? review.likes : review.dislikes;
  const mineVote = votes[review.id];
  const extra = mineVote === kind ? 1 : 0;
  if (mineVote === kind) button.classList.add("is-on");
  if (burst === `${review.id}:${kind}`) {
    button.classList.add("is-burst");
    button.addEventListener("animationend", () => button.classList.remove("is-burst"), { once: true });
  }
  button.textContent = `${label} ${base + extra}`;
  button.addEventListener("click", () => {
    votes[review.id] = votes[review.id] === kind ? "" : kind;
    if (!votes[review.id]) delete votes[review.id];
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    burst = `${review.id}:${kind}`;
    render();
  });
  return button;
}

function buildStars() {
  for (let value = 1; value <= 5; value += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "star";
    button.dataset.star = String(value);
    button.textContent = "★";
    button.setAttribute("aria-label", `${value} из 5`);
    button.addEventListener("click", () => {
      rating = value;
      if (mine) mine.stars = value;
      paintStars();
    });
    picker.append(button);
  }
}

function paintStars() {
  picker.querySelectorAll(".star").forEach((button) => {
    button.classList.toggle("is-on", Number(button.dataset.star) <= rating);
  });
}

function starLine(value) {
  const node = document.createElement("p");
  node.className = "star-line";
  node.textContent = `${"★".repeat(value)}${"☆".repeat(5 - value)}`;
  node.setAttribute("aria-label", `Оценка ${value} из 5`);
  return node;
}

function loadMine() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved && saved.text ? saved : null;
  } catch {
    return null;
  }
}

function loadVotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(VOTES_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function loadBlocked() {
  try {
    const saved = JSON.parse(localStorage.getItem(BLOCK_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function showError(message) {
  error.hidden = false;
  error.textContent = message;
}

function isBanned(text) {
  const value = text.toLocaleLowerCase("ru").replaceAll("ё", "е");
  return BANNED.some((word) => value.includes(word.replaceAll("ё", "е")));
}
