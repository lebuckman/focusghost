import { app, shell } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import type { AppSettings } from '../../shared/ipc-contract';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2';

const DEFAULT_VOICE_IDS = {
  gentle: 'EXAVITQu4vr4xnSDxMaL',
  balanced: '21m00Tcm4TlvDq8ikWAM',
  strict: 'pNInz6obpgDQGcFmaJgB',
} as const;

let playbackQueue: Promise<void> = Promise.resolve();
const currentPlayback: { child: ReturnType<typeof spawn> | null; filePath: string | null } = {
  child: null,
  filePath: null,
};

function resolveVoiceBucket(settings: AppSettings): 'gentle' | 'balanced' | 'strict' {
  if (settings.personality === 'supportive') return 'gentle';
  if (settings.personality === 'drill-sergeant') return 'strict';
  if (settings.personality === 'playful') return 'balanced';
  return settings.nudgeSensitivity;
}

function resolveVoiceId(settings: AppSettings): string {
  const bucket = resolveVoiceBucket(settings);
  const envMap: Record<(typeof bucket), string | undefined> = {
    gentle: process.env.ELEVENLABS_VOICE_GENTLE?.trim(),
    balanced: process.env.ELEVENLABS_VOICE_BALANCED?.trim(),
    strict: process.env.ELEVENLABS_VOICE_STRICT?.trim(),
  };

  return envMap[bucket] || DEFAULT_VOICE_IDS[bucket];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesizeSpeech(text: string, settings: AppSettings): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;

  const voiceId = resolveVoiceId(settings);
  const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL_ID,
      voice_settings: {
        stability: settings.nudgeSensitivity === 'strict' ? 0.55 : 0.4,
        similarity_boost: 0.8,
        style: settings.personality === 'playful' ? 0.35 : 0.15,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errText.slice(0, 180)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const outputDir = path.join(app.getPath('userData'), 'tts-cache');
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `nudge-${Date.now()}.mp3`);
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));
  return filePath;
}

function spawnPlayer(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
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
        // try the next one because desktop Linux audio is chaos in a trench coat
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
  if (!settings.voiceEnabled) return Promise.resolve();
  if (!text.trim()) return Promise.resolve();

  playbackQueue = playbackQueue
    .catch((): void => undefined)
    .then(async (): Promise<void> => {
      try {
        shell.beep();
        await wait(180);
        const filePath = await synthesizeSpeech(text, settings);
        if (!filePath) return;
        await playAudioFile(filePath);
      } catch (error) {
        console.error('[Voice] Failed to speak nudge:', error);
      }
    });

  return playbackQueue;
}
