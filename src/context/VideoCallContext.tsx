import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Peer from 'simple-peer';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type VideoCallContextType = {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  startCall: (mode: 'reader' | 'client', existingSessionId?: string) => Promise<string | null>;
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

const VideoCallContext = createContext<VideoCallContextType>({
  localStream: null,
  remoteStream: null,
  connectionStatus: 'disconnected',
  startCall: async () => null,
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
  const localStreamRef = useRef<MediaStream | null>(null);
  const endCallRef = useRef<() => void>(() => {});
  
  // End call and clean up resources
  const endCall = useCallback(() => {
    try {
      // Close peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      
      // Stop local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
      setLocalStream(null);
      localStreamRef.current = null;
      
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
      setError(null);
      setPermissionDenied(false);
      
      console.log('Call ended and resources cleaned up');
    } catch (err: any) {
      console.error('Error ending call:', err);
    }
  }, [remoteStream]);

  // Update endCallRef whenever endCall changes
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);
  
  // Handle cleanup when component unmounts
  useEffect(() => {
    return () => {
      endCallRef.current();
    };
  }, []);
  
  // Function to create a new WebRTC peer
  const createPeer = useCallback((initiator: boolean, stream: MediaStream): Peer.Instance => {
    try {
      if (!stream) {
        throw new Error('No media stream available');
      }

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
        if (!sessionId) {
          console.error('Cannot send signal: No session ID');
          return;
        }

        if (!user?.id) {
          console.error('Cannot send signal: No user ID');
          return;
        }

        // Determine the signal type based on the data
        let signalType: 'offer' | 'answer' | 'ice-candidate';
        if (data.type === 'offer') {
          signalType = 'offer';
        } else if (data.type === 'answer') {
          signalType = 'answer';
        } else {
          signalType = 'ice-candidate';
        }
        
        sendSignal({
          type: signalType,
          sender: user.id,
          recipient: null,
          sessionId: sessionId,
          data
        });
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
    if (!peerRef.current) {
      console.error('No peer connection available');
      return;
    }
    
    try {
      console.log(`Processing ${signalData.type} signal`);
      
      // Process the signal data based on type
      if (signalData.type === 'offer' || signalData.type === 'answer' || signalData.type === 'ice-candidate') {
        peerRef.current.signal(signalData.data);
      }
    } catch (err) {
      console.error('Error handling signal:', err);
      setError('Failed to process connection signal');
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
      setError('Failed to send connection signal');
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
      console.log("Explicitly requesting camera and microphone permissions");
      
      // Try to get audio-only first to ensure at least audio works
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false
      });
      
      console.log("Audio permission granted successfully");
      
      // Now try to get video
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        console.log("Video permission granted successfully");
        
        // Combine the streams
        videoStream.getAudioTracks().forEach(track => {
          track.stop(); // Stop any audio tracks from video stream
        });
        
        // Add video tracks to audio stream
        videoStream.getVideoTracks().forEach(track => {
          audioStream.addTrack(track);
        });
      } catch (videoErr) {
        console.warn("Could not get video permission, continuing with audio only:", videoErr);
      }
      
      // Clean up the test stream
      audioStream.getTracks().forEach(track => track.stop());
      
      console.log("Media permissions test completed successfully");
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
      // Define optimized video constraints for performance
      const videoConstraints = {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 15, max: 30 }
      };
      
      // First try to get audio only - this is most important for a call
      console.log('Requesting audio permissions first...');
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      console.log('Audio permissions granted, now trying video...');
      
      // Now try to get video with optimized quality
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints,
          audio: false
        });
        
        // Combine the streams
        videoStream.getVideoTracks().forEach(track => {
          audioStream.addTrack(track);
        });
        
        console.log('Successfully obtained both audio and video permissions with optimized quality');
        return { stream: audioStream, audioOnly: false };
      } catch (videoErr) {
        console.warn('Could not get video permissions, continuing with audio only:', videoErr);
        return { stream: audioStream, audioOnly: true };
      }
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
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
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
  const startCall = useCallback(async (mode: 'reader' | 'client', existingSessionId?: string): Promise<string | null> => {
    try {
      // Ensure user is authenticated
      if (!user?.id) {
        throw new Error('User must be authenticated to start a call');
      }

      // Clean up any existing call first
      endCallRef.current();

      setError(null);
      setPermissionDenied(false);
      setConnectionStatus('connecting');
      
      // Generate or validate session ID
      let callSessionId: string | null = null;
      
      if (mode === 'reader') {
        callSessionId = uuidv4();
      } else if (existingSessionId) {
        // Validate existing session ID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existingSessionId)) {
          throw new Error('Invalid session ID format');
        }
        callSessionId = existingSessionId;
      } else {
        throw new Error('Session ID is required for clients to join');
      }

      if (!callSessionId) {
        throw new Error('Failed to generate or validate session ID');
      }
      
      setSessionId(callSessionId);
      
      // Check if media devices are available
      const { success, audioOnly } = await checkMediaDevices();
      if (!success) {
        setConnectionStatus('disconnected');
        return null;
      }
      
      // Request media permissions explicitly
      const { stream, audioOnly: isAudioOnly } = await requestMediaPermissions();
      
      if (!stream) {
        setConnectionStatus('disconnected');
        return null;
      }
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // Create peer connection
      const peer = createPeer(mode === 'reader', stream);
      peerRef.current = peer;
      
      return callSessionId;
    } catch (err: any) {
      console.error('Error starting call:', err);
      setError(`Failed to start call: ${err.message}`);
      setConnectionStatus('disconnected');
      return null;
    }
  }, [checkMediaDevices, createPeer, requestMediaPermissions, user]);
  
  // Generate a shareable link for the session
  const generateShareableLink = useCallback((sessionId: string) => {
    if (!sessionId) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/reading-room?join=${sessionId}`;
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
      return result !== null;
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