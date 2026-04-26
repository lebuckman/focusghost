import { app } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import type { AppSettings } from '../../shared/ipc-contract';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2';

const DEFAULT_VOICE_CONFIG = {
  gentle: {
    id: process.env.ELEVENLABS_VOICE_GENTLE?.trim() || 'MF3mGyEYCl7XYWbV9V6O', // Elli
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.1,
      use_speaker_boost: true,
    },
  },
  balanced: {
    id: process.env.ELEVENLABS_VOICE_BALANCED?.trim() || '21m00Tcm4TlvDq8ikWAM', // Rachel
    settings: {
      stability: 0.4,
      similarity_boost: 0.8,
      style: 0.2,
      use_speaker_boost: true,
    },
  },
  strict: {
    id: process.env.ELEVENLABS_VOICE_STRICT?.trim() || 'ErXwobaYiN019PkySvjV', // Antoni
    settings: {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0.05,
      use_speaker_boost: true,
    },
  },
} as const;

type VoiceBucket = keyof typeof DEFAULT_VOICE_CONFIG;

let playbackQueue: Promise<void> = Promise.resolve();

const currentPlayback: {
  child: ReturnType<typeof spawn> | null;
  filePath: string | null;
} = {
  child: null,
  filePath: null,
};

function resolveVoiceBucket(settings: AppSettings): VoiceBucket {
  if (settings.personality === 'supportive') return 'gentle';
  if (settings.personality === 'drill-sergeant') return 'strict';
  if (settings.personality === 'playful') return 'balanced';
  return settings.nudgeSensitivity;
}

function resolveVoiceConfig(settings: AppSettings) {
  const bucket = resolveVoiceBucket(settings);
  return DEFAULT_VOICE_CONFIG[bucket];
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  if (typeof value === 'number') return value !== 0;

  return false;
}

function isVoiceEnabled(settings: AppSettings): boolean {
  return normalizeBoolean((settings as AppSettings & { voiceEnabled?: unknown }).voiceEnabled);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesizeSpeech(text: string, settings: AppSettings): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  if (!apiKey) {
    console.debug('[Voice] synthesizeSpeech: no ELEVENLABS_API_KEY present');
    return null;
  }

  const voice = resolveVoiceConfig(settings);

  console.debug('[Voice] synthesizeSpeech: calling ElevenLabs', {
    voiceId: voice.id,
    personality: settings.personality,
    nudgeSensitivity: settings.nudgeSensitivity,
    textLen: text.length,
  });

  const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voice.id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model: ELEVENLABS_MODEL_ID,
      voice_settings: voice.settings,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('[Voice] ElevenLabs TTS request failed', response.status, errText.slice(0, 180));
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errText.slice(0, 180)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const outputDir = path.join(app.getPath('userData'), 'tts-cache');
  await fs.mkdir(outputDir, { recursive: true });

  const filePath = path.join(outputDir, `nudge-${Date.now()}.mp3`);
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));

  console.debug('[Voice] synthesizeSpeech: wrote tts file', filePath);
  return filePath;
}

function spawnPlayer(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.debug('[Voice] spawnPlayer:', command, args.join(' '));

    const child = spawn(command, args, { stdio: 'ignore' });
    currentPlayback.child = child;

    child.once('error', (error) => {
      if (currentPlayback.child === child) currentPlayback.child = null;
      reject(error);
    });

    child.once('exit', (code) => {
      if (currentPlayback.child === child) currentPlayback.child = null;

      if (code === 0 || code === null) {
        resolve();
        return;
      }

      reject(new Error(`Audio player exited with code ${code}`));
    });
  });
}

async function playAudioFile(filePath: string): Promise<void> {
  currentPlayback.filePath = filePath;

  try {
    if (process.platform === 'darwin') {
      await spawnPlayer('afplay', [filePath]);
      return;
    }

    if (process.platform === 'win32') {
      const escapedPath = filePath.replace(/'/g, "''");
      const psCommand = [
        'Add-Type -AssemblyName presentationCore',
        '$player = New-Object System.Windows.Media.MediaPlayer',
        `$player.Open([Uri]'${escapedPath}')`,
        '$player.Play()',
        'Start-Sleep -Seconds 10',
      ].join('; ');

      await spawnPlayer('powershell', ['-NoProfile', '-Command', psCommand]);
      return;
    }

    const linuxCandidates: Array<[string, string[]]> = [
      ['ffplay', ['-nodisp', '-autoexit', '-loglevel', 'quiet', filePath]],
      ['mpg123', ['-q', filePath]],
      ['mpv', ['--no-video', '--really-quiet', filePath]],
    ];

    for (const [command, args] of linuxCandidates) {
      try {
        await spawnPlayer(command, args);
        return;
      } catch {
        // Linux desktop audio remains a lawless swamp.
      }
    }

    throw new Error('No supported audio player found for this platform');
  } finally {
    currentPlayback.filePath = null;

    try {
      await fs.unlink(filePath);
    } catch {
      // ignore cache cleanup failures
    }
  }
}

export async function stopNudgeSpeech(): Promise<void> {
  const child = currentPlayback.child;

  if (child && !child.killed) {
    child.kill();
  }

  if (currentPlayback.filePath) {
    try {
      await fs.unlink(currentPlayback.filePath);
    } catch {
      // ignore cache cleanup failures
    }

    currentPlayback.filePath = null;
  }
}

export function speakNudge(text: string, settings: AppSettings): Promise<void> {
  console.debug('[Voice] speakNudge called with settings:', JSON.stringify(settings, null, 2));

  if (!text.trim()) return Promise.resolve();

  const voiceEnabled = isVoiceEnabled(settings);

  if (!voiceEnabled) {
    console.debug('[Voice] speakNudge skipped: voiceEnabled=false', {
      raw: (settings as AppSettings & { voiceEnabled?: unknown }).voiceEnabled,
      type: typeof (settings as AppSettings & { voiceEnabled?: unknown }).voiceEnabled,
    });
    return Promise.resolve();
  }

  console.debug('[Voice] speakNudge: queuing speech', {
    personality: settings.personality,
    nudgeSensitivity: settings.nudgeSensitivity,
    textLen: text.length,
  });

  playbackQueue = playbackQueue
    .catch((): void => undefined)
    .then(async (): Promise<void> => {
      try {
        await wait(180);

        const filePath = await synthesizeSpeech(text, settings);

        if (!filePath) {
          console.debug('[Voice] No ElevenLabs audio file. Attempting platform fallback.');

          if (process.platform === 'darwin') {
            const voiceMap: Record<string, string | undefined> = {
              supportive: 'Alex',
              playful: 'Samantha',
              'drill-sergeant': 'Daniel',
            };

            const fallbackVoice = voiceMap[settings.personality] || undefined;
            const args = fallbackVoice ? ['-v', fallbackVoice, text] : [text];

            console.debug('[Voice] fallback say:', args.join(' '));

            const child = spawn('say', args);
            child.once('error', (err) => console.error('[Voice] macOS say failed', err));
          } else {
            console.debug('[Voice] No platform fallback available for TTS on', process.platform);
          }

          return;
        }

        await playAudioFile(filePath);
      } catch (error) {
        console.error('[Voice] Failed to speak nudge:', error);
      }
    });

  return playbackQueue;
}