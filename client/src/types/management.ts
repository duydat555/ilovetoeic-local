export type HomeworkStatus = 'submitted' | 'missing' | 'late';

export interface HomeworkAssignment {
  id: string;
  classIds: string[];
  testId: string;
  scope: 'full' | 'parts';
  selectedParts: number[];
  title: string;
  description: string;
  deadline: string;
  allowLate: boolean;
  createdAt: string;
  submittedStudentIds: string[];
  lateStudentIds: string[];
}
