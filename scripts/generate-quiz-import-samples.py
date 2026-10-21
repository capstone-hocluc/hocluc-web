"""Build the three public import templates from a shared fill-in structure.

Requires python-docx. Run from the repository with the bundled document runtime.
Keep DOCX question text in ordinary paragraphs: the BE extractor treats a bold or
underlined first run as a correct-answer marker, and does not read Word equations.
"""
from pathlib import Path
import re
import zipfile
from xml.etree import ElementTree

from docx import Document
from docx.shared import Inches, Pt, RGBColor


root = Path(__file__).resolve().parents[1]
source = root / "docs/samples/quiz-import-template.txt"
text = source.read_text(encoding="utf-8-sig").replace("\r\n", "\n").rstrip() + "\n"
output = root / "public/templates/quiz-import"
output.mkdir(parents=True, exist_ok=True)

for extension in ("txt", "md"):
    (output / f"mau-nhap-cau-hoi.{extension}").write_text(text, encoding="utf-8", newline="\n")

document = Document()
section = document.sections[0]
section.page_width, section.page_height = Inches(8.5), Inches(11)
section.top_margin = section.bottom_margin = Inches(0.65)
section.left_margin = section.right_margin = Inches(0.7)
normal = document.styles["Normal"]
normal.font.name = "Arial"
normal.font.size = Pt(11)
normal.font.color.rgb = RGBColor(0, 0, 0)
normal.paragraph_format.space_after = Pt(0)
normal.paragraph_format.line_spacing = 1.05
document.core_properties.title = "Mẫu nhập câu hỏi trắc nghiệm"
document.core_properties.subject = "Cấu trúc điền nội dung câu hỏi lựa chọn đáp án và giải thích"
document.core_properties.author = "HocLuc"
for line in text.splitlines():
    paragraph = document.add_paragraph(line)
    if line:
        paragraph.paragraph_format.keep_with_next = not line.startswith("Giải thích:")
        paragraph.paragraph_format.keep_together = True
    else:
        paragraph.paragraph_format.line_spacing = 0.5

docx_path = output / "mau-nhap-cau-hoi.docx"
document.save(docx_path)

# Verify the package's actual paragraph text, rather than just the builder input.
with zipfile.ZipFile(docx_path) as package:
    xml = package.read("word/document.xml")
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
body = ElementTree.fromstring(xml)
# Read w:t nodes only, matching the backend's paragraph extraction.
lines = ["".join(node.text or "" for node in p.findall(".//w:t", ns)) for p in body.findall(".//w:p", ns)]
expected = [line for line in text.splitlines() if line.strip()]
assert [line for line in lines if line.strip()] == expected
assert not body.findall(".//w:rPr/w:b", ns) and not body.findall(".//w:rPr/w:u", ns)
assert len(re.findall(r"^Câu \d+\.", text, re.M)) == 1
assert len(re.findall(r"^[A-D]\. \[Điền", text, re.M)) == 4
assert "Đáp án: [Điền ký tự đáp án đúng tại đây]" in text
for extension in ("txt", "md"):
    assert (output / f"mau-nhap-cau-hoi.{extension}").read_text(encoding="utf-8") == text
print("Verified three matching fill-in templates: question, four options, answer and explanation.")
