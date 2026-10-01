# EnvelopeFlow

**Budget in envelopes. When one runs dry, see exactly where the slack is.**

An offline envelope-budgeting app: each spending category is its own envelope
with a monthly budget. Log expenses against envelopes, carry balances forward
month to month (optional, per envelope), and when one envelope overspends, a
greedy reallocation algorithm suggests exactly which envelopes have spare
budget to pull from — protecting the envelopes you've marked important and
raiding the least important ones first.

## Особенности

- Конверты с месячным бюджетом, опциональным переносом остатка/долга (rollover)
- Жадный алгоритм перераспределения бюджета при перерасходе, с защитой важных конвертов по приоритету
- Stats: on-budget rate, тренд по месяцам, расходы по конвертам, heatmap активности, Wilson-gated "что надёжно / что чаще срывается"
- Полностью офлайн — ни аккаунта, ни интернета, ни аналитики

## Стек

- Expo SDK 54 + expo-router, TypeScript
- `expo-sqlite` — вся persistence локально на устройстве, интернет не нужен
- `expo-notifications` — опциональное дневное напоминание залогировать траты
- `expo-haptics` — тактильный отклик на сохранение/применение плана

## Запуск

```bash
npm install
npx expo start
```

`a` — Android, `i` — iOS, либо QR-код через Expo Go.

## Структура проекта

```
app/                    expo-router экраны (index, add-transaction, envelope/[id], rebalance, stats, settings)
src/
  theme/                палитра, типографика, отступы, анимации, категориальная палитра доната
  db/                    expo-sqlite схема + миграции (envelopes/transactions/transfers/app_settings)
  data/                  доступ к данным: envelopes.ts, transactions.ts, transfers.ts, settings.ts
  services/              notifications, haptics
  components/            UI-примитивы + EnvelopeGauge (сигнатурный виджет)
  lib/                   envelope.ts (типы), envelopeMath.ts (rollover-расчёт),
                         rebalance.ts (жадный алгоритм перераспределения),
                         envelopeStats.ts (Wilson-gated надёжность), dates.ts, statsMath.ts
tools/                   генератор иконок, проверки, rename-скрипт
```

## Данные

Все данные хранятся локально на устройстве. Регистрации нет, интернет не
требуется для работы приложения.
