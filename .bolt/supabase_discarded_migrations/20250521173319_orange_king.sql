/*
  # Add foreign key constraint to decks table

  1. Changes
    - Add a foreign key constraint between decks.creator_id and users.id
    - This enables the join operation in the API for selecting deck creator information
  
  2. Problem being fixed
    - Resolves the "Could not find a relationship between 'decks' and 'creator_id'" error
    - Enables proper queries with nested selection of creator data
*/

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'decks_creator_id_fkey' 
    AND conrelid = 'decks'::regclass
  ) THEN
    ALTER TABLE public.decks
    ADD CONSTRAINT decks_creator_id_fkey
    FOREIGN KEY (creator_id)
    REFERENCES public.users (id);
  END IF;
END
$$;