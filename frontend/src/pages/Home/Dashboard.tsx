import { CalendarClock, Gift, Sparkles, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LevelProgress } from '../../components/olimp/LevelProgress';
import { ProblemCard } from '../../components/olimp/ProblemCard';
import { StreakFlame } from '../../components/olimp/StreakFlame';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { errorMessage } from '../../services/api';
import { ratingApi, type Dashboard as DashboardData } from '../../services/rating';
import { formatDateTime } from '../../utils/format';
import { pickText } from '../../utils/localize';
import './Dashboard.css';

/** Home page for signed-in users (7.12). */
export function Dashboard() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ratingApi
      .dashboard()
      .then((d) => !cancelled && setData(d))
      .catch((err: unknown) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;
  const firstName = user.fullName.split(' ')[0];

  return (
    <div className="container page dashboard">
      <header className="dashboard__greeting">
        <h1 className="page-header__title">{t('home.dashboard.greeting', { name: firstName })}</h1>
        <p className="page-header__subtitle">{t('home.dashboard.subtitle')}</p>
      </header>

      <div className="dashboard__stats">
        <section className="card dashboard__stat">
          <StreakFlame days={user.currentStreak} longest={user.longestStreak} />
        </section>
        <section className="card dashboard__stat dashboard__stat--wide">
          <LevelProgress
            level={user.level}
            totalPoints={user.totalPoints}
            progress={user.levelProgress.progress}
            pointsToNext={user.levelProgress.pointsToNext}
            nextLevel={user.levelProgress.nextLevel}
          />
        </section>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="dashboard__grid">
        <section className="dashboard__block" aria-labelledby="daily-title">
          <h2 id="daily-title" className="section-title">
            <Sparkles size={20} aria-hidden="true" />
            {t('home.dashboard.daily')}
          </h2>
          {!data && !error ? (
            <Skeleton height={160} radius="16px" />
          ) : data?.daily ? (
            <div className="daily">
              <span className="daily__bonus">
                <Gift size={16} aria-hidden="true" />
                {t('home.dashboard.dailyBonus', { bonus: data.daily.bonus })}
              </span>
              <ProblemCard problem={data.daily.problem} />
            </div>
          ) : (
            <p className="dashboard__empty">{t('home.dashboard.noDaily')}</p>
          )}
        </section>

        <section className="dashboard__block" aria-labelledby="contests-title">
          <h2 id="contests-title" className="section-title">
            <Timer size={20} aria-hidden="true" />
            {t('home.dashboard.contests')}
          </h2>
          {!data && !error ? (
            <Skeleton height={120} radius="16px" />
          ) : data && data.upcomingContests.length > 0 ? (
            <ul className="contest-list">
              {data.upcomingContests.map((c) => (
                <li key={c.id} className="card contest-item">
                  <Link to={`/contests/${c.id}`} className="contest-item__title">
                    {pickText(c.titleKy, c.titleRu, language).text}
                  </Link>
                  <span className="contest-item__date">
                    <CalendarClock size={16} aria-hidden="true" />
                    {formatDateTime(c.startsAt, language)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard__empty">{t('home.dashboard.noContests')}</p>
          )}
        </section>
      </div>

      <section className="dashboard__block" aria-labelledby="continue-title">
        <h2 id="continue-title" className="section-title">
          {t('home.dashboard.continue')}
        </h2>
        {data && data.continue.length > 0 ? (
          <ul className="problem-grid">
            {data.continue.map((p) => (
              <li key={p.id}>
                <ProblemCard problem={p} />
              </li>
            ))}
          </ul>
        ) : data ? (
          <div className="card dashboard__cta">
            <p>{t('home.dashboard.noContinue')}</p>
            <ButtonLink to="/problems">{t('home.dashboard.toCatalog')}</ButtonLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}
