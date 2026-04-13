import { useEffect, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';

export default function VideoCall({ roomUrl, userName, onLeave }) {
  const callContainerRef = useRef(null);
  const callFrameRef     = useRef(null);

  useEffect(() => {
    if (!roomUrl || !callContainerRef.current) return;

    const frame = DailyIframe.createFrame(callContainerRef.current, {
      showLeaveButton:  true,
      showFullscreenButton: true,
      iframeStyle: {
        width:  '100%',
        height: '100%',
        border: 'none',
        borderRadius: '12px'
      }
    });

    callFrameRef.current = frame;

    frame.join({ url: roomUrl, userName: userName || 'User' });

    frame.on('left-meeting', () => {
      onLeave?.();
    });

    return () => {
      frame.destroy();
    };
  }, [roomUrl]);

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
        width: '100%', maxWidth: 960,
        height: '80vh',
        background: '#1a1a2e',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div ref={callContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>
      <button
        onClick={onLeave}
        style={{
          marginTop: 16, padding: '10px 28px',
          background: '#e91e8c', color: 'white',
          border: 'none', borderRadius: 8,
          fontSize: 14, fontWeight: 500,
          cursor: 'pointer', width: 'auto'
        }}
      >
        Leave Call
      </button>
    </div>
  );
}