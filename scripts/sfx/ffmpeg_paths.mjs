// Resolve the ffmpeg/ffprobe binaries for the gate, the SFX suites, and the SFX
// Studio spawns: prefer the pinned ffmpeg-static/ffprobe-static npm packages,
// falling back to the bare PATH names when the static binary is absent (the
// packages download their binary via an allowlisted install script, so a
// scripts-skipped install leaves the import pointing at a missing file).
// WOC_FFMPEG_PATH / WOC_FFPROBE_PATH override the resolution outright, with no
// existence check: callers probe by execution, and silently falling back would
// mask an operator's explicit choice.
import { existsSync } from 'node:fs';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

export function resolveSfxTool({ overridePath, staticPath, fallback }) {
  if (overridePath) return overridePath;
  if (staticPath && existsSync(staticPath)) return staticPath;
  return fallback;
}

export const FFMPEG_PATH = resolveSfxTool({
  overridePath: process.env.WOC_FFMPEG_PATH,
  staticPath: ffmpegStatic,
  fallback: 'ffmpeg',
});

export const FFPROBE_PATH = resolveSfxTool({
  overridePath: process.env.WOC_FFPROBE_PATH,
  staticPath: ffprobeStatic.path,
  fallback: 'ffprobe',
});
