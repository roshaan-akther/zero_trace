"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { en } from "./translations/en"
import { si } from "./translations/si"
import { ta } from "./translations/ta"
import type { Translations } from "./translations/types"

export type Language = "en" | "si" | "ta"

const translations: Record<Language, Translations> = { en, si, ta }

const LANGUAGE_STORAGE_KEY = "agentrix-language"

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en"
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null
  if (stored && stored in translations) return stored
  return "en"
}

interface I18nContextType {
  lang: Language
  t: Translations
  setLanguage: (lang: Language) => void
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(getInitialLanguage)

  const setLanguage = useCallback((newLang: Language) => {
    setLang(newLang)
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang)
    }
  }, [])

  return (
    <I18nContext.Provider value={{ lang, t: translations[lang], setLanguage }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
