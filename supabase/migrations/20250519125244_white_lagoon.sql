/*
  # Reader certification
  
  1. New Tables
    - `quiz_attempts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users.id)
      - `questions` (jsonb)
      - `user_answers` (jsonb)
      - `score` (numeric)
      - `passed` (boolean)
      - `time_limit` (integer, seconds)
      - `status` (text - in_progress, completed, expired)
      - `started_at` (timestamp)
      - `completed_at` (timestamp)
  
  2. User Changes
    - Add `reader_since` column to track when users became certified readers
  
  3. Security
    - Enable RLS on quiz_attempts table
    - Add appropriate policies for access control
*/

-- Add reader_since field to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reader_since timestamp with time zone;

-- Create quiz attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  questions jsonb NOT NULL,
  user_answers jsonb,
  score numeric DEFAULT 0,
  passed boolean DEFAULT false,
  time_limit integer NOT NULL,
  status text CHECK (status IN ('in_progress', 'completed', 'expired')) DEFAULT 'in_progress',
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  CONSTRAINT quiz_attempts_score_check CHECK (score >= 0 AND score <= 100)
);

-- Enable row level security
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Policies for quiz attempts
CREATE POLICY "Users can create their own quiz attempts"
  ON public.quiz_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
  
CREATE POLICY "Users can read their own quiz attempts"
  ON public.quiz_attempts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
  
CREATE POLICY "Users can update their own quiz attempts"
  ON public.quiz_attempts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create index on user_id for better query performance
CREATE INDEX IF NOT EXISTS quiz_attempts_user_id_idx ON public.quiz_attempts (user_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_status_idx ON public.quiz_attempts (status);

-- Create function to automatically set expired status for old in-progress quizzes
CREATE OR REPLACE FUNCTION public.expire_old_quiz_attempts()
RETURNS trigger AS $$
BEGIN
  UPDATE public.quiz_attempts
  SET status = 'expired'
  WHERE status = 'in_progress'
    AND started_at < NOW() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to expire old quizzes when new quiz is created
CREATE TRIGGER expire_old_quiz_attempts_trigger
AFTER INSERT ON public.quiz_attempts
FOR EACH STATEMENT
EXECUTE FUNCTION public.expire_old_quiz_attempts();