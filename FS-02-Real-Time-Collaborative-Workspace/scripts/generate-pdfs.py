
import re
import html
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Preformatted,
    Table,
    TableStyle,
    KeepTogether,
)

# --------------------------------------------------
# PATHS AND DOCUMENTS
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
OUTPUT = ROOT / "pdfs"
OUTPUT.mkdir(exist_ok=True)

DOCUMENTS = [
    ("API.md", "API Documentation", "API_Documentation.pdf"),
    ("ARCHITECTURE.md", "System Architecture", "System_Architecture.pdf"),
    ("DATABASE.md", "Database Documentation", "Database_Documentation.pdf"),
    ("TEST_RESULTS.md", "Test Results Report", "Test_Results_Report.pdf"),
]

# --------------------------------------------------
# STYLES
# --------------------------------------------------

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name="CoverTitle",
    parent=styles["Title"],
    fontSize=25,
    leading=32,
    alignment=TA_CENTER,
    textColor=colors.HexColor("#17365D"),
))

styles.add(ParagraphStyle(
    name="CoverSub",
    parent=styles["Normal"],
    fontSize=12,
    leading=18,
    alignment=TA_CENTER,
    textColor=colors.HexColor("#526579"),
))

styles.add(ParagraphStyle(
    name="H1x",
    parent=styles["Heading1"],
    fontSize=17,
    leading=22,
    textColor=colors.HexColor("#17365D"),
    spaceBefore=12,
    spaceAfter=8,
    keepWithNext=True,
))

styles.add(ParagraphStyle(
    name="H2x",
    parent=styles["Heading2"],
    fontSize=13,
    leading=17,
    textColor=colors.HexColor("#24527A"),
    spaceBefore=10,
    spaceAfter=6,
    keepWithNext=True,
))

styles.add(ParagraphStyle(
    name="H3x",
    parent=styles["Heading3"],
    fontSize=11,
    leading=14,
    textColor=colors.HexColor("#34495E"),
    spaceBefore=8,
    spaceAfter=4,
    keepWithNext=True,
))

styles.add(ParagraphStyle(
    name="Bodyx",
    parent=styles["BodyText"],
    fontSize=9.2,
    leading=13.5,
    spaceAfter=6,
    splitLongWords=1,
))

styles.add(ParagraphStyle(
    name="TableCellx",
    parent=styles["BodyText"],
    fontSize=7.8,
    leading=10.2,
    spaceAfter=0,
    splitLongWords=1,
))

styles.add(ParagraphStyle(
    name="TableHeaderx",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=8,
    leading=10.5,
    textColor=colors.HexColor("#17365D"),
    spaceAfter=0,
))

styles.add(ParagraphStyle(
    name="Codex",
    fontName="Courier",
    fontSize=7.2,
    leading=9,
    backColor=colors.HexColor("#F1F4F8"),
    borderColor=colors.HexColor("#D5DDE6"),
    borderWidth=0.5,
    borderPadding=6,
    spaceBefore=4,
    spaceAfter=8,
))

# --------------------------------------------------
# INLINE MARKDOWN FORMATTING
# --------------------------------------------------

def inline(text):
    text = html.escape(text, quote=False)

    text = re.sub(
        r"\*\*(.+?)\*\*",
        r"<b>\1</b>",
        text
    )

    text = re.sub(
        r"(?<!\*)\*([^*]+)\*(?!\*)",
        r"<i>\1</i>",
        text
    )

    text = re.sub(
        r"`([^`]+)`",
        r'<font name="Courier" size="8">\1</font>',
        text
    )

    return text


# --------------------------------------------------
# PAGE FOOTER
# --------------------------------------------------

def footer(canvas, doc):
    canvas.saveState()

    if doc.page > 1:
        canvas.setStrokeColor(
            colors.HexColor("#D5DDE6")
        )

        canvas.line(
            19 * mm,
            15 * mm,
            A4[0] - 19 * mm,
            15 * mm
        )

        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(
            colors.HexColor("#64748B")
        )

        canvas.drawString(
            19 * mm,
            10 * mm,
            "NEXVIA FS-02"
        )

        canvas.drawRightString(
            A4[0] - 19 * mm,
            10 * mm,
            f"Page {doc.page}"
        )

    canvas.restoreState()


# --------------------------------------------------
# TABLE CONVERSION
# --------------------------------------------------

def convert_table(lines):
    rows = []

    for index, line in enumerate(lines):
        cells = [
            cell.strip()
            for cell in line.strip().strip("|").split("|")
        ]

        # Ignore Markdown separator row
        if all(
            re.fullmatch(r":?-{3,}:?", cell.replace(" ", ""))
            for cell in cells
        ):
            continue

        style = (
            styles["TableHeaderx"]
            if index == 0
            else styles["TableCellx"]
        )

        rows.append([
            Paragraph(inline(cell), style)
            for cell in cells
        ])

    if not rows:
        return []

    column_count = max(len(row) for row in rows)

    for row in rows:
        while len(row) < column_count:
            row.append(
                Paragraph("", styles["TableCellx"])
            )

    available_width = A4[0] - 38 * mm

    # Equal column widths, with wrapped cell text
    col_widths = [
        available_width / column_count
    ] * column_count

    table = Table(
        rows,
        colWidths=col_widths,
        repeatRows=1,
        splitByRow=1,
        hAlign="LEFT",
    )

    table.setStyle(TableStyle([
        (
            "BACKGROUND",
            (0, 0),
            (-1, 0),
            colors.HexColor("#DCE6F1")
        ),
        (
            "GRID",
            (0, 0),
            (-1, -1),
            0.35,
            colors.HexColor("#C8D2DC")
        ),
        (
            "VALIGN",
            (0, 0),
            (-1, -1),
            "TOP"
        ),
        (
            "LEFTPADDING",
            (0, 0),
            (-1, -1),
            5
        ),
        (
            "RIGHTPADDING",
            (0, 0),
            (-1, -1),
            5
        ),
        (
            "TOPPADDING",
            (0, 0),
            (-1, -1),
            5
        ),
        (
            "BOTTOMPADDING",
            (0, 0),
            (-1, -1),
            5
        ),
    ]))

    return [table, Spacer(1, 7)]


# --------------------------------------------------
# MARKDOWN CONVERSION
# --------------------------------------------------

def convert_markdown(text):

    lines = text.splitlines()
    story = []

    i = 0
    code = False
    code_lines = []
    bullets = []

    def flush_bullets():
        nonlocal bullets

        for item in bullets:
            story.append(
                Paragraph(
                    "• " + inline(item),
                    styles["Bodyx"]
                )
            )

        bullets = []

    while i < len(lines):

        line = lines[i]

        # Code blocks
        if line.strip().startswith("```"):

            flush_bullets()

            if not code:
                code = True
                code_lines = []

            else:
                story.append(
                    Preformatted(
                        "\n".join(code_lines),
                        styles["Codex"]
                    )
                )
                code = False

            i += 1
            continue

        if code:
            code_lines.append(line)
            i += 1
            continue

        # Blank lines
        if not line.strip():
            flush_bullets()
            i += 1
            continue

        # Markdown tables
        if (
            line.strip().startswith("|")
            and i + 1 < len(lines)
            and re.match(
                r"^\s*\|?[\s:\-|]+\|?\s*$",
                lines[i + 1]
            )
        ):

            flush_bullets()

            table_lines = [line]
            i += 2

            while (
                i < len(lines)
                and lines[i].strip().startswith("|")
            ):
                table_lines.append(lines[i])
                i += 1

            story.extend(
                convert_table(table_lines)
            )

            continue

        # Headings
        if line.startswith("# "):

            flush_bullets()

            story.append(
                Paragraph(
                    inline(line[2:]),
                    styles["H1x"]
                )
            )

        elif line.startswith("## "):

            flush_bullets()

            story.append(
                Paragraph(
                    inline(line[3:]),
                    styles["H2x"]
                )
            )

        elif line.startswith("### "):

            flush_bullets()

            story.append(
                Paragraph(
                    inline(line[4:]),
                    styles["H3x"]
                )
            )

        # Bullet lists
        elif re.match(r"^\s*[-*]\s+", line):

            bullets.append(
                re.sub(r"^\s*[-*]\s+", "", line)
            )

        # Numbered lists
        elif re.match(r"^\s*\d+\.\s+", line):

            bullets.append(
                re.sub(r"^\s*\d+\.\s+", "", line)
            )

        # Horizontal divider
        elif line.strip() in ("---", "***"):

            flush_bullets()
            story.append(Spacer(1, 6))

        # Normal paragraphs
        else:

            flush_bullets()

            story.append(
                Paragraph(
                    inline(line),
                    styles["Bodyx"]
                )
            )

        i += 1

    flush_bullets()

    if code and code_lines:

        story.append(
            Preformatted(
                "\n".join(code_lines),
                styles["Codex"]
            )
        )

    return story


# --------------------------------------------------
# GENERATE FOUR SEPARATE PDF FILES
# --------------------------------------------------

for source, title, filename in DOCUMENTS:

    source_path = DOCS / source

    if not source_path.exists():
        raise FileNotFoundError(
            f"Missing document: {source_path}"
        )

    content = source_path.read_text(
        encoding="utf-8"
    )

    story = [

        Spacer(1, 45 * mm),

        Paragraph(
            "NEXVIA FS-02",
            styles["CoverTitle"]
        ),

        Spacer(1, 8 * mm),

        Paragraph(
            title,
            styles["CoverTitle"]
        ),

        Spacer(1, 8 * mm),

        Paragraph(
            "Real-Time Collaborative Workspace",
            styles["CoverSub"]
        ),

        Spacer(1, 4 * mm),

        Paragraph(
            "Project Documentation | November 2026",
            styles["CoverSub"]
        ),

        Spacer(1, 45 * mm),

        Paragraph(
            "Prepared for Project Review and Submission",
            styles["CoverSub"]
        ),

        PageBreak(),
    ]

    story.extend(
        convert_markdown(content)
    )

    pdf_path = OUTPUT / filename

    document = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        rightMargin=19 * mm,
        leftMargin=19 * mm,
        topMargin=22 * mm,
        bottomMargin=20 * mm,
        title=f"Nexvia FS-02 - {title}",
        author="Nexvia FS-02 Project",
    )

    document.build(
        story,
        onFirstPage=footer,
        onLaterPages=footer,
    )

    print(f"CREATED: {pdf_path}")

print("\nAll four PDFs generated successfully.")
