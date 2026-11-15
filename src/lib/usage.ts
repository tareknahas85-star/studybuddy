// عدّاد تقريبي لطلبات جيميني من هالتلفون (لليوم). الحد الفعلي للمفتاح بيتحدد من جوجل.
const KEY = 'sb.usage.v1'

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function getUsage(): { day: string; count: number } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as { day?: string; count?: number }
      if (p.day === today()) return { day: today(), count: typeof p.count === 'number' ? p.count : 0 }
    }
  } catch {
    // تخزين محجوب: العدّاد بيرجع صفر.
  }
  return { day: today(), count: 0 }
}

export function bumpUsage(): void {
  const u = getUsage()
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: today(), count: u.count + 1 }))
  } catch {
    // ما في شي نعمله.
  }
}
