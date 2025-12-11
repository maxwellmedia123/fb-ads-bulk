"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "@/lib/context/AccountContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface AccountDetails {
  id: string;
  fbAccountId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  facebookPages?: { id: string; fbPageId: string; name: string }[];
  instagramAccounts?: { id: string; igAccountId: string; username: string }[];
}

function AccountsContent() {
  const searchParams = useSearchParams();
  const { refreshAccounts } = useAccount();
  const [accounts, setAccounts] = useState<AccountDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      setMessage({ type: "success", text: "Ad account connected successfully!" });
      refreshAccounts();
    } else if (error) {
      setMessage({ type: "error", text: error });
    }

    // Clear message after 5 seconds
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [searchParams, refreshAccounts]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts/details");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/accounts/connect";
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this ad account?")) {
      return;
    }

    try {
      const response = await fetch(`/api/accounts?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAccounts(accounts.filter((a) => a.id !== id));
        refreshAccounts();
        setMessage({ type: "success", text: "Account disconnected" });
      }
    } catch (error) {
      console.error("Error disconnecting account:", error);
      setMessage({ type: "error", text: "Failed to disconnect account" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Accounts</h1>
          <p className="text-gray-600 mt-1">
            Connect and manage your Facebook Ad accounts
          </p>
        </div>
        <Button onClick={handleConnect}>
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Connect Facebook Account
        </Button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Accounts List */}
      {isLoading ? (
        <Card>
          <div className="text-center py-8 text-gray-500">Loading accounts...</div>
        </Card>
      ) : accounts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No ad accounts connected
            </h3>
            <p className="text-gray-500 mb-6">
              Connect your Facebook Ad Account to start managing ads
            </p>
            <Button onClick={handleConnect}>Connect Account</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {account.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Account ID: {account.fbAccountId}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Connected {new Date(account.createdAt).toLocaleDateString()}
                    </p>

                    {/* Pages */}
                    {account.facebookPages && account.facebookPages.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          Facebook Pages:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {account.facebookPages.map((page) => (
                            <span
                              key={page.id}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {page.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Instagram Accounts */}
                    {account.instagramAccounts &&
                      account.instagramAccounts.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Instagram Accounts:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {account.instagramAccounts.map((ig) => (
                              <span
                                key={ig.id}
                                className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded"
                              >
                                @{ig.username}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect(account.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader
          title="Need Help?"
          description="Setting up your Facebook Marketing API access"
        />
        <div className="text-sm text-gray-600 space-y-2">
          <p>To use this app, you need a Meta Developer App with Marketing API access:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to developers.facebook.com/apps and create a new app</li>
            <li>Choose &quot;Business&quot; as the app type</li>
            <li>Add the &quot;Marketing API&quot; product</li>
            <li>Complete Business Verification for Advanced Access</li>
            <li>Add your App ID and Secret to this app&apos;s environment variables</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <AccountsContent />
    </Suspense>
  );
}
