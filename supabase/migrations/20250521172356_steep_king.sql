/*
  # Add foreign key from decks to users

  1. Changes
     - Add foreign key constraint from `decks.creator_id` to `users.id`
     
  2. Purpose
     - Enable Supabase to properly join decks with creator information
     - Fix the error "Could not find a relationship between 'decks' and 'creator_id' in the schema cache"
*/

-- Add foreign key constraint from decks.creator_id to users.id
ALTER TABLE decks
ADD CONSTRAINT decks_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES users(id);