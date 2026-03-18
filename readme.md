# PPF Shop — Max мини-апп с оплатой через Точку

## Структура
```
server.js          — Express бэкенд (проксирует API Точки)
public/
  index.html       — React фронтенд (каталог + корзина)
  success.html     — страница успешной оплаты
  fail.html        — страница неудачной оплаты
package.json
```

## Как работает оплата
1. Клиент добавляет товары в корзину
2. Нажимает "Оплатить"
3. Фронт вызывает `POST /api/create-payment` на нашем сервере
4. Сервер вызывает API Точки → получает `paymentUrl`
5. Фронт редиректит на `paymentUrl` (открывается внутри Max WebView)
6. Клиент платит по СБП или картой
7. Точка редиректит на `/success` или `/fail`

## Переменные окружения (Railway → Variables)

| Переменная | Где взять |
|---|---|
| `TOCHKA_TOKEN` | Интернет-банк Точки → Интеграции и API → Bearer токен |
| `TOCHKA_CUSTOMER` | API Точки → `GET /customers` → поле `customerCode` где `customerType: "Business"` |
| `TOCHKA_MERCHANT` | API Точки → `GET /retailers` → поле `merchantId` (только если несколько точек) |
| `APP_URL` | Публичный URL аппа на Railway, напр. `https://ppf-shop.up.railway.app` |
| `SHEET_ID` | ID Google Таблицы из URL (необязательно, без него — мок-данные) |
| `GOOGLE_API_KEY` | Google Cloud Console → Sheets API (необязательно) |

## Деплой на Railway

```bash
# 1. Залить на GitHub
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR/ppf-shop
git push

# 2. Railway: New Project → Deploy from GitHub → выбрать репо
# 3. Railway: Variables → добавить все переменные выше
# 4. Railway выдаст URL вида https://ppf-shop-xxx.up.railway.app
# 5. Этот URL вставить в APP_URL
```

## Подключение интернет-эквайринга Точки

1. Интернет-банк → Сервисы → Интернет-эквайринг → оставить заявку
2. После подключения: Интеграции и API → создать токен с правами на эквайринг
3. Переключить `TOCHKA_API` в `server.js` с `/sandbox/v2` на `/v2` для прода

## Таблица товаров (Google Sheets, лист "Товары")

| A: Название | B: Категория | C: Цена ₽ | D: Ед.изм | E: Описание | F: Характеристики | G: Эмодзи | H: В наличии |
|---|---|---|---|---|---|---|---|
| XPEL Ultimate | gloss | 32000 | рулон | Описание | Толщина 6 мил, УФ-защита | ✨ | да |

Категории: `gloss` / `matte` / `satin`
Характеристики: через запятую

## Подключение в Max

1. `dev.max.ru` → партнёрская платформа → мини-приложения
2. URL: твой Railway URL
3. Полноэкранный режим
