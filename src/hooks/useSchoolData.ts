import { useContext } from "react";
import { SchoolContext } from "../context/SchoolContextDefinition";

export function useSchoolData() {
  const context = useContext(SchoolContext);

  if (context === undefined) {
    throw new Error("useSchoolData must be used within a SchoolProvider");
  }

  return context;
}
