// 실제 한국전기설비규정 데이터 소스: https://kecnav.dosystem.kr/ 의 공개 목차 API(/articles)에서
// 2026-09-21에 가져온 값이다(대분류 7개 + 각 대분류의 실제 하위 절 목록, 페이지 번호 포함).
// 예전 시안에 있던 "8 보칙"은 실제 목차 API에 존재하지 않아 제외했다 — 존재하지 않는 항목을
// 만들어 넣지 않는다는 이 프로젝트의 원칙에 따른 것이다.
import tocRaw from "./kec-toc-raw.json"
// 1장(공통사항)에 한해 실제 하위 조항 본문 전문을 같은 API(/articles/{code})에서 재귀적으로
// 가져와 두었다. 나머지 6개 대분류는 목차(제목·페이지)는 실제 값이지만 본문 텍스트는 아직
// 이 시안에 연결하지 않았다 — 존재하지 않는 본문을 지어내지 않기 위함이다.
import chapter1FlatRaw from "./kec-chapter1.json"

export type Chapter = { id: string; title: string; pageFrom: number }
export type Section = { id: string; title: string; pageFrom: number; parentId: string; parentTitle: string }
export type BodyNode = { code: string; title: string | null; depth: number; body: string }

type RawChild = { code: string; title: string; page_from: number }
type RawChapter = { code: string; title: string; page_from: number; children: RawChild[] }

const raw = tocRaw as RawChapter[]

export const chapters: Chapter[] = raw.map((c) => ({ id: c.code, title: c.title, pageFrom: c.page_from }))

export const sections: Section[] = raw.flatMap((c) =>
  c.children.map((s) => ({ id: s.code, title: s.title, pageFrom: s.page_from, parentId: c.code, parentTitle: c.title })),
)

export const chapter1Body: Record<string, BodyNode[]> = chapter1FlatRaw as Record<string, BodyNode[]>

// 검색 결과 미리보기 및 목록 설명에 쓸 한 줄 요약. 실제 본문이 연결된 절은 첫 문장을 발췌하고,
// 아직 본문이 없는 항목은 실제 페이지 번호만 정직하게 보여준다(요약을 지어내지 않는다).
export function previewOf(id: string): string {
  const body = chapter1Body[id]
  if (body) {
    const first = body.find((n) => n.body)?.body
    if (first) return first.length > 54 ? first.slice(0, 54) + "…" : first
  }
  const s = sections.find((x) => x.id === id)
  const c = chapters.find((x) => x.id === id)
  const pageFrom = s?.pageFrom ?? c?.pageFrom
  return pageFrom ? `원문 ${pageFrom}쪽부터 수록` : ""
}

// 이 대분류 산하에 실제 본문 텍스트가 연결된 절이 하나라도 있는지 (현재는 1장뿐).
export function chapterHasBody(chapterId: string): boolean {
  return sections.some((s) => s.parentId === chapterId && chapter1Body[s.id])
}
