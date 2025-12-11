"use client";

import { useAccount } from "@/lib/context/AccountContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function Dashboard() {
  const { activeAccount, accounts, isLoading } = useAccount();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // No accounts connected yet
  if (accounts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to FB Ads Bulk
            </h2>
            <p className="text-gray-600 mb-6">
              Connect your Facebook Ad Account to get started with bulk uploading ads.
            </p>
            <Link href="/accounts">
              <Button>Connect Facebook Ad Account</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {activeAccount
            ? `Managing: ${activeAccount.name}`
            : "Select an ad account to get started"}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/launch" className="block">
          <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Launch Ads</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Create and launch new ads to your ad sets
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/launch/csv" className="block">
          <Card className="hover:border-green-300 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">CSV Upload</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Bulk upload ads from a spreadsheet
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/media" className="block">
          <Card className="hover:border-purple-300 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Media Library</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Manage your images and videos
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/copy" className="block">
          <Card className="hover:border-orange-300 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Copy Templates</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Save and reuse ad copy
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Stats / Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Quick Stats"
            description="Overview of your ad account"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">-</div>
              <div className="text-sm text-gray-500">Ads Launched</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">-</div>
              <div className="text-sm text-gray-500">Media Assets</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">-</div>
              <div className="text-sm text-gray-500">Copy Templates</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">-</div>
              <div className="text-sm text-gray-500">Active Ad Sets</div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent Activity"
            description="Your latest ad launches"
            action={
              <Link
                href="/ads"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all
              </Link>
            }
          />
          <div className="text-center py-8 text-gray-500">
            No recent activity
          </div>
        </Card>
      </div>
    </div>
  );
}
