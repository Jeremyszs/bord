'use client';

import { useEffect, useRef } from 'react';
import { useMidiStore } from '@/store/midiStore';

/**
 * useMidiProcessor
 *
 * Attaches/detaches Web MIDI API listeners based on `isMidiEnabled`.
 * Feeds held hardware notes into midiStore.setHardwareNotes(), which
 * merges them with any virtual-keyboard notes and runs chord detection.
 */
export function useMidiProcessor() {
  const isMidiEnabled = useMidiStore((s) => s.isMidiEnabled);
  const setHardwareNotes = useMidiStore((s) => s.setHardwareNotes);

  // Mutable ref so we mutate without triggering renders on rapid MIDI events
  const heldNotes = useRef<Set<number>>(new Set());
  const midiAccessRef = useRef<MIDIAccess | null>(null);

  useEffect(() => {
    if (!isMidiEnabled) {
      heldNotes.current = new Set();
      setHardwareNotes(new Set());
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser.');
      return;
    }

    let isMounted = true;

    const handleMidiMessage = (event: MIDIMessageEvent) => {
      if (!isMounted) return;
      const data = event.data;
      if (!data || data.length < 3) return;

      const [status, note, velocity] = Array.from(data);
      const command = status & 0xf0;

      const isNoteOn = command === 0x90 && velocity > 0;
      const isNoteOff = command === 0x80 || (command === 0x90 && velocity === 0);

      if (isNoteOn) {
        heldNotes.current.add(note);
      } else if (isNoteOff) {
        heldNotes.current.delete(note);
      } else {
        return; // Ignore CC, pitch bend, etc.
      }

      setHardwareNotes(new Set(heldNotes.current));
    };

    const attachListeners = (access: MIDIAccess) => {
      midiAccessRef.current = access;
      access.inputs.forEach((input) => {
        input.onmidimessage = handleMidiMessage;
      });

      // Hot-plug support
      access.onstatechange = (e: MIDIConnectionEvent) => {
        if (!isMounted) return;
        const port = e.port;
        if (!port) return;
        if (port.type === 'input') {
          if (port.state === 'connected') {
            (port as MIDIInput).onmidimessage = handleMidiMessage;
          } else {
            (port as MIDIInput).onmidimessage = null;
          }
        }
      };
    };

    navigator.requestMIDIAccess({ sysex: false })
      .then(attachListeners)
      .catch((err) => {
        console.error('MIDI access denied:', err);
      });

    return () => {
      isMounted = false;
      if (midiAccessRef.current) {
        midiAccessRef.current.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
        midiAccessRef.current.onstatechange = null;
        midiAccessRef.current = null;
      }
      heldNotes.current = new Set();
      setHardwareNotes(new Set());
    };
  }, [isMidiEnabled, setHardwareNotes]);
}
