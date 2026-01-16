import { X, Shield, Code, Heart } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in-95 w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-main text-xl font-bold">About Repota</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X className="text-muted h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] space-y-6 overflow-y-auto p-6">
          {/* Mission */}
          <div className="flex gap-4">
            <div className="h-fit rounded-full bg-blue-50 p-3">
              <Code className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-main font-bold">Built for Teachers</h3>
              <p className="mt-1 text-sm text-gray-600">
                This tool was designed to help Ghanaian teachers generate professional reports in
                minutes, not days. It is currently in <strong>Beta (v0.1.0)</strong>.
              </p>
            </div>
          </div>

          {/* Privacy */}
          <div className="flex gap-4">
            <div className="h-fit rounded-full bg-green-50 p-3">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-main font-bold">Privacy First</h3>
              <p className="mt-1 text-sm text-gray-600">
                <strong>Your data never leaves this device.</strong> <br />
                We do not have servers, databases, or tracking scripts. Everything is stored locally
                in your browser. If you clear your browser cache, you lose your data—so please use
                the Backup feature regularly!
              </p>
            </div>
          </div>

          {/* Credits */}
          <div className="text-muted bg-background rounded-lg p-4 text-center text-sm">
            <p className="flex items-center justify-center gap-1">
              Made with <Heart className="h-3 w-3 fill-red-500 text-red-500" /> in Ghana
            </p>
            <p className="mt-1">© 2026 Repota</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background flex justify-end rounded-b-xl p-4">
          <button
            onClick={onClose}
            className="bg-primary rounded-lg px-4 py-2 font-medium text-white hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
