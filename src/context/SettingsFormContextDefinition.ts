import { createContext } from "react";
import type { Dispatch, MouseEvent, SetStateAction } from "react";
import type {
  AssessmentCategory,
  ClassScoreComponentConfig,
  SchoolLevel,
  SchoolSettings,
} from "../types";

export interface SettingsFormContextType {
  formData: SchoolSettings;
  setFormData: Dispatch<SetStateAction<SchoolSettings>>;
  lastSavedSettings: SchoolSettings;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  lastSaved?: Date;
  isPersistenceSuspended: boolean;
  studentsCount: number;
  committedSchoolName: string;

  // Subjects
  newSubject: string;
  setNewSubject: Dispatch<SetStateAction<string>>;
  addSubject: () => void;
  removeSubject: (index: number) => void;
  confirmDeleteSubject: () => void;

  // SBA component library & subject component assignment
  newComponentName: string;
  setNewComponentName: Dispatch<SetStateAction<string>>;
  newComponentMax: string;
  setNewComponentMax: Dispatch<SetStateAction<string>>;
  newComponentCategory: AssessmentCategory;
  setNewComponentCategory: Dispatch<SetStateAction<AssessmentCategory>>;
  addComponent: () => void;
  removeComponent: (componentName: string) => void;
  confirmDeleteComponent: () => void;
  addComponentToSubject: (subjectName: string, component: ClassScoreComponentConfig) => void;
  removeComponentFromSubject: (subjectName: string, componentName: string) => void;
  assignAllComponentsToAllSubjects: () => void;

  // Class name & level handlers
  handleClassNameBlur: () => void;
  handleKeepOldClassName: () => void;
  finalizeSave: (shouldUpdateStudents?: boolean) => void;
  flushPendingSave: () => SchoolSettings;
  syncCommittedSettings: (nextSettings: SchoolSettings) => void;
  handleLevelChange: (newLevel: SchoolLevel) => void;
  applyLevelChange: (newLevel: SchoolLevel) => void;

  // Reset modal handlers
  openResetModal: () => void;
  handleResetMouseDown: (e: MouseEvent<HTMLButtonElement>) => void;
  closeResetModal: () => void;
  handleReset: () => void;

  // Security, biometrics & factory reset modal triggers
  biometricAvailable: boolean;
  biometricType: "face" | "fingerprint" | "other" | null;
  enrollingBiometric: boolean;
  checkBiometric: (force?: boolean) => Promise<void>;
  handleEnrollBiometric: () => Promise<void>;
  handleDisableBiometric: () => void;
  setShowPinSetup: Dispatch<SetStateAction<boolean>>;
  setShowPinRecovery: Dispatch<SetStateAction<boolean>>;
  setShowDisablePinModal: Dispatch<SetStateAction<boolean>>;
  setShowFactoryResetModal: Dispatch<SetStateAction<boolean>>;
}

export const SettingsFormContext = createContext<SettingsFormContextType | undefined>(undefined);
