import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';
import { useAuthStore } from '@/stores/auth';
import '@testing-library/jest-dom';

const resetAuthStore = () => {
  useAuthStore.setState((state) => ({
    ...state,
    user: null,
    accessToken: null,
    role: null,
  }));
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('redirects unauthenticated users to login', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/today" element={<div>Dashboard</div>} />
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
      user: { id: 'test-user' },
      accessToken: 'token',
    }));

    render(
      <MemoryRouter initialEntries={['/today']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/today" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
