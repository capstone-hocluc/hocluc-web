import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { ArrowUpRight, ChevronDown } from '../../console/icons'
import { Skeleton } from '../../tailgrids/core/skeleton'
import type { MasterDataContent } from '../../../services/masterDataService'
import { MAPPING_ROLE_LABELS } from './master-data-labels'
import type { RecordKind, Selection } from './master-data-tables'
import { errorCodePresentation } from './error-code-presentation'

const KIND: Record<RecordKind, { label: string; dot: string }> = {
  domains: { label: 'Domain', dot: 'bg-badge-violet-text' },
  patterns: { label: 'Dạng câu', dot: 'bg-badge-blue-text' },
  skills: { label: 'Kỹ năng', dot: 'bg-badge-cyan-text' },
  microSkills: { label: 'Micro-skill', dot: 'bg-badge-orange-text' },
  errorCodes: { label: 'Lỗi sai thường gặp', dot: 'bg-badge-rose-text' },
}

type Role = 'PRIMARY' | 'SUPPORTING'

/** The skills a question type needs, its primary one where mappings are not loaded. */
function patternSkills(content: MasterDataContent, code: string): { code: string; role: Role }[] {
  const rows = content.mappings.filter((m) => m.patternCode === code)
  if (rows.length)
    return [...rows]
      .sort((a, b) => Number(a.role === 'SUPPORTING') - Number(b.role === 'SUPPORTING'))
      .map((m) => ({
        code: m.skillCode,
        role: m.role === 'SUPPORTING' ? 'SUPPORTING' : 'PRIMARY',
      }))
  const primary = content.patterns.find((p) => p.code === code)?.primarySkillCode
  return primary ? [{ code: primary, role: 'PRIMARY' }] : []
}

function Section({
  kind,
  count,
  children,
}: {
  kind: RecordKind
  count: number
  children: ReactNode
}) {
  return (
    <section className="min-w-0">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <span aria-hidden className={cn('size-2 shrink-0 rounded-[3px]', KIND[kind].dot)} />
        {KIND[kind].label}
        <span className="rounded-full bg-background-gray-secondary px-2 py-0.5 text-[11px] font-medium text-text-tertiary tabular-nums">
          {count}
        </span>
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function List({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-card-border overflow-hidden rounded-lg border border-card-border bg-card-background">
      {children}
    </ul>
  )
}

function Empty({ children }: { children: string }) {
  return (
    <p className="rounded-lg border border-dashed border-card-border px-3 py-4 text-sm text-text-tertiary">
      {children}
    </p>
  )
}

function RecordName({
  kind,
  code,
  name,
  onOpen,
}: {
  kind: RecordKind
  code: string
  name: string
  onOpen: (selection: Selection) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ kind, code })}
      className="max-w-full text-left text-sm font-medium break-words text-text-primary underline-offset-2 hover:text-brand-500 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
    >
      {name}
    </button>
  )
}

function RecordCode({ children }: { children: string }) {
  return <span className="text-xs break-all text-text-tertiary">{children}</span>
}

function SkillChip({
  content,
  code,
  role,
  onOpen,
}: {
  content: MasterDataContent
  code: string
  role: Role
  onOpen: (selection: Selection) => void
}) {
  const skill = content.skills.find((s) => s.code === code)
  const label = skill?.nameVi ?? code
  const body = (
    <>
      <span className="font-medium text-text-tertiary">{MAPPING_ROLE_LABELS[role]}</span>
      <span aria-hidden>·</span>
      <span className="break-words">{label}</span>
    </>
  )
  const className =
    'inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-lg border border-border-secondary bg-background-gray-secondary px-2 py-1 text-xs text-text-secondary'
  if (!skill)
    return (
      <span className={className} title={code}>
        {body}
      </span>
    )
  return (
    <button
      type="button"
      onClick={() => onOpen({ kind: 'skills', code })}
      title={code}
      className={cn(
        className,
        'text-left hover:border-brand-500 hover:text-brand-500 focus-visible:outline-2 focus-visible:outline-brand-500'
      )}
    >
      {body}
    </button>
  )
}

/** The version as a readable outline: domains open to their question types, skills, micro-skills and errors. */
export default function MasterDataStructure({
  content,
  onOpen,
}: {
  content: MasterDataContent
  onOpen: (selection: Selection) => void
}) {
  const tree = useMemo(
    () =>
      content.domains.map((domain) => ({
        domain,
        patterns: content.patterns
          .filter((p) => p.domainCode === domain.code)
          .map((pattern) => ({ pattern, skills: patternSkills(content, pattern.code) })),
        skills: content.skills.filter((s) => s.domainCodes.includes(domain.code)),
        errorCodes: content.errorCodes.filter(
          (e) => e.allDomains || e.domainCodes.includes(domain.code)
        ),
      })),
    [content]
  )
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(content.domains[0] ? [content.domains[0].code] : [])
  )

  function toggle(code: string) {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  if (!content.domains.length) {
    return (
      <div className="rounded-xl border border-dashed border-card-border px-5 py-10 text-center text-sm text-text-tertiary">
        Phiên bản này chưa có domain.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-background">
      <ul className="divide-y divide-card-border">
        {tree.map(({ domain, patterns, skills, errorCodes }, index) => {
          const expanded = open.has(domain.code)
          const bodyId = `structure-domain-${index}`
          return (
            <li key={domain.code}>
              <div className="flex items-center gap-1 pr-1">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={expanded ? bodyId : undefined}
                  onClick={() => toggle(domain.code)}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-background-gray-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500"
                >
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={cn(
                      'shrink-0 text-text-tertiary transition-transform',
                      !expanded && '-rotate-90'
                    )}
                  />
                  <RecordCode>{domain.code}</RecordCode>
                  <span className="min-w-0 flex-1 text-sm font-medium break-words text-text-primary">
                    {domain.nameVi}
                  </span>
                  <span className="w-full pl-7 text-xs text-text-tertiary tabular-nums sm:w-auto sm:pl-0">
                    {patterns.length} dạng câu · {skills.length} kỹ năng
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Xem chi tiết ${domain.nameVi}`}
                  title={`Xem chi tiết ${domain.nameVi}`}
                  onClick={() => onOpen({ kind: 'domains', code: domain.code })}
                  className="shrink-0 rounded-lg p-2 text-text-tertiary hover:bg-background-gray-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  <ArrowUpRight size={16} />
                </button>
              </div>
              {expanded && (
                <div
                  id={bodyId}
                  className="border-t border-card-border bg-background-gray-secondary/30 px-3 py-4 sm:px-5"
                >
                  <div className="grid gap-5 lg:grid-cols-2">
                    <Section kind="patterns" count={patterns.length}>
                      {patterns.length ? (
                        <List>
                          {patterns.map(({ pattern, skills: mapped }) => (
                            <li key={pattern.code} className="px-3 py-2.5">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <RecordName
                                  kind="patterns"
                                  code={pattern.code}
                                  name={pattern.nameVi}
                                  onOpen={onOpen}
                                />
                                <RecordCode>{pattern.code}</RecordCode>
                              </div>
                              {mapped.length ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {mapped.map((skill) => (
                                    <SkillChip
                                      key={`${skill.code}-${skill.role}`}
                                      content={content}
                                      code={skill.code}
                                      role={skill.role}
                                      onOpen={onOpen}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 text-xs text-text-tertiary">Chưa gán kỹ năng.</p>
                              )}
                            </li>
                          ))}
                        </List>
                      ) : (
                        <Empty>Chưa có dạng câu.</Empty>
                      )}
                    </Section>

                    <Section kind="skills" count={skills.length}>
                      {skills.length ? (
                        <List>
                          {skills.map((skill) => {
                            const microSkills = content.microSkills.filter(
                              (m) => m.skillCode === skill.code
                            )
                            return (
                              <li key={skill.code} className="px-3 py-2.5">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <RecordName
                                    kind="skills"
                                    code={skill.code}
                                    name={skill.nameVi}
                                    onOpen={onOpen}
                                  />
                                  <RecordCode>{skill.code}</RecordCode>
                                </div>
                                {microSkills.length ? (
                                  <ul className="mt-1.5 flex flex-col gap-1 border-l border-card-border pl-3">
                                    {microSkills.map((micro) => (
                                      <li
                                        key={micro.code}
                                        className="flex flex-wrap items-baseline gap-x-2"
                                      >
                                        <RecordName
                                          kind="microSkills"
                                          code={micro.code}
                                          name={micro.nameVi}
                                          onOpen={onOpen}
                                        />
                                        <RecordCode>{micro.code}</RecordCode>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-1 text-xs text-text-tertiary">
                                    Chưa có micro-skill.
                                  </p>
                                )}
                              </li>
                            )
                          })}
                        </List>
                      ) : (
                        <Empty>Chưa có kỹ năng.</Empty>
                      )}
                    </Section>
                  </div>

                  <div className="mt-5">
                    <Section kind="errorCodes" count={errorCodes.length}>
                      {errorCodes.length ? (
                        <List>
                          {errorCodes.map((error) => {
                            const presentation = errorCodePresentation(error)
                            return (
                              <li key={error.code} className="px-3 py-2.5">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <RecordName
                                    kind="errorCodes"
                                    code={error.code}
                                    name={presentation.name}
                                    onOpen={onOpen}
                                  />
                                  <RecordCode>{error.code}</RecordCode>
                                  {presentation.category && (
                                    <span className="text-xs text-text-tertiary">
                                      {presentation.category}
                                    </span>
                                  )}
                                  {error.allDomains && (
                                    <span className="text-xs text-text-tertiary">Toàn môn học</span>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </List>
                      ) : (
                        <Empty>Chưa có lỗi sai.</Empty>
                      )}
                    </Section>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Mirrors the outline: domain rows with the first one open. */
export function MasterDataStructureSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải cấu trúc"
      className="overflow-hidden rounded-xl border border-card-border bg-card-background"
    >
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className={cn('px-4 py-3', row > 0 && 'border-t border-card-border')}>
          <div className="flex items-center gap-3">
            <Skeleton className="size-4 shrink-0 rounded" />
            <Skeleton className="h-3.5 w-56 max-w-full" />
            <Skeleton className="ml-auto hidden h-3 w-32 sm:block" />
          </div>
          {row === 0 && (
            <div className="mt-4 grid gap-5 sm:pl-7 lg:grid-cols-2">
              {[0, 1].map((column) => (
                <div key={column} className="flex flex-col gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
