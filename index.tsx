/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlaybackState, Prompt } from './types';
import { GoogleGenAI, LiveMusicFilteredPrompt } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi';
import { ToastMessage } from './components/ToastMessage';
import { LiveMusicHelper } from './utils/LiveMusicHelper';
import { AudioAnalyser } from './utils/AudioAnalyser';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, apiVersion: 'v1alpha' });
const model = 'lyria-realtime-exp';

function main() {
  const initialPrompts = buildInitialPrompts();

  const pdjMidi = new PromptDjMidi(initialPrompts);
  // FIX: Cast to `any` to bypass incorrect type checking for appendChild.
  document.body.appendChild(pdjMidi as any);

  const toastMessage = new ToastMessage();
  // FIX: Cast to `any` to bypass incorrect type checking for appendChild.
  document.body.appendChild(toastMessage as any);

  const liveMusicHelper = new LiveMusicHelper(ai, model);
  liveMusicHelper.setWeightedPrompts(initialPrompts);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  // FIX: Cast to `any` to bypass incorrect type checking for addEventListener.
  (pdjMidi as any).addEventListener('prompts-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    const prompts = customEvent.detail;
    liveMusicHelper.setWeightedPrompts(prompts);
  }));

  // FIX: Cast to `any` to bypass incorrect type checking for addEventListener.
  (pdjMidi as any).addEventListener('play-pause', () => {
    liveMusicHelper.playPause();
  });

  liveMusicHelper.addEventListener('playback-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<PlaybackState>;
    const playbackState = customEvent.detail;
    pdjMidi.playbackState = playbackState;
    playbackState === 'playing' ? audioAnalyser.start() : audioAnalyser.stop();
  }));

  liveMusicHelper.addEventListener('filtered-prompt', ((e: Event) => {
    const customEvent = e as CustomEvent<LiveMusicFilteredPrompt>;
    const filteredPrompt = customEvent.detail;
    toastMessage.show(filteredPrompt.filteredReason!)
    pdjMidi.addFilteredPrompt(filteredPrompt.text!);
  }));

  const errorToast = ((e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const error = customEvent.detail;
    toastMessage.show(error);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  // FIX: Cast to `any` to bypass incorrect type checking for addEventListener.
  (pdjMidi as any).addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    const level = customEvent.detail;
    pdjMidi.audioLevel = level;
  }));

}

function buildInitialPrompts() {
  // Pick 3 random prompts to start at weight = 1
  const startOn = [...DEFAULT_PROMPTS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const prompts = new Map<string, Prompt>();

  for (let i = 0; i < DEFAULT_PROMPTS.length; i++) {
    const promptId = `prompt-${i}`;
    const prompt = DEFAULT_PROMPTS[i];
    const { text, color } = prompt;
    prompts.set(promptId, {
      promptId,
      text,
      weight: startOn.includes(prompt) ? 1 : 0,
      cc: i,
      color,
    });
  }

  return prompts;
}

const DEFAULT_PROMPTS = [
  // Strings (purples/blues)
  { color: '#d9b2ff', text: 'Lyrical Violins' },
  { color: '#9900ff', text: 'Staccato Violas' },
  { color: '#5200ff', text: 'Warm Cellos' },
  { color: '#3f00a1', text: 'Deep Double Bass' },

  // Woodwinds (greens)
  { color: '#3dffab', text: 'Soaring Flute' },
  { color: '#2af6de', text: 'Mellow Clarinet' },
  { color: '#00b894', text: 'Rich Oboe' },
  { color: '#00876c', text: 'Playful Bassoon' },

  // Brass (yellows/oranges)
  { color: '#ffdd28', text: 'Blaring Trumpets' },
  { color: '#feca57', text: 'Majestic French Horns' },
  { color: '#ff9f43', text: 'Powerful Trombones' },
  { color: '#e17055', text: 'Rumbling Tuba' },

  // Percussion & Other (reds/pinks/white)
  { color: '#d63031', text: 'Rolling Timpani' },
  { color: '#ff7675', text: 'Crisp Snare Drum' },
  { color: '#ff25f6', text: 'Plucking Harp' },
  { color: '#E0E0E0', text: 'Angelic Choir' },
];

main();