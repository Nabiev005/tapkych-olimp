import { Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import type { LeaderboardRow } from '../../services/rating';
import { formatNumber } from '../../utils/format';
import { pickName } from '../../utils/localize';
import { LevelBadge } from './LevelBadge';

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  currentUserId?: string;
  /** The viewer's place when it's not on this page */
  me?: { rank: number; points: number } | null;
}

function RankCell({ rank }: { rank: number }) {
  return (
    <span className={`rank${rank <= 3 ? ` rank--top rank--${rank}` : ''}`}>
      {rank <= 3 && <Crown size={14} aria-hidden="true" />}
      {rank}
    </span>
  );
}

export function LeaderboardTable({ rows, currentUserId, me }: LeaderboardTableProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const meOnPage = rows.some((r) => r.user.id === currentUserId);

  return (
    <div className="table-wrap">
      <table className="leaderboard">
        <thead>
          <tr>
            <th scope="col" className="leaderboard__rank">
              {t('leaderboard.columns.rank')}
            </th>
            <th scope="col">{t('leaderboard.columns.student')}</th>
            <th scope="col" className="leaderboard__school">
              {t('leaderboard.columns.school')}
            </th>
            <th scope="col" className="leaderboard__points">
              {t('leaderboard.columns.points')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isMe = row.user.id === currentUserId;
            const name = row.user.fullName ?? t('leaderboard.anonymous');
            return (
              <tr key={row.user.id} className={isMe ? 'is-me' : undefined}>
                <td className="leaderboard__rank">
                  <RankCell rank={row.rank} />
                </td>
                <td>
                  <div className="leaderboard__user">
                    {row.user.isPublic && row.user.fullName ? (
                      <Link to={`/u/${row.user.id}`} className="leaderboard__name">
                        {name}
                      </Link>
                    ) : (
                      <span className="leaderboard__name is-anon">{name}</span>
                    )}
                    {isMe && <span className="badge badge--primary">{t('leaderboard.you')}</span>}
                    <span className="leaderboard__sub">
                      <LevelBadge level={row.user.level} />
                      {row.user.grade && t('auth.fields.gradeOption', { grade: row.user.grade })}
                    </span>
                  </div>
                </td>
                <td className="leaderboard__school">
                  {row.user.school ? pickName(row.user.school, language) : '—'}
                  {row.user.region && (
                    <span className="leaderboard__region">
                      {pickName(row.user.region, language)}
                    </span>
                  )}
                </td>
                <td className="leaderboard__points">{formatNumber(row.points, language)}</td>
              </tr>
            );
          })}
        </tbody>
        {me && !meOnPage && (
          <tfoot>
            <tr className="is-me">
              <td className="leaderboard__rank">
                <RankCell rank={me.rank} />
              </td>
              <td colSpan={2}>{t('leaderboard.yourPlace')}</td>
              <td className="leaderboard__points">{formatNumber(me.points, language)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
