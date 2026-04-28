import type { Metadata } from 'next'
import { Sarabun, Playfair_Display } from 'next/font/google'
import '@/app/globals.css'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'บ้านเต้: เขียวสุวรรณ | สั่งจองผลไม้ออร์แกนิค ระยอง',
  description:
    'สั่งจองล่วงหน้า มังคุด และ ทุเรียนหมอนทอง จากสวนเขียวสุวรรณ ระยอง ปลูกด้วยปุ๋ยอินทรีย์ คุณภาพพรีเมียม',
  keywords: ['บ้านเต้', 'เขียวสุวรรณ', 'ระยอง', 'ออร์แกนิค', 'ปุ๋ยอินทรีย์', 'มังคุด', 'ทุเรียนหมอนทอง'],
  openGraph: {
    title: 'บ้านเต้: เขียวสุวรรณ',
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
    <html lang="th" className={`${sarabun.variable} ${playfair.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
