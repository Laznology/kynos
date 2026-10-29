import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import { Footer } from "../components/footer";
import { Header } from "../components/header";

import appCss from "../styles.css?url";

const RootDocument = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className="dark h-full">
    <head>
      <HeadContent />
    </head>
    <body className="bg-background text-foreground selection:bg-primary flex h-screen flex-col overflow-hidden antialiased selection:text-white">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
      <Footer />
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRoute({
  head: () => ({
    links: [
      { href: appCss, rel: "stylesheet" },
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      {
        href: "https://fonts.gstatic.com",
        crossorigin: "true",
        rel: "preconnect",
      },
      {
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        rel: "stylesheet",
      },
    ],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      {
        content: "Kynos console: WhatsApp agent runtime control panel",
        name: "description",
      },
      { title: "kynos console" },
    ],
  }),
  shellComponent: RootDocument,
});
