import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Peer from 'simple-peer';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useReadingSessionStore } from '../stores/readingSessionStore';

type VideoCallContextType = {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>; // participantId -> MediaStream
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  startCall: (mode: 'reader' | 'client', existingSessionId?: string) => Promise<string | null>;
  endCall: () => void;
  error: string | null;
  setError: (error: string | null) => void;
  generateShareableLink: (sessionId: string) => string;
  joinWithLink: (url: string) => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  permissionDenied: boolean;
  // Auto-sync features
  isAutoJoinEnabled: boolean;
  setAutoJoinEnabled: (enabled: boolean) => void;
  videoCallParticipants: string[];
  isInVideoCall: boolean;
  // Multi-party features
  connectedPeers: Map<string, string>; // participantId -> peerId mapping
  peerConnections: Map<string, Peer.Instance>; // peerId -> peer connection mapping
};

const VideoCallContext = createContext<VideoCallContextType>({
  localStream: null,
  remoteStreams: new Map(),
  connectionStatus: 'disconnected',
  startCall: async () => null,
  endCall: () => {},
  error: null,
  setError: () => {},
  generateShareableLink: () => '',
  joinWithLink: async () => false,
  requestPermissions: async () => false,
  permissionDenied: false,
  isAutoJoinEnabled: true,
  setAutoJoinEnabled: () => {},
  videoCallParticipants: [],
  isInVideoCall: false,
  connectedPeers: new Map(),
  peerConnections: new Map(),
});

export const useVideoCall = () => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};

interface VideoCallProviderProps {
  children: ReactNode;
}

export const VideoCallProvider: React.FC<VideoCallProviderProps> = ({ children }) => {
  const { user } = useAuthStore();
  const { 
    sessionState, 
    startVideoCall, 
    joinVideoCall, 
    leaveVideoCall, 
    updateVideoCallParticipants 
  } = useReadingSessionStore();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isAutoJoinEnabled, setAutoJoinEnabled] = useState(true);
  const [connectedPeers, setConnectedPeers] = useState<Map<string, string>>(new Map());
  const [peerConnections, setPeerConnections] = useState<Map<string, Peer.Instance>>(new Map());

  const endCallRef = useRef<() => void>();
  const participantId = user?.id || `anonymous-${Date.now()}`;

  // Multi-party peer management
  const createPeerConnection = useCallback((targetParticipantId: string, initiator: boolean) => {
    const peerId = uuidv4();
    
    const peer = new Peer({
      initiator,
      trickle: false,
      stream: localStream || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    });

    // Store peer connection
    setPeerConnections(prev => new Map(prev).set(peerId, peer));
    setConnectedPeers(prev => new Map(prev).set(targetParticipantId, peerId));

    peer.on('signal', async (data) => {
      console.log('Sending signal to', targetParticipantId);
      
      // Send signal through Supabase realtime
      await supabase
        .from('video_signals')
        .insert({
          session_id: sessionId,
          from_participant: participantId,
          to_participant: targetParticipantId,
          signal_data: data,
          peer_id: peerId,
          created_at: new Date().toISOString()
        });
    });

    peer.on('stream', (remoteStream) => {
      console.log('Received remote stream from', targetParticipantId);
      setRemoteStreams(prev => new Map(prev).set(targetParticipantId, remoteStream));
    });

    peer.on('connect', () => {
      console.log('Connected to peer:', targetParticipantId);
      setConnectionStatus('connected');
    });

    peer.on('error', (err) => {
      console.error('Peer connection error with', targetParticipantId, ':', err);
      setError(`Connection error with participant: ${err.message}`);
      
      // Clean up failed connection
      setPeerConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        return newMap;
      });
      setConnectedPeers(prev => {
        const newMap = new Map(prev);
        newMap.delete(targetParticipantId);
        return newMap;
      });
    });

    peer.on('close', () => {
      console.log('Peer connection closed with', targetParticipantId);
      
      // Clean up closed connection
      setPeerConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        return newMap;
      });
      setConnectedPeers(prev => {
        const newMap = new Map(prev);
        newMap.delete(targetParticipantId);
        return newMap;
      });
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(targetParticipantId);
        return newMap;
      });
    });

    return { peer, peerId };
  }, [localStream, sessionId, participantId]);

  // Handle incoming signals
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`video-signals-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'video_signals',
        filter: `to_participant=eq.${participantId}`
      }, async (payload) => {
        const { from_participant, signal_data, peer_id } = payload.new;
        
        console.log('Received signal from', from_participant);
        
        // Find existing peer connection or create new one
        let peer = peerConnections.get(peer_id);
        
        if (!peer) {
          // Create new peer connection for incoming signal
          const { peer: newPeer } = createPeerConnection(from_participant, false);
          peer = newPeer;
        }
        
        try {
          peer.signal(signal_data);
        } catch (err) {
          console.error('Error processing signal:', err);
        }
        
        // Clean up the signal record
        await supabase
          .from('video_signals')
          .delete()
          .eq('id', payload.new.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, participantId, peerConnections, createPeerConnection]);

  // Connect to all existing participants when joining
  const connectToExistingParticipants = useCallback(async (existingParticipants: string[]) => {
    for (const targetParticipantId of existingParticipants) {
      if (targetParticipantId !== participantId) {
        console.log('Connecting to existing participant:', targetParticipantId);
        createPeerConnection(targetParticipantId, true);
      }
    }
  }, [participantId, createPeerConnection]);

  // Handle new participants joining
  useEffect(() => {
    if (!sessionState?.videoCallState?.isActive) return;
    
    const currentParticipants = sessionState.videoCallState.participants || [];
    const newParticipants = currentParticipants.filter(p => 
      p !== participantId && !connectedPeers.has(p)
    );
    
    // Connect to new participants
    newParticipants.forEach(targetParticipantId => {
      console.log('New participant joined, connecting:', targetParticipantId);
      createPeerConnection(targetParticipantId, true);
    });
    
    // Clean up connections for participants who left
    connectedPeers.forEach((peerId, targetParticipantId) => {
      if (!currentParticipants.includes(targetParticipantId)) {
        console.log('Participant left, cleaning up connection:', targetParticipantId);
        const peer = peerConnections.get(peerId);
        if (peer) {
          peer.destroy();
        }
      }
    });
  }, [sessionState?.videoCallState?.participants, participantId, connectedPeers, peerConnections, createPeerConnection]);

  // Auto-sync with session video call state
  useEffect(() => {
    if (!sessionState?.videoCallState || !isAutoJoinEnabled) return;

    const { isActive, participants } = sessionState.videoCallState;
    const isParticipantInCall = participants?.includes(participantId) || false;

    if (isActive && !isParticipantInCall && connectionStatus === 'disconnected') {
      // Auto-join video call
      console.log('Auto-joining video call');
      startCall('client', sessionState.id);
    } else if (!isActive && connectionStatus !== 'disconnected') {
      // Auto-leave video call
      console.log('Auto-leaving video call');
      endCall();
    }
  }, [sessionState?.videoCallState, isAutoJoinEnabled, connectionStatus, participantId]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      setPermissionDenied(false);
      return true;
    } catch (err) {
      console.error('Permission denied:', err);
      setPermissionDenied(true);
      setError('Camera and microphone permissions are required for video calls');
      return false;
    }
  }, []);

  const startCall = useCallback(async (mode: 'reader' | 'client', existingSessionId?: string): Promise<string | null> => {
    try {
      setError(null);
      setConnectionStatus('connecting');

      // Request permissions if not already granted
      if (!localStream) {
        const hasPermissions = await requestPermissions();
        if (!hasPermissions) {
          setConnectionStatus('disconnected');
          return null;
        }
      }

      let callSessionId: string;
      
      if (mode === 'reader' || !existingSessionId) {
        // Start new video call session
        callSessionId = existingSessionId || sessionState?.id || uuidv4();
        await startVideoCall();
             } else {
         // Join existing video call
         callSessionId = existingSessionId;
         const existingParticipants = sessionState?.videoCallState?.participants || [];
         await joinVideoCall(callSessionId);
         
         // Connect to all existing participants
         await connectToExistingParticipants(existingParticipants);
       }

      setSessionId(callSessionId);
      return callSessionId;
    } catch (err) {
      console.error('Error starting call:', err);
      setError(err instanceof Error ? err.message : 'Failed to start call');
      setConnectionStatus('disconnected');
      return null;
    }
  }, [localStream, requestPermissions, startVideoCall, joinVideoCall, sessionState, connectToExistingParticipants]);

  const endCall = useCallback(() => {
    try {
      console.log('Ending video call');
      setConnectionStatus('disconnected');
      setSessionId(null);
      setError(null);

      // Close all peer connections
      peerConnections.forEach((peer, peerId) => {
        peer.destroy();
      });
      setPeerConnections(new Map());
      setConnectedPeers(new Map());

      // Stop local media tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
        });
        setLocalStream(null);
      }
      
      // Stop remote media tracks
      remoteStreams.forEach((stream, participantId) => {
        stream.getTracks().forEach(track => {
          track.stop();
        });
      });
      setRemoteStreams(new Map());
      
      // Leave video call in session
      leaveVideoCall();
    } catch (err) {
      console.error('Error ending call:', err);
    }
  }, [remoteStreams, localStream, peerConnections, leaveVideoCall]);

  // Update endCallRef whenever endCall changes
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (endCallRef.current) {
        endCallRef.current();
      }
    };
  }, []);

  const generateShareableLink = useCallback((sessionId: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/video-call/${sessionId}`;
  }, []);

  const joinWithLink = useCallback(async (url: string): Promise<boolean> => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const sessionId = pathParts[pathParts.length - 1];
      
      if (!sessionId) {
        setError('Invalid video call link');
        return false;
      }

      const result = await startCall('client', sessionId);
      return result !== null;
    } catch (err) {
      console.error('Error joining with link:', err);
      setError('Failed to join video call');
      return false;
    }
  }, [startCall]);

  const videoCallParticipants = sessionState?.videoCallState?.participants || [];
  const isInVideoCall = videoCallParticipants.includes(participantId);

  const value = {
    localStream,
    remoteStreams,
    connectionStatus,
    startCall,
    endCall,
    error,
    setError,
    generateShareableLink,
    joinWithLink,
    requestPermissions,
    permissionDenied,
    isAutoJoinEnabled,
    setAutoJoinEnabled,
    videoCallParticipants,
    isInVideoCall,
    connectedPeers,
    peerConnections,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
};