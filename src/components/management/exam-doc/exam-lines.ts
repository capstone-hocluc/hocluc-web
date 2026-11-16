/** The "--- HẾT ---" line that closes the questions (also where new AI questions stop being appended). */
export const END_LINE = /^[-–—_.*\s]*hết[-–—_.*\s]*$/iu
/** An answer key / marking scheme heading: like the end line, nothing after it belongs to the questions. */
export const TAIL_HEADING = /^(?:bảng\s+)?(?:đáp án|thang điểm|hướng dẫn chấm|lời giải|hướng dẫn giải)/iu
