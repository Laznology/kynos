# Changelog

## [1.4.0] - 2026-11-12

### Added

- Menambahkan slash command `/dl` dengan alias `/download`.
- Mendukung download media dari TikTok, Facebook/FB Watch, X/Twitter, Instagram, Threads, dan YouTube.
- Menambahkan `yt-dlp` ke image Docker bot.

### Changed

- Menambahkan informasi command `/dl` ke menu `/help`.
- Menambahkan validasi URL, batas ukuran 50 MB, timeout download, dan pembersihan temporary files.

### Tests

- Menambahkan unit test untuk registrasi command dan validasi URL downloader.
