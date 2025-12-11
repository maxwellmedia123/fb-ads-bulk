"use client";

import { useAccount } from "@/lib/context/AccountContext";
import { useState, useRef, useEffect } from "react";

export function AccountSwitcher() {
  const { accounts, activeAccount, setActiveAccount, isLoading } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500">Loading accounts...</div>
    );
  }

  if (accounts.length === 0) {
    return (
      <a
        href="/accounts"
        className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
      >
        Connect Ad Account
      </a>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="font-medium">{activeAccount?.name || "Select Account"}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  setActiveAccount(account);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                  activeAccount?.id === account.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    activeAccount?.id === account.id
                      ? "bg-blue-500"
                      : "bg-gray-300"
                  }`}
                />
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-xs text-gray-500">
                    {account.fbAccountId}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200">
            <a
              href="/accounts"
              className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
            >
              Manage Accounts
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
