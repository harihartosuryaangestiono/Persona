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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserPersona[]>(PERMANENT_USERS);
  const [currentUser, setCurrentUser] = useState<UserPersona>(PERMANENT_USERS[0]);

  const switchUserByName = (name: string) => {
    const found = users.find((u) => u.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setCurrentUser(found);
    }
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
