# CLAUDE.md — Тапкыч Олимп

Бул файл — долбоордун журналы жана иштөө эрежелери. Ар бир этаптан кийин жаңыланат: эмне жасалды, кандай чечимдер кабыл алынды, эмне калды.

## Долбоор

- **Тапкыч Олимп** — 7–11-класстын окуучуларын математика, физика, информатика боюнча олимпиадага даярдоочу акысыз платформа. Дареги `olimp.tapkych.com`, Тапкыч ордонун бир бөлүгү.
- Колдонуучулар: окуучу (`STUDENT`), мугалим (`TEACHER`), админ (`ADMIN`).
- Негизги тил — **кыргызча** (демейки, браузердин тилине карабайт), экинчиси — орусча.
- Толук техникалык тапшырма колдонуучунун биринчи билдирүүсүндө берилген (14 бөлүм, 8 этап). Талапка каршы чечим керек болсо — адегенде колдонуучудан суроо.

## Репозиторий

- GitHub: https://github.com/Nabiev005/tapkych-olimp (негизги бутак `main`).

## Иштөө эрежелери (колдонуучунун талаптары)

- Этап-этабы менен иштөө. Ар бир этаптын башында эмне кылынарын кыскача айтуу; аягында текшерип, отчет берип, **кийинки этапка уруксат суроо**.
- Ар бир этаптан кийин git commit (кыска, түшүнүктүү билдирүү).
- Стектен чыкпоо; жаңы фреймворк/китепкана керек болсо — адегенде суроо.
- Кыргызча тексттер табигый кыргыз тилинде (орусчадан сөзмө-сөз эмес). Термин так эмес болсо — суроо.
- Коддогу комментарийлер кыска, **англисче** (бирдей болушу үчүн ушуну тандадык). Колдонуучуга арналган документтер (README, DEPLOYMENT, .env.example) — кыргызча.
- Коддо катуу жазылган UI текст болбойт — баары `ky.json` / `ru.json` аркылуу.
- TypeScript strict, `any` колдонулбайт. Архитектура: `routes → controllers → services`; бизнес логика `services` ичинде гана.
- Бардык API жооптору: `{ data }` же `{ error: { code, message } }`.
- `correctAnswer` эч качан frontend'ке жиберилбейт (Prisma `select` менен алып салуу + тест).
- Убакыт/күндөр **Asia/Bishkek** боюнча (`backend/src/utils/dateRange.ts`).

## Буйруктар

```bash
npm install                 # root'тон — workspaces (backend, frontend)
npm run dev                 # API :4000 + Vite :5173 (Vite /api'ни проксилейт)
npm test                    # backend Vitest
npm run lint                # ESLint (root eslint.config.mjs)
npm run format              # Prettier
npm run i18n:check          # ky.json ↔ ru.json ачкычтары, бош маанилер, {{placeholder}}лер
npm run build               # backend tsc → backend/dist, frontend → frontend/dist
npm run db:migrate          # prisma migrate dev
npm run db:deploy           # prisma migrate deploy
npm run db:seed             # идемпотенттүү seed (upsert)
npm run admin:create -w backend -- --email … --password … --name …
npm run demo:remove -w backend
```

Env: `.env.example` (root) → `backend/.env` катары көчүрүлөт. Backend `src/config/env.ts` аркылуу Zod менен текшерет (JWT секреттери ≥ 32 белги).

## Чөйрө боюнча эскертүүлөр (маанилүү)

- **npm 11.19** install-скрипттерди бөгөттөйт. Root `package.json` → `allowScripts` ичинде `prisma`, `@prisma/client`, `@prisma/engines`, `esbuild`, `bcrypt` уруксат берилген. Жаңы нативдүү пакет кошулса — `npm install-scripts approve <pkg>`.
- **TypeScript 5.9.3** ге бекитилген (npm демейки TS 7 орнотуп, typescript-eslint менен чыр чыкты).
- **Prisma 6** ге бекитилген (Prisma 7 `prisma.config.ts` жана driver adapter талап кылат). `package.json#prisma` deprecated эскертүүсү — зыянсыз.
- bcrypt 6 Windows үчүн даяр бинардык менен келет (node-gyp керек эмес).
- PostgreSQL базасы **UTF8** болушу шарт — WIN1251 базада кыргызча «ү, ө, ң» сакталбайт (локалдык Windows'та текшерүүдө ушуга туш болдук).
- **БД — Neon** (колдонуучу тандады, 2026-10-22): `DATABASE_URL` — pooled (`-pooler`, `pgbouncer=true`), `DIRECT_URL` — түз туташуу (Prisma migrate). Экөө тең `schema.prisma` datasource ичинде (`url` + `directUrl`) жана Vercel env'де болушу керек.
- Локалдык машинада PostgreSQL/Docker жок. 1-этапта миграция жана seed scratchpad'дагы убактылуу `embedded-postgres` менен текшерилди (долбоорго кошулган эмес).

## Архитектура жана негизги файлдар

### Backend (`backend/`, ESM, `module: NodeNext` — импорттордо `.js` кеңейтүүсү)

- `src/app.ts` — `createApp()` (helmet, CORS whitelist + credentials, json 1mb, cookie-parser, `language`, `/api` + apiLimiter, 404, errorHandler). `default export` — Vercel үчүн.
- `src/server.ts` — локалдык `listen`.
- `src/db.ts` — PrismaClient singleton.
- `src/config/env.ts` — Zod env.
- `src/config/permissions.ts` — `Role`, `Permission`, `ROLE_PERMISSIONS`, `hasPermission()`. TEACHER = STUDENT + мугалим укуктары; ADMIN = баары.
- `src/config/levels.ts` — 7 деңгээл (0/100/300/700/1500/3000/6000), `getLevelForPoints`, `getLevelProgress`.
- `src/config/scoring.ts` — `points × DIFFICULTY_MULTIPLIER {1:1, 2:1.5, 3:2, 4:2.5, 5:3}`, кеңеш ×0.5, биринчи аракет +10%, чечим мурун ачылса 0; `DAILY_PROBLEM_BONUS = 10`, `SOLUTION_UNLOCK_ATTEMPTS = 3`.
- `src/i18n/` — `ky.ts` (`as const`), `ru.ts` (`Messages` тиби менен — форма дал келбесе TS катасы), `t(lang, key, params)` типтештирилген ачкычтар менен.
- `src/middleware/language.ts` — `req.lang`: `?lang=` → `Accept-Language` → `ky`.
- `src/middleware/errorHandler.ts` — `AppError` (код → `errors.<CODE>` которулат), `ZodError` → `VALIDATION_ERROR` + `details.fields[]` (которулган), бузук JSON → `INVALID_JSON`, калганы → `INTERNAL`.
- `src/utils/zodMessages.ts` — Zod 4 issue'лерин эки тилге которот; custom refine'дын `message`и i18n ачкычы болсо, ал да которулат.
- `src/middleware/rateLimit.ts` — `apiLimiter` (300/мүн), `authLimiter` (20/15 мүн). Жооп жөнөтүүгө (5/мүн/маселе) лимит — 3-этапта.
- `src/utils/dateRange.ts` — `bishkekDay()`, `bishkekDayAsDate()`, `daysBetween()`, `addDays()`.
- `src/routes/index.ts` — азырынча `GET /api/health`.

### Маалымат базасы (`backend/prisma/schema.prisma`)

Моделдер: User, Region, School, Subject, Topic, Problem, Submission, ProblemProgress, Class, ClassMember, Assignment, AssignmentProblem, Contest, ContestProblem, ContestParticipant, DailyProblem, Achievement, UserAchievement, RefreshToken, PasswordResetToken.
Миграция: `prisma/migrations/20261021000000_init/` (`prisma migrate diff` менен генерацияланган, чыныгы Postgres'те колдонулуп, drift жок экени текшерилген).

ТЗдан тышкары кошулган талаалар/моделдер (себептери менен):

- `Region.slug`, `Region.order` — seed upsert жана тизмектин тартиби үчүн.
- `User.customSchoolName` — мектеп тизмеде жок болсо «Башка» деп жазуу үчүн (7.1).
- `User.isProfilePublic` — профилди жашыруу жөндөөсү (8.8).
- `PasswordResetToken` — паролду калыбына келтирүү (7.1).
- `Problem.reviewNote` — админдин мугалим сунушуна комментарийи; `Problem.publishedAt`.
- `ProblemProgress.pointsEarned` — бул маселеден алынган упай.
- `AssignmentProblem` — Assignment ↔ Problem байланыш таблицасы (ТЗда «байланыш таблицасы аркылуу»).
- `Contest.showVerdicts` — жарыш учурунда туура/туура эмести көрсөтүү жөндөөсү (7.10); `Contest.createdById`.
- `Achievement.code/icon/threshold/order`.
- `correctAnswer` — `Json`: дайыма сап же саптардын массиви (TEXT үчүн бир нече туура вариант). `choices` — `[{ id, textKy, textRu }]`.
- Күндөр (`lastActiveDate`, `DailyProblem.date`) — `@db.Date`, Бишкек күнү UTC түн жарымы катары сакталат.

Жарыш модели (6-этапта ишке ашат): `startsAt..endsAt` — жарыш терезеси, ар бир катышуучуга өз башталышынан `durationMinutes`. Жарыштын маселелери ал бүткөнгө чейин каталогдо көрүнбөйт (каталог сурамы: `PUBLISHED` жана аяктабаган жарышка байланбаган).

### Seed (`backend/prisma/seed.ts`, `seed-data/`)

- 9 аймак (7 облус + Бишкек, Ош шаарлары), 19 мисал мектеп (ID'лери туруктуу: `school-<region>-<n>`).
- 3 предмет (`math`, `physics`, `informatics`), 14 тема.
- 30 каталог маселеси (мат. 15, физ. 10, инф. 5) + 3 жарыш маселеси = 33. Баары оригиналдуу, эки тилде, кеңеш жана чечим менен; жооптору кол менен текшерилген. Түрлөрү: INTEGER, DECIMAL (`ohms-law`), TEXT (`decimal-to-binary`), MULTIPLE_CHOICE (`compare-powers`). Кыйындык 1–5.
- `seed-data/problems.ts` формасы (`ProblemSeed`: `subjectSlug`, `topicSlug`, …) — 7-этаптагы JSON импорт форматынын негизи болот.
- Маселе тексттеринде: `$...$` / `$$...$$`, бирдиктер формуладан тышкары («$10$ м/с²»), код ` ```python ` блогу менен (`sum-of-multiples-loop`) — `MathText` 3-этапта код блокторун да колдошу керек.
- 3 жетишкендик: `first-solve`, `streak-7`, `solved-100`.
- Демо: `admin@ / teacher@ / student1-3@demo.tapkych.com`, паролдор README'де; демо класс `DEMO8A` (student1, student2); жарыш `contest-demo-autumn` (seed'ден 7 күн кийин 10:00 Бишкек, 120 мүн, терезе 3 саат).
- `SEED_DEMO_USERS=false` — демо аккаунтсыз. `scripts/remove-demo-users.ts` — `@demo.tapkych.com` колдонуучуларын өчүрөт.

### Frontend (`frontend/`)

- `src/main.tsx` → `i18n` → стилдер → `App` (`createBrowserRouter`, `Layout` ичинде маршруттар). Кийинки этаптардын бөлүмдөрү азырынча `ComingSoonPage`.
- `src/i18n/index.ts` — i18next, демейки `ky`, browser detection **жок**; тандалган тил localStorage `olimp.lang` (try/catch). `languageChanged` → `<html lang>`. `i18next.d.ts` — ачкычтар типтештирилген (`t('common.nav.home')` компиляцияда текшерилет).
- `src/i18n/locales/ky.json`, `ru.json` — модулдар: `common`, `home`, `errors` (кийин `auth`, `problems`, `leaderboard`, `teacher`, `contest`, `profile`, `admin`).
- `src/hooks/useLanguage.ts` (2-этапта кирген колдонуучу үчүн `PATCH /api/me` кошулат), `useTheme.ts` (`system → light → dark`, `<html data-theme>`, localStorage `olimp.theme`).
- `index.html` — биринчи сүрөттөлүшкө чейин тема/тилди колдонгон кичине скрипт; Golos Text шрифти (Google Fonts, cyrillic-ext — ң ө ү).
- `src/styles/tokens.css` — түстөр (кочкул көк `#0b1d3a`, алтын `#f5c542`/`#e8b10f`), шрифттер, аралыктар, радиустар, көлөкөлөр; караңгы тема `@media (prefers-color-scheme: dark)` + `:root[data-theme='dark']`. Караңгы темада негизги баскыч — алтын.
- `src/components/layout/` — `Layout` (skip-link, header, main, footer, bottom nav), `Header` (бренд, десктоп навигация ≥900px, `LanguageSwitcher` KY/RU, `ThemeSwitcher`, «Кирүү»), `BottomNav` (<900px, 5 пункт), `Footer` (Тапкыч ордо шилтемеси `https://tapkych.com`).
- `src/components/ui/` — `Button`/`ButtonLink`, `Skeleton`, `EmptyState`. Стилдери `styles/components.css`.
- `src/services/api.ts` — axios (`/api`, `withCredentials`, `Accept-Language`), каталарды `ApiError`ге айландырат, `getData<T>()`.
- `src/utils/format.ts` — `formatDate` (кыргызча өз айлар тизмеси: «21-октябрь, 2026-ж.»), `formatDateTime`, `formatNumber`; баары Asia/Bishkek.
- `scripts/i18n-check.mjs` — `npm run i18n:check`.

### Деплой

- `vercel.json`: `npm run build`, output `frontend/dist`, `/api/:path*` → `/api` (функция `api/index.mjs` → `backend/dist/app.js`), калганы → `/index.html`.
- Prisma `binaryTargets = ["native", "rhel-openssl-3.0.x"]` (Vercel).
- ⚠️ Vercel'де чыныгы текшерүү 8-этапта (функциянын `backend/dist`ти таба алышы, rewrite'тан кийин `req.url`).

### Тесттер (`backend/tests/`, 23 тест)

- `config.test.ts` — деңгээлдер, упай эрежелери, укуктар.
- `seedData.test.ts` — 9 аймак, ≥30 маселе (15/10/5), уникалдуу slug, темалар бар, бардык эки тилдүү талаалар толук, жооп форматы түргө туура, `$` тең салмакта.
- `i18n.test.ts` — ky/ru ачкычтары бирдей, интерполяция, Zod каталары эки тилде.
- `app.test.ts` — `/api/health`, демейки `ky` (англис браузерде да), 404 эки тилде (`?lang=` жана `Accept-Language`), `INVALID_JSON`, helmet header'лери.

## Этаптар журналы

### ✅ 1-этап — Скелет, конфигурациялар, БД, seed, i18n, дизайн, layout (2026-10-21)

Жасалды: жогорудагынын баары. Текшерилди: `tsc` (backend + frontend) катасыз, `eslint .` таза, `prettier` формат, 23 тест өттү, `i18n:check` (62 ачкыч), `vite build`, backend `build`; миграция + seed чыныгы PostgreSQL 17'де (seed эки жолу — идемпотенттүү), schema↔migrations drift жок; smoke: `/api/health` Vite прокси аркылуу, 404 орусча, SPA маршруттары, бөтөн Origin → 403.
Текшерилген жок: UI'ды браузерде визуалдык көрүү (браузер куралы жок) — колдонуучу `npm run dev` менен карап чыгышы керек.

### ✅ Neon туташтырылды (2026-10-22)

Neon долбоору `tapkych-olimp` (Frankfurt, Postgres 18, бутак `production`). `backend/.env` даректери коюлду (git'ке кирбейт), `migrate deploy` + seed ийгиликтүү: 9 аймак, 19 мектеп, 33 маселе, 5 демо колдонуучу; `server_encoding = UTF8`. Эскертүү: Neon'дун direct дареги pooled даректен `-pooler` алынып салынып гана алынат (хост `.c-8.` бөлүгүн сактайт).

### ⏭ 2-этап — Катталуу/кирүү, ролдор жана укуктар

Пландалган: `validators/auth.ts` (Zod), `services/auth.ts` (bcrypt, JWT access + refresh httpOnly cookie, RefreshToken ротациясы), `/api/auth/*` (register, login, logout, refresh, forgot-password, reset-password — email консолго), `GET/PATCH /api/me` (`language` дагы), `GET /api/regions`, `GET /api/schools?region=&q=`, `middleware/auth.ts`, `requirePermission()`, `authLimiter`; frontend: `useAuth`, `usePermissions`, Login/Register/Forgot/Reset барактары, тилди `User.language`ке сактоо, `auth.*` котормолору, тесттер.

### 3–8-этаптар

3: каталог, маселе барагы, `answerChecker` (+тесттер), кеңеш/чечим, упай/деңгээл/streak, `MathText`, жоопко rate limit. 4: рейтинг, профиль, күнүмдүк маселе, жетишкендиктер. 5: мугалим бөлүмү. 6: онлайн жарыштар. 7: админ панели, JSON импорт (`scripts/import-problems.ts`, `docs/problem-format.md`). 8: тесттер, оптималдаштыруу, мобилдик текшерүү, `DEPLOYMENT.md`, Vercel.

## Колдонуучуга берилген суроолор / божомолдор (жооп күтүлүүдө)

1. Тапкыч ордонун дареги `https://tapkych.com` деп алынды — туурабы?
2. «Подсказка» терминин кыргызча «кеңеш» деп которуу сунушталды — макулбу (же «жардам», «ишарат»)?
3. Жарыш модели: `startsAt..endsAt` терезе + ар бир катышуучуга `durationMinutes` — туурабы, же баары бир убакта башташы керекпи?
4. Демо паролдор (`Admin12345` ж.б.) — макулбу?
