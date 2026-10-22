import { EyeOff, MapPin, School as SchoolIcon, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AchievementGrid } from '../../components/olimp/AchievementGrid';
import { ActivityCalendar } from '../../components/olimp/ActivityCalendar';
import { LevelProgress } from '../../components/olimp/LevelProgress';
import { SolvedBarChart } from '../../components/olimp/StatsCharts';
import { StreakFlame } from '../../components/olimp/StreakFlame';
import { useLanguage } from '../../hooks/useLanguage';
import type { PublicProfile } from '../../services/rating';
import { formatDate, formatNumber } from '../../utils/format';
import { pickName } from '../../utils/localize';
import './Profile.css';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** Profile content shared by /profile (own) and /u/:id (public). */
export function ProfileView({
  profile,
  children,
}: {
  profile: PublicProfile;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <div className="profile">
      <section className="card profile-hero">
        <span className="profile-hero__avatar" aria-hidden="true">
          {initials(profile.fullName)}
        </span>
        <div className="profile-hero__info">
          <h1 className="profile-hero__name">{profile.fullName}</h1>
          <p className="profile-hero__meta">
            <span>{t(`auth.roles.${profile.role}`)}</span>
            {profile.grade && <span>{t('auth.fields.gradeOption', { grade: profile.grade })}</span>}
            {profile.school && (
              <span>
                <SchoolIcon size={14} aria-hidden="true" />
                {pickName(profile.school, language)}
              </span>
            )}
            {profile.region && (
              <span>
                <MapPin size={14} aria-hidden="true" />
                {pickName(profile.region, language)}
              </span>
            )}
          </p>
          <p className="profile-hero__since">
            {t('profile.memberSince', { date: formatDate(profile.memberSince, language) })}
          </p>
          {profile.isOwner && !profile.isProfilePublic && (
            <p className="profile-hero__private">
              <EyeOff size={14} aria-hidden="true" />
              {t('profile.privateNotice')}
            </p>
          )}
        </div>
      </section>

      <div className="profile-stats">
        <section className="card profile-stat">
          <LevelProgress
            level={profile.level}
            totalPoints={profile.totalPoints}
            progress={profile.levelProgress.progress}
            pointsToNext={profile.levelProgress.pointsToNext}
            nextLevel={profile.levelProgress.nextLevel}
          />
        </section>
        <section className="card profile-stat">
          <StreakFlame days={profile.currentStreak} longest={profile.longestStreak} />
        </section>
        <section className="card profile-stat profile-stat--numbers">
          <div>
            <span className="profile-stat__value">
              {formatNumber(profile.totalSolved, language)}
            </span>
            <span className="profile-stat__label">{t('profile.solved')}</span>
          </div>
          <div>
            <span className="profile-stat__value">
              <Trophy size={20} aria-hidden="true" />
              {profile.rank ? formatNumber(profile.rank, language) : '—'}
            </span>
            <span className="profile-stat__label">{t('profile.rank')}</span>
          </div>
        </section>
      </div>

      <section className="card profile-section">
        <h2 className="section-title">{t('profile.stats.title')}</h2>
        <div className="profile-charts">
          <SolvedBarChart
            title={t('profile.stats.bySubject')}
            data={profile.solvedBySubject.map((s) => ({
              label: pickName(s, language),
              value: s.count,
            }))}
          />
          <SolvedBarChart
            title={t('profile.stats.byDifficulty')}
            data={profile.solvedByDifficulty.map((d) => ({
              label: t('problems.difficulty.option', { value: d.difficulty }),
              value: d.count,
            }))}
          />
        </div>
      </section>

      <section className="card profile-section">
        <h2 className="section-title">{t('profile.activity.title')}</h2>
        <ActivityCalendar
          from={profile.activity.from}
          to={profile.activity.to}
          days={profile.activity.days}
        />
      </section>

      <section className="card profile-section">
        <h2 className="section-title">{t('profile.achievements.title')}</h2>
        <AchievementGrid achievements={profile.achievements} />
      </section>

      {children}
    </div>
  );
}
