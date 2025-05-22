/*
  # Add Foreign Key Constraint for Decks Creator
  
  1. Changes
    - Add foreign key constraint from decks.creator_id to users.id
    - This enables proper table joins in queries
  
  2. Purpose
    - Fix "Could not find a relationship between 'decks' and 'creator_id'" error
    - Enable proper foreign key relationship for the creator field
*/

-- Add foreign key constraint to decks table for creator_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'decks_creator_id_fkey'
  ) THEN
    ALTER TABLE decks 
      ADD CONSTRAINT decks_creator_id_fkey 
      FOREIGN KEY (creator_id) 
      REFERENCES users(id);
  END IF;
END $$;