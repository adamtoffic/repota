/**
 * Student API Service
 * Handles all student-related backend operations
 * Falls back to local storage when in local mode
 */

import type { StudentRecord } from "../types";
import { httpClient } from "./client";
import { getEndpoint, isLocalMode } from "./config";
import { loadFromStorage, saveToStorage, IDB_KEYS } from "../utils/idbStorage";

export interface StudentApiResponse {
  students: StudentRecord[];
  total: number;
  timestamp: string;
}

export interface CreateStudentResponse {
  student: StudentRecord;
  message: string;
}

export interface UpdateStudentResponse {
  student: StudentRecord;
  message: string;
}

export interface DeleteStudentResponse {
  success: boolean;
  message: string;
}

/**
 * Fetch all students
 */
export async function fetchStudents(): Promise<StudentRecord[]> {
  if (isLocalMode()) {
    // Local mode - load from IndexedDB
    const students = await loadFromStorage<StudentRecord[]>(IDB_KEYS.STUDENTS);
    return students || [];
  }

  // Backend mode
  const endpoint = getEndpoint("/students");
  if (!endpoint) throw new Error("Invalid endpoint");

  const response = await httpClient.get<StudentApiResponse>(endpoint);
  return response.students;
}

/**
 * Create a new student
 */
export async function createStudent(student: StudentRecord): Promise<StudentRecord> {
  if (isLocalMode()) {
    // Local mode - handled by SchoolContext directly
    // This function won't be called in local mode
    return student;
  }

  // Backend mode
  const endpoint = getEndpoint("/students");
  if (!endpoint) throw new Error("Invalid endpoint");

  const response = await httpClient.post<CreateStudentResponse>(endpoint, student);
  return response.student;
}

/**
 * Update an existing student
 */
export async function updateStudent(
  id: string,
  updates: Partial<StudentRecord>,
): Promise<StudentRecord> {
  if (isLocalMode()) {
    // Local mode - handled by SchoolContext directly
    // This function won't be called in local mode
    return { id, ...updates } as StudentRecord;
  }

  // Backend mode
  const endpoint = getEndpoint(`/students/${id}`);
  if (!endpoint) throw new Error("Invalid endpoint");

  const response = await httpClient.put<UpdateStudentResponse>(endpoint, updates);
  return response.student;
}

/**
 * Delete a student
 */
export async function deleteStudent(id: string): Promise<boolean> {
  if (isLocalMode()) {
    // Local mode - handled by SchoolContext directly
    // This function won't be called in local mode
    return true;
  }

  // Backend mode
  const endpoint = getEndpoint(`/students/${id}`);
  if (!endpoint) throw new Error("Invalid endpoint");

  const response = await httpClient.delete<DeleteStudentResponse>(endpoint);
  return response.success;
}

/**
 * Bulk create students
 */
export async function bulkCreateStudents(students: StudentRecord[]): Promise<StudentRecord[]> {
  if (isLocalMode()) {
    // Local mode - handled by SchoolContext directly
    return students;
  }

  // Backend mode
  const endpoint = getEndpoint("/students/bulk");
  if (!endpoint) throw new Error("Invalid endpoint");

  const response = await httpClient.post<StudentApiResponse>(endpoint, { students });
  return response.students;
}

/**
 * Save students to storage (local mode helper)
 * Called by SchoolContext after updates
 */
export async function saveStudentsLocal(students: StudentRecord[]): Promise<void> {
  await saveToStorage(IDB_KEYS.STUDENTS, students);
}
