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
  updateUserPassword: (userId: string, newPassword: string) => void;
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

  // Sync users from database & apply localStorage overrides
  const syncUsers = (dbUsers: any[]) => {
    const savedAvatars = typeof window !== 'undefined' ? localStorage.getItem('persona_custom_avatars') : null;
    const avatarsMap = savedAvatars ? JSON.parse(savedAvatars) : {};
    const savedPasswords = typeof window !== 'undefined' ? localStorage.getItem('persona_custom_passwords') : null;
    const passwordsMap = savedPasswords ? JSON.parse(savedPasswords) : {};

    if (!dbUsers || dbUsers.length === 0) {
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          avatar: avatarsMap[u.id] !== undefined ? avatarsMap[u.id] : u.avatar,
          password: passwordsMap[u.id] || u.password || u.name.toLowerCase(),
        }))
      );
      return;
    }

    const mapped: UserPersona[] = dbUsers.map((dbU) => {
      const template = PERMANENT_USERS.find((p) => p.name.toLowerCase() === dbU.name.toLowerCase());
      const customAvatar = avatarsMap[dbU.id];
      const customPassword = passwordsMap[dbU.id];

      return {
        id: dbU.id,
        name: dbU.name,
        email: dbU.email,
        avatar: customAvatar !== undefined ? customAvatar : (dbU.avatar || template?.avatar || ''),
        password: customPassword || dbU.password || template?.name.toLowerCase() || dbU.name.toLowerCase(),
        roles: Array.isArray(dbU.roles) ? dbU.roles : (template?.roles || []),
        monthlyCapacity: (dbU.monthlyCapacity && dbU.monthlyCapacity !== 12000) ? dbU.monthlyCapacity : 16000,
        hourlyPoint: dbU.hourlyPoint || 100,
        costPerPoint: dbU.costPerPoint || 250,
        active: dbU.active !== undefined ? dbU.active : true,
      };
    });

    setUsers(mapped);

    setCurrentUser((current) => {
      const match = mapped.find((m) => m.id === current.id || m.name.toLowerCase() === current.name.toLowerCase());
      return match || current;
    });
  };

  // Load auth state & custom avatars/passwords on mount
  useEffect(() => {
    const savedAvatars = localStorage.getItem('persona_custom_avatars');
    const avatarsMap = savedAvatars ? JSON.parse(savedAvatars) : {};
    const savedPasswords = localStorage.getItem('persona_custom_passwords');
    const passwordsMap = savedPasswords ? JSON.parse(savedPasswords) : {};

    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        avatar: avatarsMap[u.id] !== undefined ? avatarsMap[u.id] : u.avatar,
        password: passwordsMap[u.id] || u.password || u.name.toLowerCase(),
      }))
    );

    const savedUserId = localStorage.getItem('persona_logged_in_user_id');
    if (savedUserId) {
      const found = PERMANENT_USERS.find((u) => u.id === savedUserId);
      if (found) {
        const customAvatar = avatarsMap[found.id];
        const customPassword = passwordsMap[found.id];
        setCurrentUser({
          ...found,
          avatar: customAvatar !== undefined ? customAvatar : found.avatar,
          password: customPassword || found.name.toLowerCase(),
        });
        setIsLoggedIn(true);
      }
    }
  }, []);

  const switchUserByName = (name: string) => {
    const found = users.find((u) => u.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setCurrentUser(found);
    }
  };

  const login = (userId: string, password?: string): boolean => {
    const found = users.find((u) => u.id === userId);
    if (!found) return false;

    const savedPasswords = localStorage.getItem('persona_custom_passwords');
    const passwordsMap = savedPasswords ? JSON.parse(savedPasswords) : {};
    const expectedPassword = passwordsMap[found.id] || found.password || found.name.toLowerCase();

    if (password && password.toLowerCase() === expectedPassword.toLowerCase()) {
      setCurrentUser(found);
      setIsLoggedIn(true);
      localStorage.setItem('persona_logged_in_user_id', found.id);
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
    // Persist custom avatar if updated
    if (updatedData.avatar !== undefined) {
      const savedAvatars = localStorage.getItem('persona_custom_avatars');
      const map = savedAvatars ? JSON.parse(savedAvatars) : {};
      map[id] = updatedData.avatar;
      localStorage.setItem('persona_custom_avatars', JSON.stringify(map));
    }

    // Persist custom password if updated
    if (updatedData.password !== undefined) {
      const savedPasswords = localStorage.getItem('persona_custom_passwords');
      const map = savedPasswords ? JSON.parse(savedPasswords) : {};
      map[id] = updatedData.password;
      localStorage.setItem('persona_custom_passwords', JSON.stringify(map));
    }

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

  const updateUserPassword = (userId: string, newPassword: string) => {
    updateUser(userId, { password: newPassword });
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
        updateUserPassword,
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
