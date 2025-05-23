/*
  # Tarot Forge Database Schema Setup

  1. New Tables
    - `anonymous_users` - Stores anonymous user data
    - `users` - Stores user profiles
    - `decks` - Stores tarot deck information
    - `cards` - Stores individual tarot cards
    - `readings` - Stores tarot readings
    - `quiz_attempts` - Stores tarot certification quiz attempts
    - `reader_levels` - Stores reader certification levels
    - `reader_certificates` - Stores reader certification information
    - `reader_reviews` - Stores reviews for readers
    - `stripe_customers` - Stores Stripe customer information
    - `stripe_subscriptions` - Stores subscription information
    - `stripe_orders` - Stores order information
    - `user_credits` - Stores user credit information
    - `credit_transactions` - Stores credit transaction history
    - `deck_generation_limits` - Stores deck generation limits by plan
    - `user_deck_usage` - Stores user deck generation usage

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table

  3. Views
    - `stripe_user_subscriptions` - View for user subscription data
    - `stripe_user_orders` - View for user order data
    - `user_subscription_credits` - View for user subscription and credit data
*/

-- Anonymous Users Table
CREATE TABLE IF NOT EXISTS anonymous_users (
  id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE anonymous_users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can create anonymous users" ON anonymous_users
  FOR INSERT TO anon USING (true);

CREATE POLICY "Anyone can read anonymous user data" ON anonymous_users
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anonymous users can update their own data" ON anonymous_users
  FOR UPDATE TO anon USING (true);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  username text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  is_creator boolean DEFAULT false,
  is_reader boolean DEFAULT false,
  bio text,
  reader_since timestamptz,
  level_id uuid,
  average_rating numeric DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
  completed_readings integer DEFAULT 0,
  custom_price_per_minute numeric COMMENT 'Custom price per minute set by readers, can be less than or equal to their level''s max rate',
  last_card_generation_date timestamptz
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read basic profile data" ON users
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated USING (uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated USING (uid() = id);

-- Decks Table
CREATE TABLE IF NOT EXISTS decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  description text NOT NULL,
  theme text NOT NULL,
  style text NOT NULL,
  card_count integer NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_free boolean DEFAULT false NOT NULL,
  is_nft boolean DEFAULT false NOT NULL,
  cover_image text NOT NULL,
  sample_images text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT true,
  purchase_count integer DEFAULT 0,
  rating numeric,
  nft_address text,
  is_listed boolean DEFAULT false NOT NULL,
  is_sellable boolean DEFAULT false NOT NULL
);

-- Enable RLS
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read public decks" ON decks
  FOR SELECT TO public USING (is_public = true);

CREATE POLICY "Users can read owned decks" ON decks
  FOR SELECT TO authenticated USING (creator_id = uid());

CREATE POLICY "Users can create decks" ON decks
  FOR INSERT TO authenticated WITH CHECK (creator_id = uid());

CREATE POLICY "Users can update own decks" ON decks
  FOR UPDATE TO authenticated USING (creator_id = uid());

CREATE POLICY "Users can delete own decks" ON decks
  FOR DELETE TO authenticated USING (creator_id = uid());

CREATE POLICY "Anonymous users can create decks" ON decks
  FOR INSERT TO anon WITH CHECK (creator_id IN (SELECT id FROM anonymous_users));

CREATE POLICY "Anonymous users can read decks they created" ON decks
  FOR SELECT TO anon USING (creator_id IN (SELECT id FROM anonymous_users));

CREATE POLICY "Anonymous users can update decks they created" ON decks
  FOR UPDATE TO anon USING (creator_id IN (SELECT id FROM anonymous_users));

CREATE POLICY "Anonymous users can delete decks they created" ON decks
  FOR DELETE TO anon USING (creator_id IN (SELECT id FROM anonymous_users));

-- Cards Table
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  card_type text NOT NULL CHECK (card_type = ANY (ARRAY['major', 'minor'])),
  suit text CHECK (suit = ANY (ARRAY['wands', 'cups', 'swords', 'pentacles']) OR suit IS NULL),
  keywords text[] DEFAULT ARRAY[]::text[],
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read cards from public decks" ON cards
  FOR SELECT TO public USING (deck_id IN (SELECT id FROM decks WHERE is_public = true));

CREATE POLICY "Users can read their own cards" ON cards
  FOR SELECT TO authenticated USING (deck_id IN (SELECT id FROM decks WHERE creator_id = uid()));

CREATE POLICY "Users can create cards for their decks" ON cards
  FOR INSERT TO authenticated WITH CHECK (deck_id IN (SELECT id FROM decks WHERE creator_id = uid()));

CREATE POLICY "Users can update their cards" ON cards
  FOR UPDATE TO authenticated USING (deck_id IN (SELECT id FROM decks WHERE creator_id = uid()));

CREATE POLICY "Users can delete their cards" ON cards
  FOR DELETE TO authenticated USING (deck_id IN (SELECT id FROM decks WHERE creator_id = uid()));

CREATE POLICY "Anonymous users can read their own cards" ON cards
  FOR SELECT TO anon USING (deck_id IN (SELECT id FROM decks WHERE creator_id IN (SELECT id FROM anonymous_users)));

CREATE POLICY "Anonymous users can create cards for their decks" ON cards
  FOR INSERT TO anon WITH CHECK (deck_id IN (SELECT id FROM decks WHERE creator_id IN (SELECT id FROM anonymous_users)));

CREATE POLICY "Anonymous users can update their cards" ON cards
  FOR UPDATE TO anon USING (deck_id IN (SELECT id FROM decks WHERE creator_id IN (SELECT id FROM anonymous_users)));

CREATE POLICY "Anonymous users can delete their cards" ON cards
  FOR DELETE TO anon USING (deck_id IN (SELECT id FROM decks WHERE creator_id IN (SELECT id FROM anonymous_users)));

-- Create indexes for cards
CREATE INDEX IF NOT EXISTS cards_deck_id_idx ON cards(deck_id);
CREATE INDEX IF NOT EXISTS cards_order_idx ON cards("order");

-- Readings Table
CREATE TABLE IF NOT EXISTS readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  reader_id uuid,
  layout text NOT NULL,
  question text,
  cards jsonb NOT NULL,
  interpretation text,
  created_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read their own readings" ON readings
  FOR SELECT TO authenticated USING (user_id = uid());

CREATE POLICY "Users can create readings" ON readings
  FOR INSERT TO authenticated WITH CHECK (user_id = uid());

CREATE POLICY "Users can update their own readings" ON readings
  FOR UPDATE TO authenticated USING (user_id = uid());

CREATE POLICY "Users can delete their own readings" ON readings
  FOR DELETE TO authenticated USING (user_id = uid());

CREATE POLICY "Anonymous users can read their own readings" ON readings
  FOR SELECT TO anon USING (user_id IN (SELECT id FROM anonymous_users));

CREATE POLICY "Anonymous users can create readings" ON readings
  FOR INSERT TO anon WITH CHECK (user_id IN (SELECT id FROM anonymous_users));

CREATE POLICY "Anonymous users can update their own readings" ON readings
  FOR UPDATE TO anon USING (user_id IN (SELECT id FROM anonymous_users));

CREATE POLICY "Anonymous users can delete their own readings" ON readings
  FOR DELETE TO anon USING (user_id IN (SELECT id FROM anonymous_users));

-- Create a function to validate reading user_id
CREATE OR REPLACE FUNCTION validate_reading_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- For authenticated users
  IF auth.uid() IS NOT NULL AND NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'user_id must match the authenticated user';
  END IF;
  
  -- For anonymous users
  IF auth.uid() IS NULL AND NOT EXISTS (
    SELECT 1 FROM anonymous_users WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'user_id must be a valid anonymous user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validating reading user_id
CREATE TRIGGER check_reading_user_id
BEFORE INSERT OR UPDATE ON readings
FOR EACH ROW
EXECUTE FUNCTION validate_reading_user_id();

-- Reader Levels Table
CREATE TABLE IF NOT EXISTS reader_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  min_rating numeric CHECK (min_rating >= 0 AND min_rating <= 5),
  min_readings integer CHECK (min_readings >= 0),
  base_price_per_minute numeric DEFAULT 0.25 NOT NULL CHECK (base_price_per_minute >= 0),
  color_theme text,
  icon text,
  required_quiz_score numeric DEFAULT 75.0 NOT NULL CHECK (required_quiz_score >= 0 AND required_quiz_score <= 100),
  created_at timestamptz DEFAULT now(),
  rank_order integer NOT NULL
);

-- Enable RLS
ALTER TABLE reader_levels ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read reader levels" ON reader_levels
  FOR SELECT TO public USING (true);

-- Create indexes for reader levels
CREATE INDEX IF NOT EXISTS reader_levels_rank_order_idx ON reader_levels(rank_order);
CREATE INDEX IF NOT EXISTS reader_levels_price_idx ON reader_levels(base_price_per_minute);
CREATE INDEX IF NOT EXISTS reader_levels_base_price_idx ON reader_levels(base_price_per_minute);

-- Reader Certificates Table
CREATE TABLE IF NOT EXISTS reader_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_url text NOT NULL,
  level_name text NOT NULL,
  certification_id text NOT NULL,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  username text NOT NULL,
  certification_date timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reader_certificates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can read certificates" ON reader_certificates
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can read their own certificates" ON reader_certificates
  FOR SELECT TO authenticated USING (uid() = user_id);

CREATE POLICY "Users can create their own certificates" ON reader_certificates
  FOR INSERT TO authenticated WITH CHECK (uid() = user_id);

-- Create indexes for reader certificates
CREATE INDEX IF NOT EXISTS reader_certificates_user_id_idx ON reader_certificates(user_id);

-- Reader Reviews Table
CREATE TABLE IF NOT EXISTS reader_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating numeric NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  reading_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT reader_reviews_unique_per_reading UNIQUE (reader_id, client_id, reading_id)
);

-- Enable RLS
ALTER TABLE reader_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read reader reviews" ON reader_reviews
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can create reviews for readers" ON reader_reviews
  FOR INSERT TO authenticated WITH CHECK (client_id = uid());

CREATE POLICY "Users can update their own reviews" ON reader_reviews
  FOR UPDATE TO authenticated USING (client_id = uid()) WITH CHECK (client_id = uid());

CREATE POLICY "Users can delete their own reviews" ON reader_reviews
  FOR DELETE TO authenticated USING (client_id = uid());

-- Create a function to update reader average rating
CREATE OR REPLACE FUNCTION update_reader_average_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating numeric;
BEGIN
  -- Calculate the new average rating for the reader
  SELECT AVG(rating) INTO avg_rating
  FROM reader_reviews
  WHERE reader_id = COALESCE(NEW.reader_id, OLD.reader_id);
  
  -- Update the reader's average rating
  UPDATE users
  SET average_rating = COALESCE(avg_rating, 0)
  WHERE id = COALESCE(NEW.reader_id, OLD.reader_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating reader average rating
CREATE TRIGGER update_reader_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON reader_reviews
FOR EACH ROW
EXECUTE FUNCTION update_reader_average_rating();

-- Create a function to update modified column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Quiz Attempts Table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questions jsonb NOT NULL,
  user_answers jsonb,
  score numeric DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  passed boolean DEFAULT false,
  time_limit integer NOT NULL,
  status text DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'expired'::text])),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  difficulty_level text NOT NULL CHECK (difficulty_level = ANY (ARRAY['novice'::text, 'adept'::text, 'mystic'::text, 'oracle'::text, 'archmage'::text]))
);

-- Enable RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read their own quiz attempts" ON quiz_attempts
  FOR SELECT TO authenticated USING (user_id = uid());

CREATE POLICY "Users can create their own quiz attempts" ON quiz_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = uid());

CREATE POLICY "Users can update their own quiz attempts" ON quiz_attempts
  FOR UPDATE TO authenticated USING (user_id = uid());

-- Create indexes for quiz attempts
CREATE INDEX IF NOT EXISTS quiz_attempts_user_id_idx ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_status_idx ON quiz_attempts(status);

-- Create a function to expire old quiz attempts
CREATE OR REPLACE FUNCTION expire_old_quiz_attempts()
RETURNS TRIGGER AS $$
BEGIN
  -- Expire in-progress attempts that are older than the time limit
  UPDATE quiz_attempts
  SET status = 'expired'
  WHERE status = 'in_progress'
  AND started_at < (now() - (time_limit || ' seconds')::interval);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expiring old quiz attempts
CREATE TRIGGER expire_old_quiz_attempts_trigger
AFTER INSERT ON quiz_attempts
FOR EACH STATEMENT
EXECUTE FUNCTION expire_old_quiz_attempts();

-- Create a function to update quiz difficulty
CREATE OR REPLACE FUNCTION update_quiz_difficulty()
RETURNS TRIGGER AS $$
BEGIN
  -- If difficulty level is not set, determine it based on user's reader level
  IF NEW.difficulty_level IS NULL THEN
    SELECT 
      CASE 
        WHEN rl.rank_order = 1 THEN 'novice'
        WHEN rl.rank_order = 2 THEN 'adept'
        WHEN rl.rank_order = 3 THEN 'mystic'
        WHEN rl.rank_order = 4 THEN 'oracle'
        WHEN rl.rank_order = 5 THEN 'archmage'
        ELSE 'novice'
      END INTO NEW.difficulty_level
    FROM users u
    LEFT JOIN reader_levels rl ON u.level_id = rl.id
    WHERE u.id = NEW.user_id;
    
    -- Default to novice if no level found
    IF NEW.difficulty_level IS NULL THEN
      NEW.difficulty_level := 'novice';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for setting quiz difficulty
CREATE TRIGGER set_quiz_difficulty_trigger
BEFORE INSERT ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION update_quiz_difficulty();

-- Create a function to check and update reader level
CREATE OR REPLACE FUNCTION check_and_update_reader_level()
RETURNS TRIGGER AS $$
DECLARE
  current_level_id uuid;
  current_level_rank integer;
  next_level_id uuid;
  next_level_rank integer;
  next_level_min_rating numeric;
  next_level_min_readings integer;
BEGIN
  -- Only proceed if the user is a reader
  IF NEW.is_reader = false THEN
    RETURN NEW;
  END IF;
  
  -- Get the current level information
  SELECT id, rank_order INTO current_level_id, current_level_rank
  FROM reader_levels
  WHERE id = NEW.level_id;
  
  -- If no current level, set to the lowest level
  IF current_level_id IS NULL THEN
    SELECT id INTO NEW.level_id
    FROM reader_levels
    ORDER BY rank_order ASC
    LIMIT 1;
    
    RETURN NEW;
  END IF;
  
  -- Get the next level information
  SELECT id, rank_order, min_rating, min_readings 
  INTO next_level_id, next_level_rank, next_level_min_rating, next_level_min_readings
  FROM reader_levels
  WHERE rank_order = current_level_rank + 1
  ORDER BY rank_order ASC
  LIMIT 1;
  
  -- If there's no next level, we're already at the highest
  IF next_level_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if the user qualifies for the next level
  IF (NEW.average_rating >= next_level_min_rating OR next_level_min_rating IS NULL) AND
     (NEW.completed_readings >= next_level_min_readings OR next_level_min_readings IS NULL) THEN
    -- Update to the next level
    NEW.level_id := next_level_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for checking and updating reader level
CREATE TRIGGER check_reader_level_trigger
BEFORE UPDATE OF average_rating, completed_readings, is_reader ON users
FOR EACH ROW
EXECUTE FUNCTION check_and_update_reader_level();

-- Create a function to set initial reader level
CREATE OR REPLACE FUNCTION set_initial_reader_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the user is becoming a reader and doesn't have a level yet
  IF NEW.is_reader = true AND OLD.is_reader = false AND NEW.level_id IS NULL THEN
    -- Set to the lowest level
    SELECT id INTO NEW.level_id
    FROM reader_levels
    ORDER BY rank_order ASC
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for setting initial reader level
CREATE TRIGGER set_initial_reader_level_trigger
BEFORE UPDATE OF is_reader ON users
FOR EACH ROW
EXECUTE FUNCTION set_initial_reader_level();

-- Create a function to validate reader price
CREATE OR REPLACE FUNCTION validate_reader_price()
RETURNS TRIGGER AS $$
DECLARE
  max_price numeric;
BEGIN
  -- Only proceed if custom_price_per_minute is being updated
  IF NEW.custom_price_per_minute IS NOT DISTINCT FROM OLD.custom_price_per_minute THEN
    RETURN NEW;
  END IF;
  
  -- Get the maximum price for the reader's level
  SELECT base_price_per_minute INTO max_price
  FROM reader_levels
  WHERE id = NEW.level_id;
  
  -- If no level found, use a default maximum
  IF max_price IS NULL THEN
    max_price := 1.0;
  END IF;
  
  -- Validate the price
  IF NEW.custom_price_per_minute > max_price THEN
    RAISE EXCEPTION 'Custom price per minute cannot exceed the maximum for your level (%).',
      max_price;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validating reader price
CREATE TRIGGER validate_reader_price_trigger
BEFORE UPDATE OF custom_price_per_minute, level_id ON users
FOR EACH ROW
EXECUTE FUNCTION validate_reader_price();

-- Create a function to validate deck creator
CREATE OR REPLACE FUNCTION validate_deck_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- For authenticated users
  IF auth.uid() IS NOT NULL AND NEW.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'creator_id must match the authenticated user';
  END IF;
  
  -- For anonymous users
  IF auth.uid() IS NULL AND NOT EXISTS (
    SELECT 1 FROM anonymous_users WHERE id = NEW.creator_id
  ) THEN
    RAISE EXCEPTION 'creator_id must be a valid anonymous user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validating deck creator
CREATE TRIGGER validate_deck_creator
BEFORE INSERT OR UPDATE ON decks
FOR EACH ROW
EXECUTE FUNCTION validate_deck_creator();

-- Create trigger for updating decks updated_at
CREATE TRIGGER update_decks_updated_at
BEFORE UPDATE ON decks
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Stripe Customers Table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  customer_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT stripe_customers_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own customer data" ON stripe_customers
  FOR SELECT TO authenticated USING ((user_id = uid()) AND (deleted_at IS NULL));

-- Stripe Subscriptions Table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint PRIMARY KEY,
  customer_id text NOT NULL UNIQUE,
  subscription_id text,
  price_id text,
  current_period_start bigint,
  current_period_end bigint,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_brand text,
  payment_method_last4 text,
  status stripe_subscription_status NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions
  FOR SELECT TO authenticated USING ((customer_id IN (SELECT customer_id FROM stripe_customers WHERE (user_id = uid()) AND (deleted_at IS NULL))) AND (deleted_at IS NULL));

-- Create a function to update user plan type
CREATE OR REPLACE FUNCTION update_user_plan_type()
RETURNS TRIGGER AS $$
DECLARE
  user_id uuid;
  plan_type text;
BEGIN
  -- Only proceed if status is active or trialing
  IF NEW.status NOT IN ('active', 'trialing') THEN
    RETURN NEW;
  END IF;
  
  -- Get the user ID from the customer
  SELECT sc.user_id INTO user_id
  FROM stripe_customers sc
  WHERE sc.customer_id = NEW.customer_id;
  
  IF user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine plan type based on price ID
  IF NEW.price_id LIKE '%mystic%' THEN
    plan_type := 'mystic';
  ELSIF NEW.price_id LIKE '%creator%' THEN
    plan_type := 'creator';
  ELSIF NEW.price_id LIKE '%visionary%' THEN
    plan_type := 'visionary';
  ELSE
    plan_type := 'free';
  END IF;
  
  -- Update the user's deck usage plan
  UPDATE user_deck_usage
  SET plan_type = plan_type
  WHERE user_id = user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating user plan type
CREATE TRIGGER update_user_plan_type_trigger
AFTER INSERT OR UPDATE OF status, price_id ON stripe_subscriptions
FOR EACH ROW
WHEN ((NEW.status = 'active') OR (NEW.status = 'trialing'))
EXECUTE FUNCTION update_user_plan_type();

-- Stripe Orders Table
CREATE TABLE IF NOT EXISTS stripe_orders (
  id bigint PRIMARY KEY,
  checkout_session_id text NOT NULL,
  payment_intent_id text NOT NULL,
  customer_id text NOT NULL,
  amount_subtotal bigint NOT NULL,
  amount_total bigint NOT NULL,
  currency text NOT NULL,
  payment_status text NOT NULL,
  status stripe_order_status DEFAULT 'pending'::stripe_order_status NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own order data" ON stripe_orders
  FOR SELECT TO authenticated USING ((customer_id IN (SELECT customer_id FROM stripe_customers WHERE (user_id = uid()) AND (deleted_at IS NULL))) AND (deleted_at IS NULL));

-- User Credits Table
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  basic_credits integer DEFAULT 0 NOT NULL,
  premium_credits integer DEFAULT 0 NOT NULL,
  basic_credits_used integer DEFAULT 0 NOT NULL,
  premium_credits_used integer DEFAULT 0 NOT NULL,
  last_refresh_date timestamptz,
  next_refresh_date timestamptz,
  plan_tier text,
  max_rollover_credits integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT positive_credits CHECK ((basic_credits >= 0) AND (premium_credits >= 0)),
  CONSTRAINT positive_credits_used CHECK ((basic_credits_used >= 0) AND (premium_credits_used >= 0))
);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own credit information" ON user_credits
  FOR SELECT TO authenticated USING (user_id = uid());

CREATE POLICY "System can update credit information" ON user_credits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create a function to handle credit rollover
CREATE OR REPLACE FUNCTION handle_credit_rollover()
RETURNS TRIGGER AS $$
DECLARE
  rollover_basic integer;
  rollover_premium integer;
BEGIN
  -- Only proceed if last_refresh_date has changed
  IF NEW.last_refresh_date IS NOT DISTINCT FROM OLD.last_refresh_date THEN
    RETURN NEW;
  END IF;
  
  -- Calculate rollover credits (up to max_rollover_credits)
  rollover_basic := LEAST(OLD.basic_credits - OLD.basic_credits_used, NEW.max_rollover_credits);
  rollover_premium := LEAST(OLD.premium_credits - OLD.premium_credits_used, NEW.max_rollover_credits);
  
  -- Add rollover credits to new allocation
  NEW.basic_credits := NEW.basic_credits + rollover_basic;
  NEW.premium_credits := NEW.premium_credits + rollover_premium;
  
  -- Reset used credits
  NEW.basic_credits_used := 0;
  NEW.premium_credits_used := 0;
  
  -- Record the rollover transaction
  IF rollover_basic > 0 OR rollover_premium > 0 THEN
    INSERT INTO credit_transactions (
      user_id,
      transaction_type,
      basic_credits_change,
      premium_credits_change,
      description
    ) VALUES (
      NEW.user_id,
      'rollover',
      rollover_basic,
      rollover_premium,
      'Credits rolled over from previous period'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for handling credit rollover
CREATE TRIGGER handle_credit_rollover_trigger
AFTER UPDATE OF last_refresh_date ON user_credits
FOR EACH ROW
EXECUTE FUNCTION handle_credit_rollover();

-- Credit Transactions Table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  basic_credits_change integer DEFAULT 0,
  premium_credits_change integer DEFAULT 0,
  description text,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own credit transactions" ON credit_transactions
  FOR SELECT TO authenticated USING (user_id = uid());

CREATE POLICY "System can insert credit transactions" ON credit_transactions
  FOR INSERT TO service_role WITH CHECK (true);

-- Create a function to initialize user credits
CREATE OR REPLACE FUNCTION initialize_free_credits()
RETURNS TRIGGER AS $$
DECLARE
  free_credits integer := 5; -- Default free credits for new users
BEGIN
  -- Create a credit record for the new user
  INSERT INTO user_credits (
    user_id,
    basic_credits,
    premium_credits,
    plan_tier
  ) VALUES (
    NEW.id,
    free_credits,
    0,
    'free'
  ) ON CONFLICT (user_id) DO NOTHING;
  
  -- Record the credit allocation transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    basic_credits_change,
    description
  ) VALUES (
    NEW.id,
    'allocation',
    free_credits,
    'Initial free credits'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for initializing free credits
CREATE TRIGGER initialize_free_credits_trigger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION initialize_free_credits();

-- Create a function to initialize user credits from subscription
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
DECLARE
  user_id uuid;
  basic_credits integer := 0;
  premium_credits integer := 0;
  max_rollover integer := 0;
  plan_tier text := 'free';
  next_refresh_date timestamptz;
BEGIN
  -- Only proceed if status is active or trialing
  IF NEW.status NOT IN ('active', 'trialing') THEN
    RETURN NEW;
  END IF;
  
  -- Get the user ID from the customer
  SELECT sc.user_id INTO user_id
  FROM stripe_customers sc
  WHERE sc.customer_id = NEW.customer_id;
  
  IF user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine plan tier and credits based on price ID
  IF NEW.price_id LIKE '%mystic%' THEN
    plan_tier := 'mystic';
    basic_credits := 100;
    premium_credits := 20;
    max_rollover := 50;
  ELSIF NEW.price_id LIKE '%creator%' THEN
    plan_tier := 'creator';
    basic_credits := 200;
    premium_credits := 50;
    max_rollover := 100;
  ELSIF NEW.price_id LIKE '%visionary%' THEN
    plan_tier := 'visionary';
    basic_credits := 500;
    premium_credits := 100;
    max_rollover := 200;
  ELSE
    plan_tier := 'free';
    basic_credits := 5;
    premium_credits := 0;
    max_rollover := 0;
  END IF;
  
  -- Calculate next refresh date based on subscription period
  IF NEW.current_period_end IS NOT NULL THEN
    next_refresh_date := to_timestamp(NEW.current_period_end);
  ELSE
    next_refresh_date := (now() + interval '1 month')::date::timestamptz;
  END IF;
  
  -- Update or insert user credits
  INSERT INTO user_credits (
    user_id,
    basic_credits,
    premium_credits,
    basic_credits_used,
    premium_credits_used,
    plan_tier,
    last_refresh_date,
    next_refresh_date,
    max_rollover_credits
  ) VALUES (
    user_id,
    basic_credits,
    premium_credits,
    0,
    0,
    plan_tier,
    now(),
    next_refresh_date,
    max_rollover
  ) ON CONFLICT (user_id) DO UPDATE SET
    basic_credits = basic_credits,
    premium_credits = premium_credits,
    plan_tier = plan_tier,
    last_refresh_date = now(),
    next_refresh_date = next_refresh_date,
    max_rollover_credits = max_rollover;
  
  -- Record the credit allocation transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    basic_credits_change,
    premium_credits_change,
    description
  ) VALUES (
    user_id,
    'allocation',
    basic_credits,
    premium_credits,
    'Credits allocated for ' || plan_tier || ' subscription'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for initializing credits on subscription
CREATE TRIGGER initialize_credits_on_subscription
AFTER INSERT OR UPDATE OF status, price_id ON stripe_subscriptions
FOR EACH ROW
WHEN ((NEW.status = 'active') OR (NEW.status = 'trialing'))
EXECUTE FUNCTION initialize_user_credits();

-- Deck Generation Limits Table
CREATE TABLE IF NOT EXISTS deck_generation_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type text NOT NULL UNIQUE,
  major_arcana_limit integer DEFAULT 0 NOT NULL,
  complete_deck_limit integer DEFAULT 0 NOT NULL,
  regeneration_limit integer DEFAULT 0 NOT NULL,
  quality_level text DEFAULT 'medium'::text NOT NULL,
  max_storage integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE deck_generation_limits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read deck generation limits" ON deck_generation_limits
  FOR SELECT TO public USING (true);

-- User Deck Usage Table
CREATE TABLE IF NOT EXISTS user_deck_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL,
  major_arcana_generated integer DEFAULT 0 NOT NULL,
  complete_decks_generated integer DEFAULT 0 NOT NULL,
  regenerations_used integer DEFAULT 0 NOT NULL,
  last_reset_date timestamptz,
  next_reset_date timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT user_deck_usage_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE user_deck_usage ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own deck usage" ON user_deck_usage
  FOR SELECT TO authenticated USING (user_id = uid());

CREATE POLICY "System can update user deck usage" ON user_deck_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create a function to initialize user deck usage
CREATE OR REPLACE FUNCTION initialize_user_deck_usage()
RETURNS TRIGGER AS $$
DECLARE
  next_reset_date timestamptz;
  plan_type text := 'free';
BEGIN
  -- Calculate next reset date (first day of next month)
  next_reset_date := (date_trunc('month', now()) + interval '1 month')::date::timestamptz;
  
  -- Create a deck usage record for the new user
  INSERT INTO user_deck_usage (
    user_id,
    plan_type,
    next_reset_date
  ) VALUES (
    NEW.id,
    plan_type,
    next_reset_date
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check deck generation limit
CREATE OR REPLACE FUNCTION check_deck_generation_limit(user_id_param uuid, deck_type text)
RETURNS TABLE (
  can_generate boolean,
  reason text,
  limit_reached boolean,
  plan_type text,
  current_usage integer,
  "limit" integer,
  remaining integer,
  next_reset_date timestamptz
) AS $$
DECLARE
  usage_record RECORD;
  limits_record RECORD;
  field_name text;
  limit_field text;
BEGIN
  -- Determine which fields to check based on deck type
  IF deck_type = 'major_arcana' THEN
    field_name := 'major_arcana_generated';
    limit_field := 'major_arcana_limit';
  ELSIF deck_type = 'complete' THEN
    field_name := 'complete_decks_generated';
    limit_field := 'complete_deck_limit';
  ELSE
    RETURN QUERY SELECT 
      false AS can_generate,
      'invalid_deck_type' AS reason,
      true AS limit_reached,
      'unknown' AS plan_type,
      0 AS current_usage,
      0 AS "limit",
      0 AS remaining,
      NULL::timestamptz AS next_reset_date;
    RETURN;
  END IF;
  
  -- Get the user's usage record
  SELECT * INTO usage_record
  FROM user_deck_usage
  WHERE user_id = user_id_param;
  
  -- If no usage record exists, create one with default values
  IF usage_record IS NULL THEN
    -- Calculate next reset date (first day of next month)
    DECLARE
      next_reset timestamptz := (date_trunc('month', now()) + interval '1 month')::date::timestamptz;
    BEGIN
      INSERT INTO user_deck_usage (
        user_id,
        plan_type,
        next_reset_date
      ) VALUES (
        user_id_param,
        'free',
        next_reset
      )
      RETURNING * INTO usage_record;
    END;
  END IF;
  
  -- Check if the usage period has expired and reset if needed
  IF usage_record.next_reset_date IS NOT NULL AND usage_record.next_reset_date < now() THEN
    -- Calculate new next reset date (first day of next month)
    DECLARE
      new_reset_date timestamptz := (date_trunc('month', now()) + interval '1 month')::date::timestamptz;
    BEGIN
      UPDATE user_deck_usage
      SET 
        major_arcana_generated = 0,
        complete_decks_generated = 0,
        regenerations_used = 0,
        last_reset_date = now(),
        next_reset_date = new_reset_date
      WHERE user_id = user_id_param
      RETURNING * INTO usage_record;
    END;
  END IF;
  
  -- Get the limits for the user's plan
  SELECT * INTO limits_record
  FROM deck_generation_limits
  WHERE plan_type = usage_record.plan_type;
  
  -- If no limits record exists, use default values
  IF limits_record IS NULL THEN
    SELECT * INTO limits_record
    FROM deck_generation_limits
    WHERE plan_type = 'free';
    
    -- If still no limits record, create default values
    IF limits_record IS NULL THEN
      limits_record := (
        NULL::uuid,
        'free',
        1,
        0,
        2,
        'medium',
        3,
        now(),
        now()
      )::deck_generation_limits;
    END IF;
  END IF;
  
  -- Check if the user has reached their limit
  DECLARE
    current_usage integer;
    usage_limit integer;
    remaining integer;
  BEGIN
    IF deck_type = 'major_arcana' THEN
      current_usage := usage_record.major_arcana_generated;
      usage_limit := limits_record.major_arcana_limit;
    ELSE
      current_usage := usage_record.complete_decks_generated;
      usage_limit := limits_record.complete_deck_limit;
    END IF;
    
    remaining := greatest(0, usage_limit - current_usage);
    
    RETURN QUERY SELECT 
      (current_usage < usage_limit) AS can_generate,
      CASE
        WHEN current_usage >= usage_limit THEN 'limit_reached'
        ELSE 'allowed'
      END AS reason,
      (current_usage >= usage_limit) AS limit_reached,
      usage_record.plan_type AS plan_type,
      current_usage AS current_usage,
      usage_limit AS "limit",
      remaining AS remaining,
      usage_record.next_reset_date AS next_reset_date;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create a function to increment deck generation counter
CREATE OR REPLACE FUNCTION increment_deck_generation_counter(user_id_param uuid, field_name text)
RETURNS boolean AS $$
DECLARE
  usage_record RECORD;
BEGIN
  -- Get the user's usage record
  SELECT * INTO usage_record
  FROM user_deck_usage
  WHERE user_id = user_id_param;
  
  -- If no usage record exists, create one with default values
  IF usage_record IS NULL THEN
    -- Calculate next reset date (first day of next month)
    DECLARE
      next_reset timestamptz := (date_trunc('month', now()) + interval '1 month')::date::timestamptz;
    BEGIN
      INSERT INTO user_deck_usage (
        user_id,
        plan_type,
        next_reset_date
      ) VALUES (
        user_id_param,
        'free',
        next_reset
      )
      RETURNING * INTO usage_record;
    END;
  END IF;
  
  -- Increment the specified field
  IF field_name = 'major_arcana_generated' THEN
    UPDATE user_deck_usage
    SET major_arcana_generated = major_arcana_generated + 1
    WHERE user_id = user_id_param;
  ELSIF field_name = 'complete_decks_generated' THEN
    UPDATE user_deck_usage
    SET complete_decks_generated = complete_decks_generated + 1
    WHERE user_id = user_id_param;
  ELSIF field_name = 'regenerations_used' THEN
    UPDATE user_deck_usage
    SET regenerations_used = regenerations_used + 1
    WHERE user_id = user_id_param;
  ELSE
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to consume user credits
CREATE OR REPLACE FUNCTION consume_user_credits(
  p_user_id uuid,
  p_basic_credits_to_use integer,
  p_premium_credits_to_use integer,
  p_reference_id uuid DEFAULT NULL,
  p_description text DEFAULT 'Card generation'
)
RETURNS boolean AS $$
DECLARE
  user_credits RECORD;
BEGIN
  -- Get the user's current credits
  SELECT * INTO user_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- If no credit record exists, return false
  IF user_credits IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has enough credits
  IF user_credits.basic_credits < p_basic_credits_to_use OR
     user_credits.premium_credits < p_premium_credits_to_use THEN
    RETURN false;
  END IF;
  
  -- Update the user's credits
  UPDATE user_credits
  SET 
    basic_credits = basic_credits - p_basic_credits_to_use,
    premium_credits = premium_credits - p_premium_credits_to_use,
    basic_credits_used = basic_credits_used + p_basic_credits_to_use,
    premium_credits_used = premium_credits_used + p_premium_credits_to_use,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    basic_credits_change,
    premium_credits_change,
    reference_id,
    description
  ) VALUES (
    p_user_id,
    'consumption',
    -p_basic_credits_to_use,
    -p_premium_credits_to_use,
    p_reference_id,
    p_description
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to initialize subscription credits
CREATE OR REPLACE FUNCTION initialize_subscription_credits(
  p_user_id uuid,
  p_price_id text
)
RETURNS boolean AS $$
DECLARE
  basic_credits integer := 0;
  premium_credits integer := 0;
  max_rollover integer := 0;
  plan_tier text := 'free';
  next_refresh_date timestamptz;
BEGIN
  -- Determine plan tier and credits based on price ID
  IF p_price_id LIKE '%mystic%' THEN
    plan_tier := 'mystic';
    basic_credits := 100;
    premium_credits := 20;
    max_rollover := 50;
  ELSIF p_price_id LIKE '%creator%' THEN
    plan_tier := 'creator';
    basic_credits := 200;
    premium_credits := 50;
    max_rollover := 100;
  ELSIF p_price_id LIKE '%visionary%' THEN
    plan_tier := 'visionary';
    basic_credits := 500;
    premium_credits := 100;
    max_rollover := 200;
  ELSE
    plan_tier := 'free';
    basic_credits := 5;
    premium_credits := 0;
    max_rollover := 0;
  END IF;
  
  -- Calculate next refresh date (1 month from now)
  next_refresh_date := (now() + interval '1 month')::date::timestamptz;
  
  -- Update or insert user credits
  INSERT INTO user_credits (
    user_id,
    basic_credits,
    premium_credits,
    basic_credits_used,
    premium_credits_used,
    plan_tier,
    last_refresh_date,
    next_refresh_date,
    max_rollover_credits
  ) VALUES (
    p_user_id,
    basic_credits,
    premium_credits,
    0,
    0,
    plan_tier,
    now(),
    next_refresh_date,
    max_rollover
  ) ON CONFLICT (user_id) DO UPDATE SET
    basic_credits = basic_credits,
    premium_credits = premium_credits,
    plan_tier = plan_tier,
    last_refresh_date = now(),
    next_refresh_date = next_refresh_date,
    max_rollover_credits = max_rollover;
  
  -- Record the credit allocation transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    basic_credits_change,
    premium_credits_change,
    description
  ) VALUES (
    p_user_id,
    'allocation',
    basic_credits,
    premium_credits,
    'Credits allocated for ' || plan_tier || ' subscription'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to fix missing credit record
CREATE OR REPLACE FUNCTION fix_missing_credit_record(user_id uuid)
RETURNS boolean AS $$
DECLARE
  subscription_record RECORD;
  basic_credits integer := 5; -- Default for free users
  premium_credits integer := 0;
  max_rollover integer := 0;
  plan_tier text := 'free';
  next_refresh_date timestamptz;
BEGIN
  -- Check if a credit record already exists
  IF EXISTS (SELECT 1 FROM user_credits WHERE user_id = user_id) THEN
    RETURN true;
  END IF;
  
  -- Check if the user has an active subscription
  SELECT ss.* INTO subscription_record
  FROM stripe_subscriptions ss
  JOIN stripe_customers sc ON ss.customer_id = sc.customer_id
  WHERE sc.user_id = user_id
  AND ss.status IN ('active', 'trialing')
  AND ss.deleted_at IS NULL;
  
  -- Determine plan tier and credits based on subscription
  IF subscription_record IS NOT NULL AND subscription_record.price_id IS NOT NULL THEN
    IF subscription_record.price_id LIKE '%mystic%' THEN
      plan_tier := 'mystic';
      basic_credits := 100;
      premium_credits := 20;
      max_rollover := 50;
    ELSIF subscription_record.price_id LIKE '%creator%' THEN
      plan_tier := 'creator';
      basic_credits := 200;
      premium_credits := 50;
      max_rollover := 100;
    ELSIF subscription_record.price_id LIKE '%visionary%' THEN
      plan_tier := 'visionary';
      basic_credits := 500;
      premium_credits := 100;
      max_rollover := 200;
    END IF;
    
    -- Calculate next refresh date based on subscription period
    IF subscription_record.current_period_end IS NOT NULL THEN
      next_refresh_date := to_timestamp(subscription_record.current_period_end);
    ELSE
      next_refresh_date := (now() + interval '1 month')::date::timestamptz;
    END IF;
  ELSE
    -- Default for free users
    next_refresh_date := (date_trunc('month', now()) + interval '1 month')::date::timestamptz;
  END IF;
  
  -- Create the credit record
  INSERT INTO user_credits (
    user_id,
    basic_credits,
    premium_credits,
    basic_credits_used,
    premium_credits_used,
    plan_tier,
    last_refresh_date,
    next_refresh_date,
    max_rollover_credits
  ) VALUES (
    user_id,
    basic_credits,
    premium_credits,
    0,
    0,
    plan_tier,
    now(),
    next_refresh_date,
    max_rollover
  );
  
  -- Record the credit allocation transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    basic_credits_change,
    premium_credits_change,
    description
  ) VALUES (
    user_id,
    'allocation',
    basic_credits,
    premium_credits,
    'Credits allocated during account fix for ' || plan_tier || ' plan'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to auto-confirm user email
CREATE OR REPLACE FUNCTION auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm the user's email
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = NEW.id
  AND email_confirmed_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-confirming user email
CREATE TRIGGER trigger_auto_confirm_user_email
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION auto_confirm_user_email();

-- Create views for easier data access
-- Stripe User Subscriptions View
CREATE OR REPLACE VIEW stripe_user_subscriptions AS
SELECT
  sc.customer_id,
  ss.subscription_id,
  ss.status AS subscription_status,
  ss.price_id,
  ss.current_period_start,
  ss.current_period_end,
  ss.cancel_at_period_end,
  ss.payment_method_brand,
  ss.payment_method_last4
FROM
  stripe_customers sc
JOIN
  stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE
  sc.deleted_at IS NULL
  AND ss.deleted_at IS NULL;

ALTER VIEW stripe_user_subscriptions SECURITY DEFINER;

-- Stripe User Orders View
CREATE OR REPLACE VIEW stripe_user_orders AS
SELECT
  sc.customer_id,
  so.id AS order_id,
  so.checkout_session_id,
  so.payment_intent_id,
  so.amount_subtotal,
  so.amount_total,
  so.currency,
  so.payment_status,
  so.status AS order_status,
  so.created_at AS order_date
FROM
  stripe_customers sc
JOIN
  stripe_orders so ON sc.customer_id = so.customer_id
WHERE
  sc.deleted_at IS NULL
  AND so.deleted_at IS NULL;

ALTER VIEW stripe_user_orders SECURITY DEFINER;

-- User Subscription Credits View
CREATE OR REPLACE VIEW user_subscription_credits AS
SELECT
  u.id AS user_id,
  u.email,
  u.username,
  uc.basic_credits,
  uc.premium_credits,
  uc.basic_credits_used,
  uc.premium_credits_used,
  uc.last_refresh_date,
  uc.next_refresh_date,
  uc.plan_tier,
  uc.max_rollover_credits,
  sus.subscription_id,
  sus.subscription_status,
  sus.current_period_start,
  sus.current_period_end,
  sus.cancel_at_period_end,
  sus.price_id
FROM
  users u
LEFT JOIN
  user_credits uc ON u.id = uc.user_id
LEFT JOIN
  stripe_user_subscriptions sus ON u.id = (
    SELECT sc.user_id 
    FROM stripe_customers sc 
    WHERE sc.customer_id = sus.customer_id
  );

-- Insert default reader levels
INSERT INTO reader_levels (name, description, min_rating, min_readings, base_price_per_minute, color_theme, icon, required_quiz_score, rank_order)
VALUES
  ('Novice Seer', 'Beginning your journey into tarot with foundational knowledge', NULL, NULL, 0.25, 'red', 'flame', 75.0, 1),
  ('Mystic Adept', 'Developing deeper insight and intuition with tarot symbolism', 4.0, 10, 0.50, 'orange', 'sparkles', 80.0, 2),
  ('Ethereal Guide', 'Advanced understanding of complex tarot interpretations', 4.5, 25, 0.75, 'yellow', 'sun', 85.0, 3),
  ('Celestial Oracle', 'Mastery of esoteric knowledge and profound wisdom', 4.7, 50, 1.00, 'green', 'heart', 90.0, 4),
  ('Arcane Hierophant', 'Supreme level of tarot mastery and enlightenment', 4.9, 100, 1.50, 'violet', 'crown', 95.0, 5);

-- Insert default deck generation limits
INSERT INTO deck_generation_limits (plan_type, major_arcana_limit, complete_deck_limit, regeneration_limit, quality_level, max_storage)
VALUES
  ('free', 1, 0, 2, 'medium', 3),
  ('explorer-plus', 1, 1, 5, 'medium', 3),
  ('mystic', 2, 2, 999999, 'medium', 15),
  ('creator', 4, 4, 999999, 'high', 50),
  ('visionary', 8, 8, 999999, 'high', 999999);