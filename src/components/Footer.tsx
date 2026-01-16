import { useState } from "react";
import { AboutModal } from "./AboutModal";

export function Footer() {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <footer className="text-muted mt-auto border-t border-gray-200 bg-white py-8 text-center text-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-main font-bold">Repota</span>
            <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs">
              v1.0.0 Beta
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowAbout(true)}
              className="transition-colors hover:text-blue-600"
            >
              About & Privacy
            </button>
            <a href="mailto:support@example.com" className="transition-colors hover:text-blue-600">
              Support
            </a>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="text-lg">🇬🇭</span> Made in Ghana
            </span>
          </div>
        </div>
      </footer>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
}
