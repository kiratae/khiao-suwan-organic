import { redirect } from 'next/navigation'

// Admin index — redirect to the orders list (primary admin task)
export default function AdminPage() {
  redirect('/admin/orders')
}
