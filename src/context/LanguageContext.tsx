import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import translations, { Language } from "@/lib/translations";

type Lang = Language;

// Use a permissive type for `t` to avoid cross-module structural type
// mismatches during incremental edits. This keeps intellisense usable
// while we finish adding/adjusting translation keys across the repo.
type TranslationsType = any;

interface LanguageContextValue {
    lang: Lang;
    setLang: (l: Lang) => void;
    t: TranslationsType;
    dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => {
        try {
            const stored = localStorage.getItem("lang");
            if (stored === "en" || stored === "ar") return stored as Lang;
        } catch { }
        return "en";
    });

    const setLang = (l: Lang) => {
        setLangState(l);
    };

    useEffect(() => {
        try { localStorage.setItem("lang", lang); } catch { }
        const doc = document.documentElement;
        doc.lang = lang;
        doc.dir = lang === "ar" ? "rtl" : "ltr";
    }, [lang]);

    const value = useMemo(
        () => ({ lang, setLang, t: translations[lang], dir: (lang === "ar" ? "rtl" : "ltr") as "ltr" | "rtl" }),
        [lang]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
    return ctx;
}