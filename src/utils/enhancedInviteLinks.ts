import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { v4 as uuidv4 } from 'uuid';

export interface InviteOptions {
  role: 'reader' | 'participant';
  autoTransferHost?: boolean;
  expiresIn?: number; // hours
  maxUses?: number;
}

export interface InviteMetadata {
  inviterName?: string;
  inviterEmail?: string;
  createdAt: string;
  purpose?: string;
}

// Get user display name
async function getUserName(userId: string): Promise<string> {
  const { data: userData } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', userId)
    .single();

  if (userData?.display_name) {
    return userData.display_name;
  }

  if (userData?.email) {
    return userData.email.split('@')[0];
  }

  // Fallback to auth user email
  const { data: authData } = await supabase.auth.getUser();
  if (authData?.user?.email) {
    return authData.user.email.split('@')[0];
  }

  return 'Anonymous';
}

// Generate a smart invite link with role and permissions
export async function generateSmartInvite(
  sessionId: string,
  inviterUserId: string | null,
  options: InviteOptions
): Promise<string | null> {
  try {
    const inviterName = inviterUserId ? await getUserName(inviterUserId) : 'Anonymous';
    
    const metadata: InviteMetadata = {
      inviterName,
      createdAt: new Date().toISOString(),
      purpose: options.role === 'reader' ? 'Professional tarot reading' : 'Join reading session'
    };

    const { data: invite, error } = await supabase
      .from('session_invites')
      .insert({
        session_id: sessionId,
        created_by: inviterUserId || 'anonymous',
        intended_role: options.role,
        transfer_host_on_join: options.role === 'reader' && (options.autoTransferHost ?? true),
        expires_at: options.expiresIn 
          ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000).toISOString()
          : null,
        max_clicks: options.maxUses || null,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invite:', error);
      return null;
    }

    const baseUrl = window.location.origin;
    const inviteType = options.role === 'reader' ? 'reader' : 'join';
    return `${baseUrl}/invite/${inviteType}/${invite.id}`;
  } catch (error) {
    console.error('Error generating smart invite:', error);
    return null;
  }
}

// Validate and process an invite link
export async function validateInviteLink(inviteId: string): Promise<{
  valid: boolean;
  sessionId?: string;
  role?: string;
  shouldTransferHost?: boolean;
  error?: string;
}> {
  try {
    // Use the database function to validate and increment click count
    const { data, error } = await supabase
      .rpc('increment_invite_clicks', { invite_id: inviteId });

    if (error) {
      console.error('Error validating invite:', error);
      return { valid: false, error: 'Invalid or expired invite link' };
    }

    const result = data[0];
    
    if (!result.valid) {
      return { valid: false, error: 'This invite link has expired or reached its usage limit' };
    }

    return {
      valid: true,
      sessionId: result.session_id,
      role: result.intended_role,
      shouldTransferHost: result.transfer_host_on_join
    };
  } catch (error) {
    console.error('Error validating invite link:', error);
    return { valid: false, error: 'Failed to validate invite link' };
  }
}

// Create a pending host transfer when a reader is invited
export async function createPendingHostTransfer(
  sessionId: string,
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  try {
    const pendingTransfer = {
      fromUserId,
      toUserId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    const { error } = await supabase
      .from('reading_sessions')
      .update({ pending_host_transfer: pendingTransfer })
      .eq('id', sessionId);

    if (error) {
      console.error('Error creating pending host transfer:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating pending host transfer:', error);
    return false;
  }
}

// Generate different types of invite links
export const inviteHelpers = {
  // Invite a professional reader with auto host transfer
  async inviteReader(sessionId: string): Promise<string | null> {
    const { user } = useAuthStore.getState();
    return generateSmartInvite(sessionId, user?.id || null, {
      role: 'reader',
      autoTransferHost: true,
      expiresIn: 24, // 24 hours
      maxUses: 1 // Single use
    });
  },

  // Invite a regular participant
  async inviteParticipant(sessionId: string, maxUses?: number): Promise<string | null> {
    const { user } = useAuthStore.getState();
    return generateSmartInvite(sessionId, user?.id || null, {
      role: 'participant',
      expiresIn: 48, // 48 hours
      maxUses: maxUses || 10
    });
  },

  // Create a public share link (multi-use)
  async createPublicLink(sessionId: string): Promise<string | null> {
    const { user } = useAuthStore.getState();
    return generateSmartInvite(sessionId, user?.id || null, {
      role: 'participant',
      expiresIn: 168, // 1 week
      maxUses: 50
    });
  }
};

// Check if current user can reclaim host
export async function canReclaimHost(sessionId: string, userId: string): Promise<boolean> {
  try {
    const { data: session, error } = await supabase
      .from('reading_sessions')
      .select('original_host_user_id, host_user_id')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return false;
    }

    // Can reclaim if user is original host and not current host
    return session.original_host_user_id === userId && session.host_user_id !== userId;
  } catch (error) {
    console.error('Error checking reclaim eligibility:', error);
    return false;
  }
}

// Get host transfer history for a session
export async function getHostTransferHistory(sessionId: string): Promise<any[]> {
  try {
    const { data: session, error } = await supabase
      .from('reading_sessions')
      .select('host_transfer_history')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return [];
    }

    return session.host_transfer_history || [];
  } catch (error) {
    console.error('Error fetching host transfer history:', error);
    return [];
  }
} 