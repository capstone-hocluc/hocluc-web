import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { getMainCourses } from '../../services/courseService'
import AppLink from './AppLink'
import { ROADMAP_TAB } from './CourseCatalogSection'
import { SUBJECTS, courseTabHref, type SubjectGroup } from './course-subjects'
import Icon from './Icon'
import { isPlainNavigation } from './navigation'
import { loadSubjectGroups } from './use-course-catalog'

interface MenuData {
  bundles: number
  groups: SubjectGroup[]
}

// Loaded the first time a visitor opens the menu, then kept for the visit. The roadmap details
// are shared with the home catalog, so on the home page this adds only the list request.
let menuData: Promise<MenuData> | null = null
function loadMenuData() {
  if (!menuData) {
    menuData = getMainCourses().then(async (response) => {
      const roadmaps = response.data ?? []
      return { bundles: roadmaps.length, groups: roadmaps.length ? await loadSubjectGroups(roadmaps) : [] }
    })
    menuData.catch(() => {
      menuData = null
    })
  }
  return menuData
}

function useMenuData() {
  const [data, setData] = useState<MenuData | null>(null)
  const load = useCallback(() => {
    loadMenuData().then(setData, () => {})
  }, [])
  return { data, load }
}

// Up/Down/Home/End move between the links of a list.
function moveFocus(event: KeyboardEvent<HTMLElement>) {
  const items = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>('a')]
  const index = items.indexOf(document.activeElement as HTMLAnchorElement)
  const last = items.length - 1
  const next =
    event.key === 'ArrowDown'
      ? index < last ? index + 1 : 0
      : event.key === 'ArrowUp'
        ? index > 0 ? index - 1 : last
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last
            : null
  if (next === null || !items[next]) return
  event.preventDefault()
  items[next].focus()
}

// Plain text rows, set like the nav's own links, without icons.
const itemClass =
  'flex! min-h-11! w-full items-center gap-3 rounded-xl px-3 py-2 text-[1rem]! font-semibold! whitespace-normal! text-(--ink) hover:bg-(--soft) hover:text-(--ink)! hover:no-underline! focus-visible:bg-(--soft) focus-visible:outline-offset-0!'

interface ListProps {
  data: MenuData | null
  /** Set on the home page: the catalog is on this page, so choosing only switches its tab. */
  onSelect?: (tab: string) => void
  onNavigate?: () => void
}

// Subjects with courses, then the bundles and the full catalog. Before the counts arrive the
// known subjects are listed without them.
function CourseMenuList({ data, onSelect, onNavigate }: ListProps) {
  const subjects = data
    ? data.groups.map((group) => ({ subject: group.subject, count: group.courses.length }))
    : SUBJECTS.map((subject) => ({ subject, count: undefined }))
  const showBundles = !data || data.bundles > 0

  const choose = (tab: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.()
    if (!onSelect || !isPlainNavigation(event)) return
    event.preventDefault()
    onSelect(tab)
  }

  const row = (key: string, label: string, count?: number) => (
    <li key={key}>
      <a className={itemClass} href={courseTabHref(key)} onClick={choose(key)}>
        <span className="min-w-0 flex-1">{label}</span>
        {count !== undefined && (
          <span className="shrink-0 text-sm font-medium text-(--muted)">{count} khóa</span>
        )}
      </a>
    </li>
  )

  return (
    <>
      {subjects.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {subjects.map(({ subject, count }) => row(subject.key, subject.label, count))}
        </ul>
      )}
      <ul
        className={`flex flex-col gap-0.5 ${subjects.length > 0 ? 'mt-1 border-t border-(--line) pt-1' : ''}`}
      >
        {showBundles && row(ROADMAP_TAB, 'Lộ trình trọn gói', data?.bundles)}
        <li>
          <AppLink className={itemClass} href="/courses" onClick={onNavigate}>
            <span className="min-w-0 flex-1">Xem tất cả khóa học</span>
          </AppLink>
        </li>
      </ul>
    </>
  )
}

const OPEN_DELAY = 120
const CLOSE_DELAY = 200

interface MenuProps {
  /** The "Khóa học" link itself; it keeps its own destination. */
  trigger: ReactNode
  onSelect?: (tab: string) => void
}

// Desktop "Khóa học": the link keeps going where it always went, and the chevron button next to
// it opens a small panel of subjects. A mouse opens it by resting on the item; a click, tap,
// Enter or Space on the chevron toggles it, and Down opens it on its first item.
export function CoursesNavMenu({ trigger, onSelect }: MenuProps) {
  const [open, setOpen] = useState(false)
  const { data, load } = useMenuData()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  // Opened by resting the mouse on it: the first click on the chevron then keeps it open.
  const openedByHover = useRef(false)
  // The panel hangs from the header's bottom edge, not from the link: this is the space between them, which the
  // panel's wrapper covers so the mouse can cross it without closing the menu.
  const [gap, setGap] = useState(8)

  const clearTimer = () => window.clearTimeout(timer.current)
  const show = useCallback(() => {
    load()
    const root = rootRef.current
    const header = root?.closest('header')
    if (root && header) setGap(Math.max(0, header.getBoundingClientRect().bottom - root.getBoundingClientRect().bottom))
    setOpen(true)
  }, [load])
  const close = useCallback(() => {
    window.clearTimeout(timer.current)
    openedByHover.current = false
    setOpen(false)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  const focusFirstItem = () => {
    flushSync(show)
    panelRef.current?.querySelector('a')?.focus()
  }

  return (
    <div
      ref={rootRef}
      className="relative flex items-center gap-0.5"
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') return
        clearTimer()
        if (open) return
        timer.current = window.setTimeout(() => {
          openedByHover.current = true
          show()
        }, OPEN_DELAY)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') return
        clearTimer()
        timer.current = window.setTimeout(close, CLOSE_DELAY)
      }}
      onBlur={(event) => {
        if (open && !rootRef.current?.contains(event.relatedTarget as Node | null)) close()
      }}
    >
      {trigger}
      <button
        ref={buttonRef}
        type="button"
        className="grid size-8 place-items-center rounded-full text-(--ink) hover:bg-(--blue-soft) [&_.ui-icon]:size-4!"
        aria-label="Khóa học theo môn"
        aria-expanded={open}
        aria-controls="courses-nav-panel"
        onClick={() => {
          clearTimer()
          if (open && openedByHover.current) {
            openedByHover.current = false
            return
          }
          if (open) close()
          else show()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown') return
          event.preventDefault()
          focusFirstItem()
        }}
      >
        <span className={`flex transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <Icon name="chevron-down" />
        </span>
      </button>
      <div
        ref={panelRef}
        id="courses-nav-panel"
        hidden={!open}
        // -left-5: the panel's padding (p-2) and a row's (px-3) put each label right under the "Khóa học" link.
        className="absolute top-full -left-5 z-30"
        style={{ paddingTop: gap }}
      >
        <nav
          aria-label="Khóa học theo môn"
          className="w-[300px] rounded-b-2xl bg-(--paper) p-2 shadow-[0_24px_40px_-20px_rgb(11_58_130/22%)]"
          onKeyDown={moveFocus}
        >
          <CourseMenuList
            data={data}
            onSelect={onSelect}
            onNavigate={close}
          />
        </nav>
      </div>
    </div>
  )
}

// The same choices inside the phone menu, as a group that expands in place.
export function CoursesNavGroup({
  onSelect,
  onNavigate,
}: {
  onSelect?: (tab: string) => void
  onNavigate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { data, load } = useMenuData()

  return (
    <div className="col-span-full">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 text-[0.9375rem]! font-semibold! text-(--ink)"
        aria-expanded={expanded}
        aria-controls="mobile-courses-nav"
        onClick={() => {
          if (!expanded) load()
          setExpanded(!expanded)
        }}
      >
        Khóa học
        <span className={`flex transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          <Icon name="chevron-down" />
        </span>
      </button>
      <div
        id="mobile-courses-nav"
        hidden={!expanded}
        className="mb-2 rounded-2xl border border-(--line) p-1.5"
        onKeyDown={moveFocus}
      >
        <CourseMenuList data={data} onSelect={onSelect} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
