/**
 * Student API Service - Supabase Implementation
 * Handles all student-related operations with Supabase
 */

import type { StudentRecord } from '../types';
import { getSupabaseClient, getCurrentUserId } from './supabase';
import { isLocalMode } from './config';
import { loadFromStorage, saveToStorage, IDB_KEYS } from '../utils/idbStorage';

/**
 * Convert StudentRecord to Supabase format
 */
function toSupabaseFormat(student: StudentRecord, userId: string) {
  return {
    id: student.id,
    user_id: userId,
    name: student.name,
    class_name: student.className,
    date_of_birth: student.dateOfBirth || null,
    gender: student.gender,
    attendance_present: student.attendancePresent || null,
    teacher_remark: student.teacherRemark || null,
    conduct: student.conduct || null,
    interest: student.interest || null,
    picture_url: student.pictureUrl || null,
    promotion_status: student.promotionStatus || null,
    subjects: student.subjects, // JSONB field
  };
}

/**
 * Convert Supabase row to StudentRecord
 */
function fromSupabaseFormat(row: any): StudentRecord {
  return {
    id: row.id,
    name: row.name,
    className: row.class_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    attendancePresent: row.attendance_present,
    teacherRemark: row.teacher_remark,
    conduct: row.conduct,
    interest: row.interest,
    pictureUrl: row.picture_url,
    promotionStatus: row.promotion_status,
    subjects: row.subjects || [],
  };
}

/**
 * Fetch all students
 */
export async function fetchStudents(): Promise<StudentRecord[]> {
  if (isLocalMode()) {
    const students = await loadFromStorage<StudentRecord[]>(IDB_KEYS.STUDENTS);
    return students || [];
  }

  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();
  
  if (!supabase || !userId) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []).map(fromSupabaseFormat);
}

/**
 * Create a new student
 */
export async function createStudent(student: StudentRecord): Promise<StudentRecord> {
  if (isLocalMode()) {
    return student;
  }

  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();
  
  if (!supabase || !userId) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('students')
    .insert([toSupabaseFormat(student, userId)])
    .select()
    .single();

  if (error) throw error;
  
  return fromSupabaseFormat(data);
}

/**
 * Update an existing student
 */
export async function updateStudent(
  id: string,
  updates: Partial<StudentRecord>,
): Promise<StudentRecord> {
  if (isLocalMode()) {
    return { id, ...updates } as StudentRecord;
  }

  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();
  
  if (!supabase || !userId) {
    throw new Error('Not authenticated');
  }

  // Convert updates to Supabase format
  const supabaseUpdates: any = {};
  if (updates.name) supabaseUpdates.name = updates.name;
  if (updates.className) supabaseUpdates.class_name = updates.className;
  if (updates.dateOfBirth !== undefined) supabaseUpdates.date_of_birth = updates.dateOfBirth;
  if (updates.gender) supabaseUpdates.gender = updates.gender;
  if (updates.attendancePresent !== undefined) supabaseUpdates.attendance_present = updates.attendancePresent;
  if (updates.teacherRemark !== undefined) supabaseUpdates.teacher_remark = updates.teacherRemark;
  if (updates.conduct !== undefined) supabaseUpdates.conduct = updates.conduct;
  if (updates.interest !== undefined) supabaseUpdates.interest = updates.interest;
  if (updates.pictureUrl !== undefined) supabaseUpdates.picture_url = updates.pictureUrl;
  if (updates.promotionStatus !== undefined) supabaseUpdates.promotion_status = updates.promotionStatus;
  if (updates.subjects) supabaseUpdates.subjects = updates.subjects;

  const { data, error } = await supabase
    .from('students')
    .update(supabaseUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  
  return fromSupabaseFormat(data);
}

/**
 * Delete a student
 */
export async function deleteStudent(id: string): Promise<boolean> {
  if (isLocalMode()) {
    return true;
  }

  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();
  
  if (!supabase || !userId) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
  
  return true;
}

/**
 * Bulk create students
 */
export async function bulkCreateStudents(students: StudentRecord[]): Promise<StudentRecord[]> {
  if (isLocalMode()) {
    return students;
  }

  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();
  
  if (!supabase || !userId) {
    throw new Error('Not authenticated');
  }

  const supabaseStudents = students.map(s => toSupabaseFormat(s, userId));

  const { data, error } = await supabase
    .from('students')
    .insert(supabaseStudents)
    .select();

  if (error) throw error;
  
  return (data || []).map(fromSupabaseFormat);
}

/**
 * Subscribe to real-time student changes
 */
export function subscribeToStudents(
  onChange: (students: StudentRecord[]) => void,
): (() => void) | null {
  if (isLocalMode()) {
    return null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const channel = supabase
    .channel('students-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'students',
      },
      async () => {
        // Refetch all students when any change occurs
        const students = await fetchStudents();
        onChange(students);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Save students to local storage (local mode helper)
 */
export async function saveStudentsLocal(students: StudentRecord[]): Promise<void> {
  await saveToStorage(IDB_KEYS.STUDENTS, students);
}
