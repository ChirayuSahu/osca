import type { Metadata } from "next";
import { 
  Geist, 
  Geist_Mono, 
  JetBrains_Mono, 
  Playfair_Display, 
  Libre_Baskerville 
} from "next/font/google";
import './globals.css'
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "OSCA",
  description: "Open Source Contributor Analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={cn("font-mono bg-black text-white", jetbrainsMono.variable)} 
      suppressHydrationWarning
    >
      <body
        className={cn(
          geistSans.variable, 
          geistMono.variable, 
          playfairDisplay.variable, 
          libreBaskerville.variable, 
          "font-sans antialiased bg-black text-white"
        )}
        suppressHydrationWarning
      >
        <AuthProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}