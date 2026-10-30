import {
  BookOpen,
  GraduationCap,
  House,
  Timer,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  labelKey:
    | 'common.nav.home'
    | 'common.nav.problems'
    | 'common.nav.theory'
    | 'common.nav.leaderboard'
    | 'common.nav.contests'
    | 'common.nav.profile';
  icon: LucideIcon;
  /** Shown in the desktop header (profile lives in the user menu there) */
  desktop: boolean;
  /** Shown in the mobile bottom bar (limited to 5 items) */
  mobile: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'common.nav.home', icon: House, desktop: true, mobile: true },
  { to: '/problems', labelKey: 'common.nav.problems', icon: BookOpen, desktop: true, mobile: true },
  {
    to: '/theory',
    labelKey: 'common.nav.theory',
    icon: GraduationCap,
    desktop: true,
    mobile: false,
  },
  {
    to: '/leaderboard',
    labelKey: 'common.nav.leaderboard',
    icon: Trophy,
    desktop: true,
    mobile: true,
  },
  { to: '/contests', labelKey: 'common.nav.contests', icon: Timer, desktop: true, mobile: true },
  { to: '/profile', labelKey: 'common.nav.profile', icon: UserRound, desktop: false, mobile: true },
];
