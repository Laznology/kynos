export const Footer = () => (
  <footer className="shrink-0 border-t border-border bg-card/60 px-4 py-2">
    <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
      <span>kynos · autonomous agent runtime</span>
      <span className="hidden sm:inline">
        internal api :3001 · data/kynos.sqlite
      </span>
    </div>
  </footer>
);

export default Footer;
