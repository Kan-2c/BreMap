import {useEffect, useRef} from 'react';
import {CHAI_VIBES_PLAYLIST, getNextTrackIndex} from '../utils/chaiVibes';

/**
 * Headless background music engine for BreMap.
 * Plays gentle warm lo-fi ambient chords cycling through CHAI_VIBES_PLAYLIST
 * once unlocked by the user's first interaction, without rendering a visible player card.
 */
export function ChaiVibesPlayer() {
  const trackIdxRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const startedRef = useRef(false);
  const chordIntervalRef = useRef<number | null>(null);
  const trackIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const triggerSoftChord = () => {
      const ctx = audioCtxRef.current;
      const filter = filterRef.current;
      if (!ctx || !filter || ctx.state !== 'running') return;

      const track = CHAI_VIBES_PLAYLIST[trackIdxRef.current];
      const now = ctx.currentTime;

      track.chordHz.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq * 0.5, now + idx * 0.14);

        const peak = 0.22 / (idx + 1.4);
        noteGain.gain.setValueAtTime(0.0001, now + idx * 0.14);
        noteGain.gain.linearRampToValueAtTime(peak, now + idx * 0.14 + 0.65);
        noteGain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + idx * 0.14 + 4.4
        );

        osc.connect(noteGain);
        noteGain.connect(filter);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 4.6);
      });
    };

    const startBackgroundMusic = () => {
      if (startedRef.current) {
        if (audioCtxRef.current?.state === 'suspended') {
          void audioCtxRef.current.resume();
        }
        return;
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext?: typeof AudioContext})
          .webkitAudioContext;
      if (!AudioCtx) return;

      startedRef.current = true;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 680;
      filterRef.current = filter;

      const master = ctx.createGain();
      master.gain.value = 0.03;
      masterGainRef.current = master;

      filter.connect(master);
      master.connect(ctx.destination);

      const kickOff = () => {
        triggerSoftChord();
        chordIntervalRef.current = window.setInterval(triggerSoftChord, 4200);
        trackIntervalRef.current = window.setInterval(() => {
          trackIdxRef.current = getNextTrackIndex(
            trackIdxRef.current,
            CHAI_VIBES_PLAYLIST.length,
            false
          );
        }, 45000);
      };

      if (ctx.state === 'suspended') {
        void ctx.resume().then(kickOff).catch(() => {});
      } else {
        kickOff();
      }
    };

    const onFirstGesture = () => {
      startBackgroundMusic();
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };

    window.addEventListener('pointerdown', onFirstGesture, {passive: true});
    window.addEventListener('keydown', onFirstGesture, {passive: true});

    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      if (chordIntervalRef.current !== null) {
        window.clearInterval(chordIntervalRef.current);
      }
      if (trackIntervalRef.current !== null) {
        window.clearInterval(trackIntervalRef.current);
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  return null;
}
