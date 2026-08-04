import { useCallback, useEffect, useState } from 'react';
import {
  ManagedClassRecord,
  ManagedClassStudent,
  backendService,
} from '../services/backend';
import { HomeworkAssignment } from '../types/management';

export const useManagementData = () => {
  const [classes, setClasses] = useState<ManagedClassRecord[]>([]);
  const [students, setStudents] = useState<ManagedClassStudent[]>([]);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [classData, studentData, assignmentData] = await Promise.all([
        backendService.getManagedClasses(),
        backendService.getManagedClassStudents(),
        backendService.getHomeworkAssignments(),
      ]);
      setClasses(classData);
      setStudents(studentData);
      setAssignments(assignmentData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu quản lý.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { classes, students, assignments, loading, error, reload };
};
