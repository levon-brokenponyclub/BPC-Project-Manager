import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Broken Pony Club Project Manager',
  description: 'Project management for Broken Pony Club',
  generator: 'v0.app',
  icons: {
    icon: '/BPC-Logo.jpg',
    apple: '/BPC-Logo.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isVercelDeployment = process.env.VERCEL === '1'

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        {isVercelDeployment && <Analytics />}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
