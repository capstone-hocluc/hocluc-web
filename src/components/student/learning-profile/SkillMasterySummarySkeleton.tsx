import Skeleton from '../../ui/Skeleton'

export default function SkillMasterySummarySkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Đang tải mức độ nắm vững kỹ năng">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <Skeleton key={tile} className="h-16 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
