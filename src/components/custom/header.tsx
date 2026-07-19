import logo from "@/assets/images/logo.png";
import logoWhite from "@/assets/images/logo-white.png";
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export const Header = () => (
  <div className="flex items-center h-full">
    <HeaderLogo />
  </div>
);

function HeaderLogo() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  return <img src={isDarkMode ? logoWhite : logo} alt={t.header.brand} className="brand-logo" style={{ height: 26, width: "auto" }} />;
 
}

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  const other = lang === 'en' ? 'ar' : 'en';
  const label = other === 'ar' ? t.header.language_ar : t.header.language_en;

  return (
    <button
      onClick={() => setLang(other as any)}
      aria-label={label}
      title={label}
      style={{
        width: 76, height: 36, borderRadius: 9, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-2)', border: '1px solid transparent',
        background: 'transparent', cursor: 'pointer',
        transition: 'background .15s, border-color .15s', fontWeight: 600
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
    >
      {label}
    </button>
  );
}
