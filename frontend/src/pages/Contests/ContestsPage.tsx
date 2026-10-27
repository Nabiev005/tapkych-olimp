import { CalendarClock, CheckCircle2, Plus, Timer as TimerIcon, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { usePermissions } from '../../hooks/usePermissions';
import { errorMessage } from '../../services/api';
import { contestsApi, type ContestListItem, type ContestPhase } from '../../services/contests';
import { formatDateTime } from '../../utils/format';
import { pickText } from '../../utils/localize';
import './Contests.css';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function ContestsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('contests.title'));
  const { language } = useLanguage();
  const { status } = useAuth();
  const { can } = usePermissions();
  const [contests, setContests] = useState<ContestListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ContestPhase | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    let cancelled = false;
    contestsApi
      .list()
      .then((data) => !cancelled && setContests(data))
      .catch((err: unknown) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [status]);

  const groups = useMemo(() => {
    const by = (phase: ContestPhase) => (contests ?? []).filter((c) => c.phase === phase);
    return {
      live: by('live'),
      upcoming: by('upcoming').sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      finished: by('finished'),
    };
  }, [contests]);

  // Default tab: live if something is running, else upcoming
  const active: ContestPhase = tab ?? (groups.live.length > 0 ? 'live' : 'upcoming');
  const list = groups[active];

  return (
    <div className="container page">
      <header className="page-header contests-header">
        <div>
          <h1 className="page-header__title">{t('contests.title')}</h1>
          <p className="page-header__subtitle">{t('contests.subtitle')}</p>
        </div>
        {can('contests:createPublic') && (
          <ButtonLink to="/contests/new">
            <Plus size={18} aria-hidden="true" />
            {t('contests.create')}
          </ButtonLink>
        )}
      </header>

      <Tabs
        label={t('contests.phaseLabel')}
        value={active}
        onChange={setTab}
        options={[
          { value: 'live', label: t('contests.tabs.live', { count: groups.live.length }) },
          {
            value: 'upcoming',
            label: t('contests.tabs.upcoming', { count: groups.upcoming.length }),
          },
          {
            value: 'finished',
            label: t('contests.tabs.finished', { count: groups.finished.length }),
          },
        ]}
      />

      <div className="contests-list">
        {error && <Alert tone="error">{error}</Alert>}
        {!contests && !error && <Skeleton height={120} radius="16px" />}
        {contests && list.length === 0 && (
          <EmptyState icon={<TimerIcon size={28} />} title={t(`contests.empty.${active}`)} />
        )}
        {list.map((c) => (
          <article key={c.id} className={`card contest-card contest-card--${c.phase}`}>
            <div className="contest-card__top">
              <Badge
                tone={
                  c.phase === 'live' ? 'success' : c.phase === 'upcoming' ? 'primary' : 'neutral'
                }
              >
                {t(`contests.phase.${c.phase}`)}
              </Badge>
              {c.class && (
                <Badge tone="accent">{t('contests.classContest', { name: c.class.name })}</Badge>
              )}
              {c.registered && (
                <span className="contest-card__registered">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {t('contests.registered')}
                </span>
              )}
            </div>
            <h2 className="contest-card__title">
              <Link to={`/contests/${c.id}`} className="contest-card__link">
                {pickText(c.titleKy, c.titleRu, language).text}
              </Link>
            </h2>
            <p className="contest-card__meta">
              <span>
                <CalendarClock size={16} aria-hidden="true" />
                {formatDateTime(c.startsAt, language)} — {formatDateTime(c.endsAt, language)}
              </span>
              <span>
                <TimerIcon size={16} aria-hidden="true" />
                {t('contests.duration', { minutes: c.durationMinutes })}
              </span>
              <span>
                <Users size={16} aria-hidden="true" />
                {t('contests.participants', { count: c.participantCount })}
              </span>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
