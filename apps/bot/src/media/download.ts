import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 90_000;

const SUPPORTED_HOSTS = [
  "tiktok.com",
  "facebook.com",
  "fb.watch",
  "twitter.com",
  "x.com",
  "instagram.com",
  "threads.net",
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
];

export interface DownloadedMedia {
  buffer: Buffer;
  mimeType: string;
  sourceUrl: string;
}

const isSupportedHost = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase().replace(/^www\./u, "");
  return SUPPORTED_HOSTS.some(
    (host) => normalized === host || normalized.endsWith(`.${host}`)
  );
};

export const validateDownloadUrl = (value: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL tidak valid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL harus menggunakan http atau https.");
  }
  if (url.username || url.password || !isSupportedHost(url.hostname)) {
    throw new Error(
      "Platform belum didukung. Gunakan link TikTok, Facebook, X/Twitter, Instagram, Threads, atau YouTube."
    );
  }

  return url;
};

const getMimeType = (filename: string): string => {
  const extension = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)) {
    return extension === ".gif" ? "image/gif" : `image/${extension.slice(1)}`;
  }
  if ([".mp4", ".m4v", ".mov", ".webm", ".mkv"].includes(extension)) {
    return extension === ".webm" ? "video/webm" : "video/mp4";
  }
  if ([".mp3", ".m4a", ".ogg", ".opus", ".wav"].includes(extension)) {
    return "audio/mpeg";
  }
  return "application/octet-stream";
};

const findDownloadedFile = async (directory: string): Promise<string> => {
  const files = await readdir(directory);
  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileStats = await stat(filePath);
    if (fileStats.isFile()) {
      if (fileStats.size > MAX_DOWNLOAD_BYTES) {
        throw new Error("Ukuran media melebihi batas 50 MB.");
      }
      return filePath;
    }
  }
  throw new Error("yt-dlp tidak menghasilkan file media.");
};

const runYtDlp = async (url: URL, directory: string): Promise<void> => {
  const executable = process.env.KYNOS_YTDLP_PATH || "yt-dlp";
  const outputTemplate = path.join(directory, "%(id)s.%(ext)s");
  const child = Bun.spawn(
    [
      executable,
      "--no-playlist",
      "--no-progress",
      "--no-warnings",
      "--max-filesize",
      "50M",
      "--socket-timeout",
      "30",
      "--retries",
      "2",
      "--merge-output-format",
      "mp4",
      "--output",
      outputTemplate,
      url.toString(),
    ],
    {
      stdout: "ignore",
      stderr: "pipe",
    }
  );

  const stderrPromise = child.stderr.text();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const exitCode = await Promise.race([
      child.exited,
      new Promise<number>((resolve) => {
        timeout = setTimeout(() => {
          child.kill();
          resolve(-1);
        }, DOWNLOAD_TIMEOUT_MS);
      }),
    ]);
    const stderr = await stderrPromise;
    if (exitCode === -1) {
      throw new Error("Download timeout setelah 90 detik.");
    }
    if (exitCode !== 0) {
      const detail = stderr.trim().split("\n").at(-1);
      throw new Error(detail || "yt-dlp gagal memproses link.");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("yt-dlp gagal memproses link.");
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

export const downloadMediaFromUrl = async (
  inputUrl: string
): Promise<DownloadedMedia> => {
  const sourceUrl = validateDownloadUrl(inputUrl);
  const directory = await mkdtemp(path.join(os.tmpdir(), "kynos-dl-"));

  try {
    await runYtDlp(sourceUrl, directory);
    const filePath = await findDownloadedFile(directory);
    const buffer = await readFile(filePath);
    return {
      buffer,
      mimeType: getMimeType(filePath),
      sourceUrl: sourceUrl.toString(),
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};
