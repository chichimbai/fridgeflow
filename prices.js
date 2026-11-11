const FridgePrices = (() => {
  const CURRENCY_KEY = "fridgeflow-currency";
  const CURRENCIES = [
    { code: "KZT", label: "Тенге" },
    { code: "USD", label: "Доллар США" },
    { code: "EUR", label: "Евро" },
    { code: "RUB", label: "Российский рубль" },
    { code: "CNY", label: "Китайский юань" },
    { code: "GBP", label: "Фунт стерлингов" },
    { code: "TRY", label: "Турецкая лира" },
    { code: "JPY", label: "Японская иена" },
    { code: "AED", label: "Дирхам ОАЭ" },
    { code: "KRW", label: "Южнокорейская вона" },
  ];

  const KZT_PER_UNIT = {
    KZT: 1,
    USD: 447.14,
    EUR: 499.54,
    RUB: 5.46,
    CNY: 67.03,
    GBP: 598.9,
    TRY: 8.92,
    JPY: 2.83,
    AED: 121.75,
    KRW: 0.3301,
  };

  const CATALOG = [
    { keys: ["морожен"], per: "kg", kzt: 2126, piece: 0.08, density: 0.55 },
    { keys: ["подсолнеч"], per: "l", kzt: 906 },
    { keys: ["сливочн"], per: "kg", kzt: 5689 },
    { keys: ["молок", "кефир"], per: "l", kzt: 673 },
    { keys: ["помидор", "томат"], per: "kg", kzt: 668 },
    { keys: ["йогурт"], per: "kg", kzt: 2739 },
    { keys: ["сметан"], per: "kg", kzt: 2541 },
    { keys: ["сыр"], per: "kg", kzt: 6194 },
    { keys: ["яйц"], per: "pcs", kzt: 61 },
    { keys: ["огурец", "огурц"], per: "kg", kzt: 506, piece: 0.15 },
    { keys: ["хлеб"], per: "kg", kzt: 230, piece: 0.4 },
    { keys: ["картоф"], per: "kg", kzt: 209 },
    { keys: ["морков"], per: "kg", kzt: 215 },
    { keys: ["лук"], per: "kg", kzt: 142 },
    { keys: ["яблок"], per: "kg", kzt: 727 },
    { keys: ["банан"], per: "kg", kzt: 799 },
    { keys: ["рис"], per: "kg", kzt: 543 },
    { keys: ["греч"], per: "kg", kzt: 427 },
    { keys: ["сахар"], per: "kg", kzt: 454 },
    { keys: ["говяд"], per: "kg", kzt: 3811 },
    { keys: ["куриц"], per: "kg", kzt: 1740 },
    { keys: ["свинин"], per: "kg", kzt: 3007 },
    { keys: ["баранин"], per: "kg", kzt: 4530 },
    { keys: ["масло"], per: "kg", kzt: 5689 },
  ];

  function currentCurrency() {
    const saved = localStorage.getItem(CURRENCY_KEY);
    return CURRENCIES.some((currency) => currency.code === saved) ? saved : "KZT";
  }

  function saveCurrency(code) {
    if (CURRENCIES.some((currency) => currency.code === code)) {
      localStorage.setItem(CURRENCY_KEY, code);
    }
  }

  function todayISO() {
    return formatISO(new Date());
  }

  function formatISO(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function fromKzt(amount, code) {
    return amount / KZT_PER_UNIT[code];
  }

  function toKzt(amount, code) {
    return amount * KZT_PER_UNIT[code];
  }

  function formatMoney(amount, code) {
    const digits = code === "JPY" || code === "KRW" ? 0 : 2;
    const rounded = digits === 0 ? Math.round(amount) : Math.round(amount * 100) / 100;
    const text = rounded.toLocaleString("ru-RU", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return `${text} ${code}`;
  }

  function normalize(name) {
    return name.toLocaleLowerCase("ru").replaceAll("ё", "е");
  }

  function quantity(amount, unit, entry) {
    if (entry.per === "kg") {
      if (unit === "g") return amount / 1000;
      if (unit === "kg") return amount;
      if (unit === "pcs" && entry.piece) return amount * entry.piece;
      if (unit === "ml" && entry.density) return (amount / 1000) * entry.density;
      if (unit === "l" && entry.density) return amount * entry.density;
    }
    if (entry.per === "l") {
      if (unit === "ml") return amount / 1000;
      if (unit === "l") return amount;
      if (unit === "pcs") return amount * (entry.piece || 1);
    }
    if (entry.per === "pcs" && unit === "pcs") return amount;
    return null;
  }

  function marketKzt(product) {
    const name = normalize(product.name);
    const entry = CATALOG.find((item) => item.keys.some((key) => name.includes(key)));
    if (!entry) return null;
    const qty = quantity(product.amount, product.unit, entry);
    if (qty == null) return null;
    return qty * entry.kzt;
  }

  function valueOf(product) {
    if (product.price != null && product.price !== "" && Number(product.price) >= 0) {
      const code = product.priceCurrency || "KZT";
      return { kzt: toKzt(Number(product.price), code), source: "ваша цена" };
    }
    const market = marketKzt(product);
    if (market == null) return null;
    return { kzt: market, source: "средняя цена" };
  }

  function moneyIn(product, code) {
    const value = valueOf(product);
    if (!value) return null;
    return { ...value, amount: fromKzt(value.kzt, code) };
  }

  return {
    CURRENCIES,
    currentCurrency,
    saveCurrency,
    todayISO,
    formatMoney,
    fromKzt,
    toKzt,
    moneyIn,
    marketKzt,
  };
})();
