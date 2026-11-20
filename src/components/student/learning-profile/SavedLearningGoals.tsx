import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { useLearningProfileDialog } from '../../../hooks/useLearningProfileDialog'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'
import { Pencil } from '../../console/icons'
import styles from './SavedLearningGoals.module.css'
import { formatExamLabel } from '../../../lib/courseFormat'

export default function SavedLearningGoals({ showEditAction = true }: { showEditAction?: boolean }) {
  const { profile, status, loadCurrentUser } = useCurrentUser()
  const open = useLearningProfileDialog()
  const saved = profile?.studentProfile
  return (
    <Card as="section" aria-label="Mục tiêu và môn học tự đánh giá" className={`${styles.panel} rounded-3xl p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-20 w-[110px] shrink-0 max-[640px]:size-16">
            <img src="/mascot/04.png" alt="" width={110} height={110} className="absolute top-1/2 left-0 size-[110px] -translate-y-1/2 object-contain max-[640px]:size-16" />
          </div>
          <div className="min-w-0"><CardTitle className="mb-1 text-xl">Mục tiêu học tập của bạn</CardTitle><p className="text-sm text-text-body">Thông tin tự đánh giá, tách biệt với kết quả bài đánh giá.</p></div>
        </div>
        {showEditAction && <Button appearance="outline" shape="pill" size="sm" className={styles.editButton} disabled={!profile} onClick={open}><Pencil size={16} />Chỉnh sửa mục tiêu</Button>}
      </div>
      {!profile ? <p role="status">{status === 'error' ? <Button appearance="outline" onClick={() => void loadCurrentUser().catch(() => {})}>Thử tải lại hồ sơ</Button> : 'Đang tải mục tiêu…'}</p> : <>
        <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Kỳ thi', formatExamLabel(saved?.targetExam) || 'Chưa xác định'],
            ['Điểm mục tiêu', saved?.targetScore == null ? 'Chưa xác định' : `${saved.targetScore} / 1200`],
            ['Trường đại học mục tiêu', saved?.targetUniversity || 'Chưa xác định'],
            ['Ngành học mục tiêu', saved?.targetMajor || 'Chưa xác định'],
          ].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-surface px-3 py-2"><dt className="text-text-body">{label}</dt><dd className="mt-1 font-semibold break-words text-text-heading">{value}</dd></div>)}
        </dl>
        <div className="mt-3 border-t border-line pt-3">
          <h3 className="mb-2 text-sm font-bold text-text-heading">Môn học · Tự đánh giá</h3>
          {saved?.subjectAssessments?.length ? <ul className="flex flex-wrap gap-1.5">{saved.subjectAssessments.map((item) => <li key={item.categoryId} className={`rounded-full border-2 bg-surface px-2.5 py-1 text-sm text-text-heading ${item.level === 'STRONG' ? 'border-[#a7dfb5]' : 'border-[#f8dc91]'}`}>{item.categoryName || 'Môn học đã chọn'} · {item.level === 'STRONG' ? 'Tự tin' : 'Cần cải thiện'}</li>)}</ul> : <p className="text-sm text-text-body">Chưa tự đánh giá môn học.</p>}
        </div>
      </>}
    </Card>
  )
}
