import { useEffect, useRef, useState } from 'react'
import { askBook, podcastScript } from '../lib/ai.ts'
import type { BookAnswer, PodcastLine } from '../lib/ai.ts'
import { COMPS } from '../lib/companions.ts'
import type { Memory, Student } from '../lib/store.ts'
import { naturalReady, primeVoice, speakNatural, stopNatural } from '../lib/tts.ts'
import { Companion, Icon, Sheet } from './ui.tsx'

/** صوت صديق الرفيق بالبودكاست (غير صوت الرفيق عشان يتفرّقو). */
const FRIEND_VOICE = 'Puck'

/** بودكاست الدرس: حوار قصير بين الرفيق وصديقو، بينقرا بصوتين. */
export function PodcastSheet({
  student,
  memory,
  apiKey,
  lessonTitle,
  facts,
  onClose,
}: {
  student: Student
  memory: Memory
  apiKey: string
  lessonTitle: string
  facts: string
  onClose: () => void
}) {
  const comp = COMPS[student.comp]
  const [lines, setLines] = useState<PodcastLine[] | null>(null)
  const [err, setErr] = useState('')
  const [playing, setPlaying] = useState(-1)
  const cancelRef = useRef(false)

  useEffect(() => {
    let alive = true
    void podcastScript({ apiKey, settings: { grade: student.grade, comp: student.comp, name: student.name }, memory, lessonTitle, facts }).then((r) => {
      if (!alive) return
      if (r.ok) setLines(r.data)
      else setErr(r.error)
    })
    return () => {
      alive = false
    }
    // مرة وحدة عند الفتح
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(
    () => () => {
      cancelRef.current = true
      stopNatural()
    },
    [],
  )

  const play = () => {
    if (!lines) return
    cancelRef.current = false
    primeVoice()
    const step = (i: number) => {
      if (cancelRef.current || i >= lines.length) {
        setPlaying(-1)
        return
      }
      setPlaying(i)
      const l = lines[i]
      speakNatural(
        { text: l.text, apiKey, voice: l.speaker === 'buddy' ? student.voice : FRIEND_VOICE },
        {
          onStart: () => undefined,
          onEnd: () => step(i + 1),
          onError: () => {
            setPlaying(-1)
            setErr('الصوت ما كان جاهز هلق. جرّب مرة تانية.')
          },
        },
      )
    }
    step(0)
  }

  const stop = () => {
    cancelRef.current = true
    stopNatural()
    setPlaying(-1)
  }

  return (
    <Sheet onClose={onClose} label="بودكاست الدرس">
      <h2 className="display">بودكاست: {lessonTitle}</h2>
      {!lines && !err && <p className="muted bold">عم نحضّر الحوار…</p>}
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
      {lines && (
        <div className="chat-log">
          {lines.map((l, i) => (
            <div key={i} className={`msg ${l.speaker === 'buddy' ? 'buddy' : 'me'}`}>
              <div className="bubble" style={{ outline: playing === i ? '3px solid var(--accent)' : 'none' }}>
                <span className="bold" style={{ fontSize: 13 }}>
                  {l.speaker === 'buddy' ? comp.name : 'صديقو'}:
                </span>{' '}
                {l.text}
              </div>
            </div>
          ))}
        </div>
      )}
      {lines && (
        <div className="row">
          {playing >= 0 ? (
            <button type="button" className="btn accent grow" onClick={stop}>
              <Icon name="stop" size={22} /> وقّف
            </button>
          ) : (
            <button type="button" className="btn yellow grow" disabled={!naturalReady(apiKey)} onClick={play}>
              <Icon name="speaker" size={22} /> اسمع الحوار
            </button>
          )}
        </div>
      )}
      {!naturalReady(apiKey) && <p className="muted" style={{ margin: 0, fontSize: 14 }}>الاستماع بدو مفتاح جيميني من قسم الأهل.</p>}
    </Sheet>
  )
}

/** اسأل الكتاب: الجواب من مقاطع الكتاب بس، ويقول وين بالكتاب. */
export function AskBookSheet({
  student,
  memory,
  apiKey,
  pages,
  bookTitle,
  onClose,
}: {
  student: Student
  memory: Memory
  apiKey: string
  pages: Array<{ title: string; facts: string }>
  bookTitle: string
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<BookAnswer | null>(null)

  const send = async () => {
    const text = q.trim()
    if (text.length < 3 || busy) return
    setBusy(true)
    setErr('')
    setRes(null)
    const r = await askBook({
      apiKey,
      settings: { grade: student.grade, comp: student.comp, name: student.name },
      memory,
      question: text,
      pages: pages.slice(0, 12).map((p) => ({ title: p.title, facts: p.facts.slice(0, 500) })),
    })
    setBusy(false)
    if (r.ok) setRes(r.data)
    else setErr(r.error)
  }

  return (
    <Sheet onClose={onClose} label={`اسأل ${bookTitle}`}>
      <div className="say-row">
        <Companion id={student.comp} acc={student.acc} size={64} mood={busy ? 'think' : 'happy'} />
        <div className="bubble grow">{busy ? 'عم دوّر بالكتاب…' : `اسأل عن «${bookTitle}». بجاوبك من صفحاته بس، وبقلّك وين بالكتاب.`}</div>
      </div>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً: شو يعني الكسر؟" maxLength={200} aria-label="سؤالك عن الكتاب" />
        <button className="btn yellow" type="submit" disabled={busy || q.trim().length < 3}>
          {busy ? '…' : 'اسأل'}
        </button>
      </form>
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
      {res && (
        <div className="why">
          {res.answer}
          {res.lesson !== '' && <div className="muted bold" style={{ marginTop: 8, fontSize: 14 }}>وين بالكتاب: {res.lesson}</div>}
        </div>
      )}
    </Sheet>
  )
}
