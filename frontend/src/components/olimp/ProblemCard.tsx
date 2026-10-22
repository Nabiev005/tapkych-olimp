import { CheckCircle2, CircleDot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import type { ProblemCard as ProblemCardData } from '../../services/problems';
import { pickName, pickText } from '../../utils/localize';
import { DifficultyStars } from './DifficultyStars';
import { OlympiadBadge } from './OlympiadBadge';
import './olimp.css';

export function ProblemCard({ problem }: { problem: ProblemCardData }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const title = pickText(problem.titleKy, problem.titleRu, language);

  return (
    <article className={`problem-card${problem.userStatus === 'SOLVED' ? ' is-solved' : ''}`}>
      <div className="problem-card__top">
        <span className="problem-card__subject">
          {pickName(problem.subject, language)} · {pickName(problem.topic, language)}
        </span>
        {problem.userStatus === 'SOLVED' && (
          <span className="problem-card__status is-solved">
            <CheckCircle2 size={16} aria-hidden="true" />
            {t('problems.card.solved')}
          </span>
        )}
        {problem.userStatus === 'ATTEMPTED' && (
          <span className="problem-card__status">
            <CircleDot size={16} aria-hidden="true" />
            {t('problems.card.attempted')}
          </span>
        )}
      </div>

      <h3 className="problem-card__title">
        {/* Stretched link: the whole card is clickable */}
        <Link to={`/problems/${problem.slug}`} className="problem-card__link">
          {title.text}
        </Link>
      </h3>

      <div className="problem-card__meta">
        <DifficultyStars value={problem.difficulty} />
        <OlympiadBadge level={problem.olympiadLevel} />
      </div>

      <div className="problem-card__footer">
        <span className="problem-card__points">
          {t('problems.card.points', { points: problem.maxPoints })}
        </span>
        <span className="problem-card__percent">
          {problem.solvedPercent === null
            ? t('problems.card.noAttempts')
            : t('problems.card.solvedPercent', { percent: problem.solvedPercent })}
        </span>
      </div>
    </article>
  );
}
