import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppContext";

const lato = Lato({ subsets: ["latin", "latin-ext"], weight: ["400", "700", "900"], variable: "--font-lato", display: "swap" });

export const metadata: Metadata = {
  title: "Przewodnik Rodzica – zasiłki z ubezpieczenia chorobowego",
  description: "Zasiłkowy Przewodnik Przyszłego Rodzica – uprawnienia, kalkulator zasiłku macierzyńskiego, wnioski. Projekt HackNation (demo).",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#161b18" },
  ],
};

// Nakłada zapisane ustawienia wyglądu (motyw, kontrast, rozmiar tekstu) przed pierwszym renderem – bez mignięcia.
const PREFS = `try{var d=document.documentElement,s=localStorage,t=s.getItem("theme");if(t==="dark"||t==="light")d.dataset.theme=t;if(s.getItem("a11y-contrast")==="1")d.dataset.contrast="high";var x=s.getItem("a11y-text");if(x==="1"||x==="2")d.dataset.text=x}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={lato.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS }} />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
