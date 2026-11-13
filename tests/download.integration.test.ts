import { describe, expect, it } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { downloadMediaFromUrl } from "../apps/bot/src/media/download";

const integrationIt = process.env.RUN_DOWNLOAD_INTEGRATION === "1" ? it : it.skip;

describe("yt-dlp real platform downloads", () => {
  it("passes the real Facebook URL through the yt-dlp runner", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "kynos-ytdlp-test-"));
    const executable = path.join(directory, "yt-dlp-fixture");
    const previousExecutable = process.env.KYNOS_YTDLP_PATH;
    await writeFile(
      executable,
      `#!/bin/sh
output=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output" ]; then
    output="$2"
    shift 2
  else
    shift
  fi
done
printf "fixture-media" > "$output"
`
    );
    await chmod(executable, 0o755);
    process.env.KYNOS_YTDLP_PATH = executable;

    try {
      const media = await downloadMediaFromUrl(
        "https://www.facebook.com/share/r/1CdfXKYGnx/"
      );
      expect(media.buffer.toString()).toBe("fixture-media");
      expect(media.sourceUrl).toContain("facebook.com");
    } finally {
      if (previousExecutable === undefined) {
        delete process.env.KYNOS_YTDLP_PATH;
      } else {
        process.env.KYNOS_YTDLP_PATH = previousExecutable;
      }
      await rm(directory, { recursive: true, force: true });
    }
  });

  integrationIt(
    "downloads the provided Facebook share link",
    async () => {
      const media = await downloadMediaFromUrl(
        "https://www.facebook.com/share/r/1CdfXKYGnx/"
      );
      expect(media.buffer.byteLength).toBeGreaterThan(0);
      expect(media.sourceUrl).toContain("facebook.com");
    },
    120_000
  );

  integrationIt(
    "downloads a real YouTube test video",
    async () => {
      const media = await downloadMediaFromUrl(
        "https://www.youtube.com/watch?v=BaW_jenozKc"
      );
      expect(media.buffer.byteLength).toBeGreaterThan(0);
      expect(media.sourceUrl).toContain("youtube.com");
    },
    120_000
  );
});
