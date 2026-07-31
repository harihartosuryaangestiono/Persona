'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPersona } from '@/lib/types';
import { PERMANENT_USERS } from '@/lib/rbac';

interface UserContextType {
  currentUser: UserPersona;
  setCurrentUser: (user: UserPersona) => void;
  switchUserByName: (name: string) => void;
  allUsers: UserPersona[];
  updateUser: (id: string, updatedData: Partial<UserPersona>) => void;
  addUser: (newUser: UserPersona) => void;
  isLoggedIn: boolean;
  login: (userId: string, password?: string) => boolean;
  logout: () => void;
  hasCheckedInToday: boolean;
  setHasCheckedInToday: (val: boolean) => void;
  hasSeenWelcomeToday: boolean;
  setHasSeenWelcomeToday: (val: boolean) => void;
  syncUsers: (dbUsers: any[]) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserPersona[]>(PERMANENT_USERS);
  const [currentUser, setCurrentUser] = useState<UserPersona>(PERMANENT_USERS[0]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(false);
  const [hasSeenWelcomeToday, setHasSeenWelcomeToday] = useState<boolean>(false);

  // Sync users from database
  const syncUsers = (dbUsers: any[]) => {
    if (!dbUsers || dbUsers.length === 0) return;
    
    // Map dbUsers to UserPersona format
    const mapped: UserPersona[] = dbUsers.map((dbU) => {
      // Find matching permanent user template for roles and fallbacks
      const template = PERMANENT_USERS.find((p) => p.name.toLowerCase() === dbU.name.toLowerCase());
      return {
        id: dbU.id,
        name: dbU.name,
        email: dbU.email,
        avatar: dbU.avatar || template?.avatar || '',
        roles: Array.isArray(dbU.roles) ? dbU.roles : (template?.roles || []),
        monthlyCapacity: (dbU.monthlyCapacity && dbU.monthlyCapacity !== 12000) ? dbU.monthlyCapacity : 16000,
        hourlyPoint: dbU.hourlyPoint || 100,
        costPerPoint: dbU.costPerPoint || 250,
        active: dbU.active !== undefined ? dbU.active : true,
      };
    });

    setUsers(mapped);

    // Also update currentUser ID if matched by name
    setCurrentUser((current) => {
      const match = mapped.find((m) => m.name.toLowerCase() === current.name.toLowerCase());
      return match || current;
    });
  };

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('persona_logged_in_user_id');
    if (savedUserId) {
      const found = users.find((u) => u.id === savedUserId);
      if (found) {
        setCurrentUser(found);
        setIsLoggedIn(true);
      }
    }
  }, [users]);

  const switchUserByName = (name: string) => {
    const found = users.find((u) => u.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setCurrentUser(found);
    }
  };

  const login = (userId: string, password?: string): boolean => {
    const found = users.find((u) => u.id === userId);
    if (!found) return false;

    // Password is the lowercase name of the employee (e.g. devi, anggi, gigie, dinda, jabin, priska)
    const expectedPassword = found.name.toLowerCase();
    if (password && password.toLowerCase() === expectedPassword) {
      setCurrentUser(found);
      setIsLoggedIn(true);
      localStorage.setItem('persona_logged_in_user_id', found.id);
      
      // Reset welcome seen status for a new login session
      setHasSeenWelcomeToday(false);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('persona_logged_in_user_id');
  };

  const updateUser = (id: string, updatedData: Partial<UserPersona>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, ...updatedData };
          if (currentUser.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
  };

  const addUser = (newUser: UserPersona) => {
    setUsers((prev) => [...prev, newUser]);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchUserByName,
        allUsers: users,
        updateUser,
        addUser,
        isLoggedIn,
        login,
        logout,
        hasCheckedInToday,
        setHasCheckedInToday,
        hasSeenWelcomeToday,
        setHasSeenWelcomeToday,
        syncUsers,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
