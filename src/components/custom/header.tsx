import logo from "@/assets/images/logo.png";
import { useLanguage } from "@/context/LanguageContext";

export const Header = () => {
  const { lang, setLang, t } = useLanguage();

  const toggle = () => setLang(lang === "en" ? "ar" : "en");

  return (
    <div className="flex items-center h-full" style={{ width: "100%", justifyContent: "space-between" }}>
      <img src={logo} alt={t("header.logoAlt")} style={{ height: 26, width: "auto" }} />
      <div style={{ marginLeft: "auto" }}>
        <button
          onClick={toggle}
          aria-label={t('header.switchLanguage')}
          title={t('header.switchLanguage')}
          style={{
            height: 34, padding: "0 10px", borderRadius: 9, border: "1px solid var(--line)",
            background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8
          }}
        >
          <span style={{ fontWeight: 600 }}>{lang === "en" ? t("header.langAr") : t("header.langEn")}</span>
        </button>
      </div>
    </div>
  );
};
