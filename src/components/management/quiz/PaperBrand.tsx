import Logo from '../../common/Logo'

/**
 * The platform's band at the top of a paper: its mark, its motto, and whose rights the paper carries. A paper the
 * platform made is its own; a paper loaded from elsewhere (a national exam) keeps its maker's rights, the platform's
 * being only its own layout - saying otherwise would claim what is not ours.
 */
export default function PaperBrand({ content, showCopyright = true }: { content: 'own' | 'source'; showCopyright?: boolean }) {
  const year = new Date().getFullYear()
  return (
    <header className="quiz-paper-brand">
      <div className="quiz-paper-brand-row">
        <Logo size={32} />
        <span className="quiz-paper-brand-motto">Mỗi ngày một chút, tiến xa một bước</span>
      </div>
      {showCopyright && <p className="quiz-paper-copyright">
        {content === 'own'
          ? `© ${year} Hocluc.com. Đề thuộc nền tảng Hocluc.com, chỉ dùng cho học viên của Hocluc.com; không sao chép hay phát hành lại khi chưa được phép.`
          : `© ${year} Hocluc.com: nền tảng và cách trình bày. Nội dung đề thuộc đơn vị ra đề; bản dựng lại chỉ dùng nội bộ để luyện tập, không phát hành lại.`}
      </p>}
    </header>
  )
}
