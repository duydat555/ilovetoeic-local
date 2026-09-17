-- Migration: Add audio_url and image_url to listening_sentences for part-grouped listening sets
-- Date: 2026-09-15

ALTER TABLE listening_sentences 
ADD COLUMN audio_url VARCHAR(1000) NULL AFTER group_index,
ADD COLUMN image_url VARCHAR(1000) NULL AFTER audio_url;
