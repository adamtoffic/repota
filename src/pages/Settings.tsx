import { SchoolSettingsForm } from "../components/SchoolSettingsForm";
import type { SchoolSettings } from "../types";

interface Props {
  settings: SchoolSettings;
  onSave: (settings: SchoolSettings) => void;
}

export function Settings({ settings, onSave }: Props) {
  return (
    <div className="animate-in fade-in zoom-in-95 mx-auto max-w-2xl duration-200">
      <SchoolSettingsForm initialSettings={settings} onSave={onSave} />
    </div>
  );
}
