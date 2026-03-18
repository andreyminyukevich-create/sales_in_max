const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// =============================================
// ENV (Railway → Variables)
// =============================================
// TOCHKA_TOKEN      — Bearer токен из интернет-банка (Интеграции и API)
// TOCHKA_CUSTOMER   — customerCode (Get Customers List → customerType: Business)
// TOCHKA_MERCHANT   — merchantId (Get Retailers, 15 цифр) — только если несколько точек
// APP_URL           — публичный URL задеплоенного аппа, например https://ppf-shop.up.railway.app

const {
  TOCHKA_TOKEN,
  TOCHKA_CUSTOMER,
  TOCHKA_MERCHANT,
  APP_URL = "https://your-app.up.railway.app",
  PORT = 3000,
} = process.env;

const TOCHKA_API = "https://enter.tochka.com/sandbox/v2"; // поменять на /v2 для прода

// =============================================
// POST /api/create-payment
// body: { items: [{name, price, qty}], orderId: string }
// =============================================
app.post("/api/create-payment", async (req, res) => {
  try {
    const { items, orderId } = req.body;

    if (!items?.length) {
      return res.status(400).json({ error: "Корзина пустая" });
    }

    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const purpose = items
      .map((i) => `${i.name} x${i.qty}`)
      .join(", ")
      .slice(0, 200); // лимит Точки

    const body = {
      customerCode: TOCHKA_CUSTOMER,
      amount: total,
      purpose,
      redirectUrl: `${APP_URL}/success?order=${orderId}`,
      failRedirectUrl: `${APP_URL}/fail?order=${orderId}`,
      // paymentMode: "sbp" — раскомментировать если только СБП
    };

    if (TOCHKA_MERCHANT) {
      body.merchantId = TOCHKA_MERCHANT;
    }

    const tochkaRes = await fetch(
      `${TOCHKA_API}/acquiring/payment-links/create-payment-operation`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOCHKA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await tochkaRes.json();

    if (!tochkaRes.ok) {
      console.error("Tochka API error:", data);
      return res.status(502).json({ error: "Ошибка платёжного сервиса", details: data });
    }

    // Точка возвращает paymentUrl или redirectUrl в зависимости от версии
    const paymentUrl = data.paymentUrl || data.redirectUrl || data.url;

    if (!paymentUrl) {
      return res.status(502).json({ error: "Не получили ссылку на оплату", data });
    }

    res.json({ paymentUrl, orderId, total });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// =============================================
// GET /api/products
// Читает из Google Sheets (опционально)
// Или возвращает мок-данные если SHEET_ID не задан
// =============================================
app.get("/api/products", async (req, res) => {
  const { SHEET_ID, GOOGLE_API_KEY, SHEET_NAME = "Товары" } = process.env;

  if (!SHEET_ID || !GOOGLE_API_KEY) {
    return res.json(MOCK_PRODUCTS);
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${GOOGLE_API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    const [, ...rows] = data.values;
    const products = rows.map((row, i) => ({
      id: i + 1,
      name: row[0] || "",
      category: row[1] || "gloss",
      price: Number(row[2]) || 0,
      unit: row[3] || "рулон",
      desc: row[4] || "",
      specs: (row[5] || "").split(",").map((s) => s.trim()).filter(Boolean),
      emoji: row[6] || "🛡️",
      in_stock: row[7]?.toLowerCase() !== "нет",
    }));
    res.json(products);
  } catch (err) {
    console.error("Sheets error:", err);
    res.json(MOCK_PRODUCTS);
  }
});

// SPA fallback
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`PPF Shop running on :${PORT}`));

// =============================================
// Мок-данные (пока нет реального Sheet)
// =============================================
const MOCK_PRODUCTS = [
  {
    id: 1, name: "XPEL Ultimate Plus", category: "gloss",
    price: 32000, unit: "рулон",
    desc: "Топовая глянцевая PPF с самовосстановлением царапин за 24 часа. Ширина 60 см, длина 15 м.",
    specs: ["Толщина 6 мил", "Самовосстановление", "10 лет гарантия"],
    emoji: "✨", in_stock: true,
  },
  {
    id: 2, name: "SunTek ClearBra", category: "gloss",
    price: 24000, unit: "рулон",
    desc: "Надёжная глянцевая защита. Устойчива к пожелтению. Ширина 60 см, длина 15 м.",
    specs: ["Толщина 8 мил", "УФ-защита", "7 лет гарантия"],
    emoji: "🛡️", in_stock: true,
  },
  {
    id: 3, name: "STEK DYNOmatt", category: "matte",
    price: 38000, unit: "рулон",
    desc: "Матовая PPF для стелс-эффекта. Полностью меняет текстуру глянцевого кузова.",
    specs: ["Матовый финиш", "Самовосстановление", "5 лет гарантия"],
    emoji: "⬛", in_stock: true,
  },
  {
    id: 4, name: "Llumar Platinum Matte", category: "matte",
    price: 35000, unit: "рулон",
    desc: "Матовая защита с антигрязевым покрытием. Лёгкая очистка, стойкость к маслам.",
    specs: ["Антигрязевой слой", "Матовый финиш", "8 лет гарантия"],
    emoji: "🖤", in_stock: true,
  },
  {
    id: 5, name: "XPEL Stealth", category: "satin",
    price: 41000, unit: "рулон",
    desc: "Сатиновая плёнка премиум-класса. Роскошный атласный блеск.",
    specs: ["Сатиновый финиш", "Самовосстановление", "10 лет гарантия"],
    emoji: "💎", in_stock: true,
  },
  {
    id: 6, name: "SunTek Paint Armor", category: "satin",
    price: 29000, unit: "рулон",
    desc: "Сатиновая защита с отличным балансом цены и качества.",
    specs: ["Сатиновый финиш", "УФ-защита", "6 лет гарантия"],
    emoji: "🌟", in_stock: false,
  },
];
