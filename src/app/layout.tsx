import type { Metadata } from "next";
import { JetBrains_Mono, Be_Vietnam_Pro, Inter } from "next/font/google";
import "../styles/globals.css";
import { AppProviders } from "@/utils/providers";
import { Navbar } from "@/components/layout/nav-bar";
import { BackgroundWaves } from "@/components/ui/background-waves";
import { PageEffects } from "@/components/ui/page-effects";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin", "vietnamese"], variable: '--font-jetbrains' });
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: '--font-inter' });
// Display face for names and section titles; geometric, with full Vietnamese diacritics.
const display = Be_Vietnam_Pro({ weight: ["600", "700", "800"], subsets: ["latin", "vietnamese"], variable: "--font-display-face" });

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Le Duc Trong",
    description: "Software Engineering Student Portfolio",
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      shortcut: "/icon.svg",
      apple: "/icon.svg",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-color-theme="green" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} ${inter.variable} ${display.variable} font-sans min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden relative`}>
        <AppProviders attribute="class" defaultTheme="dark" enableSystem>
          <BackgroundWaves />
          <Navbar />
          <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 pb-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <PageEffects />
        </AppProviders>
      </body>
    </html>
  );
}
