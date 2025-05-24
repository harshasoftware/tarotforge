/*
  # Drop Chat Messages Table

  1. Remove Tables
    - Drop `chat_messages` table along with all associated indexes and policies
  
  2. Cleanup
    - Drop RLS policies for chat_messages
    - Drop indexes for chat_messages 
    - Drop the table itself
*/

-- Drop policies first (they depend on the table)
DROP POLICY IF EXISTS "Users can read messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;

-- Drop indexes (they depend on the table)
DROP INDEX IF EXISTS public.chat_messages_room_id_idx;
DROP INDEX IF EXISTS public.chat_messages_created_at_idx;

-- Drop the table itself
DROP TABLE IF EXISTS public.chat_messages; 