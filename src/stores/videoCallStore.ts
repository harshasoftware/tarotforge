import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface VideoCallState {
  // Call state
  isInCall: boolean;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  participants: string[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed';
  error: string | null;
  
  // Internal state
  channel: RealtimeChannel | null;
  peerConnections: Map<string, RTCPeerConnection>;
  sessionId: string | null;
  participantId: string | null;
  
  // Actions
  initializeVideoCall: (sessionId: string, participantId: string) => Promise<void>;
  startCall: () => Promise<void>;
  joinCall: () => Promise<void>;
  endCall: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  cleanup: () => void;
  
  // Internal methods
  createPeerConnection: (targetParticipantId: string, initiator: boolean, offer?: RTCSessionDescriptionInit) => Promise<void>;
  handleUserLeft: (userId: string) => void;
  handleOffer: (payload: { offer: RTCSessionDescriptionInit; from: string }) => Promise<void>;
  handleAnswer: (payload: { answer: RTCSessionDescriptionInit; from: string }) => Promise<void>;
  handleIceCandidate: (payload: { candidate: RTCIceCandidateInit; from: string }) => Promise<void>;
}

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export const useVideoCallStore = create<VideoCallState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isInCall: false,
    localStream: null,
    remoteStreams: new Map(),
    isVideoEnabled: true,
    isAudioEnabled: true,
    participants: [],
    connectionStatus: 'disconnected',
    error: null,
    channel: null,
    peerConnections: new Map(),
    sessionId: null,
    participantId: null,

    initializeVideoCall: async (sessionId: string, participantId: string) => {
      const state = get();
      
      // Clean up existing channel if any
      if (state.channel) {
        await state.channel.unsubscribe();
      }

      set({ sessionId, participantId });

      const channelName = `video_call:${sessionId}`;
      console.log('Initializing video call channel:', channelName);
      
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: participantId }
        }
      });

      // Handle presence (participants joining/leaving)
      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const participantIds = Object.keys(presenceState).filter(id => id !== participantId);
          console.log('Video call participants synced:', participantIds);
          set({ participants: participantIds });
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          console.log('User joined video call:', key);
          if (key !== participantId && get().localStream && !get().peerConnections.has(key)) {
            setTimeout(() => {
              get().createPeerConnection(key, true);
            }, 500);
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log('User left video call:', key);
          get().handleUserLeft(key);
        })
        // Handle WebRTC signaling
        .on('broadcast', { event: 'video_offer' }, ({ payload }) => {
          if (payload.to === participantId) {
            console.log('Received video offer from:', payload.from);
            get().handleOffer(payload);
          }
        })
        .on('broadcast', { event: 'video_answer' }, ({ payload }) => {
          if (payload.to === participantId) {
            console.log('Received video answer from:', payload.from);
            get().handleAnswer(payload);
          }
        })
        .on('broadcast', { event: 'video_ice_candidate' }, ({ payload }) => {
          if (payload.to === participantId) {
            console.log('Received ICE candidate from:', payload.from);
            get().handleIceCandidate(payload);
          }
        })
        .subscribe(async (status) => {
          console.log('Video call channel status:', status);
          if (status === 'SUBSCRIBED') {
            set({ connectionStatus: 'connected', error: null });
          } else if (status === 'CHANNEL_ERROR') {
            set({ connectionStatus: 'failed', error: 'Failed to connect to video call' });
          }
        });

      set({ channel });
    },

    startCall: async () => {
      try {
        console.log('Starting video call...');
        set({ connectionStatus: 'connecting', error: null });
        
        // Request media permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        console.log('Got local stream:', stream.getTracks().map(t => t.kind));
        set({ localStream: stream, isInCall: true });
        
        // Track presence in the video call
        const { channel, participantId } = get();
        if (channel && participantId) {
          await channel.track({
            user_id: participantId,
            online_at: new Date().toISOString(),
            has_video: true,
            has_audio: true
          });
          console.log('Tracking presence in video call');
        }
        
        set({ connectionStatus: 'connected' });
      } catch (error) {
        console.error('Error starting call:', error);
        set({ 
          error: 'Failed to access camera and microphone. Please check permissions.',
          connectionStatus: 'failed'
        });
      }
    },

    joinCall: async () => {
      console.log('Joining video call...');
      await get().startCall();
    },

    endCall: () => {
      console.log('Ending video call...');
      const { peerConnections, localStream, channel } = get();
      
      // Close all peer connections
      peerConnections.forEach((pc, userId) => {
        console.log('Closing peer connection with:', userId);
        pc.close();
      });
      
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => {
          console.log('Stopping track:', track.kind);
          track.stop();
        });
      }
      
      // Untrack presence
      if (channel) {
        channel.untrack();
        console.log('Untracked presence from video call');
      }
      
      set({
        peerConnections: new Map(),
        localStream: null,
        remoteStreams: new Map(),
        participants: [],
        isInCall: false,
        connectionStatus: 'disconnected',
        error: null
      });
    },

    toggleVideo: () => {
      const { localStream, channel, participantId, isAudioEnabled } = get();
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          set({ isVideoEnabled: videoTrack.enabled });
          console.log('Video toggled:', videoTrack.enabled);
          
          // Update presence
          if (channel && participantId) {
            channel.track({
              user_id: participantId,
              online_at: new Date().toISOString(),
              has_video: videoTrack.enabled,
              has_audio: isAudioEnabled
            });
          }
        }
      }
    },

    toggleAudio: () => {
      const { localStream, channel, participantId, isVideoEnabled } = get();
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          set({ isAudioEnabled: audioTrack.enabled });
          console.log('Audio toggled:', audioTrack.enabled);
          
          // Update presence
          if (channel && participantId) {
            channel.track({
              user_id: participantId,
              online_at: new Date().toISOString(),
              has_video: isVideoEnabled,
              has_audio: audioTrack.enabled
            });
          }
        }
      }
    },

    cleanup: () => {
      const { channel } = get();
      get().endCall();
      if (channel) {
        channel.unsubscribe();
      }
      set({ 
        channel: null, 
        sessionId: null, 
        participantId: null 
      });
    },

    // Internal methods
    createPeerConnection: async (userId: string, isInitiator: boolean, offer?: RTCSessionDescriptionInit) => {
      try {
        console.log(`Creating peer connection with ${userId}, initiator: ${isInitiator}`);
        const { peerConnections, localStream, channel, participantId } = get();
        
        if (peerConnections.has(userId)) {
          console.log('Peer connection already exists for:', userId);
          return;
        }

        const pc = new RTCPeerConnection(rtcConfig);
        const newConnections = new Map(peerConnections);
        newConnections.set(userId, pc);
        set({ peerConnections: newConnections });

        // Add local stream tracks
        if (localStream) {
          localStream.getTracks().forEach(track => {
            console.log('Adding track to peer connection:', track.kind);
            pc.addTrack(track, localStream);
          });
        }

        // Handle remote stream
        pc.ontrack = (event) => {
          console.log('Received remote stream from:', userId);
          const [remoteStream] = event.streams;
          set(state => ({
            remoteStreams: new Map(state.remoteStreams).set(userId, remoteStream)
          }));
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && channel && participantId) {
            console.log('Sending ICE candidate to:', userId);
            channel.send({
              type: 'broadcast',
              event: 'video_ice_candidate',
              payload: {
                candidate: event.candidate.toJSON(),
                to: userId,
                from: participantId
              }
            });
          }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          console.log(`Connection state with ${userId}:`, pc.connectionState);
          if (pc.connectionState === 'failed') {
            console.error(`Connection failed with ${userId}`);
            set({ error: `Connection failed with participant` });
            get().handleUserLeft(userId);
          } else if (pc.connectionState === 'connected') {
            console.log(`Successfully connected to ${userId}`);
            set({ error: null });
          }
        };

        if (isInitiator) {
          // Create and send offer
          console.log('Creating offer for:', userId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          if (channel && participantId) {
            channel.send({
              type: 'broadcast',
              event: 'video_offer',
              payload: {
                offer,
                to: userId,
                from: participantId
              }
            });
            console.log('Sent offer to:', userId);
          }
        } else if (offer) {
          // Handle incoming offer
          console.log('Setting remote description and creating answer for:', userId);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          if (channel && participantId) {
            channel.send({
              type: 'broadcast',
              event: 'video_answer',
              payload: {
                answer,
                to: userId,
                from: participantId
              }
            });
            console.log('Sent answer to:', userId);
          }
        }
      } catch (error) {
        console.error('Error creating peer connection:', error);
        set({ error: `Failed to connect with participant` });
      }
    },

    handleUserLeft: (userId: string) => {
      console.log('Handling user left:', userId);
      const { peerConnections } = get();
      const pc = peerConnections.get(userId);
      if (pc) {
        pc.close();
        const newConnections = new Map(peerConnections);
        newConnections.delete(userId);
        set({ peerConnections: newConnections });
      }
      
      set(state => {
        const newStreams = new Map(state.remoteStreams);
        newStreams.delete(userId);
        return { remoteStreams: newStreams };
      });
    },

    handleOffer: async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      try {
        console.log('Processing offer from:', from);
        await get().createPeerConnection(from, false, offer);
      } catch (error) {
        console.error('Error handling offer:', error);
        set({ error: 'Failed to process incoming call' });
      }
    },

    handleAnswer: async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
      try {
        console.log('Processing answer from:', from);
        const pc = get().peerConnections.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('Set remote description for answer from:', from);
        }
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    },

    handleIceCandidate: async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
      try {
        const pc = get().peerConnections.get(from);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('Added ICE candidate from:', from);
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }))
); 