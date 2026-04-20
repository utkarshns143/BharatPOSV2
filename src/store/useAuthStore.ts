import { create } from 'zustand';
import type { AppUser } from '../types';

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,         // Starts as null (not logged in)
  isLoading: true,    // Starts as true while Firebase checks the session
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
}));