import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { useLearningProfileDialog } from '../../../hooks/useLearningProfileDialog'
import Button from '../../ui/Button'

export default function SavedLearningGoals() {
  const { profile, status, loadCurrentUser } = useCurrentUser()
  const open = useLearningProfileDialog()
  const saved = profile?.studentProfile
  return (
    <section aria-label="Mục tiêu và môn học tự đánh giá" className="mb-6 rounded-2xl border border-dashed border-line-brand bg-surface-brand p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold text-text-heading">Mục tiêu học tập của bạn</h2><p className="text-sm text-text-body">Thông tin tự khai, tách biệt với kết quả bài đánh giá.</p></div>
        <Button appearance="outline" disabled={!profile} onClick={open}>Chỉnh sửa mục tiêu</Button>
      </div>
      {!profile ? <p role="status">{status === 'error' ? <Button appearance="outline" onClick={() => void loadCurrentUser().catch(() => {})}>Thử tải lại hồ sơ</Button> : 'Đang tải mục tiêu…'}</p> : <>
        <dl className="grid grid-cols-2 gap-4 text-sm max-[760px]:grid-cols-1">
          {[
            ['Kỳ thi', saved?.targetExam === 'VNUHCM_DGNL' ? 'ĐGNL ĐHQG TP.HCM' : 'Chưa xác định'],
            ['Điểm mục tiêu', saved?.targetScore == null ? 'Chưa xác định' : `${saved.targetScore} / 1200`],
            ['Trường đại học mục tiêu', saved?.targetUniversity || 'Chưa xác định'],
            ['Ngành học mục tiêu', saved?.targetMajor || 'Chưa xác định'],
          ].map(([label, value]) => <div key={label}><dt className="text-text-body">{label}</dt><dd className="mt-1 font-semibold break-words text-text-heading">{value}</dd></div>)}
        </dl>
        <h3 className="mt-5 mb-2 text-sm font-bold">Môn học · Tự đánh giá</h3>
        {saved?.subjectAssessments?.length ? <ul className="flex flex-wrap gap-2">{saved.subjectAssessments.map((item) => <li key={item.categoryId} className="rounded-xl border border-dashed border-line-brand bg-surface px-3 py-2 text-sm text-text-heading">{item.categoryName || 'Môn học đã chọn'} · {item.level === 'STRONG' ? 'Tự tin' : 'Cần cải thiện'}</li>)}</ul> : <p className="text-sm text-text-body">Chưa tự đánh giá môn học.</p>}
      </>}
    </section>
  )
}
