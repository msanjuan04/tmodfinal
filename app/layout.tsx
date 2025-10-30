import type React from "react"
import { Inter, Montserrat } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
})

export const metadata = {
  title: "Terrazea · Diseño exterior & protección liquid glass",
  description: "Descubre cómo combinamos diseño mediterráneo con tecnología de vidrio líquido para tu terraza ideal.",
  generator: "v0.app",
  icons: {
    icon: "/placeholder-logo.png",
  },
  openGraph: {
    title: "Terrazea · Diseño exterior & protección liquid glass",
    description:
      "Diseño exterior mediterráneo con tecnología liquid glass que protege y realza tu terraza con un acabado cristalino.",
    url: "https://terrazea.com",
    siteName: "Terrazea",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terrazea · Diseño exterior & protección liquid glass",
    description:
      "Diseño exterior mediterráneo con tecnología liquid glass que protege y realza tu terraza con un acabado cristalino.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-body antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
