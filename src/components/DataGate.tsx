import { Suspense, type ReactNode } from "react";
import { useSchoolActions, useSchoolLifecycle } from "../hooks/useSchoolData";
import { lazyWithRetry } from "../utils/lazyWithRetry";
import { Alert, Button } from "./ui";
import { PageLoader } from "./PageLoader";

const DataBackup = lazyWithRetry(() =>
  import("./DataBackup").then((module) => ({ default: module.DataBackup })),
);

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

  if (!isDataLoaded) {
    return <PageLoader />;
  }

  const isRecoveryBusy = Boolean(activeRecoveryAction);

  if (loadError || isRollbackIncomplete) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center p-4 sm:p-6">
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
              <Suspense fallback={null}>
                <DataBackup
                  recoveryOnly
                  disabled={isRecoveryBusy}
                  activeRecoveryAction={activeRecoveryAction}
                  onRecoveryActionChange={setActiveRecoveryAction}
                />
              </Suspense>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
