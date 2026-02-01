import { X, Shield, Code, Heart } from "lucide-react"; // 👈 Added User icon
import { Modal } from "./ui/Modal";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-h-[90vh] max-w-lg overflow-y-auto">
      <div className="animate-in zoom-in-95 relative p-6 duration-200">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-main text-2xl font-bold">About Repota</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
            <X className="text-muted h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Mission */}
          <div className="flex gap-4">
            <div className="h-fit rounded-full bg-blue-50 p-3">
              <Heart className="text-primary h-6 w-6" />
            </div>
            <div>
              <h3 className="text-main font-bold">Built for Teachers</h3>
              <p className="text-muted mt-1 text-sm">
                Repota is a free, open-source tool designed to help Ghanaian teachers generate
                GES-standard report cards instantly. No internet required after installation.
              </p>
            </div>
          </div>

          {/* Privacy */}
          <div className="flex gap-4">
            <div className="h-fit rounded-full bg-green-50 p-3">
              <Shield className="text-success h-6 w-6" />
            </div>
            <div>
              <h3 className="text-main font-bold">Privacy First</h3>
              <p className="text-muted mt-1 text-sm">
                Your data never leaves your device. All students, grades, and remarks are stored
                locally in your browser. We cannot see or access your school's data.
              </p>
            </div>
          </div>

          {/* Developer Contact (NEW SECTION) */}
          <div className="flex gap-4">
            <img
              src="/developer.jpg"
              alt="Developer Profile"
              loading="lazy" // Lazy load for performance
              className="h-14 w-14 rounded-full border-2 border-purple-100 bg-gray-200 object-cover shadow-sm"
            />
            <div>
              <h3 className="text-main font-bold">Questions or Feedback?</h3>
              <p className="text-muted mt-1 text-sm">
                Hi, I'm <span className="font-semibold text-gray-900">Adam Toffic</span>. I build
                software for Ghanaian schools and businesses. Need help or have suggestions? Reach
                out!
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  /* 🔴 EDIT THIS */
                  href="https://wa.me/233248140806?text=Hi!%20About%20Repota..."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-success inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
                >
                  💬 WhatsApp
                </a>
                <a
                  /* 🔴 EDIT THIS */
                  href="mailto:repota.team@proton.me"
                  className="text-primary inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
                >
                  📧 Email
                </a>
              </div>
            </div>
          </div>

          {/* Open Source */}
          <div className="flex gap-4">
            <div className="h-fit rounded-full bg-gray-50 p-3">
              <Code className="text-muted h-6 w-6" />
            </div>
            <div>
              <h3 className="text-main font-bold">Open Source</h3>
              <p className="text-muted mt-1 text-sm">
                This project is open source. You can view the code, contribute, or suggest features
                on GitHub.
              </p>
              <a
                /* 🔴 EDIT THIS */
                href="https://github.com/adamtoffic/repota"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary mt-2 inline-block text-sm font-bold hover:underline"
              >
                View on GitHub →
              </a>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="bg-main hover:bg-main/90 mt-8 w-full rounded-lg py-3 font-bold text-white transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
