import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TRANSLATIONS, type Lang } from "@/translations";

type LanguageContextValue = {
    lang: Lang;
    setLang: (l: Lang) => void;
    t: (path: string) => any;
    dir: "ltr" | "rtl";
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lang, setLangState] = useState<Lang>(() => {
        try {
            const stored = localStorage.getItem("salama-lang") as Lang | null;
            if (stored && Object.prototype.hasOwnProperty.call(TRANSLATIONS, stored)) return stored;
        } catch (e) { }
        if (typeof navigator !== "undefined") {
            const nav = navigator.language || (navigator as any).userLanguage || "en";
            if (nav.startsWith("ar")) return "ar";
        }
        return "en";
    });

    const setLang = (l: Lang) => {
        setLangState(l);
        try { localStorage.setItem("salama-lang", l); } catch (e) { }
    };

    useEffect(() => {
        const dir = lang === "ar" ? "rtl" : "ltr";
        if (typeof document !== "undefined") {
            document.documentElement.lang = lang;
            document.documentElement.dir = dir;
        }
    }, [lang]);

    const t = (path: string) => {
        const parts = path.split(".");
        let cur: any = TRANSLATIONS[lang] || TRANSLATIONS.en;
        for (const p of parts) {
            if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
            else return path;
        }
        return cur;
    };

    const value = useMemo(() => ({ lang, setLang, t, dir: (lang === "ar" ? "rtl" : "ltr") as "ltr" | "rtl" }), [lang]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
    const c = useContext(LanguageContext);
    if (!c) throw new Error("useLanguage must be used within LanguageProvider");
    return c;
};
