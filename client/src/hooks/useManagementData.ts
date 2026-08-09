import { useCallback, useEffect, useState } from 'react';
import {
  ManagedClassRecord,
  ManagedClassStudent,
  backendService,
} from '../services/backend';

export const useManagementData = () => {
  const [classes, setClasses] = useState<ManagedClassRecord[]>([]);
  const [students, setStudents] = useState<ManagedClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [classData, studentData] = await Promise.all([
        backendService.getManagedClasses(),
        backendService.getManagedClassStudents(),
      ]);
      setClasses(classData);
      setStudents(studentData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu quản lý.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { classes, students, loading, error, reload };
};
