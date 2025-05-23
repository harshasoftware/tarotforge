import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Peer from 'simple-peer';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type VideoCallContextType = {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  startCall: (mode: 'reader' | 'client', existingSessionId?: string) => Promise<string | undefined>;
  endCall: () => void;
  error: string | null;
  setError: (error: string | null) => void;
  generateShareableLink: (sessionId: string) => string;
  joinWithLink: (url: string) => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  permissionDenied: boolean;
};

interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  sender: string;
  recipient: string | null;
  sessionId: string;
  data: any;
}

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

const VideoCallContext = createContext<VideoCallContextType>({
  localStream: null,
  remoteStream: null,
  connectionStatus: 'disconnected',
  startCall: async () => { return undefined; },
  endCall: () => {},
  error: null,
  setError: () => {},
  generateShareableLink: () => "",
  joinWithLink: async () => false,
  requestPermissions: async () => false,
  permissionDenied: false,
});

export const useVideoCall = () => useContext(VideoCallContext);

export const VideoCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const peerRef = useRef<Peer.Instance | null>(null);
  const channelRef = useRef<any>(null);
  
  // Handle cleanup when component unmounts
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);
  
  // Function to create a new WebRTC peer
  const createPeer = useCallback((initiator: boolean, stream: MediaStream): Peer.Instance => {
    try {
      const peer = new Peer({
        initiator,
        trickle: true,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });
      
      // Handle receiving remote stream
      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        setRemoteStream(remoteStream);
      });
      
      // Handle ICE candidates
      peer.on('signal', (data) => {
        // Determine the signal type based on the data
        let signalType: 'offer' | 'answer' | 'ice-candidate';
        if (data.type === 'offer') {
          signalType = 'offer';
        } else if (data.type === 'answer') {
          signalType = 'answer';
        } else {
          signalType = 'ice-candidate';
        }
        
        // Only send signal if we have a session ID
        if (sessionId) {
          sendSignal({
            type: signalType,
            sender: user?.id || 'anonymous',
            recipient: null,
            sessionId: sessionId,
            data
          });
        } else {
          console.error('Cannot send signal: No session ID');
        }
      });
      
      // Handle connection established
      peer.on('connect', () => {
        console.log('Peer connection established');
        setConnectionStatus('connected');
      });
      
      // Handle errors
      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        setError(`Connection error: ${err.message}`);
      });
      
      // Handle close
      peer.on('close', () => {
        console.log('Peer connection closed');
        setConnectionStatus('disconnected');
      });
      
      return peer;
    } catch (err: any) {
      console.error('Error creating peer:', err);
      setError(`Failed to create connection: ${err.message}`);
      throw err;
    }
  }, [sessionId, user]);
  
  // Subscribe to signaling channel in Supabase
  useEffect(() => {
    if (!sessionId) return;
    
    console.log(`Subscribing to signals for session ${sessionId}`);
    
    // Subscribe to signaling channel with Supabase Realtime
    const channel = supabase.channel(`webrtc:${sessionId}`, {
      config: {
        broadcast: {
          self: false,
        },
      }
    });
    
    channel
      .on('broadcast', { event: 'signal' }, (payload) => {
        console.log('Received signal:', payload);
        handleSignal(payload.payload as SignalData);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to webrtc:${sessionId}`);
          channelRef.current = channel;
        }
      });
    
    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);
  
  // Handle incoming signals
  const handleSignal = useCallback((signalData: SignalData) => {
    if (!peerRef.current) return;
    
    try {
      console.log(`Processing ${signalData.type} signal`);
      
      // Process the signal data based on type
      if (signalData.type === 'offer' || signalData.type === 'answer' || signalData.type === 'ice-candidate') {
        peerRef.current.signal(signalData.data);
      }
    } catch (err) {
      console.error('Error handling signal:', err);
    }
  }, []);
  
  // Send signal through Supabase Realtime
  const sendSignal = useCallback(async (signalData: SignalData) => {
    if (!channelRef.current) {
      console.error('No channel available for signaling');
      return;
    }
    
    try {
      console.log(`Sending ${signalData.type} signal`);
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: signalData
      });
    } catch (err) {
      console.error('Error sending signal:', err);
    }
  }, []);
  
  // Check if media devices are available
  const checkMediaDevices = useCallback(async (): Promise<{ success: boolean, audioOnly?: boolean }> => {
    try {
      // Check if mediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Media devices API not supported in this browser');
        return { success: false };
      }
      
      // Check if there are any video/audio devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');
      const hasAudioInput = devices.some(device => device.kind === 'audioinput');
      
      console.log('Media devices check:', { 
        hasVideoInput, 
        hasAudioInput, 
        devicesCount: devices.length,
        devices: devices.map(d => ({ kind: d.kind, label: d.label }))
      });
      
      if (!hasVideoInput && !hasAudioInput) {
        setError('No camera or microphone detected on this device');
        return { success: false };
      }
      
      if (!hasVideoInput) {
        // Can proceed with audio only
        console.warn('No camera detected. Will proceed with audio only.');
        return { success: true, audioOnly: true };
      }
      
      if (!hasAudioInput) {
        setError('No microphone detected. Video call requires a microphone');
        return { success: false };
      }
      
      return { success: true, audioOnly: false };
    } catch (err: any) {
      console.error('Error checking media devices:', err);
      setError(`Failed to access media devices: ${err.message}`);
      return { success: false };
    }
  }, []);
  
  // Request media permissions directly (useful for retry button)
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setError(null);
    setPermissionDenied(false);
    
    try {
      console.log("Explicitly requesting camera and microphone permissions...");
      
      // First try with both video and audio with more explicit constraints
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };
      
      console.log("Using constraints:", JSON.stringify(constraints));
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
        .catch(async (err) => {
          console.error("Failed with ideal constraints:", err);
          // Fallback to basic constraints
          return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        });
      
      // Log tracks to verify both audio and video were obtained
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      console.log("Obtained media tracks:", { 
        videoTracks: videoTracks.length, 
        audioTracks: audioTracks.length,
        videoLabels: videoTracks.map(t => t.label),
        audioLabels: audioTracks.map(t => t.label)
      });
      
      if (videoTracks.length === 0) {
        console.warn("No video tracks obtained despite permissions");
      }
      
      // If successful, clean up the stream
      stream.getTracks().forEach(track => track.stop());
      
      console.log("Camera and microphone permissions granted successfully");
      return true;
    } catch (err: any) {
      console.error('Error requesting permissions:', err);
      
      if (err.name === 'NotAllowedError') {
        setPermissionDenied(true);
        setError('Camera or microphone permission denied. Please check your browser settings and allow access.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please ensure your devices are connected properly.');
      } else if (err.name === 'NotReadableError') {
        setError('Cannot access your camera or microphone. They might be in use by another application.');
      } else {
        setError(`Failed to access media devices: ${err.name} - ${err.message}`);
      }
      
      return false;
    }
  }, []);
  
  // Request both audio and video permissions explicitly
  const requestMediaPermissions = useCallback(async (): Promise<{ stream: MediaStream | null, audioOnly: boolean }> => {
    try {
      // First try to get both video and audio with explicit constraints
      console.log('Requesting camera and microphone permissions with explicit constraints...');
      
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };
      
      console.log("Using constraints:", JSON.stringify(constraints));
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
        .catch(async (err) => {
          console.error("Failed with ideal constraints:", err);
          // Fallback to basic constraints
          return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        });
      
      // Log tracks to verify both audio and video were obtained
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      console.log("Obtained media tracks:", { 
        videoTracks: videoTracks.length, 
        audioTracks: audioTracks.length,
        videoLabels: videoTracks.map(t => t.label),
        audioLabels: audioTracks.map(t => t.label)
      });
      
      if (videoTracks.length === 0) {
        console.warn("No video tracks obtained despite permissions");
        // If no video tracks were obtained, try again explicitly for video
        try {
          const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false
          });
          
          // Add the video tracks to our existing stream
          videoOnlyStream.getVideoTracks().forEach(track => {
            stream.addTrack(track);
          });
          
          console.log("Successfully added video tracks in second attempt");
        } catch (videoErr) {
          console.error("Failed to add video in second attempt:", videoErr);
        }
      }
      
      return { stream, audioOnly: videoTracks.length === 0 };
    } catch (err: any) {
      console.warn('Failed to get video and audio permissions:', err);
      
      if (err.name === 'NotAllowedError') {
        setPermissionDenied(true);
        setError('Camera and microphone permission denied. Please allow access in your browser settings.');
        return { stream: null, audioOnly: false };
      }
      
      // Fallback: try to get only audio
      try {
        console.log('Falling back to audio-only...');
        const audioStream = await navigator.mediaDevices.getUserMedia({ 
          video: false, 
          audio: true 
        });
        
        console.log('Successfully got audio-only permissions');
        return { stream: audioStream, audioOnly: true };
      } catch (audioErr: any) {
        console.error('Failed to get audio permissions:', audioErr);
        
        if (audioErr.name === 'NotAllowedError') {
          setPermissionDenied(true);
          setError('Microphone permission denied. Please check your browser settings.');
        } else {
          setError('Unable to access microphone. Please check your device.');
        }
        
        return { stream: null, audioOnly: false };
      }
    }
  }, []);
  
  // Start video call
  const startCall = useCallback(async (mode: 'reader' | 'client', existingSessionId?: string): Promise<string | undefined> => {
    try {
      setError(null);
      setPermissionDenied(false);
      setConnectionStatus('connecting');
      
      // Generate a session ID if initiating the call
      const callSessionId = mode === 'reader' ? uuidv4() : existingSessionId;
      
      if (!callSessionId) {
        throw new Error('Session ID is required for clients to join');
      }
      
      setSessionId(callSessionId);
      
      // Check if media devices are available
      const { success, audioOnly } = await checkMediaDevices();
      if (!success) {
        setConnectionStatus('disconnected');
        return undefined;
      }
      
      // Request media permissions explicitly
      const { stream, audioOnly: isAudioOnly } = await requestMediaPermissions();
      
      if (!stream) {
        setConnectionStatus('disconnected');
        return undefined;
      }
      
      setLocalStream(stream);
      
      // Create peer connection only after we have the stream
      const peer = createPeer(mode === 'reader', stream);
      peerRef.current = peer;
      
      return callSessionId;
    } catch (err: any) {
      console.error('Error starting call:', err);
      setError(`Failed to start call: ${err.message}`);
      setConnectionStatus('disconnected');
      return undefined;
    }
  }, [checkMediaDevices, createPeer, requestMediaPermissions]);
  
  // End call and clean up resources
  const endCall = useCallback(() => {
    try {
      // Close peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      
      // Stop local media tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
        });
        setLocalStream(null);
      }
      
      // Stop remote media tracks
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => {
          track.stop();
        });
        setRemoteStream(null);
      }
      
      // Unsubscribe from Supabase channel
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      
      // Reset state
      setSessionId(null);
      setConnectionStatus('disconnected');
      setMessages([]);
      setError(null);
      setPermissionDenied(false);
      
      console.log('Call ended and resources cleaned up');
    } catch (err: any) {
      console.error('Error ending call:', err);
    }
  }, [localStream, remoteStream]);
  
  // Generate a shareable link for the session
  const generateShareableLink = useCallback((sessionId: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/reading-room?join=${sessionId}`;
    return link;
  }, []);
  
  // Join a call using a shareable link
  const joinWithLink = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Parse the URL to extract sessionId
      const parsedUrl = new URL(url);
      const sessionId = parsedUrl.searchParams.get('join');
      
      if (!sessionId) {
        setError('Invalid invitation link. Session ID is missing.');
        return false;
      }
      
      // Start call as client
      const result = await startCall('client', sessionId);
      return !!result;
    } catch (err: any) {
      console.error('Error joining with link:', err);
      setError(`Failed to join: ${err.message}`);
      return false;
    }
  }, [startCall]);
  
  const value = {
    localStream,
    remoteStream,
    connectionStatus,
    startCall,
    endCall,
    error,
    setError,
    setError,
    generateShareableLink,
    joinWithLink,
    requestPermissions,
    permissionDenied
  };
  
  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
};