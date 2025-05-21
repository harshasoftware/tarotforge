/*
  # Add foreign key constraint between decks and users tables

  1. Changes
    - Add foreign key constraint from decks.creator_id to users.id

  2. Purpose
    - Allow proper relationship queries between decks and users
    - Fix error: "Could not find a relationship between 'decks' and 'users'"
*/

-- Add foreign key constraint to connect decks.creator_id to users.id
ALTER TABLE IF EXISTS public.decks
ADD CONSTRAINT decks_creator_id_fkey 
FOREIGN KEY (creator_id) 
REFERENCES public.users(id);