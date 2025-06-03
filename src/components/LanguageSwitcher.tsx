import { locales, defaultLocale } from '@/configs';

const stripLocalePrefix = (path: string) => {
  const [, first] = path.split('/');
  return locales.some((l) => l.value === first)
    ? path.split('/').slice(2).join('/')
    : path.slice(1);
};

const LanguageSwitcher = ({
  currentLanguage,
  currentPath,
}: {
  currentLanguage: string;
  currentPath: string;
}) => {
  const normalizedPath = stripLocalePrefix(currentPath);

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost rounded-field">
        {currentLanguage.toUpperCase()}
      </div>
      <ul className="menu dropdown-content bg-base-200 text-neutral rounded-box z-1 mt-4 w-52 p-2 shadow-sm">
        {locales.map((locale) => (
          <li key={locale.value}>
            <a
              href={
                locale.value === defaultLocale
                  ? `/${normalizedPath}`
                  : `/${locale.value}/${normalizedPath}`
              }
            >
              {locale.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LanguageSwitcher;
