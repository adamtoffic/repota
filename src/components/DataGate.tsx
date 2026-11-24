import { useEffect, type ReactNode } from "react";
import { useSchoolActions, useSchoolLifecycle } from "../hooks/useSchoolData";
import { Alert, Button } from "./ui";
import { PageLoader } from "./PageLoader";
import { DataBackup } from "./DataBackup";

interface DataGateProps {
  children: ReactNode;
}

/**
 * Blocks child rendering until `SchoolProvider` completes initial storage load and renders the
 * recovery UI on `loadError` or `isRollbackIncomplete`. Must wrap consumers that initialize
 * local draft state from loaded settings on mount (such as `SettingsFormProvider`).
 */
export function DataGate({ children }: DataGateProps) {
  const { isDataLoaded, loadError, isRollbackIncomplete, activeRecoveryAction } =
    useSchoolLifecycle();
  const { retryLoad, startFresh, setActiveRecoveryAction } = useSchoolActions();

  useEffect(() => {
    if (!isDataLoaded || loadError || isRollbackIncomplete) return;
    if (import.meta.env.MODE === "test") return;

    const preload = () => {
      void import("../pages/Analytics").catch(() => {});
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(preload);
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = window.setTimeout(preload, 1500);
    return () => window.clearTimeout(timerId);
  }, [isDataLoaded, isRollbackIncomplete, loadError]);

  if (!isDataLoaded) {
    return <PageLoader />;
  }

  const isRecoveryBusy = Boolean(activeRecoveryAction);

  if (loadError || isRollbackIncomplete) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl">
          <Alert variant="error" title="Saved data could not be loaded">
            Changes will not be saved while storage is unavailable. Try again, or restore a backup
            below.
            <div className="mt-3 flex gap-2">
              <Button onClick={retryLoad} disabled={isRecoveryBusy} size="sm">
                Try again
              </Button>
              <Button onClick={startFresh} disabled={isRecoveryBusy} size="sm" variant="secondary">
                Start fresh
              </Button>
            </div>
            <div className="mt-4">
              <DataBackup
                recoveryOnly
                disabled={isRecoveryBusy}
                activeRecoveryAction={activeRecoveryAction}
                onRecoveryActionChange={setActiveRecoveryAction}
              />
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
