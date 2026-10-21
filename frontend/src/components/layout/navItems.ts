import { BookOpen, House, Timer, Trophy, UserRound, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  labelKey:
    | 'common.nav.home'
    | 'common.nav.problems'
    | 'common.nav.leaderboard'
    | 'common.nav.contests'
    | 'common.nav.profile';
  icon: LucideIcon;
  /** Shown in the desktop header (profile lives in the user menu there) */
  desktop: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'common.nav.home', icon: House, desktop: true },
  { to: '/problems', labelKey: 'common.nav.problems', icon: BookOpen, desktop: true },
  { to: '/leaderboard', labelKey: 'common.nav.leaderboard', icon: Trophy, desktop: true },
  { to: '/contests', labelKey: 'common.nav.contests', icon: Timer, desktop: true },
  { to: '/profile', labelKey: 'common.nav.profile', icon: UserRound, desktop: false },
];
