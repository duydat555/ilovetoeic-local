-- Migration: 20260913_03_clean_listening_categories.sql
-- Description: Xoa cac category rac, chi giu lai 'all' (Tat ca) va 'ets-2026' (De ETS 2026)

UPDATE listening_categories 
SET icon = 'Layers3', order_index = 1 
WHERE id = 'ets-2026';

DELETE FROM listening_categories 
WHERE id IN (
    'short-stories',
    'conversations',
    'part1-photographs',
    'part2-q-and-a',
    'part3-conversations',
    'part4-talks',
    'ets-2024',
    'ets-2023'
);
