"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface AdAccount {
  id: string;
  fbAccountId: string;
  name: string;
  isActive: boolean;
}

interface AccountContextType {
  accounts: AdAccount[];
  activeAccount: AdAccount | null;
  setActiveAccount: (account: AdAccount | null) => void;
  refreshAccounts: () => Promise<void>;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [activeAccount, setActiveAccountState] = useState<AdAccount | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);

        // Restore active account from localStorage or use first account
        const savedAccountId = localStorage.getItem("activeAccountId");
        const savedAccount = data.accounts?.find(
          (a: AdAccount) => a.id === savedAccountId
        );

        if (savedAccount) {
          setActiveAccountState(savedAccount);
        } else if (data.accounts?.length > 0) {
          setActiveAccountState(data.accounts[0]);
          localStorage.setItem("activeAccountId", data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveAccount = (account: AdAccount | null) => {
    setActiveAccountState(account);
    if (account) {
      localStorage.setItem("activeAccountId", account.id);
    } else {
      localStorage.removeItem("activeAccountId");
    }
  };

  useEffect(() => {
    refreshAccounts();
  }, []);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccount,
        setActiveAccount,
        refreshAccounts,
        isLoading,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}
