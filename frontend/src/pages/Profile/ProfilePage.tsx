import { EyeOff, UserX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { ApiError, errorMessage } from '../../services/api';
import { ratingApi, type PublicProfile } from '../../services/rating';
import { ChangePassword } from './ChangePassword';
import { ProfileSettings } from './ProfileSettings';
import { ProfileView } from './ProfileView';

function useProfile(id: string | undefined) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const reload = useCallback(() => {
    if (!id) return;
    ratingApi
      .profile(id)
      .then((data) => {
        setProfile(data);
        setError(null);
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err : new ApiError('UNKNOWN', errorMessage(err), null)),
      );
  }, [id]);

  return { profile, error, reload };
}

function ProfileSkeleton() {
  return (
    <div className="profile" aria-busy="true">
      <div className="card profile-hero">
        <Skeleton width={72} height={72} radius="50%" />
        <div style={{ flex: 1, display: 'grid', gap: 8 }}>
          <Skeleton width="50%" height="1.6em" />
          <Skeleton width="70%" />
        </div>
      </div>
      <Skeleton height={160} />
    </div>
  );
}

/** /profile — the signed-in user's own profile with settings */
export function ProfilePage() {
  const { user } = useAuth();
  const { profile, error, reload } = useProfile(user?.id);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="container page">
      {error && <Alert tone="error">{error.message}</Alert>}
      {!profile && !error && <ProfileSkeleton />}
      {profile && (
        <ProfileView profile={profile}>
          <ProfileSettings onSaved={reload} />
          <ChangePassword />
        </ProfileView>
      )}
    </div>
  );
}

/** /u/:id — public profile */
export function PublicProfilePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { status } = useAuth();
  const { profile, error, reload } = useProfile(id);

  useEffect(() => {
    // Wait for the session: owners may view their own hidden profile
    if (status !== 'loading') reload();
  }, [reload, status]);

  if (error) {
    const hidden = error.code === 'PROFILE_PRIVATE';
    return (
      <div className="container page">
        <EmptyState
          as="h1"
          icon={hidden ? <EyeOff size={28} /> : <UserX size={28} />}
          title={hidden ? t('profile.hiddenTitle') : t('profile.notFound')}
          description={hidden ? t('profile.hiddenText') : undefined}
          action={<ButtonLink to="/leaderboard">{t('profile.backToLeaderboard')}</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="container page">
      {profile ? <ProfileView profile={profile} /> : <ProfileSkeleton />}
    </div>
  );
}
