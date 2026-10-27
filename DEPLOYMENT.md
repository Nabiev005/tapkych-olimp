# Тапкыч Олимпти коюу (Vercel + Neon)

Тапкыч Олимп — Тапкыч ордодон **өзүнчө Vercel долбоору**, дареги `olimp.tapkych.com`. Ордо сайты (`tapkych.com`) өзгөрбөйт.

Бир Vercel долбоору фронтенди да, API'ни да тейлейт:

- `frontend/dist` — статикалык сайт (React);
- `api/index.mjs` — serverless функция, ал `backend/dist/app.js` (Express) колдонот;
- `vercel.json` — `/api/*` → функция, калганы → `index.html`.

## 1. Маалымат базасы (Neon)

База Neon'до (`tapkych-olimp`, Frankfurt) мурунтан түзүлгөн, миграциялар жана seed колдонулган. Жаңы миграция пайда болгондо, аны локалдык компьютерден колдонуңуз (`backend/.env` Neon'го карайт):

```bash
npm run db:deploy
```

> Vercel'дин build'и миграцияларды иштетпейт — бул атайын: база өзгөрүүлөрү көзөмөлдө болсун.

## 2. Vercel'де долбоор түзүү

1. [vercel.com](https://vercel.com) → **Add New… → Project**.
2. GitHub'дан `Nabiev005/tapkych-olimp` репозиторийин тандаңыз (**Import**).
3. Жөндөөлөр:
   - **Framework Preset:** `Other`
   - **Root Directory:** `./` (өзгөртпөңүз)
   - Build/Output/Install буйруктарын өзгөртпөңүз — алар `vercel.json` ичинде (`npm run build`, `frontend/dist`).
4. **Environment Variables** (Production жана Preview үчүн):

   | Аты                  | Мааниси                                                                                        |
   | -------------------- | ---------------------------------------------------------------------------------------------- |
   | `NODE_ENV`           | `production`                                                                                   |
   | `DATABASE_URL`       | Neon'дун **pooled** дареги (`-pooler`, аягында `&pgbouncer=true`) — `backend/.env` ичиндегидей |
   | `DIRECT_URL`         | Neon'дун түз дареги (`-pooler` жок)                                                            |
   | `JWT_ACCESS_SECRET`  | жаңы кокус сап (≥ 32 белги)                                                                    |
   | `JWT_REFRESH_SECRET` | башка жаңы кокус сап (≥ 32 белги)                                                              |
   | `CORS_ORIGINS`       | `https://olimp.tapkych.com,https://tapkych-olimp.vercel.app`                                   |
   | `APP_URL`            | `https://olimp.tapkych.com`                                                                    |

   JWT секреттерин түзүү (ар бири үчүн өзүнчө иштетиңиз):

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   > `CORS_ORIGINS` ичинде сайт ачылган бардык даректер болушу керек — болбосо кирүү/жооп жөнөтүү 403 берет. Vercel'дин долбоор дареги башкача болсо (мисалы `tapkych-olimp-xxx.vercel.app`), аны да кошуңуз.

5. **Deploy** басыңыз. Build ~2 мүнөт. Бүткөндө `…vercel.app` дарегин ачып текшериңиз: башкы бет, маселелер, кирүү.

## 3. `olimp.tapkych.com` субдоменин туташтыруу

1. Жаңы долбоордо: **Settings → Domains → Add** → `olimp.tapkych.com`.
2. DNS:
   - `tapkych.com` Vercel'дин nameserver'лерин колдонсо — жазуу автоматтык түрдө кошулат, эч нерсе кылуунун кереги жок.
   - Домен башка жерде (регистратордо) башкарылса — ошол жерге **CNAME** кошуңуз:

     | Түрү    | Аты (Host) | Мааниси                |
     | ------- | ---------- | ---------------------- |
     | `CNAME` | `olimp`    | `cname.vercel-dns.com` |

3. Vercel «Valid Configuration» деп көрсөткөнчө күтүңүз (бир нече мүнөттөн бир нече саатка чейин). SSL сертификаты автоматтык түрдө берилет.
4. Тапкыч ордодогу шилтемелерди `https://olimp.tapkych.com` дарегине багыттаңыз.

## 4. Коюудан кийин

- **Демо аккаунттарды өчүрүү** (продакшнда милдеттүү, ТЗ 11-бөлүм): локалдык компьютерден `npm run demo:remove -w backend`. Админ аккаунтуңуз (`ajbeknabiev90@gmail.com`) өчпөйт.
- Жаңы админ: `npm run admin:create -w backend -- --email … --password … --name …`.
- Маселелерди массалык кошуу: админ панели → Импорт, же `npm run problems:import -w backend -- --file …` ([docs/problem-format.md](docs/problem-format.md)).

## 5. Жаңыртуу

`main` бутагына push кылынган ар бир commit автоматтык түрдө продакшнга чыгат. Башка бутактар — preview деплой.

Схема өзгөрсө: адегенде `npm run db:deploy` (Neon'го миграция), анан push.

## 6. Бэкап

- Neon өзү маалыматты калыбына келтирүүнү колдойт (**Backup & Restore**, акысыз планда 1 күн).
- Кошумча толук көчүрмө: `pg_dump` орнотулган компьютерден

  ```bash
  cd backend && ./scripts/backup-db.sh
  ```

  Файл `backend/backups/olimp-YYYYMMDD-HHMMSS.sql.gz` болуп сакталат (git'ке кирбейт). Калыбына келтирүү: `gunzip -c файл.sql.gz | psql "$DIRECT_URL"`.

## Көйгөйлөр

| Белгиси                                                         | Себеби / чечими                                                                                                                           |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Кирүүдө же жооп жөнөткөндө `403 CORS`                           | Сайттын дареги `CORS_ORIGINS` ичинде жок — кошуп, кайра deploy кылыңыз.                                                                   |
| API `500`, логдо `Invalid environment variables`                | Vercel'де env өзгөрмөсү жок же JWT секрети 32 белгиден кыска.                                                                             |
| `Can't reach database server`                                   | `DATABASE_URL` туура эмес, же Neon'дун compute'у уктап жатат (биринчи сурам 1–2 сек. созулат).                                            |
| Кыргызча тамгалар `?` болуп сакталат                            | База UTF8 эмес — Neon'до андай болбойт; башка базада UTF8 менен түзүңүз.                                                                  |
| Build `npm run build` 2-код менен кулайт, «added ~200 packages» | `NODE_ENV=production` болгондо npm devDependencies'ти орнотпойт. `vercel.json` ичинде `npm install --include=dev` турушу керек (коюлган). |
| Кирүү сессиясы сакталбайт                                       | Сайт `https://` аркылуу ачылышы керек (cookie `Secure`).                                                                                  |

Rate limit эсептегичтери ар бир serverless инстанцияда өзүнчө сакталат — бул азыркы көлөм үчүн жетиштүү; трафик чоңойсо, жалпы сактагычка (мисалы Redis) өтсө болот.
