import type { Metadata } from "next"
import { Google_Sans, Nunito_Sans, Instrument_Sans, Montserrat } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/lib/i18n"

const googleSansHeading = Google_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
})

const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-sans" })

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
})

const googleSans = Google_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Traveller - Transit Planner",
  description: "AI-powered transit travel planner",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", googleSans.variable, googleSans.variable, "font-sans", nunitoSans.variable, googleSansHeading.variable, instrumentSans.variable, montserrat.variable)}
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              ::-webkit-scrollbar-track {
                background: transparent;
              }
              ::-webkit-scrollbar-thumb {
                background: hsl(var(--muted-foreground) / 0.3);
                border-radius: 4px;
              }
              ::-webkit-scrollbar-thumb:hover {
                background: hsl(var(--muted-foreground) / 0.5);
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="traveller-theme"
        >
          <TooltipProvider>
            <I18nProvider>{children}</I18nProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
