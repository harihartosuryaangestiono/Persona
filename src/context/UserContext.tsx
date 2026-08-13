'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPersona } from '@/lib/types';
import { PERMANENT_USERS, normalizeRoles } from '@/lib/rbac';

function getTodayJakartaStr(): string {
  if (typeof Intl === 'undefined') {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

interface UserContextType {
  currentUser: UserPersona;
  setCurrentUser: (user: UserPersona) => void;
  switchUserByName: (name: string) => void;
  allUsers: UserPersona[];
  updateUser: (id: string, updatedData: Partial<UserPersona>) => Promise<{ success: boolean; error?: string }>;
  updateUserPassword: (userId: string, newPassword: string) => void;
  addUser: (newUser: UserPersona) => Promise<{ success: boolean; error?: string }>;
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

  const todayJakartaKey = typeof window !== 'undefined' ? getTodayJakartaStr() : '';
  const [hasCheckedInTodayInternal, setHasCheckedInTodayInternal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const uid = localStorage.getItem('persona_logged_in_user_id');
    if (!uid) return false;
    return localStorage.getItem(`persona_checkedin_${uid}_${todayJakartaKey}`) === '1';
  });
  const [hasSeenWelcomeTodayInternal, setHasSeenWelcomeTodayInternal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const uid = localStorage.getItem('persona_logged_in_user_id');
    if (!uid) return false;
    return localStorage.getItem(`persona_seen_welcome_${uid}_${todayJakartaKey}`) === '1';
  });

  const setHasCheckedInToday = (val: boolean) => {
    setHasCheckedInTodayInternal(val);
    if (typeof window !== 'undefined') {
      const uid = localStorage.getItem('persona_logged_in_user_id') || currentUser.id;
      if (val) {
        localStorage.setItem(`persona_checkedin_${uid}_${todayJakartaKey}`, '1');
      } else {
        localStorage.removeItem(`persona_checkedin_${uid}_${todayJakartaKey}`);
      }
    }
  };

  const setHasSeenWelcomeToday = (val: boolean) => {
    setHasSeenWelcomeTodayInternal(val);
    if (typeof window !== 'undefined') {
      const uid = localStorage.getItem('persona_logged_in_user_id') || currentUser.id;
      if (val) {
        localStorage.setItem(`persona_seen_welcome_${uid}_${todayJakartaKey}`, '1');
      } else {
        localStorage.removeItem(`persona_seen_welcome_${uid}_${todayJakartaKey}`);
      }
    }
  };

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
          roles: normalizeRoles(u.roles),
        }))
      );
      return;
    }

    const mapped: UserPersona[] = dbUsers.map((dbU) => {
      const template = PERMANENT_USERS.find((p) => p.name.toLowerCase() === dbU.name.toLowerCase());
      const customAvatar = avatarsMap[dbU.id];
      const customPassword = passwordsMap[dbU.id];
      const rawRoles: string[] = Array.isArray(dbU.roles) ? dbU.roles : (template?.roles || []);
      const canonicalRoles = normalizeRoles(rawRoles);
      if (template && canonicalRoles.length === 0) {
        canonicalRoles.push(...template.roles);
      }

      return {
        id: dbU.id,
        name: dbU.name,
        email: dbU.email,
        avatar: customAvatar !== undefined ? customAvatar : (dbU.avatar || template?.avatar || ''),
        password: customPassword || dbU.password || template?.name.toLowerCase() || dbU.name.toLowerCase(),
        roles: canonicalRoles,
        monthlyCapacity: (dbU.monthlyCapacity && dbU.monthlyCapacity !== 12000) ? dbU.monthlyCapacity : 16000,
        hourlyPoint: dbU.hourlyPoint || 100,
        costPerPoint: dbU.costPerPoint || 250,
        active: dbU.active !== undefined ? dbU.active : true,
      };
    });

    setUsers(mapped);

    setCurrentUser((current) => {
      const match = mapped.find((m) => m.id === current.id || m.name.toLowerCase() === current.name.toLowerCase());
      if (match) return match;
      return {
        ...current,
        roles: normalizeRoles(current.roles),
      };
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
      localStorage.removeItem(`persona_seen_welcome_${found.id}_${todayJakartaKey}`);
      localStorage.removeItem(`persona_checkedin_${found.id}_${todayJakartaKey}`);
      setHasSeenWelcomeTodayInternal(false);
      setHasCheckedInTodayInternal(false);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('persona_logged_in_user_id');
  };

  const updateUser = async (id: string, updatedData: Partial<UserPersona>): Promise<{ success: boolean; error?: string }> => {
    if (updatedData.avatar !== undefined) {
      const savedAvatars = localStorage.getItem('persona_custom_avatars');
      const map = savedAvatars ? JSON.parse(savedAvatars) : {};
      map[id] = updatedData.avatar;
      localStorage.setItem('persona_custom_avatars', JSON.stringify(map));
    }

    if (updatedData.password !== undefined) {
      const savedPasswords = localStorage.getItem('persona_custom_passwords');
      const map = savedPasswords ? JSON.parse(savedPasswords) : {};
      map[id] = updatedData.password;
      localStorage.setItem('persona_custom_passwords', JSON.stringify(map));
    }

    const serverPayload: Record<string, any> = {};
    if (updatedData.name !== undefined) serverPayload.name = updatedData.name;
    if (updatedData.email !== undefined) serverPayload.email = updatedData.email;
    if (updatedData.avatar !== undefined) serverPayload.avatar = updatedData.avatar;
    if (updatedData.roles !== undefined) serverPayload.roles = normalizeRoles(updatedData.roles);
    if (updatedData.monthlyCapacity !== undefined) serverPayload.monthlyCapacity = updatedData.monthlyCapacity;
    if (updatedData.hourlyPoint !== undefined) serverPayload.hourlyPoint = updatedData.hourlyPoint;
    if (updatedData.costPerPoint !== undefined) serverPayload.costPerPoint = updatedData.costPerPoint;
    if (updatedData.active !== undefined) serverPayload.active = updatedData.active;

    let serverOk = true;
    let serverErr: string | undefined;
    if (Object.keys(serverPayload).length > 0 && typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUser.id || '',
          },
          body: JSON.stringify(serverPayload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          serverOk = false;
          serverErr = j?.error || `Failed to sync (${res.status})`;
        }
      } catch (e: any) {
        serverOk = false;
        serverErr = e?.message || 'Network error syncing to server';
      }
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const merged: any = { ...u, ...updatedData };
          if (updatedData.roles) {
            merged.roles = normalizeRoles(updatedData.roles);
          }
          if (currentUser.id === id) {
            setCurrentUser({ ...merged });
          }
          return merged;
        }
        return u;
      })
    );

    if (!serverOk) {
      return { success: false, error: serverErr };
    }
    return { success: true };
  };

  const updateUserPassword = (userId: string, newPassword: string) => {
    updateUser(userId, { password: newPassword });
  };

  const addUser = async (newUser: UserPersona): Promise<{ success: boolean; error?: string }> => {
    newUser.roles = normalizeRoles(newUser.roles);
    setUsers((prev) => [...prev, newUser]);
    return { success: true };
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
        hasCheckedInToday: hasCheckedInTodayInternal,
        setHasCheckedInToday,
        hasSeenWelcomeToday: hasSeenWelcomeTodayInternal,
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
