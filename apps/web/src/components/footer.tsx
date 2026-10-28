export const Footer = () => (
  <footer className="shrink-0 border-t border-white/[0.07] bg-[#08080a] px-3 py-1">
    <div className="flex items-center justify-between font-mono text-[10px] text-zinc-600">
      <span>kynos · autonomous agent runtime</span>
      <span className="hidden sm:inline">
        internal api :3001 · data/kynos.sqlite
      </span>
    </div>
  </footer>
);

export default Footer;
