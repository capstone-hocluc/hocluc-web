import type { MdErrorCode } from '../../../services/masterDataService'

type ErrorCodeCopy = { name?: string; diagnostic: string; support: string }

/** Plain-language copy for the diagnostic and remediation notes in imported workbooks. */
const COPY: Record<string, ErrorCodeCopy> = {
  'TV.E.LEX': {
    diagnostic: 'Chọn nghĩa đúng trong từ điển nhưng không khớp với ngữ cảnh của đoạn văn.',
    support: 'Dựa vào các câu xung quanh để xác định nghĩa; luyện nhận diện từ theo ngữ cảnh.',
  },
  'TV.E.GRA': {
    diagnostic: 'Thường sai khi phân tích thành phần câu, quan hệ từ hoặc cấu trúc gây mơ hồ.',
    support: 'Ôn cấu trúc câu và luyện tìm lỗi trong câu.',
  },
  'TV.E.COH': {
    diagnostic: 'Thường xếp sai thứ tự câu, bỏ lỡ câu chủ đề hoặc mối nối giữa các ý.',
    support: 'Luyện nhận diện từ nối, từ thay thế và mạch liên kết đoạn.',
  },
  'TV.E.INF': {
    diagnostic: 'Chọn kết luận nghe hợp lý nhưng đoạn văn không cung cấp đủ bằng chứng.',
    support: 'Đối chiếu từng lựa chọn với câu bằng chứng; tránh suy diễn vượt quá nội dung bài.',
  },
  'TV.E.ARG': {
    diagnostic: 'Chưa xác định đúng luận điểm, lý do và dẫn chứng trong đoạn lập luận.',
    support: 'Đánh dấu lần lượt luận điểm, lý do và dẫn chứng trong bài.',
  },
  'TV.E.TIME': {
    diagnostic: 'Mất nhiều thời gian đọc lại nhưng độ chính xác không cải thiện.',
    support: 'Luyện đọc lướt câu hỏi, quét thông tin và làm bài theo thời gian.',
  },
  'TV.E.CARE': {
    diagnostic: 'Bỏ qua từ phủ định hoặc yêu cầu như “không”, “chưa”, “ngoại trừ”, “nhất”.',
    support: 'Gạch chân từ khóa trong câu hỏi trước khi chọn đáp án.',
  },
  'TV.E.GEN': {
    diagnostic: 'Lỗi chưa thuộc nhóm cụ thể nào.',
    support: 'Xem lại câu trả lời và chọn nhóm lỗi cụ thể phù hợp hơn.',
  },
  'EN.E.GRA': {
    diagnostic: 'Lặp lại lỗi trong cùng một nhóm ngữ pháp.',
    support: 'Ôn quy tắc ngắn gọn rồi luyện phân biệt các câu có cấu trúc gần giống nhau.',
  },
  'EN.E.LEX': {
    diagnostic: 'Chọn từ đúng nghĩa cơ bản nhưng chưa hợp cách kết hợp từ hoặc sắc thái trong câu.',
    support: 'Luyện từ vựng trong ngữ cảnh và các cụm từ thường đi cùng nhau.',
  },
  'EN.E.CLOZE': {
    name: 'Chỉ nhìn câu có chỗ trống',
    diagnostic: 'Chỉ dựa vào câu có chỗ trống, bỏ qua thông tin ở câu trước hoặc câu sau.',
    support: 'Kiểm tra lần lượt ngữ pháp, ngữ cảnh gần và mạch ý của cả đoạn.',
  },
  'EN.E.REF': {
    name: 'Xác định sai từ được thay thế',
    diagnostic: 'Chọn danh từ gần nhất làm đối tượng được thay thế nhưng không khớp nghĩa câu.',
    support: 'Đối chiếu số ít/số nhiều, ý nghĩa và vai trò của từ trong câu.',
  },
  'EN.E.INF': {
    name: 'Suy luận vượt quá bằng chứng',
    diagnostic: 'Chọn kết luận mà đoạn văn chưa cung cấp đủ bằng chứng để khẳng định.',
    support: 'Tìm câu bằng chứng và kiểm tra mức độ chắc chắn trước khi suy luận.',
  },
  'EN.E.TIME': {
    diagnostic: 'Đọc toàn bộ đoạn theo thứ tự quá lâu nhưng vẫn sai câu hỏi chi tiết.',
    support: 'Đọc câu hỏi trước, nắm ý từng đoạn rồi quét tìm thông tin cần thiết.',
  },
  'EN.E.CARE': {
    name: 'Bỏ sót từ khóa phủ định hoặc giới hạn',
    diagnostic: 'Bỏ sót từ yêu cầu như NOT, EXCEPT, least hoặc chọn khi chưa đọc hết đáp án.',
    support: 'Đánh dấu từ khóa trong câu hỏi và đọc hết các lựa chọn trước khi trả lời.',
  },
  'EN.E.GEN': {
    diagnostic: 'Lỗi chưa thuộc nhóm cụ thể nào.',
    support: 'Xem lại câu trả lời và chọn nhóm lỗi cụ thể phù hợp hơn.',
  },
  'MA.E.KNOW': {
    diagnostic: 'Sai cùng một chủ đề kể cả khi không bị giới hạn thời gian.',
    support: 'Ôn lại khái niệm và công thức cốt lõi, sau đó làm một nhóm câu nền tảng.',
  },
  'MA.E.MODEL': {
    diagnostic: 'Tính toán đúng nhưng lập phương trình hoặc mô hình từ đề bài chưa đúng.',
    support: 'Gạch dữ kiện, đặt biến, viết mối quan hệ rồi kiểm tra đơn vị.',
  },
  'MA.E.DATA': {
    diagnostic: 'Đọc nhầm số liệu trong bảng, biểu đồ hoặc đơn vị trước khi tính.',
    support: 'Luyện xác định đúng dữ liệu cần đọc và kiểm tra đơn vị trước khi tính.',
  },
  'MA.E.PROB': {
    diagnostic: 'Dùng công thức xác suất trước khi xác định đầy đủ các trường hợp có thể xảy ra.',
    support: 'Liệt kê không gian mẫu và biến cố cần tính trước khi chọn công thức.',
  },
  'MA.E.CALC': {
    diagnostic: 'Nhập sai biểu thức, chọn sai chế độ máy tính hoặc chưa kiểm tra nghiệm.',
    support: 'Kiểm tra chế độ và dữ liệu nhập; đối chiếu kết quả bằng ước lượng hoặc cách khác.',
  },
  'MA.E.METHOD': {
    diagnostic: 'Chọn cách giải dài khiến thời gian làm bài vượt đáng kể.',
    support: 'Thử cách giải khác, ước lượng hoặc loại trừ để chọn hướng ngắn hơn.',
  },
  'MA.E.CARE': {
    diagnostic: 'Lập luận đúng nhưng sai dấu, đơn vị hoặc chép nhầm số.',
    support: 'Dành vài giây cuối để kiểm tra dấu, đơn vị và điều kiện của đáp án.',
  },
  'MA.E.GEN': {
    diagnostic: 'Lỗi chưa thuộc nhóm cụ thể nào.',
    support: 'Xem lại bài làm và chọn nhóm lỗi cụ thể phù hợp hơn.',
  },
  'LR.E.COND': {
    name: 'Đảo chiều điều kiện, nhầm điều kiện cần và đủ',
    diagnostic: 'Đảo chiều điều kiện hoặc nhầm điều kiện cần với điều kiện đủ.',
    support: 'Vẽ sơ đồ điều kiện và luyện suy luận bằng mệnh đề đảo phủ định.',
  },
  'LR.E.DED': {
    diagnostic: 'Bỏ sót kết luận bắt buộc do chưa kết nối được nhiều quy tắc.',
    support: 'Luyện nối từng quy tắc thành chuỗi suy luận từng bước.',
  },
  'LR.E.CONST': {
    diagnostic: 'Tình huống dựng lên vi phạm ít nhất một điều kiện đã cho.',
    support: 'Dùng danh sách kiểm tra quy tắc và sơ đồ ràng buộc khi lập tình huống.',
  },
  'LR.E.PAT': {
    diagnostic: 'Chọn quy luật quá phức tạp hoặc chỉ giải thích được một phần dãy.',
    support: 'Ưu tiên quy luật đơn giản và kiểm tra lại với toàn bộ phần tử.',
  },
  'LR.E.DATA': {
    diagnostic: 'Đưa ra kết luận hoặc quan hệ nhân quả mà dữ liệu chưa chứng minh.',
    support: 'Đối chiếu kết luận với bằng chứng và xác định giới hạn của dữ liệu.',
  },
  'LR.E.ARG': {
    diagnostic: 'Đánh giá bằng chứng trước khi xác định kết luận hoặc giả định của lập luận.',
    support: 'Tìm kết luận chính trước, rồi xác định lý do và giả định liên quan.',
  },
  'LR.E.TIME': {
    diagnostic: 'Thử quá nhiều trường hợp nhưng chưa tận dụng các kết luận có thể suy ra trước.',
    support: 'Rút ra hệ quả chắc chắn trước, sau đó chỉ kiểm tra các trường hợp cần thiết.',
  },
  'LR.E.GEN': {
    name: 'Lỗi suy luận chung',
    diagnostic: 'Lỗi suy luận chưa thuộc nhóm cụ thể nào.',
    support: 'Xem lại bài làm và chọn nhóm lỗi cụ thể phù hợp hơn.',
  },
  'SR.E.DATA': {
    name: 'Đọc sai trục, đơn vị hoặc chuỗi dữ liệu',
    diagnostic: 'Đọc nhầm trục, đơn vị hoặc chuỗi số liệu trước khi suy luận.',
    support: 'Xác định tên trục, đơn vị và chuỗi dữ liệu trước khi rút kết luận.',
  },
  'SR.E.VAR': {
    name: 'Nhầm biến thay đổi, biến đo lường hoặc biến kiểm soát',
    diagnostic: 'Xác định nhầm biến được thay đổi, biến được đo hoặc yếu tố cần giữ nguyên.',
    support: 'Phân biệt rõ: thay đổi yếu tố nào, đo kết quả nào và giữ yếu tố nào cố định.',
  },
  'SR.E.DESIGN': {
    diagnostic: 'Chấp nhận so sánh giữa các thí nghiệm chưa công bằng hoặc thiếu đối chứng.',
    support: 'Kiểm tra biến thay đổi, nhóm đối chứng và các yếu tố cần giữ giống nhau.',
  },
  'SR.E.PRED': {
    diagnostic: 'Dự đoán ngược xu hướng hoặc vượt quá phạm vi mà dữ liệu cho phép.',
    support: 'Kiểm tra xu hướng, phạm vi dữ liệu và mức độ chưa chắc chắn trước khi dự đoán.',
  },
  'SR.E.CONCL': {
    diagnostic: 'Khái quát hoặc kết luận quan hệ nhân quả khi dữ liệu chưa đủ bằng chứng.',
    support: 'Đối chiếu kết luận với bằng chứng và giới hạn của thí nghiệm.',
  },
  'SR.E.VIEW': {
    diagnostic: 'Gán nhầm ý kiến hoặc bằng chứng của giả thuyết này sang giả thuyết khác.',
    support: 'Ghi riêng từng giả thuyết và đối chiếu luận điểm, bằng chứng theo từng cột.',
  },
  'SR.E.TIME': {
    name: 'Đọc đoạn khoa học từ đầu đến cuối quá lâu',
    diagnostic: 'Mất nhiều thời gian đọc lại phần mô tả thí nghiệm hoặc đoạn khoa học.',
    support: 'Xem hình, bảng và thiết kế thí nghiệm trước; sau đó đọc theo câu hỏi.',
  },
  'SR.E.GEN': {
    name: 'Lỗi suy luận khoa học chung',
    diagnostic: 'Lỗi suy luận khoa học chưa thuộc nhóm cụ thể nào.',
    support: 'Xem lại bài làm và chọn nhóm lỗi cụ thể phù hợp hơn.',
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  Grammar: 'Ngữ pháp',
  Vocabulary: 'Từ vựng',
  Cloze: 'Điền từ',
  Reading: 'Đọc hiểu',
  Inference: 'Suy luận',
  Careless: 'Sơ suất',
  Casio: 'Máy tính',
  Design: 'Thiết kế thí nghiệm',
  Prediction: 'Dự đoán',
  Conclusion: 'Kết luận',
  Viewpoint: 'Quan điểm',
  Other: 'Khác',
}

export function errorCodePresentation(error: MdErrorCode) {
  const copy = COPY[error.code]
  return {
    name: copy?.name ?? error.nameVi,
    category: (error.errorCategory && CATEGORY_LABELS[error.errorCategory]) || error.errorCategory,
    diagnostic: copy?.diagnostic ?? error.diagnosticRule,
    support: copy?.support ?? error.remediationAction,
  }
}
