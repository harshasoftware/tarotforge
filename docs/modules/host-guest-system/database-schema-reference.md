# Database Schema Reference

## Overview

This document provides a comprehensive reference for the database schema supporting TarotForge's host/guest architecture and collaborative reading sessions.

## Core Tables

### reading_sessions

The primary table storing session state and ownership information.

```sql
CREATE TABLE reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid REFERENCES auth.users(id),
  deck_id text NOT NULL,
  selected_layout jsonb,
  question text,
  reading_step text DEFAULT 'setup',
  selected_cards jsonb DEFAULT '[]',
  interpretation text,
  zoom_level real DEFAULT 1.0,
  pan_offset jsonb DEFAULT '{"x": 0, "y": 0}',
  zoom_focus jsonb,
  active_card_index integer,
  shared_modal_state jsonb,
  video_call_state jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | uuid | Unique session identifier | Primary key, auto-generated |
| `host_user_id` | uuid | Session owner/creator | References `auth.users(id)`, NULL for guest sessions |
| `deck_id` | text | Tarot deck being used | NOT NULL, references deck system |
| `selected_layout` | jsonb | Chosen card layout/spread | NULL for free-form layouts |
| `question` | text | User's question for the reading | Optional |
| `reading_step` | text | Current step in reading process | 'setup', 'ask-question', 'drawing', 'interpretation' |
| `selected_cards` | jsonb | Array of drawn cards with positions | Default empty array |
| `interpretation` | text | AI-generated or user interpretation | Optional |
| `zoom_level` | real | Current zoom level for view sync | Default 1.0 |
| `pan_offset` | jsonb | Pan offset for view synchronization | Default `{"x": 0, "y": 0}` |
| `zoom_focus` | jsonb | Zoom focus point for view sync | NULL when not focused |
| `active_card_index` | integer | Currently selected card index | NULL when no card selected |
| `shared_modal_state` | jsonb | Modal state shared across participants | NULL when no modal open |
| `video_call_state` | jsonb | Video chat session information | NULL when no video call |
| `is_active` | boolean | Whether session is still active | Default true |
| `created_at` | timestamptz | Session creation timestamp | Auto-generated |
| `updated_at` | timestamptz | Last update timestamp | Auto-updated via trigger |

#### JSONB Field Structures

##### selected_cards
```json
[
  {
    "id": "card-uuid",
    "name": "The Fool",
    "position": "past",
    "isReversed": false,
    "x": 100,
    "y": 200,
    "customPosition": "custom-position-name"
  }
]
```

##### shared_modal_state
```json
{
  "isOpen": true,
  "cardIndex": 0,
  "showDescription": true,
  "triggeredBy": "participant-id"
}
```

##### video_call_state
```json
{
  "isActive": true,
  "sessionId": "video-session-id",
  "hostParticipantId": "participant-uuid",
  "participants": ["participant-1", "participant-2"]
}
```

### session_participants

Tracks all users (authenticated and anonymous) participating in sessions.

```sql
CREATE TABLE session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES reading_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  anonymous_id text,
  name text,
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT unique_anonymous_participant 
    UNIQUE (session_id, anonymous_id)
);
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | uuid | Unique participant record ID | Primary key, auto-generated |
| `session_id` | uuid | Associated reading session | References `reading_sessions(id)`, CASCADE delete |
| `user_id` | uuid | Authenticated user ID | References `auth.users(id)`, NULL for anonymous |
| `anonymous_id` | text | Browser fingerprint for guests | NULL for authenticated users |
| `name` | text | Display name for participant | Optional, for guest name setting |
| `is_active` | boolean | Whether participant is still active | Default true |
| `joined_at` | timestamptz | When participant joined session | Auto-generated |
| `last_seen_at` | timestamptz | Last activity timestamp | Updated via presence system |

#### Constraints

- **Unique Anonymous Participant**: Prevents duplicate anonymous participants per session
- **Cascade Delete**: Participants are removed when session is deleted
- **Either/Or Identity**: Participant has either `user_id` OR `anonymous_id`, not both

### session_invites

Manages wrapper invite links for proper host/guest role distinction.

```sql
CREATE TABLE session_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES reading_sessions(id) ON DELETE CASCADE,
  created_by text,
  expires_at timestamp with time zone,
  max_clicks integer,
  is_active boolean DEFAULT true,
  click_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | uuid | Unique invite identifier | Primary key, used in invite URLs |
| `session_id` | uuid | Target reading session | References `reading_sessions(id)`, CASCADE delete |
| `created_by` | text | Creator identifier | Can be user ID or anonymous ID |
| `expires_at` | timestamptz | Invite expiration time | NULL for no expiration |
| `max_clicks` | integer | Maximum allowed clicks | NULL for unlimited |
| `is_active` | boolean | Whether invite is still valid | Default true |
| `click_count` | integer | Number of times invite was used | Default 0, incremented on use |
| `created_at` | timestamptz | Invite creation timestamp | Auto-generated |
| `updated_at` | timestamptz | Last update timestamp | Auto-updated via trigger |

## Indexes

### Performance Optimization

```sql
-- Reading sessions
CREATE INDEX idx_reading_sessions_host_user_id ON reading_sessions(host_user_id);
CREATE INDEX idx_reading_sessions_active ON reading_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_reading_sessions_created_at ON reading_sessions(created_at);

-- Session participants
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX idx_session_participants_anonymous_id ON session_participants(anonymous_id);
CREATE INDEX idx_session_participants_active ON session_participants(is_active) WHERE is_active = true;

-- Session invites
CREATE INDEX idx_session_invites_session_id ON session_invites(session_id);
CREATE INDEX idx_session_invites_created_by ON session_invites(created_by);
CREATE INDEX idx_session_invites_active ON session_invites(is_active) WHERE is_active = true;
CREATE INDEX idx_session_invites_expires_at ON session_invites(expires_at) WHERE expires_at IS NOT NULL;
```

## Row Level Security (RLS)

### reading_sessions Policies

```sql
-- Enable RLS
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active sessions (needed for joining)
CREATE POLICY "Anyone can read active sessions"
  ON reading_sessions
  FOR SELECT
  USING (is_active = true);

-- Anyone can create sessions (authenticated and anonymous)
CREATE POLICY "Anyone can create sessions"
  ON reading_sessions
  FOR INSERT
  WITH CHECK (true);

-- Only hosts can update their sessions
CREATE POLICY "Hosts can update their sessions"
  ON reading_sessions
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = host_user_id) OR
    (auth.uid() IS NULL AND host_user_id IS NULL)
  );
```

### session_participants Policies

```sql
-- Enable RLS
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- Anyone can read participants (needed for participant lists)
CREATE POLICY "Anyone can read participants"
  ON session_participants
  FOR SELECT
  USING (true);

-- Anyone can create participant records
CREATE POLICY "Anyone can create participants"
  ON session_participants
  FOR INSERT
  WITH CHECK (true);

-- Participants can update their own records
CREATE POLICY "Participants can update themselves"
  ON session_participants
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );
```

### session_invites Policies

```sql
-- Enable RLS
ALTER TABLE session_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can read active invites (needed for processing)
CREATE POLICY "Anyone can read active invites"
  ON session_invites
  FOR SELECT
  USING (is_active = true);

-- Anyone can create invites
CREATE POLICY "Anyone can create invites"
  ON session_invites
  FOR INSERT
  WITH CHECK (true);

-- Only creators can update their invites
CREATE POLICY "Creators can update their invites"
  ON session_invites
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = created_by) OR
    (auth.uid() IS NULL AND created_by IS NOT NULL)
  );
```

## Triggers and Functions

### Automatic Timestamp Updates

```sql
-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_reading_sessions_timestamp
  BEFORE UPDATE ON reading_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_invites_timestamp
  BEFORE UPDATE ON session_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Participant Management

```sql
-- Function to upsert anonymous participants
CREATE OR REPLACE FUNCTION upsert_anonymous_participant(
  p_session_id uuid,
  p_anonymous_id text,
  p_name text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  participant_id uuid;
BEGIN
  INSERT INTO session_participants (session_id, anonymous_id, name, is_active)
  VALUES (p_session_id, p_anonymous_id, p_name, true)
  ON CONFLICT (session_id, anonymous_id)
  DO UPDATE SET
    is_active = true,
    last_seen_at = now(),
    name = COALESCE(EXCLUDED.name, session_participants.name)
  RETURNING id INTO participant_id;
  
  RETURN participant_id;
END;
$$ LANGUAGE plpgsql;
```

### Cleanup Functions

```sql
-- Function to clean up expired invites
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
  UPDATE session_invites 
  SET is_active = false 
  WHERE is_active = true 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up inactive sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions(
  inactive_hours integer DEFAULT 24
)
RETURNS void AS $$
BEGIN
  UPDATE reading_sessions 
  SET is_active = false 
  WHERE is_active = true 
    AND updated_at < now() - (inactive_hours || ' hours')::interval
    AND NOT EXISTS (
      SELECT 1 FROM session_participants 
      WHERE session_id = reading_sessions.id 
        AND is_active = true 
        AND last_seen_at > now() - '1 hour'::interval
    );
END;
$$ LANGUAGE plpgsql;
```

## Common Queries

### Session Management

```sql
-- Create new session
INSERT INTO reading_sessions (host_user_id, deck_id, reading_step)
VALUES ($1, $2, 'setup')
RETURNING id;

-- Get session with host info
SELECT 
  rs.*,
  u.email as host_email
FROM reading_sessions rs
LEFT JOIN auth.users u ON rs.host_user_id = u.id
WHERE rs.id = $1 AND rs.is_active = true;

-- Update session state
UPDATE reading_sessions 
SET 
  selected_layout = $2,
  question = $3,
  reading_step = $4,
  selected_cards = $5,
  updated_at = now()
WHERE id = $1;
```

### Participant Management

```sql
-- Add participant to session
INSERT INTO session_participants (session_id, user_id, anonymous_id)
VALUES ($1, $2, $3)
RETURNING id;

-- Get active participants
SELECT 
  sp.*,
  u.email as user_email
FROM session_participants sp
LEFT JOIN auth.users u ON sp.user_id = u.id
WHERE sp.session_id = $1 AND sp.is_active = true
ORDER BY sp.joined_at;

-- Update participant presence
UPDATE session_participants 
SET last_seen_at = now() 
WHERE id = $1;
```

### Invite Management

```sql
-- Create invite link
INSERT INTO session_invites (session_id, created_by, expires_at, max_clicks)
VALUES ($1, $2, $3, $4)
RETURNING id;

-- Process invite link
UPDATE session_invites 
SET click_count = click_count + 1 
WHERE id = $1 
  AND is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (max_clicks IS NULL OR click_count < max_clicks)
RETURNING session_id;

-- Get invite statistics
SELECT 
  COUNT(*) as total_invites,
  SUM(click_count) as total_clicks,
  COUNT(*) FILTER (WHERE expires_at > now() OR expires_at IS NULL) as active_invites
FROM session_invites 
WHERE session_id = $1;
```

## Data Migration Scripts

### Adding New Fields

```sql
-- Add new fields to existing tables
ALTER TABLE reading_sessions 
ADD COLUMN IF NOT EXISTS pan_offset jsonb DEFAULT '{"x": 0, "y": 0}',
ADD COLUMN IF NOT EXISTS zoom_focus jsonb;

-- Update existing records with default values
UPDATE reading_sessions 
SET pan_offset = '{"x": 0, "y": 0}'
WHERE pan_offset IS NULL;
```

### Data Cleanup

```sql
-- Remove duplicate anonymous participants (run before adding unique constraint)
DELETE FROM session_participants sp1
WHERE EXISTS (
  SELECT 1 FROM session_participants sp2
  WHERE sp2.session_id = sp1.session_id
    AND sp2.anonymous_id = sp1.anonymous_id
    AND sp2.id > sp1.id
    AND sp1.anonymous_id IS NOT NULL
);

-- Deactivate old sessions
UPDATE reading_sessions 
SET is_active = false 
WHERE updated_at < now() - '30 days'::interval;
```

## Monitoring Queries

### Session Analytics

```sql
-- Active sessions summary
SELECT 
  COUNT(*) as total_active_sessions,
  COUNT(DISTINCT host_user_id) as unique_hosts,
  AVG(EXTRACT(EPOCH FROM (now() - created_at))/3600) as avg_session_hours
FROM reading_sessions 
WHERE is_active = true;

-- Participant statistics
SELECT 
  COUNT(*) as total_participants,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as authenticated_participants,
  COUNT(*) FILTER (WHERE anonymous_id IS NOT NULL) as anonymous_participants
FROM session_participants 
WHERE is_active = true;

-- Invite usage statistics
SELECT 
  COUNT(*) as total_invites,
  AVG(click_count) as avg_clicks_per_invite,
  COUNT(*) FILTER (WHERE click_count > 0) as used_invites,
  COUNT(*) FILTER (WHERE expires_at < now()) as expired_invites
FROM session_invites;
```

### Performance Monitoring

```sql
-- Slow queries identification
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE query LIKE '%reading_sessions%' 
ORDER BY mean_time DESC 
LIMIT 10;

-- Table size monitoring
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename IN ('reading_sessions', 'session_participants', 'session_invites');
```

This schema provides a robust foundation for the host/guest architecture while maintaining performance, security, and scalability. 