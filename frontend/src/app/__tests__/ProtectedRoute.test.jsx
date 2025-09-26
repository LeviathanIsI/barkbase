import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';
import { useAuthStore } from '@/stores/auth';
import '@testing-library/jest-dom';

const resetAuthStore = () => {
  useAuthStore.setState((state) => ({
    ...state,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    role: null,
  }));
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('redirects unauthenticated users to login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders child route when authenticated', () => {
    useAuthStore.setState((state) => ({
      ...state,
      accessToken: 'token',
      expiresAt: Date.now() + 60_000,
    }));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
