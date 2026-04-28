import type { Metadata } from 'next'
import { Sarabun } from 'next/font/google'
import Script from 'next/script'
import '@/app/globals.css'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'เขียวสุวรรณออร์แกนิค | สั่งจองผลไม้ออร์แกนิค ระยอง',
  description:
    'สั่งจองล่วงหน้า มังคุด และ ทุเรียนหมอนทอง จากสวนเขียวสุวรรณ ระยอง ปลูกด้วยปุ๋ยอินทรีย์ คุณภาพพรีเมียม',
  keywords: ['บ้านเต้', 'เขียวสุวรรณ', 'ระยอง', 'ออร์แกนิค', 'ปุ๋ยอินทรีย์', 'มังคุด', 'ทุเรียนหมอนทอง'],
  openGraph: {
    title: 'เขียวสุวรรณออร์แกนิค',
    description: 'ผลไม้ออร์แกนิคพรีเมียมจากระยอง — สั่งจองล่วงหน้าได้ที่นี่',
    locale: 'th_TH',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="min-h-screen antialiased">{children}</body>
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />
      )}
    </html>
  )
}
