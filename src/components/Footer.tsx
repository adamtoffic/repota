import { useState } from "react";
import { AboutModal } from "./AboutModal";

export function Footer() {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <footer className="text-muted mt-auto border-t border-gray-200 bg-white py-6 text-sm sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Container with responsive layout */}
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-4">
            {/* Brand Section */}
            <div className="flex items-center gap-2">
              <span className="text-main text-base font-bold sm:text-lg">Repota</span>
              <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs">
                v1.0.0
              </span>
            </div>

            {/* Links Section - Responsive Grid */}
            <div className="grid grid-cols-2 gap-3 text-center sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 md:gap-6">
              <button
                onClick={() => setShowAbout(true)}
                className="hover:text-primary whitespace-nowrap transition-colors"
              >
                About & Privacy
              </button>

              {/* WhatsApp Support */}
              <a
                /* 🔴 EDIT THIS: Put your real WhatsApp number below (e.g. 233541234567) */
                href="https://wa.me/233248140806?text=Hi!%20I%20need%20help%20with%20Repota"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-success flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <span>💬</span>
                <span className="hidden sm:inline">WhatsApp Support</span>
                <span className="sm:hidden">WhatsApp</span>
              </a>

              {/* Email */}
              <a
                /* 🔴 EDIT THIS: Put your real email below */
                href="mailto:repota.team@proton.me"
                className="hover:text-primary flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <span>📧</span>
                <span className="hidden sm:inline">Email Us</span>
                <span className="sm:hidden">Email</span>
              </a>

              {/* GitHub */}
              <a
                /* 🔴 EDIT THIS: Put your GitHub username below */
                href="https://github.com/adamtoffic"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-main flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <span>🐙</span>
                <span>GitHub</span>
              </a>

              {/* Made in Ghana - Full width on mobile or inline on desktop */}
              <span className="col-span-2 flex items-center justify-center gap-1.5 text-gray-400 sm:col-span-1">
                <span className="text-lg">🇬🇭</span> Made in Ghana
              </span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Repota. Built with ❤️ for Ghanaian Teachers.
        </div>
      </footer>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
}
