import React from 'react';
import { Navigate } from 'react-router-dom';

// Compatibility fallback for old bookmarks. The editor now lives inside
// AdminHomeworkPage so opening it never changes the active list URL.
export const CreateHomeworkPage: React.FC = () => (
  <Navigate to="/admin/homework" replace />
);
