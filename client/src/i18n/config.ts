import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';
import esES from './locales/es-ES.json';

// Define available languages
export const LANGUAGES = {
  'pt-BR': {
    code: 'pt-BR',
    name: 'Português',
    flag: '🇧🇷',
  },
  'en-US': {
    code: 'en-US',
    name: 'English',
    flag: '🇺🇸',
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Español',
    flag: '🇪🇸',
  },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

const resources = {
  'pt-BR': {
    common: ptBR.common,
    navigation: ptBR.navigation,
    dashboard: ptBR.dashboard,
    properties: ptBR.properties,
    leads: ptBR.leads,
    calendar: ptBR.calendar,
    contracts: ptBR.contracts,
    rentals: ptBR.rentals,
    financial: ptBR.financial,
    reports: ptBR.reports,
    settings: ptBR.settings,
    onboarding: ptBR.onboarding,
    errors: ptBR.errors,
    validation: ptBR.validation,
  },
  'en-US': {
    common: enUS.common,
    navigation: enUS.navigation,
    dashboard: enUS.dashboard,
    properties: enUS.properties,
    leads: enUS.leads,
    calendar: enUS.calendar,
    contracts: enUS.contracts,
    rentals: enUS.rentals,
    financial: enUS.financial,
    reports: enUS.reports,
    settings: enUS.settings,
    onboarding: enUS.onboarding,
    errors: enUS.errors,
    validation: enUS.validation,
  },
  'es-ES': {
    common: esES.common,
    navigation: esES.navigation,
    dashboard: esES.dashboard,
    properties: esES.properties,
    leads: esES.leads,
    calendar: esES.calendar,
    contracts: esES.contracts,
    rentals: esES.rentals,
    financial: esES.financial,
    reports: esES.reports,
    settings: esES.settings,
    onboarding: esES.onboarding,
    errors: esES.errors,
    validation: esES.validation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    defaultNS: 'common',
    ns: [
      'common',
      'navigation',
      'dashboard',
      'properties',
      'leads',
      'calendar',
      'contracts',
      'rentals',
      'financial',
      'reports',
      'settings',
      'onboarding',
      'errors',
      'validation',
    ],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
