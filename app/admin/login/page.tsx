import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Lock } from 'lucide-react'

/** Constant-time string comparison (Edge-runtime safe — no Node crypto). */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  const maxLen = Math.max(aBytes.length, bBytes.length)
  // XOR length difference into result so mismatched lengths always fail
  let result = aBytes.length ^ bBytes.length
  for (let i = 0; i < maxLen; i++) {
    result |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return result === 0
}

async function loginAction(formData: FormData) {
  'use server'
  const password = (formData.get('password') as string) ?? ''
  const secret = process.env.ADMIN_SECRET ?? ''

  if (!secret || !timingSafeEqual(password, secret)) {
    redirect('/admin/login?error=1')
  }

  const cookieStore = await cookies()
  cookieStore.set('adminToken', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })

  redirect('/admin')
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-2xl border border-earth/20 bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest/10">
            <Lock className="h-6 w-6 text-forest" />
          </div>
          <h1 className="font-heading text-xl font-semibold text-forest">
            เข้าสู่ระบบแผงควบคุม
          </h1>
          <p className="text-sm text-earth">เขียวสุวรรณออร์แกนิค</p>
        </div>

        <form action={loginAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-forest"
            >
              รหัสผ่าน
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-lg border border-earth/30 bg-cream px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-forest px-4 py-2.5 font-medium text-cream transition-colors hover:bg-forest-light active:bg-forest"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  )
}
