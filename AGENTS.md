# Kynos Architectural Guidelines & Standards

Standard arsitektur Kynos dirancang untuk kemudahan maintainability, low cognitive load, dan ketiadaan over-engineering.

---

## 1. Core Philosophy: Pragmatic Modular Pipeline

1. Boring over Clever: Kode terbaca langsung tanpa abstraksi berlapis.
2. Pure Functions untuk Logika: Transformasi data, media processing (Sharp, FFmpeg), dan prompt generation berupa fungsi murni data-in data-out.
3. Vercel AI SDK Standard: Orkestrasi model bahasa menggunakan package ai dan @ai-sdk/openai dengan generateText dan tool.
4. Database Drizzle ORM: Interaksi SQLite WAL mode menggunakan drizzle-orm/bun-sqlite untuk type safety tanpa overhead ORM berat.
5. Flat Registry: Command WhatsApp dan tool AI didaftarkan via dictionary objek datar.
6. Isolasi Monorepo Bun:
   - apps/web: TanStack Start dan shadcn/ui dashboard.
   - apps/bot: Baileys daemon, Media Engine, AI SDK runner.
   - packages/db: Drizzle ORM SQLite storage.
   - packages/shared: Shared types dan constants.

---

## 2. Directory Structure Conventions

```
apps/bot/src/
├── agent/
│   ├── tools/
│   │   ├── index.ts
│   │   ├── calculator.ts
│   │   ├── datetime.ts
│   │   ├── memory.ts
│   │   ├── reminder.ts
│   │   ├── summarize.ts
│   │   ├── weather.ts
│   │   └── web-search.ts
│   ├── client.ts
│   ├── prompt.ts
│   ├── runner.ts
│   └── types.ts
├── commands/
│   ├── index.ts
│   ├── help.ts
│   ├── smeme.ts
│   ├── sticker.ts
│   ├── toimg.ts
│   └── types.ts
├── media/
│   ├── exif.ts
│   ├── meme.ts
│   ├── sticker.ts
│   └── index.ts
├── bot.ts
├── server.ts
└── index.ts
```

---

## 3. Command Pattern Standard

Setiap slash command WA mengikuti satu interface CommandHandler:

```typescript
export interface CommandContext {
  jid: string;
  sender: string;
  senderName?: string;
  isGroup: boolean;
  args: string[];
  fullText: string;
  commandName: string;
  mediaBuffer?: Buffer;
  mimetype?: string;
  quoted?: {
    text?: string;
    mediaBuffer?: Buffer;
    mimetype?: string;
    isSticker?: boolean;
    isAnimated?: boolean;
  };
  reply: (text: string) => Promise<void>;
  replyMedia: (
    buffer: Buffer,
    type: "image" | "video" | "sticker" | "document",
    caption?: string
  ) => Promise<void>;
}

export interface CommandHandler {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  execute: (ctx: CommandContext) => Promise<void>;
}
```

Menambah command baru:

1. Buat file baru di apps/bot/src/commands/<nama>.ts.
2. Export objek yang memenuhi CommandHandler.
3. Daftarkan ke COMMAND_LIST di apps/bot/src/commands/index.ts.

---

## 4. AI Tool Standard

Setiap tool menggunakan fungsi tool dari package ai dengan validasi skema Zod:

```typescript
export const sampleTool = tool({
  description: "Deskripsi fungsi",
  parameters: z.object({ ... }),
  execute: async ({ ... }) => { ... },
});
```

---

## 5. Media Processing Rules

1. WhatsApp Sticker WebP:
   - Ukuran canvas 512x512 dengan padding transparan (contain).
   - Format WebP lossy quality 80.
   - EXIF chunk berisi metadata pack Kynos.
2. Smeme:
   - Font Impact atau Arial Black via inline SVG overlay.
   - White fill dengan black stroke outline tebal.
   - Format teks atas dan bawah dipisahkan karakter pipa.
3. Video dan GIF:
   - Durasi maksimal 10 detik.
   - Framerate 15 fps untuk efisiensi memory.

---

## 6. Database and State Invariants

- Database: SQLite lokal via Drizzle ORM di folder data/kynos.sqlite.
- Mode: PRAGMA journal_mode = WAL.
- State bot selalu single-row (id = 1).
- Semua perubahan status dan aktivitas dicatat ke audit_logs.
- Tidak meninggalkan komentar satu baris di codebase.
