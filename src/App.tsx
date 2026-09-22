import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import "./library.css"
import { chapters, sections, chapter1Body, previewOf, chapterHasBody } from "./kecData"
import type { BodyNode } from "./kecData"

const COVER_ID = "__cover__"

type Entry = { id: string; title: string; desc: string; parentId: string; parentTitle: string; isChapter: boolean }
const entries: Entry[] = [
  ...chapters.map((c) => ({ id: c.id, title: c.title, desc: previewOf(c.id), parentId: "", parentTitle: "", isChapter: true })),
  ...sections.map((s) => ({ id: s.id, title: s.title, desc: previewOf(s.id), parentId: s.parentId, parentTitle: s.parentTitle, isChapter: false })),
]
const entryOf = (id: string) => entries.find((e) => e.id === id)
const siblingsOf = (id: string) => {
  const e = entryOf(id)
  if (!e) return []
  const parentId = e.isChapter ? e.id : e.parentId
  return entries.filter((x) => !x.isChapter && x.parentId === parentId && x.id !== id)
}
const sectionsOf = (chapterId: string) => sections.filter((s) => s.parentId === chapterId)

// 실사용 통계가 아닌, 큐레이션한 탐색 예시 (정직성 유지를 위해 화면에도 "예시"로 명시)
const curatedFrequent = ["140", "100", "130"]
const curatedPath = ["100", "140", "130"]

type Screen = "library" | "reader"
type FontStep = 0 | 1 | 2
const FONT_PX = [14, 15.5, 17.5]
const FONT_LABEL = ["작게", "보통", "크게"]

type Excerpt = { sectionId: string; code: string; title: string; body: string }
type AiTurn = { q: string; refId?: string; excerpt?: Excerpt }

// 실제 AI가 생성한 답변이 아니라, 1장(공통사항)에 연결해 둔 실제 규정 원문 중 질문과
// 가장 관련 있는 문단을 문자 bigram 유사도로 찾아 인용하는 정직한 검색 함수.
function bigrams(s: string): Set<string> {
  const clean = s.replace(/\s+/g, "")
  const set = new Set<string>()
  for (let i = 0; i < clean.length - 1; i++) set.add(clean.slice(i, i + 2))
  return set
}
function overlapScore(query: Set<string>, target: string): number {
  const t = bigrams(target)
  let hits = 0
  query.forEach((bg) => {
    if (t.has(bg)) hits++
  })
  return hits
}
function findRealExcerpt(question: string): Excerpt | null {
  const q = bigrams(question)
  let best: Excerpt | null = null
  let bestScore = 0
  for (const sectionId of Object.keys(chapter1Body)) {
    for (const node of chapter1Body[sectionId]) {
      if (!node.body) continue
      const score = overlapScore(q, `${node.title ?? ""} ${node.body}`)
      if (score > bestScore) {
        bestScore = score
        best = { sectionId, code: node.code, title: node.title ?? sections.find((s) => s.id === sectionId)?.title ?? node.code, body: node.body }
      }
    }
  }
  return bestScore >= 2 ? best : null
}

function Icon({ name, size = 20, filled = false }: { name: string; size?: number; filled?: boolean }) {
  const paths: Record<string, string> = {
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    book: "M12 5v16M12 5C9 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-1-7-2-10 1",
    arrow: "M12 20V4m-6 6 6-6 6 6",
    chevron: "m9 5 7 7-7 7",
    chevronLeft: "m15 5-7 7 7 7",
    chevronDown: "m5 9 7 7 7-7",
    sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    moon: "M20 15A9 9 0 0 1 9 4 9 9 0 1 0 20 15Z",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "m6 6 12 12M6 18 18 6",
    bookmark: "M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z",
    bookmarkFilled: "M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z",
    share: "M8.5 12.5 15 8m0 0v4m0-4h-4M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7M6 12l3.5-4.5",
    sparkle: "M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2",
    sparkleSolid:
      "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
    chat: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z",
    note: "M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v4h4",
    link: "M9 15l6-6m-5-1 1.2-1.2a3.5 3.5 0 0 1 5 5L15 13m-6 2-1.2 1.2a3.5 3.5 0 1 1-5-5L4 10",
    minus: "M5 12h14",
    plus: "M12 5v14M5 12h14",
    grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    clock: "M12 7v5l3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    star: "M12 3.5 14.5 9l6 .8-4.3 4.2 1 6L12 17l-5.2 3 1-6-4.3-4.2 6-.8Z",
    route: "M4 6h9a3 3 0 0 1 0 6H7a3 3 0 0 0 0 6h9M4 6l3-3M4 6l3 3M20 18l-3 3M20 18l-3-3",
    arrowUpRight: "M7 17 17 7M9 7h8v8",
    info: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  }
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={paths[name] || paths.book} />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] || paths.book} />
    </svg>
  )
}

function Brand() {
  return (
    <span className="c-brand">
      <span className="c-brand-mark">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M13 2L4.5 13.5H11.5L10 22L20 10H13L13 2Z" fill="currentColor" />
        </svg>
      </span>
      <span className="c-brand-type">
        <strong>KEC</strong>
        <small>NAVIGATOR</small>
      </span>
    </span>
  )
}

export default function App() {
  const [dark, setDark] = useState(false)
  const [version, setVersion] = useState("2026-01-05")
  const [screen, setScreen] = useState<Screen>("library")
  const [selected, setSelected] = useState("")
  const [openChapters, setOpenChapters] = useState<Set<string>>(() => new Set(["1"]))
  const [mobileTocOpen, setMobileTocOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [recent, setRecent] = useState<string[]>([])
  const [fontStep, setFontStep] = useState<FontStep>(1)
  const [imageError, setImageError] = useState(false)

  const [search, setSearch] = useState(false)
  const [query, setQuery] = useState("")
  const searchInput = useRef<HTMLInputElement>(null)
  const searchModal = useRef<HTMLDivElement>(null)
  const searchButton = useRef<HTMLButtonElement>(null)

  const [aiOpen, setAiOpen] = useState(false)
  const [aiDraft, setAiDraft] = useState("")
  const [aiMessages, setAiMessages] = useState<AiTurn[]>([])
  const [aiWidth, setAiWidth] = useState(560)
  const AI_WIDTH_MIN = 360
  const AI_WIDTH_MAX = 880
  const [selMenu, setSelMenu] = useState<{ x: number; y: number; text: string } | null>(null)
  const docBody = useRef<HTMLDivElement>(null)

  const [toast, setToast] = useState("")
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearch((s) => !s)
      }
      if (e.key === "Escape") {
        if (search) setSearch(false)
        else if (aiOpen) setAiOpen(false)
        else if (mobileTocOpen) setMobileTocOpen(false)
        else if (toolsOpen) setToolsOpen(false)
        else if (selMenu) setSelMenu(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [search, aiOpen, mobileTocOpen, toolsOpen, selMenu])
  useEffect(() => {
    if (search) searchInput.current?.focus()
  }, [search])
  useEffect(() => {
    if (!selMenu) return
    const clear = () => setSelMenu(null)
    window.addEventListener("scroll", clear, true)
    return () => window.removeEventListener("scroll", clear, true)
  }, [selMenu])
  useEffect(() => {
    if (!toast) return
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(""), 2200)
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [toast])

  const closeSearch = () => {
    setSearch(false)
    searchButton.current?.focus()
  }

  const goLibrary = () => {
    setScreen("library")
    setMobileTocOpen(false)
    setToolsOpen(false)
    setSelMenu(null)
  }

  const goReader = (id: string) => {
    setSelected(id)
    setImageError(false)
    setSelMenu(null)
    setMobileTocOpen(false)
    setToolsOpen(false)
    setSearch(false)
    setScreen("reader")
    if (id !== COVER_ID) {
      setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 6))
    }
  }

  const toggleBookmark = (id: string) => {
    setBookmarks((b) => (b.includes(id) ? b.filter((x) => x !== id) : [id, ...b]))
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      setToast("이 화면 링크를 복사했습니다")
    } catch {
      setToast("링크 복사에 실패했습니다")
    }
  }

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return entries
    return entries.filter((e) => `${e.id} ${e.title} ${e.desc}`.includes(q))
  }, [query])

  const active = entryOf(selected)
  const isCover = selected === COVER_ID

  const handleDocMouseUp = () => {
    const sel = window.getSelection()
    const text = sel?.toString().trim() ?? ""
    if (!text || text.length > 300 || !docBody.current) {
      setSelMenu(null)
      return
    }
    const range = sel!.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const host = docBody.current.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      setSelMenu(null)
      return
    }
    setSelMenu({
      x: Math.min(Math.max(rect.left + rect.width / 2 - host.left, 90), host.width - 90),
      y: rect.top - host.top - 12,
      text,
    })
  }

  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s)

  const openAiWith = (label: string, context: string) => {
    setAiDraft(`${label}: "${truncate(context, 44)}"`)
    setAiOpen(true)
    setSelMenu(null)
  }

  const sendAi = () => {
    const text = aiDraft.trim()
    if (!text) return
    const excerpt = findRealExcerpt(text) ?? undefined
    setAiMessages((m) => [...m, { q: text, refId: !isCover && selected ? selected : undefined, excerpt }])
    setAiDraft("")
  }

  // ---------- Library (home) ----------

  const librarySection = () => (
    <div className="c-library">
      {/* 컴팩트 워크바: 랜딩 히어로가 아니라 작업 도구줄 — 제목 한 줄 + 검색 + AI 진입점 */}
      <section className="c-workbar">
        <div className="c-workbar-title">
          <span className="c-eyebrow">— KEC NAVIGATOR</span>
          <h1>
            전기설비 기준을 <span className="c-grad-text">더 명확하게 탐색해보세요</span>
          </h1>
          <p>
            {chapters.length}개 대분류 · {sections.length}개 조항 연결 · {version} 버전
          </p>
        </div>
        <div className="c-workbar-tools">
          <button className="c-search-bar-btn" onClick={() => setSearch(true)}>
            <Icon name="search" size={16} />
            <span>규정, 조항 또는 키워드 검색</span>
            <kbd>⌘K</kbd>
          </button>
          <button className="c-ai-entry-btn" onClick={() => setAiOpen(true)}>
            <span className="c-ai-entry-text">
              <b>AI CHAT</b>
              <small>규정에 대해 무엇이든 물어보세요</small>
            </span>
          </button>
        </div>
      </section>

      <div className="c-workspace">
        <section className="c-directory">
          <div className="c-section-head-row">
            <h2>대분류</h2>
          </div>
          <div className="c-dir-list" role="list" aria-label="규정 대분류">
            {chapters.map((c) => {
              const subCount = sectionsOf(c.id).length
              const hasBody = chapterHasBody(c.id)
              return (
                <button className="c-dir-row" key={c.id} role="listitem" onClick={() => goReader(c.id)}>
                  <span className="c-mini-badge">{c.id}</span>
                  <span className="c-dir-main">
                    <b>{c.title}</b>
                    <small>{previewOf(c.id)}</small>
                  </span>
                  <span className={`c-dir-meta ${hasBody ? "" : "muted"}`}>{hasBody ? `${subCount}개 조항 · 본문 연결됨` : `${subCount}개 조항 · 목차만 연결`}</span>
                  <Icon name="chevron" size={16} />
                </button>
              )
            })}
          </div>
          <button className="c-cover-link" onClick={() => goReader(COVER_ID)}>
            <Icon name="book" size={14} /> 전체 규정 원문 표지 보기
          </button>
        </section>

        <aside className="c-side">
          <div className="c-side-panel">
            <h2>
              <Icon name="clock" size={13} /> 최근 본 조항
            </h2>
            {recent.length ? (
              <ul className="c-side-list">
                {recent.map((id) => {
                  const e = entryOf(id)
                  if (!e) return null
                  return (
                    <li key={id}>
                      <button onClick={() => goReader(id)}>
                        <span className="c-mini-badge">{id}</span>
                        {e.title}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="c-side-empty">최근에 열람한 조항이 여기에 표시됩니다.</p>
            )}
          </div>

          {bookmarks.length > 0 && (
            <div className="c-side-panel">
              <h2>
                <Icon name="bookmarkFilled" size={13} /> 북마크
              </h2>
              <ul className="c-side-list">
                {bookmarks.map((id) => {
                  const e = entryOf(id)
                  if (!e) return null
                  return (
                    <li key={id}>
                      <button onClick={() => goReader(id)}>
                        <span className="c-mini-badge">{id}</span>
                        {e.title}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="c-side-panel">
            <h2>
              <Icon name="star" size={13} /> 자주 찾는 조항 <small className="c-example-tag">예시</small>
            </h2>
            <ul className="c-side-list">
              {curatedFrequent.map((id) => {
                const e = entryOf(id)
                if (!e) return null
                return (
                  <li key={id}>
                    <button onClick={() => goReader(id)}>
                      <span className="c-mini-badge">{id}</span>
                      {e.title}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="c-side-panel">
            <h2>
              <Icon name="route" size={13} /> 추천 탐색 경로
            </h2>
            <div className="c-path-row">
              {curatedPath.map((id, i) => {
                const e = entryOf(id)
                if (!e) return null
                return (
                  <span className="c-path-item" key={id}>
                    <button onClick={() => goReader(id)}>
                      <span className="c-mini-badge">{id}</span>
                      {e.title}
                    </button>
                    {i < curatedPath.length - 1 && <Icon name="chevron" size={12} />}
                  </span>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )

  // ---------- Reader (immersive document view) ----------

  const toggleChapter = (id: string) => {
    setOpenChapters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tocList = (onNavigate: (id: string) => void) => (
    <div className="c-toc-list">
      {chapters.map((c) => {
        const isOpen = openChapters.has(c.id)
        const kids = sectionsOf(c.id)
        return (
          <div key={c.id}>
            <div className={`c-toc-row ${selected === c.id ? "active" : ""}`}>
              <button className="c-toc-expand" aria-label={isOpen ? "접기" : "펼치기"} aria-expanded={isOpen} onClick={() => toggleChapter(c.id)}>
                <span className={isOpen ? "rot" : ""}>
                  <Icon name="chevron" size={12} />
                </span>
              </button>
              <button className="c-toc-main" onClick={() => onNavigate(c.id)}>
                <span className="c-mini-badge">{c.id}</span>
                {c.title}
              </button>
            </div>
            {isOpen && (
              <div className="c-toc-sub">
                {kids.map((s) => (
                  <button key={s.id} className={selected === s.id ? "active" : ""} onClick={() => onNavigate(s.id)}>
                    <span>{s.id}</span>
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
      <button className="c-toc-cover" onClick={() => onNavigate(COVER_ID)}>
        <Icon name="book" size={13} /> 전체 규정 원문 표지 보기
      </button>
    </div>
  )

  const railContent = () => (
    <div className="c-rail">
      <section className="c-rail-block">
        <h3>
          <Icon name={bookmarks.includes(selected) ? "bookmarkFilled" : "bookmark"} size={14} /> 북마크
        </h3>
        {!isCover && (
          <button className={`c-rail-bookmark-btn ${bookmarks.includes(selected) ? "active" : ""}`} onClick={() => toggleBookmark(selected)}>
            <Icon name={bookmarks.includes(selected) ? "bookmarkFilled" : "bookmark"} size={14} />
            {bookmarks.includes(selected) ? "북마크됨" : "이 조항 북마크"}
          </button>
        )}
        {bookmarks.length > 0 ? (
          <ul className="c-rail-list">
            {bookmarks.map((id) => {
              const e = entryOf(id)
              if (!e) return null
              return (
                <li key={id}>
                  <button onClick={() => goReader(id)}>
                    <span className="c-mini-badge">{id}</span>
                    {e.title}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="c-side-empty">북마크한 조항이 없습니다.</p>
        )}
      </section>

      {!isCover && (
        <section className="c-rail-block">
          <h3>
            <Icon name="note" size={14} /> 메모
          </h3>
          <textarea
            className="c-rail-note"
            placeholder="이 조항에 대한 메모를 남겨보세요"
            value={notes[selected] ?? ""}
            onChange={(e) => setNotes((n) => ({ ...n, [selected]: e.target.value }))}
            rows={4}
          />
          <p className="c-rail-note-hint">이 브라우저에만 임시로 저장됩니다.</p>
        </section>
      )}

      <section className="c-rail-block">
        <h3>
          <Icon name="link" size={14} /> 관련 조항
        </h3>
        {!isCover && siblingsOf(selected).length ? (
          <ul className="c-rail-list">
            {siblingsOf(selected)
              .slice(0, 6)
              .map((e) => (
                <li key={e.id}>
                  <button onClick={() => goReader(e.id)}>
                    <span className="c-mini-badge">{e.id}</span>
                    {e.title}
                  </button>
                </li>
              ))}
          </ul>
        ) : (
          <p className="c-side-empty">같은 대분류 내 다른 조항이 없습니다.</p>
        )}
      </section>
    </div>
  )

  const readerBody = () => (
    <div
      className="c-doc-body"
      ref={docBody}
      onMouseUp={handleDocMouseUp}
      style={{ "--doc-font": `${FONT_PX[fontStep]}px` } as CSSProperties}
    >
      {isCover ? (
        version !== "2026-01-05" ? (
          <div className="c-unavailable">
            <Icon name="book" size={30} />
            <h3>이 버전의 원문은 아직 연결되지 않았어요</h3>
            <p>2026-01-05 버전에서 표지 미리보기를 확인할 수 있습니다.</p>
          </div>
        ) : imageError ? (
          <div className="c-unavailable">
            <p>원문 이미지를 불러오지 못했어요.</p>
            <a href="https://kecnav.dosystem.kr/reader/1" target="_blank" rel="noreferrer">
              기존 사이트에서 원문 열기 ↗
            </a>
          </div>
        ) : (
          <div className="c-paper-layout">
            <img
              className="c-paper"
              alt="한국전기설비규정 2026-01-05 원문 표지 1쪽"
              src="https://kecnav.dosystem.kr/static/2026-01-05/pages/page_0001.jpg"
              onError={() => setImageError(true)}
            />
            <p className="c-paper-caption">전체 규정의 표지 1쪽입니다. 개별 조항의 원문은 아직 연결되어 있지 않습니다.</p>
          </div>
        )
      ) : active?.isChapter ? (
        <div className="c-chapter-overview">
          <span className="c-mini-badge lg">{active.id}</span>
          <h2>{active.title}</h2>
          <p>{active.desc}</p>
          {siblingsOf(active.id).length ? (
            <>
              <p className="c-chapter-hint">실제 목차 기준 하위 절입니다. 왼쪽 목차 또는 아래에서 선택하면 원문을 확인할 수 있습니다.</p>
              <div className="c-chapter-children">
                {siblingsOf(active.id).map((e) => (
                  <button key={e.id} onClick={() => goReader(e.id)}>
                    <span className="c-mini-badge">{e.id}</span>
                    {e.title}
                    <Icon name="chevron" size={14} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="c-chapter-hint">이 대분류의 세부 조항 데이터는 아직 준비 중입니다.</p>
          )}
        </div>
      ) : chapter1Body[selected] ? (
        <article className="c-real-doc">
          <header className="c-real-doc-head">
            <span className="c-mini-badge lg">{selected}</span>
            <div>
              <span className="c-real-doc-source">실제 규정 원문 · {version}</span>
              <h2>{active?.title}</h2>
            </div>
          </header>
          {chapter1Body[selected].map((n: BodyNode, i: number) => (
            <div className={`c-real-node depth-${n.depth}`} key={i}>
              {n.title && <h4>{n.depth <= 3 ? `${n.code} ${n.title}` : n.title}</h4>}
              {n.body && <p>{n.body}</p>}
            </div>
          ))}
          <p className="c-real-doc-foot">
            출처: 기후에너지환경부 고시 「한국전기설비규정」({version}) ·{" "}
            <a href={`https://kecnav.dosystem.kr/reader/${sections.find((s) => s.id === selected)?.pageFrom ?? 1}`} target="_blank" rel="noreferrer">
              기존 사이트에서 원본 지면 보기 ↗
            </a>
          </p>
        </article>
      ) : (
        <div className="c-unavailable">
          <Icon name="book" size={30} />
          <h3>이 조항의 본문은 아직 이 시안에 연결되지 않았습니다</h3>
          <p>
            <span className="c-mini-badge">{selected}</span> {active?.title}의 목차 정보(실제 원문 {sections.find((s) => s.id === selected)?.pageFrom}쪽부터)는 실제 규정 기준이지만, 본문
            텍스트는 아직 이 시안에 연결되어 있지 않습니다. 아래 문장을 드래그해 선택하면 AI 메뉴가 나타나는 인터랙션을 미리 확인할 수 있습니다.
          </p>
          <p className="c-selectable-demo">이 문단은 선택 인터랙션을 시연하기 위한 안내 문장입니다. 실제 조항 원문이 아닙니다.</p>
          <a href="https://kecnav.dosystem.kr/" target="_blank" rel="noreferrer">
            기존 사이트에서 확인하기 ↗
          </a>
        </div>
      )}
    </div>
  )

  const readerScreen = () => (
    <div className="c-reader">
      <div className="c-doc-toolbar">
        <div className="c-doc-toolbar-left">
          <button className="c-icon-btn mobile-only" aria-label="목차 열기" onClick={() => setMobileTocOpen(true)}>
            <Icon name="menu" size={17} />
          </button>
          <nav className="c-breadcrumb" aria-label="현재 위치">
            <button onClick={goLibrary}>라이브러리</button>
            {!isCover && active && !active.isChapter && (
              <>
                <Icon name="chevron" size={11} />
                <button onClick={() => goReader(active.parentId)}>{active.parentTitle}</button>
              </>
            )}
            <Icon name="chevron" size={11} />
            <span>{isCover ? "원문 표지" : active?.title}</span>
          </nav>
        </div>
        <div className="c-doc-toolbar-right">
          <div className="c-font-stepper" role="group" aria-label="글자 크기 조절">
            <button className="c-icon-btn" aria-label="글자 작게" disabled={fontStep === 0} onClick={() => setFontStep((s) => (s > 0 ? ((s - 1) as FontStep) : s))}>
              <Icon name="minus" size={14} />
            </button>
            <span>{FONT_LABEL[fontStep]}</span>
            <button className="c-icon-btn" aria-label="글자 크게" disabled={fontStep === 2} onClick={() => setFontStep((s) => (s < 2 ? ((s + 1) as FontStep) : s))}>
              <Icon name="plus" size={14} />
            </button>
          </div>
          {!isCover && (
            <button className={`c-icon-btn ${bookmarks.includes(selected) ? "active" : ""}`} aria-label="북마크" title="북마크" onClick={() => toggleBookmark(selected)}>
              <Icon name={bookmarks.includes(selected) ? "bookmarkFilled" : "bookmark"} size={17} />
            </button>
          )}
          <button className="c-icon-btn" aria-label="링크 공유" title="링크 공유" onClick={share}>
            <Icon name="share" size={17} />
          </button>
          <button className={`c-icon-btn ${toolsOpen ? "active" : ""}`} aria-label="주석·북마크·관련 조항 열기" title="주석·북마크·관련 조항" aria-haspopup="dialog" aria-expanded={toolsOpen} onClick={() => setToolsOpen(true)}>
            <Icon name="info" size={17} />
          </button>
        </div>
      </div>

      <div className="c-reader-body">
        <aside className="c-toc-col" aria-label="목차">
          {tocList(goReader)}
        </aside>
        <main className="c-doc-col">{readerBody()}</main>
      </div>

      {selMenu && (
        <div className="c-sel-menu" style={{ left: selMenu.x, top: selMenu.y }}>
          <button onClick={() => openAiWith("이 조항 설명하기", selMenu.text)}>설명하기</button>
          <button onClick={() => openAiWith("관련 규정 찾기", selMenu.text)}>
            <Icon name="search" size={13} /> 관련 규정
          </button>
          <button onClick={() => openAiWith("질문하기", selMenu.text)}>
            <Icon name="chevron" size={13} /> 질문하기
          </button>
        </div>
      )}

      <button className="c-ai-fab" onClick={() => setAiOpen(true)} aria-haspopup="dialog" aria-expanded={aiOpen}>
        <span>AI CHAT</span>
      </button>

      {mobileTocOpen && (
        <div className="c-drawer-backdrop" onClick={() => setMobileTocOpen(false)}>
          <aside className="c-drawer" onClick={(e) => e.stopPropagation()} aria-label="목차">
            <div className="c-drawer-head">
              <span>목차</span>
              <button className="c-icon-btn" aria-label="닫기" onClick={() => setMobileTocOpen(false)}>
                <Icon name="close" size={17} />
              </button>
            </div>
            <div className="c-drawer-body">{tocList(goReader)}</div>
          </aside>
        </div>
      )}
      {/* 우측 도구 영역: 데스크톱·모바일 모두에서 필요할 때만 열리는 글래스 패널 */}
      {toolsOpen && (
        <div className="c-drawer-backdrop" onClick={() => setToolsOpen(false)}>
          <aside className="c-drawer right" onClick={(e) => e.stopPropagation()} aria-label="주석 및 북마크">
            <div className="c-drawer-head">
              <span>주석 · 북마크 · 관련 조항</span>
              <button className="c-icon-btn" aria-label="닫기" onClick={() => setToolsOpen(false)}>
                <Icon name="close" size={17} />
              </button>
            </div>
            <div className="c-drawer-body">{railContent()}</div>
          </aside>
        </div>
      )}
    </div>
  )

  // ---------- AI slide-up sheet (on-demand only) ----------

  // 채팅 패널은 화면 중앙 하단에 고정된 채로 좌우 양쪽이 대칭으로 넓어지므로,
  // 어느 쪽 손잡이를 잡아도 포인터 이동량의 2배만큼 폭을 바꿔야 실제 가장자리가
  // 손끝을 따라온다. dir: 오른쪽 손잡이는 +1, 왼쪽 손잡이는 -1.
  const startAiResize = (e: ReactPointerEvent<HTMLButtonElement>, dir: 1 | -1) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const startX = e.clientX
    const startWidth = aiWidth
    const onMove = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) * dir * 2
      setAiWidth(Math.min(AI_WIDTH_MAX, Math.max(AI_WIDTH_MIN, startWidth + delta)))
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }
  const nudgeAiWidth = (delta: number) => setAiWidth((w) => Math.min(AI_WIDTH_MAX, Math.max(AI_WIDTH_MIN, w + delta)))

  const aiResizeHandle = (dir: 1 | -1) => (
    <button
      className={`c-ai-resize ${dir === 1 ? "right" : "left"}`}
      aria-label="채팅 영역 너비 조절"
      title="드래그하거나 화살표 키로 너비를 조절하세요"
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={Math.round(aiWidth)}
      aria-valuemin={AI_WIDTH_MIN}
      aria-valuemax={AI_WIDTH_MAX}
      onPointerDown={(e) => startAiResize(e, dir)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault()
          nudgeAiWidth(dir === 1 ? -24 : 24)
        } else if (e.key === "ArrowRight") {
          e.preventDefault()
          nudgeAiWidth(dir === 1 ? 24 : -24)
        }
      }}
    >
      <span />
    </button>
  )

  const aiSheet = () =>
    aiOpen && (
      <div className="c-ai-scrim" onClick={() => setAiOpen(false)}>
        <div className="c-ai-sheet" role="dialog" aria-modal="true" aria-label="AI CHAT" style={{ "--ai-width": `${aiWidth}px` } as CSSProperties} onClick={(e) => e.stopPropagation()}>
          {aiResizeHandle(-1)}
          {aiResizeHandle(1)}
          <div className="c-ai-sheet-head">
            <span>AI CHAT</span>
            <button className="c-icon-btn" aria-label="닫기" onClick={() => setAiOpen(false)}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="c-ai-sheet-body">
            {aiMessages.length === 0 ? (
              <div className="c-ai-empty">
                <p>규정에 대해 자유롭게 질문해 보세요. 원문을 드래그해 선택하거나, 아래에서 바로 질문해 보세요.</p>
                <div className="c-ai-chips">
                  <button onClick={() => setAiDraft(active ? `이 조항 설명하기: ${active.id} ${active.title}` : "이 조항 설명하기")}>이 조항 설명하기</button>
                  <button onClick={() => setAiDraft(active ? `관련 규정 찾기: ${active.id} ${active.title}` : "관련 규정 찾기")}>관련 규정 찾기</button>
                </div>
              </div>
            ) : (
              <div className="c-ai-turns">
                {aiMessages.map((m, i) => (
                  <div className="c-ai-turn" key={i}>
                    {m.refId && (
                      <div className="c-ai-turn-ref">
                        <Icon name="link" size={11} />
                        <span className="c-mini-badge">{m.refId}</span>
                        {entryOf(m.refId)?.title}
                      </div>
                    )}
                    <div className="c-ai-q">{m.q}</div>
                    {m.excerpt ? (
                      <div className="c-ai-a">
                        <div>
                          <p>관련된 실제 규정 원문을 찾았습니다. (AI가 생성한 답변이 아니라 원문 발췌입니다)</p>
                          <button className="c-ai-excerpt" onClick={() => goReader(m.excerpt!.sectionId)}>
                            <div className="c-ai-excerpt-head">
                              <span className="c-mini-badge">{m.excerpt.code}</span>
                              {m.excerpt.title}
                              <Icon name="chevron" size={13} />
                            </div>
                            <p>{m.excerpt.body}</p>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="c-ai-a">
                        <p>관련된 실제 규정 원문을 찾지 못했습니다. 이 시안은 1장(공통사항)의 실제 원문만 검색 대상으로 연결되어 있습니다.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <form
            className="c-ai-composer"
            onSubmit={(e) => {
              e.preventDefault()
              sendAi()
            }}
          >
            <input
              value={aiDraft}
              onChange={(e) => setAiDraft(e.target.value)}
              placeholder={active ? `${active.title}에 대해 질문하기` : "질문을 입력하세요"}
              aria-label="AI에게 질문"
            />
            <button type="submit" disabled={!aiDraft.trim()} aria-label="전송">
              <Icon name="arrow" size={17} />
            </button>
          </form>
          <p className="c-ai-disclaimer">디자인 시안 · 생성형 AI가 아닌 실제 원문 검색·인용</p>
        </div>
      </div>
    )

  return (
    <div className={`libapp ${dark ? "dark" : ""}`}>
      <div className="c-ambient" aria-hidden="true" />
      <header className="c-top-wrap">
        <div className="c-top">
          <button className="c-brand-btn" onClick={goLibrary} aria-label="라이브러리로 이동" title="라이브러리로 이동">
            <Brand />
          </button>
          <button className="c-search-trigger" onClick={() => setSearch(true)} ref={searchButton}>
            <Icon name="search" size={15} />
            <span>검색</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="c-top-actions">
            <div className="c-version-select">
              <select aria-label="규정 버전 선택" value={version} onChange={(e) => setVersion(e.target.value)}>
                <option>2026-01-05</option>
                <option>2020-12-31</option>
              </select>
              <span className="c-version-caret" aria-hidden="true">
                <Icon name="chevronDown" size={13} />
              </span>
            </div>
            <button className="c-icon-btn" aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"} title={dark ? "라이트 모드로 전환" : "다크 모드로 전환"} onClick={() => setDark((d) => !d)}>
              <Icon name={dark ? "sun" : "moon"} size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="c-main">{screen === "library" ? librarySection() : readerScreen()}</main>

      {aiSheet()}

      {search && (
        <div
          className="c-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSearch()
          }}
        >
          <div
            className="c-search-modal"
            ref={searchModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="c-search-title"
            onKeyDown={(e) => {
              if (e.key !== "Tab") return
              const nodes = searchModal.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input, a[href]")
              if (!nodes?.length) return
              const first = nodes[0],
                last = nodes[nodes.length - 1]
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
              }
            }}
          >
            <div className="c-search-input-row">
              <Icon name="search" size={17} />
              <input ref={searchInput} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="조항 번호나 키워드를 입력하세요" aria-label="검색어" />
              <button className="c-icon-btn" onClick={closeSearch} aria-label="검색 닫기">
                <Icon name="close" size={17} />
              </button>
            </div>
            <div className="c-search-meta">
              <h2 id="c-search-title">{query ? "검색 결과" : "전체 목차"}</h2>
              <span>{results.length}개</span>
            </div>
            <div className="c-search-results">
              {results.length ? (
                results.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      goReader(e.id)
                    }}
                  >
                    <span className="c-mini-badge">{e.id}</span>
                    <span className="c-search-result-text">
                      <b>{e.title}</b>
                      <small>{e.desc}</small>
                    </span>
                    <span className="c-search-result-parent">{e.isChapter ? "대분류" : e.parentTitle}</span>
                  </button>
                ))
              ) : (
                <p className="c-no-results">일치하는 항목이 없습니다. 다른 키워드로 검색해 주세요.</p>
              )}
            </div>
            <footer>시안에 포함된 목차 검색 · 전체 규정 검색 연결 예정</footer>
          </div>
        </div>
      )}

      {toast && <div className="c-toast" role="status">{toast}</div>}
    </div>
  )
}
