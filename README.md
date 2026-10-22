# Тапкыч Олимп

Кыргызстандагы 7–11-класстын окуучуларын математика, физика жана информатика боюнча олимпиадаларга даярдоочу акысыз платформа. Дареги: `olimp.tapkych.com` (Тапкыч ордонун бир бөлүгү).

Интерфейстин негизги тили — кыргызча, экинчи тили — орусча.

> Долбоор этап-этабы менен курулуп жатат. Учурдагы абал: **1-этап** (скелет, маалымат базасы, i18n, дизайн, layout). Толук документация 8-этапта толукталат.

## Технологиялар

- **Backend:** Node.js, Express 5, TypeScript (strict), Prisma 6 + PostgreSQL, Zod 4, JWT, bcrypt, helmet, express-rate-limit
- **Frontend:** React 18, Vite, React Router, i18next, KaTeX, axios, lucide-react, Recharts, өз CSS токендери
- **Деплой:** Vercel + Neon/Supabase PostgreSQL

## Локалдык ишке киргизүү

Талаптар: Node.js 20+ жана PostgreSQL базасы — сунушталганы [Neon](https://neon.tech) (Frankfurt аймагы). База **UTF8** коддоосунда болушу керек, болбосо кыргызча тамгалар сакталбайт (Neon демейки UTF8).

```bash
# 1. Көз карандылыктарды орнотуу (backend + frontend бир жолу)
npm install

# 2. Env файлын даярдоо: DATABASE_URL (Neon pooled), DIRECT_URL (Neon direct), JWT_* маанилерин толтуруу
cp .env.example backend/.env

# 3. Миграция жана баштапкы маалыматтар
npm run db:migrate
npm run db:seed

# 4. Иштетүү: API http://localhost:4000/api, сайт http://localhost:5173
npm run dev
```

> **Эскертүү (npm 11+):** npm install-скрипттерди өзүнчө уруксатсыз иштетпейт. Керектүү пакеттер (`prisma`, `@prisma/client`, `@prisma/engines`, `esbuild`, `bcrypt`) түпкү `package.json` ичиндеги `allowScripts` талаасында уруксат берилген.

## Скрипттер

| Буйрук                                                               | Эмне кылат                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                                                        | API жана сайтты чогуу иштетет                              |
| `npm run build`                                                      | Backend'ди жана frontend'ди курат                          |
| `npm test`                                                           | Backend тесттери (Vitest)                                  |
| `npm run lint`                                                       | ESLint                                                     |
| `npm run format`                                                     | Prettier                                                   |
| `npm run i18n:check`                                                 | `ky.json` жана `ru.json` ачкычтарынын дал келишин текшерет |
| `npm run db:migrate`                                                 | Prisma миграциялары (dev)                                  |
| `npm run db:deploy`                                                  | Миграцияларды продакшнга колдонуу                          |
| `npm run db:seed`                                                    | Баштапкы маалыматтар (кайра иштетсе болот)                 |
| `npm run admin:create -w backend -- --email … --password … --name …` | Админ түзүү                                                |
| `npm run demo:remove -w backend`                                     | Демо аккаунттарды өчүрүү (продакшнда милдеттүү)            |

## Демо аккаунттар

Seed `SEED_DEMO_USERS=false` болбосо түзүлөт. **Продакшнда `npm run demo:remove -w backend` менен өчүрүңүз.**

| Роль              | Email                       | Пароль         |
| ----------------- | --------------------------- | -------------- |
| Админ             | `admin@demo.tapkych.com`    | `Admin12345`   |
| Мугалим           | `teacher@demo.tapkych.com`  | `Teacher12345` |
| Окуучу (8-класс)  | `student1@demo.tapkych.com` | `Student12345` |
| Окуучу (9-класс)  | `student2@demo.tapkych.com` | `Student12345` |
| Окуучу (10-класс) | `student3@demo.tapkych.com` | `Student12345` |

Мугалимдин демо классынын коду: `DEMO8A`.

## Seed эмнелерди түзөт

- Кыргызстандын 7 облусу, Бишкек жана Ош шаарлары; ар биринде 2–3 мисал мектеп
- 3 предмет, 14 тема
- 30 каталог маселеси (математика 15, физика 10, информатика 5) + 3 жарыш маселеси — баары эки тилде, кеңеши жана чечими менен
- 3 жетишкендик (деңгээлдер `backend/src/config/levels.ts` ичинде)
- Демо аккаунттар, демо класс, бир жумадан кийин башталуучу жарыш

## Папкалардын түзүлүшү

```
backend/
  prisma/            schema.prisma, migrations/, seed.ts, seed-data/
  scripts/           backup-db.sh, create-admin.ts, remove-demo-users.ts
  src/
    config/          env, permissions, levels, scoring
    routes/ controllers/ services/ validators/
    middleware/      language, errorHandler, rateLimit (+ auth — 2-этап)
    i18n/            ky.ts, ru.ts — API билдирүүлөрү
    utils/
  tests/
frontend/
  src/
    pages/           ар бир бөлүм өз папкасында (компонент + .css)
    components/      ui/, olimp/, layout/
    hooks/ services/ utils/
    i18n/locales/    ky.json, ru.json
    styles/          tokens.css, components.css, global.css
api/index.mjs        Vercel'дин serverless кирүү чекити
vercel.json
```

## Жаңы котормо кантип кошулат

1. Ачкычты `frontend/src/i18n/locales/ky.json` **жана** `ru.json` экөөнө тең бир эле жерге кошуңуз (модул боюнча: `common.*`, `auth.*`, `problems.*` …).
2. Компоненттен `t('модул.ачкыч')` аркылуу колдонуңуз — коддо текстти түз жазбаңыз.
3. `npm run i18n:check` иштетиңиз.

Backend билдирүүлөрү `backend/src/i18n/ky.ts` жана `ru.ts` ичинде; TypeScript алардын бирдей болушун текшерет.

## Жаңы маселе кантип кошулат

Азырынча — `backend/prisma/seed-data/problems.ts` файлына кошуп, `npm run db:seed` иштетүү. Формулалар: `$...$` — сапта, `$$...$$` — өзүнчө блок. Админ панели жана JSON импорт 7-этапта кошулат.
