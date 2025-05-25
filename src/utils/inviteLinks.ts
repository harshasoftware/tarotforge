/**
 * Invite Link Management System
 * 
 * Handles the creation and parsing of invite links for tarot reading sessions.
 * Supports both direct session links and wrapper invite links.
 */

import { supabase } from '../lib/supabase';

export interface InviteLink {
  id: string;
  sessionId: string;
  createdBy: string | null; // user ID or anonymous ID
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  clickCount: number;
  maxClicks: number | null;
}

/**
 * Creates a wrapper invite link that properly distinguishes hosts from guests
 */
export async function createInviteLink(
  sessionId: string, 
  createdBy: string | null,
  options: {
    expiresInHours?: number;
    maxClicks?: number;
  } = {}
): Promise<string | null> {
  try {
    const { expiresInHours = 24, maxClicks = null } = options;
    
    // Calculate expiration time
    const expiresAt = expiresInHours 
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
      : null;

    // Create invite record in database
    const { data: invite, error } = await supabase
      .from('session_invites')
      .insert({
        session_id: sessionId,
        created_by: createdBy,
        expires_at: expiresAt,
        max_clicks: maxClicks,
        is_active: true,
        click_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invite link:', error);
      return null;
    }

    // Generate wrapper invite URL
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite/${invite.id}`;
    
  } catch (error) {
    console.error('Error creating invite link:', error);
    return null;
  }
}

/**
 * Validates and processes an invite link
 */
export async function processInviteLink(inviteId: string): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  try {
    // Fetch invite details
    const { data: invite, error: fetchError } = await supabase
      .from('session_invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (fetchError || !invite) {
      return { success: false, error: 'Invite link not found' };
    }

    // Check if invite is still active
    if (!invite.is_active) {
      return { success: false, error: 'This invite link has been deactivated' };
    }

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'This invite link has expired' };
    }

    // Check click limit
    if (invite.max_clicks && invite.click_count >= invite.max_clicks) {
      return { success: false, error: 'This invite link has reached its usage limit' };
    }

    // Check if session still exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('reading_sessions')
      .select('id, is_active')
      .eq('id', invite.session_id)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      return { success: false, error: 'The reading session is no longer available' };
    }

    // Increment click count
    await supabase
      .from('session_invites')
      .update({ click_count: invite.click_count + 1 })
      .eq('id', inviteId);

    return { 
      success: true, 
      sessionId: invite.session_id 
    };

  } catch (error) {
    console.error('Error processing invite link:', error);
    return { success: false, error: 'Failed to process invite link' };
  }
}

/**
 * Generates a shareable invite link for the current session
 */
export async function generateSessionInviteLink(
  sessionId: string,
  userId: string | null,
  anonymousId: string | null
): Promise<string | null> {
  const createdBy = userId || anonymousId;
  
  if (!createdBy) {
    console.error('Cannot create invite link: no user or anonymous ID');
    return null;
  }

  return await createInviteLink(sessionId, createdBy, {
    expiresInHours: 24,
    maxClicks: 50 // Reasonable limit for sharing
  });
}

/**
 * Creates a direct session link (for internal navigation)
 */
export function createDirectSessionLink(sessionId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/reading/rider-waite-classic?join=${sessionId}`;
}

/**
 * Determines if a user should be considered the host based on how they accessed the session
 */
export function determineUserRole(
  accessMethod: 'create' | 'invite' | 'direct',
  sessionHostUserId: string | null,
  currentUserId: string | null
): 'host' | 'participant' {
  // If accessing via invite link, always participant
  if (accessMethod === 'invite') {
    return 'participant';
  }
  
  // If creating new session, always host
  // This covers:
  // - Navbar "Try Free Reading"
  // - Home page "Start Reading" 
  // - Collections page deck selection
  // - Marketplace deck selection
  // - Any internal navigation that creates a new session
  if (accessMethod === 'create') {
    return 'host';
  }
  
  // For direct links (browser URL or bookmarks), check if user matches session host
  if (accessMethod === 'direct') {
    // If session has no host (guest session) and current user is also guest
    if (sessionHostUserId === null && currentUserId === null) {
      // Could be original creator returning via bookmark/URL
      // Default to host for guest sessions accessed directly
      return 'host';
    }
    
    // If current user matches the session's host user ID
    if (sessionHostUserId === currentUserId) {
      return 'host';
    }
    
    // Otherwise, they're joining someone else's session
    return 'participant';
  }
  
  return 'participant';
} 