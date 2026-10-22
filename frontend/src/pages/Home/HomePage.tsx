import {
  ArrowRight,
  Atom,
  BookOpenCheck,
  Cpu,
  ExternalLink,
  GraduationCap,
  Sigma,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TAPKYCH_ORDO_URL } from '../../components/layout/Footer';
import { ButtonLink } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { Dashboard } from './Dashboard';
import './HomePage.css';

const SUBJECTS = [
  { key: 'math', icon: Sigma },
  { key: 'physics', icon: Atom },
  { key: 'informatics', icon: Cpu },
] as const;

const FEATURES = [
  { key: 'problems', icon: BookOpenCheck },
  { key: 'contests', icon: Timer },
  { key: 'progress', icon: TrendingUp },
  { key: 'teachers', icon: GraduationCap },
] as const;

/** Signed-in users get their dashboard; guests see the landing page. */
export function HomePage() {
  const { status } = useAuth();
  return status === 'authenticated' ? <Dashboard /> : <Landing />;
}

function Landing() {
  const { t } = useTranslation();

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__inner">
          <span className="hero__badge">{t('home.hero.badge')}</span>
          <h1 id="hero-title" className="hero__title">
            {t('home.hero.title')}
          </h1>
          <p className="hero__subtitle">{t('home.hero.subtitle')}</p>
          <div className="hero__actions">
            <ButtonLink to="/register" variant="white" size="lg">
              {t('home.hero.cta')}
              <ArrowRight size={20} aria-hidden="true" />
            </ButtonLink>
            <ButtonLink to="/problems" variant="ghost" size="lg" className="hero__secondary">
              {t('home.hero.secondary')}
            </ButtonLink>
          </div>
          <dl className="hero__stats">
            <div>
              <dt>{t('home.stats.subjects')}</dt>
              <dd>3</dd>
            </div>
            <div>
              <dt>{t('home.stats.levels')}</dt>
              <dd>5</dd>
            </div>
            <div>
              <dt>{t('home.stats.free')}</dt>
              <dd>100%</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="container home-section" aria-labelledby="subjects-title">
        <h2 id="subjects-title" className="home-section__title">
          {t('home.subjects.title')}
        </h2>
        <ul className="subject-grid">
          {SUBJECTS.map(({ key, icon: Icon }) => (
            <li key={key} className={`card subject-card subject-card--${key}`}>
              <span className="subject-card__icon" aria-hidden="true">
                <Icon size={26} />
              </span>
              <h3 className="subject-card__name">{t(`home.subjects.${key}`)}</h3>
              <p className="subject-card__text">{t(`home.subjects.${key}Text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container home-section" aria-labelledby="features-title">
        <h2 id="features-title" className="home-section__title">
          {t('home.features.title')}
        </h2>
        <ul className="feature-grid">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li key={key} className="feature">
              <span className="feature__icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <div>
                <h3 className="feature__title">{t(`home.features.${key}Title`)}</h3>
                <p className="feature__text">{t(`home.features.${key}Text`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="container home-section">
        <div className="ordo-banner">
          <div>
            <h2 className="ordo-banner__title">{t('home.ordo.title')}</h2>
            <p className="ordo-banner__text">{t('home.ordo.text')}</p>
          </div>
          <a className="btn btn--secondary" href={TAPKYCH_ORDO_URL}>
            {t('home.ordo.link')}
            <ExternalLink size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
