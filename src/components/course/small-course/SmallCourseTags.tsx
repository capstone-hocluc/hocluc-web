/** The exam a course prepares for and the short pieces of its fact line, as tags above its title. */
export default function SmallCourseTags({ exam, tags }: { exam: string | null; tags: string[] }) {
  if (!exam && tags.length === 0) return null
  return (
    <ul className="sc-tags" aria-label="Thông tin khóa học">
      {exam && <li className="is-exam">{exam}</li>}
      {tags.map((tag) => (
        <li key={tag}>{tag}</li>
      ))}
    </ul>
  )
}
