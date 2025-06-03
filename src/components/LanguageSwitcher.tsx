import { locales, defaultLocale } from '@/configs';

const LanguageSwitcher = ({ currentLanguage }: { currentLanguage: string }) => {
  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost rounded-field">
        {currentLanguage.toUpperCase()}
      </div>
      <ul className="menu dropdown-content bg-base-200 text-neutral rounded-box z-1 mt-4 w-52 p-2 shadow-sm">
        {locales.map((locale) => (
          <li key={locale.value}>
            <a href={`/${locale.value === defaultLocale ? '' : locale.value}`}>
              {locale.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LanguageSwitcher;
