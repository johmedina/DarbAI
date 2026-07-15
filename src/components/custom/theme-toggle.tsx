import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from '@/context/LanguageContext'

export function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useLanguage()
  return (
    <button
      onClick={toggleTheme}
      aria-label={t('ui.toggleTheme')}
      title={t('ui.toggleTheme')}
      style={{
        width: 36, height: 36, borderRadius: 9,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--ink-2)", border: "1px solid transparent",
        background: "transparent", cursor: "pointer",
        transition: "background .15s, border-color .15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
    >
      {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
