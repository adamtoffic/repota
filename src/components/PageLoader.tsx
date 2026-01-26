// src/components/PageLoader.tsx
import { GraduationCap } from "lucide-react";

export const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-blue-50">
    <div className="animate-fade-in flex flex-col items-center gap-6">
      <div className="relative">
        {/* Spinning Ring */}
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 p-3">
            <GraduationCap className="h-6 w-6 text-blue-900" />
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-blue-900">Loading Repota...</p>
        <p className="text-sm text-gray-600">Preparing your dashboard</p>
      </div>
    </div>
  </div>
);
