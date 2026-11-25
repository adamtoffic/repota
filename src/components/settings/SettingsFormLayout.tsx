import { Outlet } from "@tanstack/react-router";
import { SettingsFormProvider } from "../../context/SettingsFormContext";

/**
 * Route layout isolating `SettingsFormProvider` to `/sba` and `/settings/*` routes
 * so root Dashboard boot does not eagerly pull settings form draft state.
 */
export default function SettingsFormLayout() {
  return (
    <SettingsFormProvider>
      <Outlet />
    </SettingsFormProvider>
  );
}
