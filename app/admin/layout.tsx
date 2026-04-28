import Link from 'next/link'

const NAV = [
  { href: '/admin/prices', label: 'ราคาสินค้า' },
  { href: '/admin/shipping', label: 'ค่าขนส่ง' },
  { href: '/admin/yield', label: 'โควตาผลผลิต' },
  { href: '/admin/orders', label: 'คำสั่งจอง' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-cream-dark">
      <header className="border-b border-white/10 bg-forest">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex h-14 items-center justify-between">
            <span className="font-heading text-base font-semibold text-cream">
              เขียวสุวรรณออร์แกนิค
            </span>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-cream/80 transition-colors hover:bg-white/10 hover:text-cream"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
