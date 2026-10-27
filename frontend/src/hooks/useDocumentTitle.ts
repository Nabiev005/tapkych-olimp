import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'Тапкыч Олимп';
const DEFAULT_TITLE = 'Тапкыч Олимп — олимпиадага даярдоо платформасы';
const ORIGIN = 'https://olimp.tapkych.com';

/**
 * Per-page <title> and canonical URL (search engines and browser tabs).
 * Pass undefined while data is loading to keep the default title.
 */
export function useDocumentTitle(title?: string | null) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title ? `${title} — ${SITE}` : DEFAULT_TITLE;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = `${ORIGIN}${pathname === '/' ? '/' : pathname}`;
  }, [title, pathname]);
}
