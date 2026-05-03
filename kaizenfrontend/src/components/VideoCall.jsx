import { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';

export default function VideoCall({ roomUrl, userName, onLeave }) {
  const callContainerRef = useRef(null);
  const callFrameRef = useRef(null);
  const initializedRef = useRef(false); // Track if we've already initialized
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Clean up function - strictly destroy any existing instance
  const destroyCallFrame = () => {
    if (callFrameRef.current) {
      try {
        // Remove all event listeners first
        const frame = callFrameRef.current;
        frame.off('joined-meeting');
        frame.off('joining-meeting');
        frame.off('error');
        frame.off('camera-error');
        frame.off('mic-error');
        frame.off('left-meeting');
        frame.off('participant-joined');
        frame.off('participant-left');
        
        // Destroy the frame
        frame.destroy();
      } catch (err) {
        console.warn('Error destroying call frame:', err);
      } finally {
        callFrameRef.current = null;
        initializedRef.current = false;
      }
    }
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (!roomUrl || !callContainerRef.current || initializedRef.current) {
      return;
    }

    let isMounted = true;

    const initializeCall = async () => {
      // Double-check we haven't already initialized
      if (initializedRef.current && callFrameRef.current) {
        console.log('Call already initialized, skipping...');
        return;
      }

      try {
        setIsConnecting(true);
        setError('');

        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Your browser does not support video calls. Please use Chrome, Firefox, or Edge.');
        }

        // Request permissions (but don't fail if user denies, Daily will handle it)
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch (permError) {
          console.warn('Permission request warning:', permError);
          // Don't throw - Daily will handle permission requests
        }

        // Create the frame
        const frame = DailyIframe.createFrame(callContainerRef.current, {
          showLeaveButton: true,
          showFullscreenButton: true,
          showChat: false, // Disable chat to reduce complexity
          showParticipantsBar: true,
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '12px'
          },
          userMediaConstraints: {
            audio: true,
            video: true
          }
        });

        if (!isMounted) return;
        
        callFrameRef.current = frame;
        initializedRef.current = true;

        // Set up event listeners
        frame.on('joining-meeting', () => {
          console.log('Joining meeting...');
          setIsConnecting(true);
        });

        frame.on('joined-meeting', () => {
          console.log('Successfully joined meeting');
          setIsConnecting(false);
          setError('');
        });

        frame.on('error', (e) => {
          console.error('Daily.co error:', e);
          let errorMessage = 'Failed to connect to video call. ';
          
          if (e.errorMsg?.includes('permission')) {
            errorMessage += 'Please allow camera and microphone access.';
          } else if (e.errorMsg?.includes('network')) {
            errorMessage += 'Please check your internet connection.';
          } else if (e.errorMsg?.includes('Duplicate')) {
            errorMessage += 'A call is already in progress. Please refresh the page.';
          } else {
            errorMessage += 'Please try again.';
          }
          
          setError(errorMessage);
          setIsConnecting(false);
        });

        frame.on('camera-error', (e) => {
          console.error('Camera error:', e);
          setError('Camera failed to start. Please check your camera settings.');
        });

        frame.on('mic-error', (e) => {
          console.error('Microphone error:', e);
          setError('Microphone failed to start. Please check your microphone settings.');
        });

        frame.on('left-meeting', () => {
          console.log('Left meeting');
          if (isMounted && !isLeaving) {
            handleLeave();
          }
        });

        frame.on('participant-joined', (e) => {
          console.log('Participant joined:', e.participant.userName);
        });

        frame.on('participant-left', (e) => {
          console.log('Participant left:', e.participant.userName);
        });

        // Join the meeting
        await frame.join({ 
          url: roomUrl, 
          userName: userName || 'User' 
        });
        
      } catch (err) {
        console.error('Error initializing video call:', err);
        setError(err.message || 'Unable to start video call. Please check your camera/microphone permissions.');
        setIsConnecting(false);
        initializedRef.current = false;
      }
    };

    // Slight delay to ensure DOM is ready
    const timer = setTimeout(initializeCall, 100);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      isMounted = false;
      destroyCallFrame();
    };
  }, [roomUrl, userName]); // Only depend on roomUrl and userName

  const handleLeave = () => {
    if (isLeaving) return;
    
    setIsLeaving(true);
    
    if (callFrameRef.current) {
      try {
        callFrameRef.current.leave();
      } catch (err) {
        console.error('Error leaving meeting:', err);
      }
    }
    
    // Call onLeave after a short delay to allow cleanup
    setTimeout(() => {
      destroyCallFrame();
      onLeave?.();
    }, 100);
  };

  const toggleMute = async () => {
    if (!callFrameRef.current) return;
    
    try {
      if (isMuted) {
        await callFrameRef.current.setAudio(true);
        setIsMuted(false);
      } else {
        await callFrameRef.current.setAudio(false);
        setIsMuted(true);
      }
    } catch (err) {
      console.error('Error toggling audio:', err);
    }
  };

  const toggleVideo = async () => {
    if (!callFrameRef.current) return;
    
    try {
      if (isVideoOff) {
        await callFrameRef.current.setVideo(true);
        setIsVideoOff(false);
      } else {
        await callFrameRef.current.setVideo(false);
        setIsVideoOff(true);
      }
    } catch (err) {
      console.error('Error toggling video:', err);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        width: '100%', maxWidth: 1200,
        height: '85vh',
        background: '#1a1a2e',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {isConnecting && !error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '20px 30px',
            borderRadius: 12,
            fontSize: 14,
            zIndex: 10,
            textAlign: 'center'
          }}>
            <div style={{
              width: 40,
              height: 40,
              border: '3px solid rgba(233,30,140,0.3)',
              borderTop: `3px solid #e91e8c`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px'
            }} />
            Connecting to video call...
          </div>
        )}
        
        {error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#e53e3e',
            color: 'white',
            padding: '20px 30px',
            borderRadius: 12,
            fontSize: 14,
            zIndex: 10,
            textAlign: 'center',
            maxWidth: '80%'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎥</div>
            {error}
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 20px',
                  background: 'white',
                  color: '#e53e3e',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={handleLeave}
                style={{
                  padding: '8px 20px',
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid white',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        <div ref={callContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>
      
      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={toggleMute}
          style={{
            padding: '10px 20px',
            background: isMuted ? '#e53e3e' : 'linear-gradient(135deg, #e91e8c, #9c27b0)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: 120
          }}
        >
          {isMuted ? '🔴 Unmute' : '🎤 Mute'}
        </button>
        
        <button
          onClick={toggleVideo}
          style={{
            padding: '10px 20px',
            background: isVideoOff ? '#e53e3e' : 'linear-gradient(135deg, #e91e8c, #9c27b0)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: 140
          }}
        >
          {isVideoOff ? '📷 Turn On Camera' : '📹 Turn Off Camera'}
        </button>
        
        <button
          onClick={handleLeave}
          disabled={isLeaving}
          style={{
            padding: '10px 28px',
            background: isLeaving ? '#ccc' : '#e53e3e',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: isLeaving ? 'not-allowed' : 'pointer',
            minWidth: 120
          }}
        >
          {isLeaving ? 'Leaving...' : 'Leave Call'}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}