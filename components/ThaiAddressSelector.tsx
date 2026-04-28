'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  searchAddressByTambon,
  searchAddressByAmphoe,
  searchAddressByProvince,
  searchAddressByZipcode,
} from 'thailand-address-database'
import { Search, MapPin, X } from 'lucide-react'

export interface ThaiAddress {
  tambon: string    // ตำบล / แขวง
  amphoe: string   // อำเภอ / เขต
  province: string // จังหวัด
  zipcode: string  // รหัสไปรษณีย์
}

interface ThaiAddressSelectorProps {
  value: ThaiAddress | null
  onChange: (address: ThaiAddress | null) => void
}

function highlight(text: string, query: string): string {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-earth/20 rounded-sm">$1</mark>')
}

export default function ThaiAddressSelector({ value, onChange }: ThaiAddressSelectorProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ThaiAddress[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Search when query changes
  const search = useCallback((q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }

    let combined: ThaiAddress[] = []
    // Detect numeric → zipcode search, otherwise search all fields
    if (/^\d+$/.test(trimmed)) {
      combined = searchAddressByZipcode(trimmed, 20) as ThaiAddress[]
    } else {
      const byProvince = searchAddressByProvince(trimmed, 10) as ThaiAddress[]
      const byAmphoe = searchAddressByAmphoe(trimmed, 10) as ThaiAddress[]
      const byTambon = searchAddressByTambon(trimmed, 10) as ThaiAddress[]
      // Deduplicate by joining key fields
      const seen = new Set<string>()
      for (const item of [...byTambon, ...byAmphoe, ...byProvince]) {
        const key = `${item.tambon}|${item.amphoe}|${item.province}|${item.zipcode}`
        if (!seen.has(key)) {
          seen.add(key)
          combined.push(item)
          if (combined.length >= 20) break
        }
      }
    }
    setResults(combined)
    setOpen(combined.length > 0)
    setActiveIndex(-1)
  }, [])

  useEffect(() => {
    search(query)
  }, [query, search])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectAddress(addr: ThaiAddress) {
    onChange(addr)
    setQuery('')
    setResults([])
    setOpen(false)
    setActiveIndex(-1)
  }

  function clearAddress() {
    onChange(null)
    setQuery('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectAddress(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Selected address display */}
      {value ? (
        <div className="flex items-start justify-between rounded-lg border border-forest/30 bg-forest/5 px-4 py-3">
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
            <div className="text-sm">
              <p className="font-medium text-forest">
                ต.{value.tambon} อ.{value.amphoe}
              </p>
              <p className="text-earth">
                จ.{value.province} {value.zipcode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearAddress}
            className="ml-2 shrink-0 rounded p-0.5 text-earth/60 hover:text-earth"
            aria-label="ล้างที่อยู่"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Search input */
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-earth/50" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="พิมพ์จังหวัด อำเภอ ตำบล หรือรหัสไปรษณีย์..."
            className="w-full rounded-lg border border-earth/30 bg-cream py-2.5 pl-9 pr-4 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            autoComplete="off"
          />
        </div>
      )}

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-earth/20 bg-white shadow-lg"
        >
          {results.map((addr, i) => (
            <li
              key={`${addr.tambon}|${addr.amphoe}|${addr.province}|${addr.zipcode}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); selectAddress(addr) }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                i === activeIndex ? 'bg-forest/8 text-forest' : 'text-earth hover:bg-cream'
              }`}
            >
              <span
                dangerouslySetInnerHTML={{
                  __html: `ต.${highlight(addr.tambon, query)} อ.${highlight(addr.amphoe, query)} จ.${highlight(addr.province, query)} <span class="font-mono text-xs ml-1 opacity-60">${highlight(addr.zipcode, query)}</span>`,
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {/* No results feedback */}
      {open && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-earth/20 bg-white px-4 py-3 text-sm text-earth/60 shadow-lg">
          ไม่พบข้อมูล ลองพิมพ์ใหม่อีกครั้ง
        </div>
      )}
    </div>
  )
}
