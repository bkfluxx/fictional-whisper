import type { Metadata } from "next";
import { Lora, Inter, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aura",
  description: "Your private, encrypted journal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Aura",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/logo.jpg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lora.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Restore palette, font scale, and density before first paint to avoid flash */}
        <Script
          id="aura-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var pc=localStorage.getItem('aura-palette-css');if(pc){var ps=document.createElement('style');ps.id='aura-palette';ps.textContent=pc;document.head.appendChild(ps);}}catch(e){}try{var s=localStorage.getItem('aura-font-scale');if(s)document.documentElement.style.fontSize=s+'%';}catch(e){}try{var d=localStorage.getItem('aura-density');if(d)document.documentElement.setAttribute('data-density',d);}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
