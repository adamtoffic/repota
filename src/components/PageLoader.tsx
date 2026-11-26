// src/components/PageLoader.tsx
import { GraduationCap } from "lucide-react";

export const PageLoader = () => (
  <div className="bg-background flex min-h-dvh items-center justify-center">
    <div className="animate-fade-in flex flex-col items-center gap-6">
      <div className="relative">
        {/* Spinning Ring */}
        <div className="border-border border-t-primary h-20 w-20 animate-spin rounded-full border-4" />
        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-gradient-to-br from-amber-400 to-amber-500 p-3">
            <GraduationCap className="h-6 w-6 text-blue-900" />
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-primary-text text-lg font-bold">Loading Repota...</p>
        <p className="text-muted text-sm">Preparing your workspace</p>
      </div>
    </div>
  </div>
);
