/**
 * @file tests/setup.ts
 * Global test setup — imported before every test file.
 *
 * Provides:
 * - jest-dom matchers (toBeInTheDocument, etc.)
 * - i18next initialisation in English so assertions can use predictable strings
 */

import '@testing-library/jest-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../src/i18n/en.json';
import fi from '../src/i18n/fi.json';

// Initialise i18n with English as default so test assertions match readable strings.
// Components use t('key'), tests assert against English values.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fi: { translation: fi },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
