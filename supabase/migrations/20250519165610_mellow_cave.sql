/*
  # Add Support for Infinite Scrolling Pagination
  
  1. New Indexes
     - Add indexes for efficient pagination and sorting
     
  2. Changes
     - Add indexes on decks and users tables to optimize pagination performance
     
  3. Security
     - No changes to RLS policies
*/

-- Add pagination indexes to decks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'decks' AND indexname = 'decks_updated_at_idx'
  ) THEN
    CREATE INDEX decks_updated_at_idx ON decks(updated_at);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'decks' AND indexname = 'decks_rating_idx'
  ) THEN
    CREATE INDEX decks_rating_idx ON decks(rating);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'decks' AND indexname = 'decks_purchase_count_idx'
  ) THEN
    CREATE INDEX decks_purchase_count_idx ON decks(purchase_count);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'decks' AND indexname = 'decks_is_free_is_listed_idx'
  ) THEN
    CREATE INDEX decks_is_free_is_listed_idx ON decks(is_free, is_listed);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'decks' AND indexname = 'decks_is_nft_is_listed_idx'
  ) THEN
    CREATE INDEX decks_is_nft_is_listed_idx ON decks(is_nft, is_listed);
  END IF;
END $$;

-- Add pagination and sorting indexes to users table for reader functionality
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'users_is_reader_idx'
  ) THEN
    CREATE INDEX users_is_reader_idx ON users(is_reader);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'users_average_rating_idx'
  ) THEN
    CREATE INDEX users_average_rating_idx ON users(average_rating);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'users_reader_since_idx'
  ) THEN
    CREATE INDEX users_reader_since_idx ON users(reader_since);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'users_completed_readings_idx'
  ) THEN
    CREATE INDEX users_completed_readings_idx ON users(completed_readings);
  END IF;
  
  -- Update reader_levels table to ensure proper sorting
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'reader_levels' AND indexname = 'reader_levels_price_idx'
  ) THEN
    CREATE INDEX reader_levels_price_idx ON reader_levels(base_price_per_minute);
  END IF;
END $$;

-- Add search indexes for text search capabilities
DO $$
BEGIN
  -- For decks
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'decks' AND indexname = 'decks_title_idx'
  ) THEN
    CREATE INDEX decks_title_idx ON decks(title);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'decks' AND indexname = 'decks_theme_style_idx'
  ) THEN
    CREATE INDEX decks_theme_style_idx ON decks(theme, style);
  END IF;
  
  -- For users/readers
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'users_username_idx'
  ) THEN
    CREATE INDEX users_username_idx ON users(username);
  END IF;
END $$;