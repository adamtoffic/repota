import { useContext } from "react";
import { SettingsFormContext } from "../context/SettingsFormContextDefinition";

export function useSettingsForm() {
  const context = useContext(SettingsFormContext);

  if (context === undefined) {
    throw new Error("useSettingsForm must be used within a SettingsFormProvider");
  }

  return context;
}
