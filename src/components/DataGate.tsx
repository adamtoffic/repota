import type { ReactNode } from "react";
import { useSchoolData } from "../hooks/useSchoolData";
import { Alert, Button } from "./ui";
import { PageLoader } from "./PageLoader";
import { DataBackup } from "./DataBackup";

interface DataGateProps {
  children: ReactNode;
}

export function DataGate({ children }: DataGateProps) {
  const { isDataLoaded, loadError, retryLoad, startFresh } = useSchoolData();

  if (!isDataLoaded) {
    return <PageLoader />;
  }

  if (loadError) {
    return (
      <div className="p-6">
        <Alert variant="error" title="Saved data could not be loaded">
          Changes will not be saved while storage is unavailable. Try again, or restore a backup
          from Settings &gt; Backup.
          <div className="mt-3 flex gap-2">
            <Button onClick={retryLoad} size="sm">
              Try again
            </Button>
            <Button onClick={startFresh} size="sm" variant="secondary">
              Start fresh
            </Button>
          </div>
          <div className="mt-4">
            <DataBackup recoveryOnly />
          </div>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
