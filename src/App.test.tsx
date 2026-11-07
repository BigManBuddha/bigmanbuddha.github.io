// @vitest-environment jsdom
/* Smoke test: the real app renders and the main journey works end to end. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { SlateProvider } from './state/SlateProvider';

const renderApp = () => render(<SlateProvider><App /></SlateProvider>);

describe('App', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('first run shows the welcome, then the sample caseload', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Welcome to Slate.' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Explore with sample data' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/clients need you this week/);
    expect(screen.getByText('Grace P.')).toBeTruthy();
  });

  it('navigates between screens', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Explore with sample data' }));
    fireEvent.click(screen.getAllByRole('button', { name: /Forecast/ })[0]);
    expect(screen.getByRole('heading', { name: 'Forecast' })).toBeTruthy();
  });

  it('saves to this device and reloads', () => {
    const first = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Explore with sample data' }));
    first.unmount();
    renderApp();
    expect(screen.getByText('Grace P.')).toBeTruthy();
  });
});
