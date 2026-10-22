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

- Этап-этабы менен иштөө. Ар бир этаптын башында эмне кылынарын кыскача айтуу; аягында текшерип, кыска отчет берүү.
- **2026-10-22 колдонуучу: «план боюнча толук уланта берели»** — этаптардын ортосунда уруксат күтпөй улантуу.
- Ар бир этаптан кийин git commit жана GitHub'га **push** (колдонуучу «пуш кыла тур» деген).
- **Дизайн: таза, билим берүүгө ылайыктуу көк-ак түстөр** (колдонуучунун талабы, 2026-10-22). Алтын түс — жетишкендиктер/streak үчүн гана.
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
- `src/styles/tokens.css` — көк-ак палитра: негизги `--color-primary` `#1d5bd8` (караңгы темада `#6ea0ff`), ак беттер, ачык көк фон `#f5f8fd`; алтын `--color-accent` жетишкендиктер үчүн; header ак (жарым тунук + blur), hero көк градиент (`--color-hero-from/to`). Караңгы тема `@media (prefers-color-scheme: dark)` + `:root[data-theme='dark']`.
- `src/components/layout/` — `Layout` (skip-link, header, main, footer, bottom nav), `Header` (бренд, десктоп навигация ≥900px, `LanguageSwitcher` KY/RU, `ThemeSwitcher`, «Кирүү»), `BottomNav` (<900px, 5 пункт), `Footer` (Тапкыч ордо шилтемеси `https://tapkych.com`).
- `src/components/ui/` — `Button`/`ButtonLink`, `Skeleton`, `EmptyState`. Стилдери `styles/components.css`.
- `src/services/api.ts` — axios (`/api`, `withCredentials`, `Accept-Language`), каталарды `ApiError`ге айландырат, `getData<T>()`.
- `src/utils/format.ts` — `formatDate` (кыргызча өз айлар тизмеси: «21-октябрь, 2026-ж.»), `formatDateTime`, `formatNumber`; баары Asia/Bishkek.
- `scripts/i18n-check.mjs` — `npm run i18n:check`.

### Деплой

- `vercel.json`: `npm run build`, output `frontend/dist`, `/api/:path*` → `/api` (функция `api/index.mjs` → `backend/dist/app.js`), калганы → `/index.html`.
- Prisma `binaryTargets = ["native", "rhel-openssl-3.0.x"]` (Vercel).
- ⚠️ Vercel'де чыныгы текшерүү 8-этапта (функциянын `backend/dist`ти таба алышы, rewrite'тан кийин `req.url`).

### Аутентификация (2-этап)

- Access token: JWT HS256, `ACCESS_TOKEN_TTL` (15m), payload `{ sub, role }`, frontend'де эстутумда гана (`services/api.ts` → `setAccessToken`).
- Refresh token: random 48 байт, базада `sha256` хэши (`RefreshToken`), cookie `olimp_rt` (httpOnly, `SameSite=Lax`, `Secure` продакшнда, `Path=/api/auth`). `/auth/refresh` ар бир чакырганда ротация кылат; алмаштырылган токен 10 сек. өткөндөн кийин кайра колдонулса — колдонуучунун бардык сессиялары жабылат (уурдоодон коргоо). Шарттуу `updateMany` эки параллель ротациядан сактайт.
- `register`: ADMIN өзү каттала албайт (Zod enum STUDENT|TEACHER); окуучуга `grade` милдеттүү; `schoolId` же `customSchoolName` милдеттүү; мектеп облуска таандык экени текшерилет (`SCHOOL_NOT_IN_REGION`); тил — body.language же `req.lang`.
- `login`: белгисиз email жана туура эмес пароль үчүн бирдей ката (`INVALID_CREDENTIALS`); бөгөттөлгөн → `ACCOUNT_BLOCKED`.
- `forgot-password` дайыма `{ ok: true }` (аккаунттарды санап билүүгө болбойт); токен 1 саат, email `services/email.ts` аркылуу (азыр консолго, `setEmailSender()` менен алмаштырылат); шилтеме `${APP_URL}/reset-password?token=…`. `reset-password` бардык refresh токендерди жокко чыгарат.
- `GET /api/me` (`requireAuth`), `PATCH /api/me` (`requirePermission('profile:update')`, `.strict()` — `role` сыяктуу талааларды кабыл албайт). `toMeDto` → `permissions[]`, `levelProgress`. `passwordHash` эч качан select'ке кирбейт (`meSelect`).
- `GET /api/regions`, `GET /api/schools?regionId=&q=&limit=` — ILIKE издөө (Neon `C.UTF-8` локалында кириллица/ү ө ң чоң-кичине тамгага карабай иштейт).
- Middleware: `requireAuth`, `optionalAuth`, `currentUser(req)`, `requirePermission(...perms)` (`[requireAuth, check]` массивин кайтарат). Rate limit — фабрикалар (`createApiLimiter`, `createAuthLimiter`), `createApp()` ар бир чакырганда жаңы эсептегичтер.
- Frontend: `hooks/authContext.ts` + `AuthProvider.tsx` (баракча ачылганда `/auth/refresh` менен сессияны калыбына келтирет; кирген колдонуучунун `language`и колдонулат) + `useAuth.ts`; `usePermissions().can()`; `useLanguage` кирген колдонуучу үчүн `PATCH /me {language}`; `api.ts` 401 (`TOKEN_EXPIRED`/`UNAUTHORIZED`) болсо бир жолу refresh кылып, сурамды кайталайт (single-flight). `RouteGuards.tsx`: `RequireAuth` (`/login?next=`; `permission` жок болсо 404), `GuestOnly`. `safeNext()` — open redirect жок.
- UI: `components/ui/Field.tsx` (`TextField`, `PasswordField`, `SelectField`, `FieldShell`), `fieldA11y.ts`, `Alert.tsx`, `Button` `loading`; `components/olimp/SchoolPicker.tsx` (ARIA combobox, debounce 250ms, «Мектебим тизмеде жок» режими); `components/layout/UserMenu.tsx`; барактар `pages/Auth/` (Login, Register, ForgotPassword, ResetPassword, `AuthCard`, `Auth.css`).

### Маселелер, жооп, упай (3-этап)

- `services/problemQueries.ts` — **жалгыз** ачык select'тер (`problemCardSelect`, `problemDetailSelect`); `correctAnswer`/`tolerance` аларда жок. `visibleProblemWhere()` = `PUBLISHED` жана аягына чыга элек жарышка (`endsAt > now`) кирбеген маселелер — жарыш бүткөндө маселе каталогго автоматтык түрдө чыгат.
- `services/problems.ts` — `listProblems` (фильтрлер: subject, topic, difficulty `1,2`, level, grade (`gradeFrom ≤ g ≤ gradeTo`), status (кирген колдонуучу үчүн гана), q (titleKy/titleRu ILIKE), sort `new|difficulty|popular`, пагинация `page/pageSize≤50`), `getProblem` (кеңеш/чечим тексттери ачылгандан кийин гана; `progress`, акыркы 10 аракет, окшош 4 маселе — ошол эле тема, кыйындык ±1), `openHint`, `openSolution` (чечилгенден кийин же `attempts ≥ 3` болсо; болбосо `403 SOLUTION_LOCKED`), `listSubjects`, `listTopics`.
- `Problem.attemptCount` = аракет кылган **колдонуучулардын** саны (ProblemProgress түзүлгөндө +1), `solvedCount` = чечкендердин саны; `solvedPercent = solved/attempted`.
- `services/submissions.ts` → `submitAnswer`: бир транзакция; упай бир гана жолу (шарттуу `updateMany ATTEMPTED→SOLVED`, параллель сурамдардан корголгон); `calculatePoints` (кеңеш ×0.5, биринчи аракет +10%, чечим мурун ачылса 0) + бүгүнкү `DailyProblem` болсо `+DAILY_PROBLEM_BONUS` (упай > 0 болгондо); `totalPoints`, `level`, streak (`services/streak.ts`), `solvedCount`; жетишкендиктер (`services/achievements.ts`: `first-solve`/`solved-N` — чечилгендер, `streak-N` — streak). Жооп: `isCorrect, pointsAwarded, alreadySolved, dailyBonus, attempts, canOpenSolution, totalPoints, level, leveledUp, currentStreak, achievements[]`.
- `services/answerChecker.ts` — INTEGER (BigInt, боштуктар/`+`/алдыңкы нөлдөр/юникод минус), DECIMAL (`,`=`.`, tolerance, демейки 1e-9), TEXT (NFC, боштуксуз, кичине тамга, бир нече туура жооп), MULTIPLE_CHOICE (id так).
- `services/streak.ts` — `applySolve` (Бишкек күнү: ошол эле күн — өзгөрбөйт, кечээ — +1, андан эрте — 1), `effectiveStreak` (бир толук күн өтсө 0 көрсөтүлөт; `/me` ушуну кайтарат).
- Маршруттар: `GET /api/subjects`, `GET /api/subjects/:slug/topics`, `GET /api/problems` (`optionalAuth`), `GET /api/problems/:slug`, `POST …/submit` (`problems:submit` + `createSubmitLimiter` 5/мүн, ачкыч `userId:slug`), `POST …/hint`, `POST …/solution`.
- Frontend: `utils/parseMathText.ts` + `components/olimp/MathText.tsx` (KaTeX `trust:false`, `strict:'ignore'`; ` ``` ` код блоктору; `\$` — жөнөкөй доллар; `inline` режими), `katex.min.css` `main.tsx`те. `utils/localize.ts` (`pickText` → `{text, missing}`, `pickName`), `TranslationMissing` белгиси. `components/olimp/`: `ProblemCard` (бүт карточка шилтеме), `DifficultyStars`, `OlympiadBadge`, `CelebrationModal`; `components/ui/`: `Modal` (native `<dialog>`), `Badge`, `Pagination`. `utils/levels.ts` — backend деңгээлдеринин көчүрмөсү. Барактар: `pages/Problems/ProblemsPage` (фильтрлер URL'де, skeleton, EmptyState, пагинация), `pages/Problem/ProblemPage` (`key={slug}` менен кайра монтаждалат; `AnswerForm` жооп түрүнө жараша; туура/туура эмес анимациясы `aria-live`; кеңеш/чечим ырастоо модалы — чечилгенден кийин суроосуз; аракеттер; окшош маселелер; деңгээл/жетишкендик модалы).
- Seed'деги 540 формула KaTeX strict режиминде катасыз текшерилди.

### Рейтинг, профиль, күнүмдүк маселе (4-этап)

- `services/rating.ts`: рейтингде **активдүү окуучулар гана** (`role=STUDENT`, `isActive`, упай > 0). Бардык убакыт — `User.totalPoints` (индекстер `[regionId|schoolId|grade, totalPoints desc]`); жума/ай — `Submission.pointsAwarded` суммасы (`$queryRaw`, индекс `[createdAt, userId]`, `contestId IS NULL`), мезгилдин башы Бишкек боюнча (`startOfBishkekWeek` — дүйшөмбү 00:00, `startOfBishkekMonth`), натыйжа 60 сек. `TtlCache` (`utils/cache.ts`; `clearRatingCache()` тесттер үчүн). Тең упайлар бирдей орун алат (`rankRows`). `me` — көрүүчүнүн өз орду (баракта жок болсо да). Жашыруун профиль → `fullName: null`, `school: null` («Жашыруун катышуучу»); ээси өзүн көрөт. Мектептер — окуучуларынын `totalPoints` суммасы, облус фильтри.
- `services/profile.ts` → `GET /api/users/:id`: email жок; жашыруун профиль ээсинен башкага `403 PROFILE_PRIVATE`; статистика (предмет/кыйындык боюнча чечилгендер), активдүүлүк — акыркы 182 күн (`solvedAt + 6 саат` → Бишкек күнү), жетишкендиктер (`unlockedAt`), жалпы рейтингдеги орун.
- `services/daily.ts` → `GET /api/daily`: бүгүнкү (Бишкек) `DailyProblem`; жок болсо автоматтык тандоо (көрүнгөн, акыркы 60 күндө daily болбогон, кыйындыгы 2–3 артыкчылыктуу, кокустан), `isAuto=true`, параллель сурамда `P2002` кармалат.
- `services/dashboard.ts` → `GET /api/me/dashboard`: daily, «Улантуу» (ATTEMPTED, акыркы 4), келе жаткан коомдук жарыштар (3). Тапшырмалар 5-этапта кошулат.
- Frontend: `pages/Leaderboard/LeaderboardPage` (Окуучулар/Мектептер жана мезгил `Tabs`, облус/мектеп/класс фильтрлери URL'де, `LeaderboardTable` — өз сабы белгиленет, баракта жок болсо `tfoot`та «Сиздин ордуңуз»), `pages/Profile/` (`ProfileView` — жалпы; `ProfilePage` `/profile` + `ProfileSettings` (аты, облус/мектеп, класс, жашыруу которгучу); `PublicProfilePage` `/u/:id`), `pages/Home/Dashboard` (кирген колдонуучуга `HomePage` ушуну көрсөтөт). Компоненттер: `Tabs`, `LevelBadge`, `LevelProgress`, `StreakFlame`, `LeaderboardTable`, `ActivityCalendar` (CSS grid, `--heat-0..4`), `StatsCharts` (`SolvedBarChart` — Recharts, бир серия, легендасыз, түз белгилер, tooltip, жашыруун таблица), `AchievementGrid`.
- Графиктердин түстөрү dataviz валидатору менен текшерилди: `--chart-bar` жарык `#1d5bd8` (PASS), караңгы `#4f8cff` (`#6ea0ff` lightness band'дан өтпөдү); heatmap — бир түстүү көк шкала, ар бир тема үчүн өзүнчө кадамдар.
- Орусча көптүк сандардан качуу үчүн «Табылды: N», «Серия: N дн.» сыяктуу формат колдонулат (i18n:check ky/ru ачкычтарынын бирдейлигин талап кылат).

### Тесттер (`backend/tests/`, 76 тест)

- `integration/rating.test.ts` (10) — тең орундар, мугалим/0 упай кирбейт, жашыруун ысымдар, `me` баракта жок болсо да, класс фильтри, жума рейтинги (эски упайлар кирбейт), мектептердин суммасы, профилде `@` жок, жашыруун профиль 403/ээсине 200, daily автоматтык жана туруктуу, dashboard.
- `streak.test.ts` — жума/ай чектери Бишкек боюнча.

- `answerChecker.test.ts`, `streak.test.ts` (Бишкек убакыт алкагы, ай/жыл чеги) — 17.
- `integration/problems.test.ts` (10) — **`correctAnswer`/`tolerance` эч бир жоопто жок** (бардык ачкычтарды рекурсивдүү текшерет), DRAFT жана келе жаткан жарыштын маселелери жашырылган (404), фильтр/издөө/иреттөө/пагинация, упай (биринчи аракет 22), кайра чечүүдө 0, деңгээл/streak/`first-solve`, кеңеш ×0.5, чечим кулпусу жана упайдан ажыратуу, `3,145` DECIMAL, күнүмдүк бонус, 401 жана 5/мүн лимит, окшош маселелер, предметтер.

- Интеграциялык тесттер (`tests/integration/`) `TEST_DATABASE_URL` берилгенде гана иштейт (бош, миграция кылынган **өзүнчө** база; продакшн Neon'го эч качан эмес): `TEST_DATABASE_URL=postgresql://… npm test -w backend`. Тест колдонуучулары `@itest.tapkych.local` — тесттен кийин өчүрүлөт. Тест базасы Neon сыяктуу `C.UTF-8` локалында болушу керек (болбосо кириллица ILIKE иштебейт).
- `integration/auth.test.ts` (11) — каттоо (cookie HttpOnly/Path), кайталанган email, эки тилдеги валидация, мугалим + «Башка» мектеп, ADMIN каттоосу жана башка облустун мектеби четке кагылат, кирүү, `/me` GET/PATCH, refresh ротациясы + logout, паролду калыбына келтирүү (email кармалат), бөгөттөлгөн колдонуучу, облус/мектеп издөө.
- `permissions.test.ts` — `requirePermission` (401/403 которулган/200), JWT.

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

### ✅ Дизайн көк-ак палитрага которулду (2026-10-22)

Колдонуучунун талабы боюнча. `tokens.css`, header (ак), hero (көк градиент), `Button` `white` варианты, favicon.

### ✅ 2-этап — Катталуу/кирүү, ролдор жана укуктар (2026-10-22)

Жасалды: «Аутентификация (2-этап)» бөлүмүндөгүнүн баары. Текшерилди: 38 тест (11 интеграциялык — убактылуу PostgreSQL 17, `C.UTF-8`), `eslint .` таза, `tsc` backend + frontend, `vite build`, `i18n:check` (122 ачкыч); smoke (port 4100, тест базасы): демо окуучу кирүү, cookie менен refresh, орусча ката, кириллица менен мектеп издөө.
Эскертүү: колдонуучу `npm run dev` иштетип турганда `prisma generate` (жана `npm run build`) Windows'та `EPERM` берет — DLL'ди иштеп жаткан backend кармайт. Dev серверди токтотуп, кайра иштетүү керек.

### ✅ 3-этап — Маселелер, жооп текшерүү, кеңеш/чечим, упай/деңгээл/streak (2026-10-22)

Жасалды: «Маселелер, жооп, упай (3-этап)» бөлүмүндөгүнүн баары. Текшерилди: 65 тест (21 интеграциялык), eslint, tsc, `vite build`, `i18n:check` (206 ачкыч), KaTeX strict (540 формула).
Белгиленди: frontend бандлы 650 kB (KaTeX) — 8-этапта lazy routes менен бөлүү.

### ✅ 4-этап — Рейтинг, профиль, күнүмдүк маселе, жетишкендиктер, dashboard (2026-10-22)

Жасалды: «Рейтинг, профиль, күнүмдүк маселе (4-этап)» бөлүмүндөгүнүн баары. Текшерилди: 76 тест (31 интеграциялык), eslint, tsc, build, `i18n:check` (273 ачкыч), графиктердин түстөрү валидатор менен.

### ⏭ 5–8-этаптар

5: мугалим бөлүмү. 6: онлайн жарыштар. 7: админ панели, JSON импорт (`scripts/import-problems.ts`, `docs/problem-format.md`). 8: тесттер, оптималдаштыруу, мобилдик текшерүү, `DEPLOYMENT.md`, Vercel.

## Колдонуучуга берилген суроолор / божомолдор (жооп күтүлүүдө)

Жооп келгенге чейин төмөнкү божомолдор колдонулат (колдонуучу «уланта берели» деди).

1. Тапкыч ордонун дареги `https://tapkych.com` деп алынды — туурабы?
2. «Подсказка» терминин кыргызча «кеңеш» деп которуу сунушталды — макулбу (же «жардам», «ишарат»)?
3. Жарыш модели: `startsAt..endsAt` терезе + ар бир катышуучуга `durationMinutes` — туурабы, же баары бир убакта башташы керекпи?
4. Демо паролдор (`Admin12345` ж.б.) — макулбу?
