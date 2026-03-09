/**
 * @file tests/utils/renderWithProviders.tsx
 * RTL render wrapper that initialises i18next so every component
 * that calls `useTranslation()` gets valid translations in tests.
 *
 * @example
 * import { renderWithProviders } from '../utils/renderWithProviders';
 * renderWithProviders(<MyComponent />);
 */

import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { type ReactElement } from 'react';

/**
 * Render a React element inside the i18n provider.
 *
 * @param ui - The React element to render
 * @param options - RTL render options (excluding wrapper)
 * @returns RTL RenderResult
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  function Wrapper({ children }: { children: React.ReactNode }): JSX.Element {
    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
