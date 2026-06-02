import React, { createContext, ReactNode, useContext, useState } from "react";

// 1. Add userName and setUserName to the TypeScript Interface
interface AuthContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  userRole: string | null;
  setUserRole: (role: string | null) => void;
  userName: string | null;
  setUserName: (name: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedInState] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // 2. Create the state to hold the user's name
  const [userName, setUserName] = useState<string | null>(null);

  const setIsLoggedIn = (value: boolean) => {
    console.log("Context is updating isLoggedIn to:", value);
    setIsLoggedInState(value);
  };

  return (
    // 3. Pass the new name variables down through the Provider
    <AuthContext.Provider 
      value={{ 
        isLoggedIn, 
        setIsLoggedIn, 
        userRole, 
        setUserRole, 
        userName, 
        setUserName 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}