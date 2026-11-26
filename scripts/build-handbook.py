#!/usr/bin/env python3
"""Build the Junior Member Handbook page (and its PDF) from the Registrar's
Word file.

    python3 scripts/build-handbook.py path/to/handbook.docx          # page only
    python3 scripts/build-handbook.py path/to/handbook.docx --pdf    # page + PDF

Everything between the HANDBOOK markers in academics/junior-member-handbook.html
is replaced on every run, so edit the Word file (or the fix tables below), never
the generated markup. The hero, <head> and year live in the page itself.

The same run also writes the guide edition, academics/junior-member-handbook-guide.html:
the same cleaned chapters, cut into one topic per view with a contents tree, an
A-Z index, a front door of student questions (SITUATIONS) and a search the
page builds from its own text. Nothing in the handbook is rewritten for it;
see "The guide edition" below.

The guide also comes in three shorter editions, one per family of programs (see
TRACKS below): MA & PhD in Philosophy; MWS & lifelong learning; and the education
programs. Each is the same build with the topics that belong only to other programs
left out, its own front door and its own labels; links into a topic an edition
leaves out go to the complete guide. Their <head> and top bar are copied from the
complete guide on every run (see track_shell), so edit those there.

Needs pandoc on PATH, and BeautifulSoup + WeasyPrint for Python.

What the script does to the Word file, in order:
  1. pandoc converts it to HTML.
  2. Word artifacts go: the cover and Word's own contents, comments,
     highlights, bookmark anchors, empty headings, decorative chapter-opener
     paragraphs, "---" separators, signature images and partner letterhead.
  3. Headings are re-cased from ALL CAPS (see ACRONYMS / WORD_FIXES).
  4. Text fixes from TEXT_FIXES (stale page references and similar).
  5. Chapters are wrapped, numbered and given short sidebar labels (SHORT).
  6. Tables are set as ruled ledgers; deadline tables as calendar rows; the
     lexicon as a definition list; contacts as a directory.
  7. Footnotes move to the end of the chapter that cites them.
  8. Stray line breaks go, split lists are joined, and the welcome
     signatories and each author of "Letters from Senior Members" get a
     portrait linked to their page (PEOPLE). Portraits are copied from the
     faculty repo (../faculty/assets/headshots) into assets/images/faculty/.
"""

import copy
import html as htmllib
import re
import shutil
import subprocess
import sys
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "academics" / "junior-member-handbook.html"
PDF = ROOT / "academics" / "ICS-Junior-Member-Handbook-2026-27.pdf"
GUIDE = ROOT / "academics" / "junior-member-handbook-guide.html"
START, END = "<!-- HANDBOOK:START -->", "<!-- HANDBOOK:END -->"

# --------------------------------------------------------------- fix tables

# Short names for the chapter sidebar and the margin, keyed by chapter number.
SHORT = {
    "1": "Junior Members", "2": "Why ICS", "3": "Admission",
    "4": "Academic Year", "5": "Programs", "6": "Support & Evaluation",
    "7": "Program Changes", "8": "Funding & Tuition", "9": "Student Records",
    "10": "Research", "11": "Partner Schools", "12": "Community Life",
    "13": "When Things Go Wrong", "14": "Other Policies", "15": "Lexicon",
    "16": "Contacts", "A": "VU Agreement", "B": "VU Template",
}

# Words that keep a fixed spelling when ALL-CAPS headings are re-cased.
ACRONYMS = {
    w.upper(): w for w in [
        "ICS", "MA", "MA-EL", "MWS", "MWS-ART", "MWS-E", "PhD", "VUA", "VU",
        "TST", "OSAP", "CSL", "FICS", "CPRSE", "LAC", "TCPS2", "APA", "K-12",
        "SIN", "FAO", "JM", "SM", "IDS", "LSC", "UofT", "CSTC", "NSLDS",
        "II", "III", "IV",
    ]
}
WORD_FIXES = {"DEROO": "DeRoo", "ICS'S": "ICS's", "ICS’S": "ICS’s",
              "(PHIL)": "(Phil)", "(PHILOSOPHY)": "(Philosophy)"}
SMALL = {"a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for",
         "by", "with", "from", "as", "but", "nor", "der", "van", "per", "into"}

# The Senior Members and officers the handbook speaks through: portraits for
# the welcome letters and "Why I Love Teaching at ICS", and links to their
# pages. Faculty headshots (400 px) are copied from the faculty site's repo
# (../faculty/assets/headshots) into assets/images/faculty/ on every build, so
# the page and the PDF do not depend on another host. Beth Green is not on the
# faculty site; her photo and bio are on the About page.
FACULTY_SITE = "https://faculty.icscanada.edu/"
FACULTY_HEADSHOTS = ROOT.parent / "faculty" / "assets" / "headshots"
PHOTO_DIR = ROOT / "assets" / "images" / "faculty"


def _fac(slug, photo):
    return {"page": f"{FACULTY_SITE}{slug}/", "img": f"faculty/{photo}", "label": "Faculty page"}


PEOPLE = {
    "Nik Ansell": _fac("nansell", "nik-ansell-400.jpg"),
    "Neal DeRoo": _fac("neal-deroo", "neal-deroo-400.jpg"),
    "Ronald A. Kuipers": _fac("rkuipers", "ronald-kuipers-400.jpg"),
    "Rebekah Smick": _fac("rsmick", "rebekah-smick-400.jpg"),
    "Gideon Strauss": _fac("gstrauss", "gideon-strauss-400.jpg"),
    # Bob's page and photo are listed under his full name, Robert
    "Bob Sweetman": _fac("bsweetman", "robert-sweetman-400.jpg"),
    "Edith van der Boom": _fac("evanderboom", "edith-van-der-boom-400.jpg"),
    "Beth Green": {"page": "https://www.icscanada.edu/about", "img": "beth-green.jpg",
                   "label": "About the President"},
}
ALIASES = {"Elizabeth Green": "Beth Green"}

# Plain-text replacements applied to every text node. Page numbers in the Word
# file stopped matching when sections moved, so references to them go.
TEXT_FIXES = [
    (re.compile(r"please refer to pp\. ?\d+\s*[-–]\s*\d+ of this handbook, "), "please refer to "),
    (re.compile(r"\bpp\. ?\d+\s*[-–]\s*\d+ of this handbook,? ?"), ""),
    (re.compile(r"\s*on pp?\. ?\d+(\s*[-\u2013]\s*\d+)?( of this handbook)?"), ""),
    (re.compile(r" on \)"), ")"),
    (re.compile(r"See p\. ?\d+ of this handbook, footnote (\d+)\."), r"See note \1 above."),
    (re.compile(r" \(p\. ?\d+\)(?= of this handbook)"), ""),
    (re.compile(r" \(p\. ?\d+, (footnote \d+)\)(?= of this handbook)"), r", \1,"),
    (re.compile(r"Academic CouncilBib Found:"), "Academic Council."),
    (re.compile(r"reduce or forgive fines\.To dispute"), "reduce or forgive fines. To dispute"),
]

# Links into the Word file's own bookmarks, mapped by link text to our ids.
LINK_BY_TEXT = [
    (re.compile(r"how do we learn", re.I), "ch-5"),
    (re.compile(r"grading template", re.I), "ics-grading-template-and-program-trackers"),
    (re.compile(r"protocol for the ma thesis", re.I), "protocol-for-the-ma-thesis-examination"),
    (re.compile(r"declaration of full", re.I), "declaration-of-full-time-part-time-status-for-ics-junior-members"),
    (re.compile(r"how do we approach research", re.I), "ch-10"),
    (re.compile(r"ma program description", re.I), "ma-in-philosophy"),
    (re.compile(r"phd program description", re.I), "phd-in-philosophy"),
    (re.compile(r"section 5", re.I), "ch-5"),
    (re.compile(r"section 6", re.I), "ch-6"),
    (re.compile(r"section 10", re.I), "ch-10"),
    (re.compile(r"craft of reflective", re.I), "instructional-leadership-courses"),
    (re.compile(r"^4: the academic year|^section$", re.I), "ch-4"),
    (re.compile(r"introduction to this section", re.I),
     "introduction-to-the-ma-philosophy-and-phd-philosophy-programs-of-study"),
    (re.compile(r"framework agreement", re.I), "appendix-a"),
    (re.compile(r"tracker template|completion plan template", re.I), "ics-grading-template-and-program-trackers"),
    (re.compile(r"list of deadlines", re.I), "a-list-of-deadlines"),
]

# Sections that are printable forms: drawn as sheets, each on its own page.
FORM_SECTIONS = {"ics-grading-template-and-program-trackers",
                 "declaration-of-full-time-part-time-status-for-ics-junior-members"}


# ------------------------------------------------------------------ helpers

def text_of(el):
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip()


def slug(s):
    s = s.lower().replace("&", " and ").replace("’", "").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:80].rstrip("-")


def recase_word(w, first):
    up = w.upper()
    if up in WORD_FIXES:
        return WORD_FIXES[up]
    core = up.strip("()[]:,.?“”\"'")
    if core in ACRONYMS:
        return w.upper().replace(core, ACRONYMS[core])
    if "/" in w and len(w) > 1:
        return "/".join(recase_word(p, first) for p in w.split("/"))
    if "-" in w and len(w) > 1 and not up.startswith("-"):
        parts = w.split("-")
        return "-".join(recase_word(p, first or i > 0) for i, p in enumerate(parts))
    low = w.lower()
    if not first and low.strip("()") in SMALL:
        return low
    # capitalise the first letter, keep leading punctuation
    m = re.match(r"^([^A-Za-z]*)([A-Za-z])(.*)$", low)
    return f"{m.group(1)}{m.group(2).upper()}{m.group(3)}" if m else low


def recase(s):
    """ALL CAPS -> Title Case, leaving mixed-case text alone."""
    letters = [c for c in s if c.isalpha()]
    if not letters or sum(c.isupper() for c in letters) / len(letters) < 0.8:
        return s
    words = s.split(" ")
    out = []
    lead = next((i for i, w in enumerate(words) if w), 0)
    for i, w in enumerate(words):
        prev = words[i - 1] if i else ""
        first = i <= lead or prev.endswith((":", "?", ".", "—", "-", "–"))
        out.append(recase_word(w, first) if w else w)
    return " ".join(out)


def recase_tag(tag):
    for node in list(tag.descendants):
        if isinstance(node, NavigableString) and node.strip():
            node.replace_with(recase(str(node)))


def unwrap_all(root, names):
    for t in root.find_all(names):
        t.unwrap()


def new(soup, name, cls=None, text=None, **attrs):
    t = soup.new_tag(name, **attrs)
    if cls:
        t["class"] = cls if isinstance(cls, list) else cls.split()
    if text is not None:
        t.string = text
    return t


# --------------------------------------------------------------- the build

def pandoc(docx):
    return subprocess.run(
        ["pandoc", str(docx), "-f", "docx", "-t", "html5", "--wrap=none"],
        check=True, capture_output=True, text=True).stdout


def _blank(node):
    return node is None or (isinstance(node, NavigableString) and not node.strip())


def _at_edge(br, direction):
    """True when nothing but blank text lies on that side of the <br> inside
    its block (looking out through <em>, <strong> and <span> wrappers)."""
    node = br
    while node is not None and node.name not in ("p", "li", "td", "th", "div", "body", "[document]"):
        sib = node.next_sibling if direction == "after" else node.previous_sibling
        while sib is not None and _blank(sib):
            sib = sib.next_sibling if direction == "after" else sib.previous_sibling
        if sib is not None:
            return False
        node = node.parent
    return True


def _prev_is_br(br):
    sib = br.previous_sibling
    while sib is not None and _blank(sib):
        sib = sib.previous_sibling
    return isinstance(sib, Tag) and sib.name == "br"


def tidy_breaks(body):
    """Word line breaks that were really spacing.

    - none belong in a heading;
    - a break at the start or end of a block, or one that follows another,
      is empty space;
    - in running prose (not a table cell or list item) a break between two
      sentences was a paragraph break, so make it one.
    Addresses, record lists and form labels keep their single line breaks."""
    for h in body.find_all(re.compile(r"^h[1-6]$")):
        for br in h.find_all("br"):
            br.decompose()
    for br in list(body.find_all("br")):
        if br.parent is None:
            continue
        if _at_edge(br, "before") or _at_edge(br, "after") or _prev_is_br(br):
            br.decompose()
    for br in list(body.find_all("br")):
        p = br.parent
        if p is None or p.name != "p" or p.find_parent(["td", "th", "li", "blockquote"]):
            continue
        idx = p.contents.index(br)
        head_txt = "".join(c.get_text() if isinstance(c, Tag) else str(c) for c in p.contents[:idx]).strip()
        tail_txt = "".join(c.get_text() if isinstance(c, Tag) else str(c) for c in p.contents[idx + 1:]).strip()
        if len(head_txt) >= 60 and len(tail_txt) >= 60 and head_txt[-1] in ".?!:)\u201d\"" \
                and tail_txt[0].isupper() and not p.find_parent("table"):
            twin = Tag(name="p")
            for c in list(p.contents[idx + 1:]):
                twin.append(c.extract())
            if isinstance(twin.contents[0], NavigableString):
                twin.contents[0].replace_with(twin.contents[0].lstrip())
            br.decompose()
            p.insert_after(twin)


def merge_lists(body):
    """Word starts a second list where the first one is only indented again;
    two bullet lists with nothing between them are one list."""
    for ul in body.find_all("ul"):
        while True:
            nxt = ul.next_sibling
            while nxt is not None and _blank(nxt):
                nxt = nxt.next_sibling
            if not (isinstance(nxt, Tag) and nxt.name == "ul"):
                break
            for li in list(nxt.find_all("li", recursive=False)):
                ul.append(li.extract())
            nxt.decompose()


def unbold_initials(body):
    """A lone bold capital that starts a word ("<strong>S</strong>pring")."""
    for s in body.find_all(["strong", "em"]):
        t = s.get_text()
        nxt = s.next_sibling
        if len(t) == 1 and t.isalpha() and isinstance(nxt, NavigableString) and nxt[:1].isalpha():
            s.unwrap()


def clean(soup):
    body = soup.body or soup

    # Word's highlights, comments, bookmarks, raw-HTML comments, underline.
    for t in body.find_all(["mark"]):
        t.unwrap()
    for t in body.find_all("span", class_=["mark", "comment-start", "comment-end"]):
        t.unwrap()
    for t in body.find_all("span", class_="anchor"):
        t.decompose()
    for t in body.find_all("u"):
        t.name = "em"
    for t in body.find_all("span", class_="underline"):
        t.name = "em"
        del t["class"]
    for t in body.find_all("img"):
        # signatures and partner letterhead: not published on the web
        t.decompose()
    for t in body.find_all(["col", "colgroup"]):
        t.decompose()
    for t in body.find_all(True):
        for a in ("style", "width", "height"):
            if a in t.attrs:
                del t[a]

    # Everything before chapter 1 is the Word cover and contents.
    first = next(h for h in body.find_all("h2") if re.match(r"\s*1\.", text_of(h)))
    for sib in list(first.find_previous_siblings()):
        sib.decompose()

    # Decorative ALL-CAPS paragraphs that open each chapter ("HOW DO WE / LEARN
    # AT ICS?") sit right before the chapter's h2; so do empty headings.
    for h in body.find_all(re.compile(r"^h[1-6]$")):
        if not text_of(h):
            h.decompose()
    for h in body.find_all("h2"):
        prev = h.find_previous_sibling()
        while prev is not None and prev.name == "p" and prev.find("strong") and \
                text_of(prev) == text_of(prev).upper() and len(text_of(prev)) < 40:
            nxt = prev.find_previous_sibling()
            prev.decompose()
            prev = nxt

    # "---" separators between the faculty letters; stray "." paragraphs.
    for p in body.find_all("p"):
        t = text_of(p)
        if t in {"—", "---", "——", ".", "(over)", ""} and not p.find(["img", "a"]):
            p.decompose()
    # Indentation came across as <blockquote>; it is not quotation.
    for bq in body.find_all("blockquote"):
        bq.unwrap()

    tidy_breaks(body)
    merge_lists(body)
    unbold_initials(body)

    # Text fixes.
    for node in list(body.find_all(string=True)):
        s = str(node)
        for rx, rep in TEXT_FIXES:
            s = rx.sub(rep, s)
        if s != str(node):
            node.replace_with(s)


def fix_headings(soup):
    for h in soup.find_all(["h2", "h3", "h4", "h5"]):
        for t in h.find_all("strong"):
            t.unwrap()
        if h.name == "h5":
            for t in h.find_all("em"):
                t.unwrap()
        recase_tag(h)
        # tidy whitespace
        for node in list(h.find_all(string=True)):
            node.replace_with(re.sub(r"\s+", " ", str(node)))
        if h.contents and isinstance(h.contents[0], NavigableString):
            h.contents[0].replace_with(h.contents[0].lstrip())
        if h.contents and isinstance(h.contents[-1], NavigableString):
            h.contents[-1].replace_with(h.contents[-1].rstrip())
        if "id" in h.attrs:
            del h["id"]


def run_in_heads(soup):
    """'***Reading:*** Junior Members are…' -> a run-in label."""
    for p in soup.find_all("p"):
        first = next((c for c in p.contents if not (isinstance(c, NavigableString) and not c.strip())), None)
        if not isinstance(first, Tag) or first.name not in ("strong", "em"):
            continue
        label = text_of(first)
        rest = text_of(p)[len(label):].strip()
        has_both = first.find(["strong", "em"]) is not None or first.find_parent(["strong", "em"])
        if label.endswith(":") and rest and (has_both or first.name == "strong"):
            first.name = "span"
            first["class"] = ["runin"]
            for t in first.find_all(["strong", "em"]):
                t.unwrap()
        elif not rest and label.endswith(":") and first.name == "strong" and p.find_parent("li") \
                and getattr(p.find_next_sibling(), "name", None) in ("ul", "ol"):
            # "Scholarship:" opening a nested list in the Educational Creed
            first.name = "span"
            first["class"] = ["runin"]
            for t in first.find_all(["strong", "em"]):
                t.unwrap()
        elif not rest and label and label == label.upper() and len(label) < 60 and first.name == "strong":
            # standalone caps line: a small heading inside a section
            # a heading one level below the section it sits in (fixed up later)
            p.name = "h4"
            p["class"] = ["label"]
            first.unwrap()
            recase_tag(p)
        elif not rest and label.endswith(":") is False and first.name == "strong" and first.find("em") \
                and len(label) < 160:
            # bold-italic course titles in the certificate chapter
            p["class"] = ["course-title"]


def bold_runs_to_lists(soup):
    """Runs of four or more paragraphs that are each one short bold phrase
    (the list of events opening Section 4) were indented lines in Word."""
    for p in list(soup.find_all("p")):
        if p.parent is None or p.find_previous_sibling() is not None and _is_bold_line(p.find_previous_sibling()):
            continue
        run = [p]
        nxt = p.find_next_sibling()
        while nxt is not None and _is_bold_line(nxt):
            run.append(nxt)
            nxt = nxt.find_next_sibling()
        if len(run) < 6 or not all(_is_bold_line(x) for x in run):
            continue
        ul = new(soup, "ul", "hb-runlist")
        p.insert_before(ul)
        for x in run:
            li = new(soup, "li", text=text_of(x))
            ul.append(li)
            x.decompose()


def _is_bold_line(el):
    if not isinstance(el, Tag) or el.name != "p":
        return False
    kids = [c for c in el.contents if not (isinstance(c, NavigableString) and not c.strip())]
    return len(kids) == 1 and isinstance(kids[0], Tag) and kids[0].name == "strong" \
        and 0 < len(text_of(el)) < 40


def join_split_paragraphs(section):
    """The Word file breaks a few sentences in two at a page boundary
    ("...after signing a registration" / "agreement, that he or she..."). A paragraph that
    stops without closing punctuation, followed by one that starts in lower case, is one."""
    closers = ".?!:;)”\"…]"
    for para in list(section.find_all("p")):
        if para.parent is None or para.get("class"):
            continue
        if para.find_parent(["td", "th", "li", "blockquote", "aside", "table"]) is not None:
            continue
        nxt = para.find_next_sibling()
        if nxt is None or nxt.name != "p" or nxt.get("class"):
            continue
        a, b = text_of(para), text_of(nxt)
        if len(a) > 25 and b and b[0].islower() and a[-1] not in closers:
            para.append(NavigableString(" "))
            for c in list(nxt.contents):
                para.append(c.extract())
            nxt.decompose()


def wrap_chapters(soup):
    body = soup.body
    chapters = []
    for h in list(body.find_all("h2", recursive=False)):
        t = text_of(h)
        m = re.match(r"^(\d+)\.\s*(.+)$", t) or re.match(r"^Appendix ([A-Z])\s*[-–]\s*(.+)$", t, re.I)
        if not m:
            continue
        # a note marker can sit mid-title ("15. DOOYEWORDS<sup>15</sup>: AN ICS LEXICON");
        # remember the words before it so it goes back in the same place
        ref_at = None
        first_ref = h.find("a", class_="footnote-ref")
        if first_ref is not None:
            before = ""
            for c in h.contents:
                if c is first_ref:
                    break
                before += c.get_text() if isinstance(c, Tag) else str(c)
            ref_at = re.sub(r"^\s*(\d+\.|Appendix [A-Z]\s*[-\u2013])\s*", "", re.sub(r"\s+", " ", before), flags=re.I).strip()
        refs = [r.extract() for r in h.find_all("a", class_="footnote-ref")]
        t = text_of(h)
        m = re.match(r"^(\d+)\.\s*(.+)$", t) or re.match(r"^Appendix ([A-Z])\s*[-\u2013]\s*(.+)$", t, re.I)
        num, title = m.group(1).upper(), re.sub(r"\s+:", ":", m.group(2).strip())
        is_app = not num.isdigit()
        sec = new(soup, "section", "hb-ch" + (" hb-ch--appendix" if is_app else ""),
                  id=f"ch-{num.lower()}" if not is_app else f"appendix-{num.lower()}")
        sec["data-short"] = SHORT.get(num, title)
        sec["data-num"] = num
        # collect siblings up to next chapter h2
        nodes = []
        sib = h.next_sibling
        while sib is not None and not (isinstance(sib, Tag) and sib.name == "h2"
                                       and re.match(r"^(\d+\.|appendix)", text_of(sib), re.I)):
            nxt = sib.next_sibling
            nodes.append(sib.extract())
            sib = nxt
        h.insert_before(sec)
        h.extract()
        chapters.append((sec, num, title, is_app, nodes, refs, ref_at))
    # anything left after the last chapter (the footnotes aside) stays put
    return chapters


def build_chapter(soup, sec, num, title, is_app, nodes, refs=(), ref_at=None):
    # the handbook's own cross-references say "Section 5", so the headings do too
    label = f"Appendix {num}" if is_app else f"Section {num}"
    margin = new(soup, "div", "hb-ch__margin", **{"aria-hidden": "true"})
    margin.append(new(soup, "span", "hb-ch__no", text=num))
    margin.append(new(soup, "span", "hb-ch__short", text=SHORT.get(num, "")))
    sec.append(margin)

    col = new(soup, "div", "hb-ch__body")
    head = new(soup, "header", "hb-ch__head")
    h2 = new(soup, "h2", "hb-ch__title")
    h2.append(new(soup, "span", "hb-ch__label", text=label + ". "))
    if refs and ref_at and title.upper().startswith(ref_at.upper()):
        h2.append(NavigableString(recase(title[:len(ref_at)])))
        for ref in refs:
            h2.append(ref)
        h2.append(NavigableString(recase(title[len(ref_at):])))
    else:
        h2.append(NavigableString(recase(title)))
        for ref in refs:
            h2.append(ref)
    head.append(h2)
    col.append(head)
    for n in nodes:
        col.append(n)
    sec.append(col)

    # ids for section headings
    seen = set()
    for h in col.find_all(["h3", "h4"]):
        base = slug(text_of(h)) or "section"
        hid = base
        i = 2
        while hid in seen or soup.find(id=hid):
            hid = f"{base}-{i}"
            i += 1
        seen.add(hid)
        h["id"] = hid


def ledgerize_tables(soup):
    for tbl in soup.find_all("table"):
        # unwrap paragraph-in-cell where a cell holds one paragraph
        for cell in tbl.find_all(["td", "th"]):
            ps = cell.find_all("p", recursive=False)
            if len(ps) == 1 and len(cell.find_all(True, recursive=False)) == 1:
                ps[0].unwrap()
            for h in cell.find_all(re.compile("^h[1-6]$")):
                h.name = "strong"
                if "id" in h.attrs:
                    del h["id"]
        for tr in tbl.find_all("tr"):
            if "class" in tr.attrs:
                del tr["class"]
            if not text_of(tr) and not tr.find_parent("table", class_="sheet-grid"):
                # keep blank rows only in forms (filled in by hand)
                pass
        restructure_table(soup, tbl)
        tbl["class"] = ["ledger"]
        ncols = max(len(r.find_all(["td", "th"])) for r in tbl.find_all("tr"))
        if ncols >= 4:
            tbl["class"].append("ledger--wide")
        wrap = new(soup, "div", "ledger-wrap")
        tbl.wrap(wrap)


def restructure_table(soup, tbl):
    """Word marks whole tables as repeating header rows, so pandoc puts every
    row in <thead>. Put them all in the body, then promote what really is a
    title (one filled cell) to a caption and a row of short labels to the head."""
    rows = tbl.find_all("tr")
    for part in tbl.find_all(["thead", "tbody"]):
        part.unwrap()
    for r in rows:
        for c in r.find_all("th"):
            c.name = "td"

    def filled(r):
        return [c for c in r.find_all("td") if text_of(c)]

    body = new(soup, "tbody")
    for r in rows:
        body.append(r.extract())
    if len(rows) > 2 and len(filled(rows[0])) == 1:
        cap = new(soup, "caption")
        cap.string = recase(text_of(rows[0]))
        rows[0].decompose()
        rows = rows[1:]
        tbl.insert(0, cap)
    head_cells = filled(rows[0]) if rows else []
    if len(rows) > 1 and len(head_cells) >= 2 and all(len(text_of(c)) <= 40 for c in head_cells):
        thead = new(soup, "thead")
        for c in rows[0].find_all("td"):
            c.name = "th"
            c["scope"] = "col"
        thead.append(rows[0].extract())
        tbl.append(thead)
    tbl.append(body)


def deadline_rows(soup):
    """Tables of deadlines become calendar-style rows."""
    for tbl in soup.find_all("table", class_="ledger"):
        rows = tbl.find_all("tr")
        cells = [[text_of(c) for c in r.find_all(["td", "th"])] for r in rows]
        if len(cells) < 3 or any(len(c) != 2 for c in cells):
            continue
        firsts = " ".join(c[0] for c in cells)
        seconds = [c[1] for c in cells]
        kind = None
        if re.search(r"JM Deadline", firsts):
            kind = "list"
        elif sum(bool(re.search(r"of Year \d", s)) for s in seconds) >= len(cells) - 1:
            kind = "thesis"
        if not kind:
            continue
        ol = new(soup, "ol", "hb-dates")
        for (a, b), r in zip(cells, rows):
            li = new(soup, "li", "hb-date")
            if kind == "list":
                m = re.match(r"^(JM Deadline|SM Deadline|Application Deadlines):\s*(.*)$", a)
                cat, what = (m.group(1), m.group(2)) if m else ("", a)
                if cat.startswith("Application"):
                    # two programs, two dates in the same row
                    parts = re.split(r"\s+(?=MA-EL)", what)
                    dates = re.split(r"\s+(?=April)", b)
                    for w, d in zip(parts, dates):
                        li2 = new(soup, "li", "hb-date hb-date--app")
                        li2.append(new(soup, "span", "hb-date__when", text=d))
                        li2.append(new(soup, "span", "hb-date__what", text=f"Application deadline: {w}"))
                        li2.append(new(soup, "span", "hb-date__cat", text="Applications"))
                        ol.append(li2)
                    continue
                kindcls = "jm" if cat.startswith("JM") else "sm"
                li["class"].append(f"hb-date--{kindcls}")
                li.append(new(soup, "span", "hb-date__when", text=b))
                li.append(new(soup, "span", "hb-date__what", text=what))
                li.append(new(soup, "span", "hb-date__cat",
                              text="Junior Members" if kindcls == "jm" else "Senior Members"))
            else:
                li["class"].append("hb-date--jm")
                li.append(new(soup, "span", "hb-date__when", text=b))
                li.append(new(soup, "span", "hb-date__what", text=a))
            ol.append(li)
        tbl.parent.replace_with(ol)


def lexicon(soup, chapter):
    for tbl in chapter.find_all("table"):
        rows = tbl.find_all("tr")
        if not rows or any(len(r.find_all(["td", "th"])) != 2 for r in rows):
            continue
        dl = new(soup, "dl", "hb-lexicon")
        for r in rows:
            a, b = r.find_all(["td", "th"])
            term = text_of(a).rstrip(":")
            if not term:
                continue
            dt = new(soup, "dt")
            dt.string = term
            dd = new(soup, "dd")
            for c in list(b.contents):
                dd.append(c)
            dl.append(dt)
            dl.append(dd)
        (tbl.find_parent("div", class_="ledger-wrap") or tbl).replace_with(dl)


def contacts(soup, chapter):
    body = chapter.find("div", class_="hb-ch__body")
    rows = []
    for p in list(body.find_all("p", recursive=False)):
        # joined without a separator: a Word link that breaks an address
        # in two ("nderoo" + "@icscanada.edu") must read as one
        t = re.sub(r"\s+", " ", p.get_text("")).strip()
        m = re.match(r"^(.+?):\s*(.+)$", t)
        # "MA/PhD" is mixed case on purpose
        if not m or m.group(1).replace("PhD", "PHD").upper() != m.group(1).replace("PhD", "PHD"):
            continue
        role = recase(m.group(1).strip())
        rest = m.group(2)
        parts = [re.sub(r"\s+@", "@", x.strip()) for x in rest.split("|")]
        name = parts[0]
        links = [a for a in p.find_all("a")]
        rows.append((p, role, name, parts[1:], links))
    if not rows:
        return
    ol = new(soup, "ul", "hb-contacts")
    for p, role, name, extra, links in rows:
        li = new(soup, "li", "hb-contact")
        li.append(new(soup, "span", "hb-contact__role", text=role))
        nm = new(soup, "span", "hb-contact__name")
        person = PEOPLE.get(name)
        if person:
            nm.append(new(soup, "a", text=name, href=person["page"]))
        else:
            nm.string = name
        li.append(nm)
        for e in extra:
            if "@" in e:
                a = new(soup, "a", "hb-contact__mail", text=e, href=f"mailto:{e}")
                li.append(a)
            elif e:
                li.append(new(soup, "span", "hb-contact__extra", text=e))
        ol.append(li)
    rows[0][0].insert_before(ol)
    for r in rows:
        r[0].decompose()


SIGNOFFS = {"Elizabeth Green", "Ronald A. Kuipers"}


def signoffs(soup):
    """The welcome letters end with a name and title, which Word set as a
    heading in one letter and bold text in the other."""
    for el in soup.find_all(["h4", "h5", "p"]):
        # an h4 without the "label" class is a letter's own heading (the
        # same name opens the Dean's letter in "Letters from Senior Members")
        if el.name == "h4" and "label" not in el.get("class", []):
            continue
        if text_of(el) in SIGNOFFS and el.find_parent("section", class_="hb-ch"):
            el.name = "p"
            el.attrs = {"class": ["signoff"]}
            el.string = text_of(el)


def people(soup):
    """Portraits and faculty-page links for the welcome signatories and the
    authors of "Letters from Senior Members"."""
    def portrait(info, who):
        a = new(soup, "a", "hb-portrait", href=info["page"], tabindex="-1", **{"aria-hidden": "true"})
        a.append(new(soup, "img", src=f"../assets/images/{info['img']}", alt="", width="400", height="400",
                     loading="lazy", decoding="async"))
        return a

    def link(info, who):
        return new(soup, "a", "hb-person__link", href=info["page"], text=info["label"],
                   **{"aria-label": f"{who}: {info['label'].lower()}"})

    # welcome letters: the portrait sits beside the name and title
    for el in soup.find_all("p", class_="signoff"):
        name = ALIASES.get(text_of(el), text_of(el))
        info = PEOPLE.get(name)
        if not info:
            continue
        title = el.find_next_sibling("p")
        wrap = new(soup, "div", "hb-sign")
        el.insert_before(wrap)
        wrap.append(portrait(info, name))
        text = new(soup, "div", "hb-sign__text")
        wrap.append(text)
        text.append(el.extract())
        if title is not None and title.find("em"):
            text.append(title.extract())
        text.append(link(info, name))

    # one letter per Senior Member: heading, portrait and the letter together
    ch2 = soup.find(id="ch-2")
    if ch2 is None:
        return
    for h in list(ch2.find_all("h4")):
        info = PEOPLE.get(text_of(h))
        if not info or "label" in h.get("class", []) or h.find_parent("article"):
            continue
        who = text_of(h)
        art = new(soup, "article", "hb-letter")
        h.insert_before(art)
        head = new(soup, "header", "hb-letter__head")
        art.append(head)
        head.append(portrait(info, who))
        text = new(soup, "div", "hb-letter__who")
        head.append(text)
        text.append(h.extract())
        text.append(link(info, who))
        sib = art.next_sibling
        while sib is not None and not (isinstance(sib, Tag) and sib.name in ("h3", "h4", "h2", "aside", "section")):
            nxt = sib.next_sibling
            art.append(sib.extract())
            sib = nxt


def copy_photos():
    """Bring the faculty headshots in beside the page (see PEOPLE)."""
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    for info in PEOPLE.values():
        if not info["img"].startswith("faculty/"):
            continue
        name = info["img"].split("/", 1)[1]
        src, dst = FACULTY_HEADSHOTS / name, PHOTO_DIR / name
        if src.exists():
            if not dst.exists() or src.read_bytes() != dst.read_bytes():
                shutil.copyfile(src, dst)
        elif not dst.exists():
            print(f"missing portrait: {name}", file=sys.stderr)


def fix_links(soup):
    ids = {t["id"] for t in soup.find_all(id=True)}
    for a in soup.find_all("a", href=True):
        h = a["href"]
        if h.startswith("#") and h[1:] not in ids and not h.startswith("#fn"):
            t = text_of(a)
            for rx, target in LINK_BY_TEXT:
                if rx.search(t) and target in ids:
                    a["href"] = "#" + target
                    break
            else:
                hid = slug(t)
                a["href"] = "#" + hid if hid in ids else "#contents"
        elif h.startswith("http://www.icscanada.edu"):
            a["href"] = "https://" + h[len("http://"):]
        # bold-wrapped links read as links on their own
        for s in a.find_all("strong"):
            s.unwrap()
        if a.parent and a.parent.name == "strong" and text_of(a.parent) == text_of(a):
            a.parent.unwrap()


def move_footnotes(soup, chapters):
    aside = soup.find(["aside", "section"], class_="footnotes")
    if not aside:
        return
    notes = {li["id"]: li for li in aside.find_all("li", id=True)}
    for sec, *_ in chapters:
        refs = sec.find_all("a", class_="footnote-ref")
        if not refs:
            continue
        box = new(soup, "aside", "hb-notes", **{"aria-label": "Notes"})
        box.append(new(soup, "p", "hb-notes__title", text="Notes"))
        ol = new(soup, "ol")
        for ref in refs:
            fid = ref["href"][1:]
            li = notes.get(fid)
            if li is None:
                continue
            n = text_of(ref)
            li["value"] = n
            for back in li.find_all("a", class_="footnote-back"):
                back.string = "Back to text"
            ol.append(li)
            ref["class"] = ["fnref"]
            ref["aria-label"] = f"Note {n}"
        box.append(ol)
        sec.find("div", class_="hb-ch__body").append(box)
    aside.decompose()


def mark_forms(soup):
    for hid in FORM_SECTIONS:
        h = soup.find(id=hid)
        if not h:
            continue
        level = h.name
        wrap = new(soup, "div", "hb-forms")
        h.insert_before(wrap)
        wrap.append(h.extract())
        sib = wrap.next_sibling
        while sib is not None and not (isinstance(sib, Tag) and (
                sib.name in ("h2", "h3") and (level == "h3" or sib.name == "h2")) or
                (isinstance(sib, Tag) and sib.name == "aside")):
            nxt = sib.next_sibling
            wrap.append(sib.extract())
            sib = nxt
        for t in wrap.find_all("table"):
            t["class"] = ["ledger", "ledger--form"]
        # Each form opened with a one-line letterhead table (logo + form name).
        # It becomes the sheet's title; in print every sheet starts a page.
        for t in wrap.find_all("table"):
            if len(t.find_all("tr")) <= 2 and len(text_of(t)) < 120 and not t.find("caption") \
                    and not re.match(r"^[IVX]+\.", text_of(t)):
                ttl = new(soup, "p", "sheet-title")
                ttl.string = recase(text_of(t))
                (t.find_parent("div", class_="ledger-wrap") or t).replace_with(ttl)
        prev = None
        for ttl in wrap.find_all("p", class_="sheet-title"):
            # a form's second page repeats its letterhead: keep the page break, drop the title
            if prev is not None and text_of(prev) == text_of(ttl):
                ttl["class"].append("sheet-title--repeat")
            prev = ttl
            nxt = ttl.find_next_sibling()
            cap = nxt.find("caption") if nxt else None
            if cap and text_of(cap).lower() == text_of(ttl).lower():
                cap.decompose()


def contents(soup, chapters):
    nav = new(soup, "nav", "hb-contents", id="contents", **{"aria-labelledby": "contents-title"})
    inner = new(soup, "div", "container")
    head = new(soup, "div", "hb-contents__head")
    h = new(soup, "h2", "hb-contents__title", id="contents-title", text="Contents")
    head.append(h)
    inner.append(head)
    ol = new(soup, "ol", "hb-toc")
    for sec, num, title, is_app, *_ in chapters:
        li = new(soup, "li", "hb-toc__ch" + (" hb-toc__ch--app" if is_app else ""))
        li.append(new(soup, "span", "hb-toc__no", text=num))
        main = new(soup, "div", "hb-toc__main")
        a = new(soup, "a", "hb-toc__link", href="#" + sec["id"])
        h2 = copy.copy(sec.find("h2"))
        for x in h2.find_all(["span", "a"]):
            x.decompose()
        a.string = text_of(h2)
        main.append(a)
        subs = sec.find("div", class_="hb-ch__body").find_all("h3")
        if subs:
            ul = new(soup, "ul", "hb-toc__subs")
            for s in subs:
                sli = new(soup, "li")
                sli.append(new(soup, "a", href="#" + s["id"], text=text_of(s)))
                ul.append(sli)
            main.append(ul)
        li.append(main)
        ol.append(li)
    inner.append(ol)
    nav.append(inner)
    return nav


def side(soup, chapters):
    """The sidebar: search, then one row per chapter with its sections (shown
    for the chapter in view), then the PDF. On narrow screens js/handbook.js
    opens it as a drawer from the bar (see bar()). Without JavaScript it is
    plain anchor links and the search stays hidden."""
    aside = new(soup, "aside", "hb-side", id="hb-side", **{"aria-label": "Handbook"})
    head = new(soup, "div", "hb-side__head")
    form = new(soup, "form", "hb-search", action="#", role="search", hidden="")
    label = new(soup, "label", "hb-sr", text="Search the handbook")
    label["for"] = "hb-q"
    form.append(label)
    field = new(soup, "div", "hb-search__field")
    field.append(icon(soup, "search", "hb-ic hb-search__ic"))
    q = new(soup, "input", "hb-search__input", id="hb-q", type="search",
            placeholder="Search the handbook", autocomplete="off", spellcheck="false",
            **{"aria-controls": "hb-results", "enterkeyhint": "search"})
    q["name"] = "q"
    field.append(q)
    clear = new(soup, "button", "hb-search__clear", type="button", hidden="",
                **{"aria-label": "Clear the search"})
    clear.append(icon(soup, "close", "hb-ic"))
    field.append(clear)
    form.append(field)
    form.append(new(soup, "button", "hb-sr", type="submit", text="Search"))
    head.append(form)
    shut = new(soup, "button", "hb-side__close", type="button", **{"aria-label": "Close"})
    shut.append(icon(soup, "close", "hb-ic"))
    head.append(shut)
    aside.append(head)

    res = new(soup, "div", "hb-results", id="hb-results", hidden="")
    res.append(new(soup, "p", "hb-results__meta", **{"aria-live": "polite"}))
    res.append(new(soup, "ol", "hb-results__list"))
    aside.append(res)

    nav = new(soup, "nav", "hb-side__nav", **{"aria-label": "Chapters"})
    nav.append(new(soup, "a", "hb-side__contents", href="#contents", text="Contents"))
    ol = new(soup, "ol", "hb-side__list")
    for sec, num, title, is_app, *_ in chapters:
        li = new(soup, "li", "hb-side__ch" + (" hb-side__ch--app" if is_app else ""))
        li["data-ch"] = sec["id"]
        a = new(soup, "a", "hb-side__link", href="#" + sec["id"])
        a.append(new(soup, "span", "hb-side__no", text=num))
        a.append(new(soup, "span", "hb-side__name", text=SHORT.get(num, title)))
        li.append(a)
        subs = sec.find("div", class_="hb-ch__body").find_all("h3")
        if subs:
            ul = new(soup, "ul", "hb-side__subs")
            for h in subs:
                sli = new(soup, "li")
                sli.append(new(soup, "a", href="#" + h["id"], text=text_of(h)))
                ul.append(sli)
            li.append(ul)
        ol.append(li)
    nav.append(ol)
    aside.append(nav)

    foot = new(soup, "div", "hb-side__foot")
    pdf = new(soup, "a", "hb-side__pdf", href=PDF.name, text="Download the PDF")
    # opens in a new tab: the Google Sites embed allows popups, not downloads
    pdf["target"] = "_blank"
    pdf["rel"] = "noopener nofollow"
    foot.append(pdf)
    foot.append(new(soup, "a", "hb-side__cal", href="academic-calendar.html", text="Academic calendar"))
    aside.append(foot)
    return aside


def bar(soup):
    """Narrow screens only: a slim bar that opens the sidebar as a drawer and
    names the chapter in view. Hidden until js/handbook.js runs."""
    div = new(soup, "div", "hb-bar")
    menu = new(soup, "button", "hb-bar__menu", type="button",
               **{"aria-controls": "hb-side", "aria-expanded": "false"})
    menu.append(icon(soup, "menu", "hb-ic"))
    menu.append(new(soup, "span", "hb-bar__label", text="Contents"))
    menu.append(new(soup, "span", "hb-bar__where"))
    div.append(menu)
    find = new(soup, "button", "hb-bar__search", type="button",
               **{"aria-controls": "hb-side", "aria-label": "Search the handbook"})
    find.append(icon(soup, "search", "hb-ic"))
    div.append(find)
    return div


# ------------------------------------------------------- the guide edition
#
# The same cleaned chapters, cut into one topic per view. The only copy written
# for it is navigation: the situation questions below, the labels, the A-Z
# index. Every question target is checked against the real headings, so a
# renamed heading in next year's Word file fails the build instead of leaving a
# dead link.

# Headings the Word file files one level too deep. The handbook's section on
# funding hides tuition and refunds under "Term of Eligibility"; here they are
# topics of their own so they can be found.
PROMOTE = {"tuition-and-fee-collection", "withdrawals-and-tuition-refunds"}

# External pages a question may point to (opens in a new tab like every other
# off-page link): label -> href.
CALENDAR = ("Academic calendar", "academic-calendar.html")

# (column title, [(question, [(chip label or None, target id), ...]), ...]).
# A question with one target is a link; with several, the question is text and
# each target is a chip. Targets are heading ids, or ch-N for a whole section.
SITUATIONS = [
    ("I’m thinking about applying", [
        ("What is a Junior Member?", [(None, "ch-1")]),
        ("Why study at ICS?", [(None, "ch-2")]),
        ("Which programs can I study?", [
            ("MA", "ma-in-philosophy"), ("PhD", "phd-in-philosophy"),
            ("MA-EL", "introduction-to-the-ma-phil-in-educational-leadership-ma-el-program-of-study"),
            ("MWS-ART", "master-of-worldview-studies-in-art-religion-and-theology-mws-art"),
            ("Certificates", "christian-educator-certificates")]),
        ("What do I need to apply, and by when?", [
            ("MA", "admission-to-the-ics-ma-philosophy"), ("PhD", "admission-to-the-ics-phd"),
            ("MA-EL", "admission-to-the-ics-ma-philosophy-in-educational-leadership-or-ma-el"),
            ("MWS-ART", "admission-to-the-ics-mws-art")]),
        ("Do I have to live in Toronto?", [(None, "modes-of-delivery")]),
        ("Is there funding?", [
            ("ICS awards", "internal-funding"), ("Outside funding", "external-funding"),
            ("How long it lasts", "term-of-eligibility")]),
        ("What does it cost, and how do I pay?", [
            ("Where fees are listed", "ch-3"), ("Paying", "tuition-and-fee-collection"),
            ("Refunds", "withdrawals-and-tuition-refunds")]),
        ("Who will guide my work?", [(None, "mentors-and-advisors")]),
        ("Can I take a course without a degree?", [
            ("Special Studies", "special-studies"), ("Lifelong learning", "lifelong-learning")]),
    ]),
    ("I’ve been admitted", [
        ("What happens at Orientation and Registration?", [(None, "orientation-and-registration")]),
        ("When do the terms run, and what is due when?", [
            ("Terms", "terms"), ("Deadlines", "a-list-of-deadlines"), ("Reading week", "reading-week")]),
        ("How do I get my ICS email?", [(None, "ics-email-accounts")]),
        ("Which courses do I take first?", [
            ("MA", "course-sequencing"), ("PhD", "sequencing"), ("MA-EL", "course-requirements"),
            ("MWS-ART", "course-sequencing-2")]),
        ("How do I add, drop or audit a course?", [
            ("Add or drop", "adding-or-dropping-a-course"),
            ("Audit or credit", "changing-between-audit-and-credit")]),
        ("How do I pay tuition?", [(None, "tuition-and-fee-collection")]),
        ("How do I work with my mentor?", [
            ("Working with a mentor", "how-to-work-with-your-mentor"),
            ("Mentorship policy", "mentorship-policy")]),
        ("How do I use the library?", [(None, "how-to-use-the-library")]),
        ("What is the retreat, and how else can I take part?", [
            ("Retreat", "retreat"), ("Community life", "ch-12")]),
    ]),
    ("I’m already studying", [
        ("When is my coursework and grade due?", [
            ("Coursework", "deadlines-for-submission-of-coursework-and-course-grades-including-annual-final"),
            ("All deadlines", "a-list-of-deadlines")]),
        ("How is my work graded?", [
            ("Grading scale", "grading-scale"), ("Expectations", "expectations")]),
        ("What if I cannot finish on time?", [(None, "effect-of-incomplete-work-and-extensions")]),
        ("How do I change my program, mentor or status?", [
            ("Program or status", "changing-program-or-status"), ("Mentor", "change-of-mentor")]),
        ("How do I take a leave of absence?", [(None, "leave-of-absence-and-readmission")]),
        ("How is my thesis or dissertation examined?", [
            ("MA thesis", "protocol-for-the-ma-thesis-examination"),
            ("PhD pre-dissertation exam", "protocol-for-the-doctoral-pre-dissertation-examination"),
            ("Dissertation", "dissertation")]),
        ("Where do I find help with writing, citing and publishing?", [
            ("Presenting and publishing", "presenting-and-publishing"), ("Style", "style"),
            ("Research ethics", "ethical-research-practices")]),
        ("How are my records kept?", [(None, "ch-9")]),
        ("What if something goes wrong?", [(None, "ch-13")]),
        ("Whom do I contact?", [(None, "ch-16")]),
    ]),
]

SUGGEST = ["deadlines", "tuition", "thesis", "library", "leave of absence", "mentor"]

# ---------------------------------------------------------------- editions
# The guide in three shorter editions, one per family of programs. An edition is
# the complete guide minus the topics that belong only to the other families:
# membership is by exclusion (a topic nobody lists below is in every edition, so a
# new heading in next year's Word file can never silently vanish), and a topic is
# never cut in the middle. The ids are topic ids from the guide; the build fails on
# one that no longer exists, and on a topic that would fall out of every edition.
EDITION_LABEL = "All programs"

_PHILOSOPHY = {
    "admission-to-the-ics-ma-philosophy", "admission-to-the-ics-phd",
    "introduction-to-the-ma-philosophy-and-phd-philosophy-programs-of-study",
    "ma-in-philosophy", "phd-in-philosophy",
    "protocol-for-the-ma-thesis-examination",
    "protocol-for-the-doctoral-pre-dissertation-examination",
    "appendix-a", "appendix-b",
}
_MWS = {
    "admission-to-the-ics-mws-art",
    "master-of-worldview-studies-in-art-religion-and-theology-mws-art",
    "art-in-orvieto",
}
_EDUCATION = {
    "admission-to-the-ics-ma-philosophy-in-educational-leadership-or-ma-el",
    "introduction-to-the-ma-phil-in-educational-leadership-ma-el-program-of-study",
    "christian-educator-certificates",
    "master-of-worldview-studies-in-education-mws-e",
}
# Continuing education (and so the CSTC) and lifelong learning serve the MWS and
# education readers alike; Special Studies, the way in for anyone, is in all three.
_CONTINUING = {"admission-to-the-all-online-ics-mws", "lifelong-learning"}

_MA_EL = "introduction-to-the-ma-phil-in-educational-leadership-ma-el-program-of-study"
_MWS_ART = "master-of-worldview-studies-in-art-religion-and-theology-mws-art"
_COURSEWORK_DUE = "deadlines-for-submission-of-coursework-and-course-grades-including-annual-final"

# Questions every edition asks in the same words, to the same topics.
_Q_FUNDING = ("Is there funding?", [
    ("ICS awards", "internal-funding"), ("Outside funding", "external-funding")])
_Q_FUNDING_LONG = ("Is there funding?", _Q_FUNDING[1] + [("How long it lasts", "term-of-eligibility")])
_Q_COST = ("What does it cost, and how do I pay?", [
    ("Where fees are listed", "ch-3"), ("Paying", "tuition-and-fee-collection"),
    ("Refunds", "withdrawals-and-tuition-refunds")])
_Q_TERMS = ("When do the terms run, and what is due when?", [
    ("Terms", "terms"), ("Deadlines", "a-list-of-deadlines"), ("Reading week", "reading-week")])
_Q_MENTOR = ("How do I work with my mentor?", [
    ("Working with a mentor", "how-to-work-with-your-mentor"),
    ("Mentorship policy", "mentorship-policy")])
_Q_DUE = ("When is my coursework and grade due?", [
    ("Coursework", _COURSEWORK_DUE), ("All deadlines", "a-list-of-deadlines")])
_Q_GRADED = ("How is my work graded?", [
    ("Grading scale", "grading-scale"), ("Expectations", "expectations")])
_Q_LATE = ("What if I can’t finish on time?", [(None, "effect-of-incomplete-work-and-extensions")])
_Q_CHANGE = ("How do I change my program, mentor or status?", [
    ("Program or status", "changing-program-or-status"), ("Mentor", "change-of-mentor")])
_Q_LEAVE = ("How do I take a leave of absence?", [(None, "leave-of-absence-and-readmission")])
_Q_WRONG = ("What if something goes wrong?", [(None, "ch-13")])
_Q_CONTACT = ("Whom do I contact?", [(None, "ch-16")])
_Q_EMAIL = ("How do I get my ICS email?", [(None, "ics-email-accounts")])
_Q_PAY = ("How do I pay tuition?", [(None, "tuition-and-fee-collection")])
_Q_LIBRARY = ("How do I use the library?", [(None, "how-to-use-the-library")])
_Q_ADD = ("How do I add, drop or audit a course?", [
    ("Add or drop", "adding-or-dropping-a-course"),
    ("Audit or credit", "changing-between-audit-and-credit")])

# key, file, labels, hero copy, topics left out, the search words offered on the
# front door, and the front door's own questions (same shape as SITUATIONS; a target
# written "@edition#id" opens that topic in another edition).
TRACKS = [
    {
        "key": "philosophy",
        "file": "junior-member-handbook-guide-philosophy.html",
        "label": "MA & PhD in Philosophy",
        "short": "Philosophy",
        "kicker": "Guide for MA and PhD students in Philosophy",
        "sub": "Find the rule, the date or the person you need.",
        "description": ("The 2026–2027 Junior Member Handbook of the Institute for Christian Studies "
                        "for the MA and PhD in Philosophy: admission, coursework, the thesis and the "
                        "dissertation, funding, and the joint PhD with the Vrije Universiteit Amsterdam."),
        "drop": _MWS | _EDUCATION | _CONTINUING,
        "suggest": ["deadlines", "tuition", "thesis", "dissertation", "library", "mentor"],
        "situations": [
            ("I’m thinking about applying", [
                ("What are the MA and the PhD like?", [
                    ("MA", "ma-in-philosophy"), ("PhD", "phd-in-philosophy"),
                    ("Fields of study", "fields-of-study")]),
                ("What do I need to apply, and by when?", [
                    ("MA", "admission-to-the-ics-ma-philosophy"), ("PhD", "admission-to-the-ics-phd"),
                    ("Deadlines", "a-list-of-deadlines")]),
                ("Is there a joint PhD with the Vrije Universiteit Amsterdam?", [
                    ("The PhD", "phd-in-philosophy"), ("Framework agreement", "appendix-a"),
                    ("Individual agreements", "appendix-b")]),
                ("Do I have to live in Toronto?", [(None, "modes-of-delivery")]),
                ("Who will guide my work?", [(None, "mentors-and-advisors")]),
                _Q_FUNDING_LONG, _Q_COST,
                ("Can I take a course before I apply?", [(None, "special-studies")]),
            ]),
            ("I’ve been admitted", [
                ("What happens at Orientation and Registration?", [(None, "orientation-and-registration")]),
                ("Which courses do I take first?", [
                    ("MA", "course-sequencing"), ("PhD", "sequencing"),
                    ("MA course planning", "program-selection-and-course-planning")]),
                ("What are the language requirements?", [
                    ("MA", "language-requirement"), ("PhD", "doctoral-language-requirements")]),
                _Q_TERMS, _Q_EMAIL, _Q_PAY, _Q_MENTOR, _Q_LIBRARY,
                ("What is the retreat, and how else can I take part?", [
                    ("Retreat", "retreat"), ("Community life", "ch-12")]),
            ]),
            ("I’m already studying", [
                _Q_DUE, _Q_GRADED, _Q_LATE,
                ("How does the MA thesis work?", [
                    ("Thesis", "thesis"), ("Examination", "protocol-for-the-ma-thesis-examination"),
                    ("Guided readings", "guided-reading-policy")]),
                ("How do I get from coursework to the dissertation?", [
                    ("Pre-dissertation exam", "doctoral-pre-dissertation-examination"),
                    ("Exam protocol", "protocol-for-the-doctoral-pre-dissertation-examination"),
                    ("Dissertation stage", "admission-to-dissertation-stage-of-the-program"),
                    ("Dissertation", "dissertation")]),
                _Q_CHANGE, _Q_LEAVE,
                ("Where do I find help with writing, citing and publishing?", [
                    ("Presenting and publishing", "presenting-and-publishing"), ("Style", "style"),
                    ("Research ethics", "ethical-research-practices")]),
                _Q_WRONG, _Q_CONTACT,
            ]),
        ],
    },
    {
        "key": "mws",
        "file": "junior-member-handbook-guide-mws-lifelong.html",
        "label": "MWS & lifelong learning",
        "short": "MWS & lifelong learning",
        "kicker": "Guide for the MWS-ART and lifelong learning",
        "sub": ("Find the rule, the date or the person you need, whether you’re working toward the "
                "MWS-ART or taking courses through Special Studies, continuing education, or "
                "Free to be Faithful."),
        "description": ("The 2026–2027 Junior Member Handbook of the Institute for Christian Studies "
                        "for the MWS-ART, Special Studies, and lifelong learning, including continuing "
                        "education and Free to be Faithful."),
        "drop": _PHILOSOPHY | _EDUCATION,
        "suggest": ["Orvieto", "audit", "Free to be Faithful", "Special Studies", "tuition", "deadlines"],
        "situations": [
            ("I’m thinking about the MWS-ART", [
                ("What is the MWS-ART?", [(None, _MWS_ART)]),
                ("What do I need to apply, and by when?", [
                    ("Admission", "admission-to-the-ics-mws-art"), ("Deadlines", "a-list-of-deadlines")]),
                ("What happens in Orvieto?", [
                    ("The residency", "art-in-orvieto"), ("In the program", "program-description-4")]),
                ("Which courses will I take?", [
                    ("Program description", "program-description-4"),
                    ("Course sequencing", "course-sequencing-2")]),
                ("Is there an all-online MWS?", [(None, "admission-to-the-all-online-ics-mws")]),
                ("Can I take courses at other schools?", [(None, "ch-11")]),
                _Q_FUNDING, _Q_COST,
            ]),
            ("I’d like to take a course", [
                ("Can I take ICS courses without a degree?", [
                    ("Special Studies", "special-studies"), ("Lifelong learning", "lifelong-learning")]),
                ("What is Free to be Faithful?", [(None, "lifelong-learning")]),
                ("Can I audit a course?", [
                    ("Lifelong learning", "lifelong-learning"), ("Special Studies", "special-studies"),
                    ("Art in Orvieto", "art-in-orvieto"),
                    ("Audit or credit", "changing-between-audit-and-credit")]),
                ("How do I enrol, and by when?", [
                    ("Special Studies", "special-studies"), ("Deadlines", "a-list-of-deadlines")]),
                ("What about continuing education for teachers?", [
                    ("Continuing education and the CSTC", "admission-to-the-all-online-ics-mws"),
                    ("Certificates (Education guide)", "@education#christian-educator-certificates")]),
                ("Can I move from Special Studies into a program?", [(None, "special-studies")]),
                _Q_COST,
                ("When do courses run?", [("Terms", "terms"), ("Reading week", "reading-week")]),
            ]),
            ("I’m already enrolled", [
                _Q_DUE, _Q_GRADED, _Q_ADD, _Q_LATE,
                ("What are the Action Project and the final paper?", [(None, "program-description-4")]),
                _Q_CHANGE, _Q_LIBRARY, _Q_LEAVE, _Q_WRONG, _Q_CONTACT,
            ]),
        ],
    },
    {
        "key": "education",
        "file": "junior-member-handbook-guide-education.html",
        "label": "Education programs",
        "short": "Education",
        "kicker": "Guide for the education programs",
        "sub": ("Find the rule, the date or the person you need for the MA-EL, the MWS in Education, "
                "the Christian Educator Certificates, or CSTC courses."),
        "description": ("The 2026–2027 Junior Member Handbook of the Institute for Christian Studies "
                        "for the education programs: the MA-EL, the MWS in Education, the Christian "
                        "Educator Certificates, and continuing education toward the CSTC."),
        "drop": _PHILOSOPHY | _MWS,
        "suggest": ["CSTC", "certificate", "Project and Praxis", "tuition", "deadlines", "mentor"],
        "situations": [
            ("I’m thinking about a program", [
                ("Which education programs does ICS offer?", [
                    ("MA-EL", _MA_EL), ("MWS-E", "master-of-worldview-studies-in-education-mws-e"),
                    ("Certificates", "christian-educator-certificates")]),
                ("What do I need to apply, and by when?", [
                    ("MA-EL", "admission-to-the-ics-ma-philosophy-in-educational-leadership-or-ma-el"),
                    ("Deadlines", "a-list-of-deadlines")]),
                ("Can I start with a certificate and move on to the MA-EL?", [
                    ("Certificates", "christian-educator-certificates"),
                    ("MA-EL admission", "admission-to-the-ics-ma-philosophy-in-educational-leadership-or-ma-el")]),
                ("What about the Christian School Teacher Certificate (CSTC)?", [
                    (None, "admission-to-the-all-online-ics-mws")]),
                ("How do the courses work online?", [
                    ("MA-EL formats", "course-formats"),
                    ("MWS-E", "master-of-worldview-studies-in-education-mws-e")]),
                ("Can I take a course without a degree?", [
                    ("Special Studies", "special-studies"), ("Lifelong learning", "lifelong-learning")]),
                _Q_FUNDING, _Q_COST,
                ("Who will guide my work?", [
                    ("MA-EL mentoring", "mentoring"), ("Mentorship policy", "mentorship-policy")]),
            ]),
            ("I’ve been admitted", [
                ("Which courses do I take first?", [
                    ("MA-EL", "course-requirements"), ("MWS-E", "program-structure"),
                    ("Administration certificate", "certificate-in-school-administration"),
                    ("Instructional Leadership certificate", "certificate-in-instructional-leadership")]),
                ("What are the Program Tracker and the Program Completion Plan?", [
                    (None, "program-tracker-and-program-completion-plan")]),
                ("When do the terms run, and what is due when?", [
                    ("Terms", "terms"), ("Deadlines", "a-list-of-deadlines"),
                    ("MA-EL calendar", "academic-calendar")]),
                _Q_EMAIL, _Q_PAY, _Q_ADD, _Q_MENTOR, _Q_LIBRARY,
                ("How else can I take part?", [("Retreat", "retreat"), ("Community life", "ch-12")]),
            ]),
            ("I’m already studying", [
                ("What are the Project and Praxis?", [(None, "the-project-and-praxis")]),
                ("What is the Celebration of Learning?", [(None, "celebration-of-learning")]),
                ("How is my work graded?", [
                    ("MA-EL grading", "grading"), ("Grading scale", "grading-scale"),
                    ("Expectations", "expectations")]),
                _Q_DUE, _Q_LATE, _Q_CHANGE, _Q_LEAVE, _Q_WRONG, _Q_CONTACT,
            ]),
        ],
    },
]

ICONS = {
    "search": '<circle cx="9" cy="9" r="5.6"/><path d="M13.2 13.2 17 17"/>',
    "arrow": '<path d="M4 10h11M11 5.5 15.5 10 11 14.5"/>',
    "chevron": '<path d="m5.5 8 4.5 4.5L14.5 8"/>',
    "menu": '<path d="M3.5 6h13M3.5 10h13M3.5 14h13"/>',
    "close": '<path d="m5 5 10 10M15 5 5 15"/>',
}


def icon(soup, name, cls="gd-ic"):
    svg = BeautifulSoup(
        f'<svg class="{cls}" viewBox="0 0 20 20" width="20" height="20" fill="none" '
        f'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" '
        f'stroke-linejoin="round" aria-hidden="true" focusable="false">{ICONS[name]}</svg>',
        "html.parser")
    return svg.svg


def _is_unit_start(n):
    if not isinstance(n, Tag):
        return False
    if n.name == "h3":
        return True
    if n.name == "div" and "hb-forms" in (n.get("class") or []):
        first = next((c for c in n.children if isinstance(c, Tag)), None)
        return first is not None and first.name == "h3"
    return False


def _unit_heading(n):
    return n if n.name == "h3" else next(c for c in n.children if isinstance(c, Tag))


def _chapter_title(sec):
    h2 = copy.copy(sec.find("h2"))
    for x in h2.find_all(["span", "a"]):
        x.decompose()
    return text_of(h2)


def _split_chapters(soup, chapters):
    """Cut every chapter into topic units. Returns one dict per chapter."""
    out = []
    for sec, num, title, is_app, *_ in chapters:
        ch_id = sec["id"]
        margin = sec.find("div", class_="hb-ch__margin")
        if margin:
            margin.decompose()
        body = sec.find("div", class_="hb-ch__body")
        head = body.find("header", class_="hb-ch__head", recursive=False)
        ch_title = _chapter_title(sec)
        notes = {}
        box = body.find("aside", class_="hb-notes", recursive=False)
        if box is not None:
            notes = {li["id"]: li for li in box.find_all("li", id=True)}
            box.extract()
        kids = [c for c in list(body.children) if c is not head]
        for c in kids:
            c.extract()
        groups, intro, cur = [], [], None
        for n in kids:
            if _is_unit_start(n):
                cur = [n]
                groups.append(cur)
            elif cur is None:
                intro.append(n)
            else:
                cur.append(n)
        real_intro = [n for n in intro if isinstance(n, Tag) or str(n).strip()]
        specs = []
        if real_intro or not groups:
            specs.append({"id": ch_id, "title": ch_title, "nodes": ([head] if head else []) + intro,
                          "head": head.find("h2") if head else None, "chapter": True})
        else:
            if head:
                head.decompose()
        for g in groups:
            h = _unit_heading(g[0])
            specs.append({"id": h["id"], "title": text_of(h), "nodes": g, "head": h, "chapter": False})
        label = f"Appendix {num}" if is_app else f"Section {num}"
        out.append({"sec": sec, "body": body, "num": num, "is_app": is_app, "label": label,
                    "short": SHORT.get(num, ch_title), "title": ch_title, "id": ch_id,
                    "specs": specs, "notes": notes})
    return out


def _make_units(soup, chs, crumb_root="Handbook"):
    flat = []
    for ch in chs:
        for spec in ch["specs"]:
            flat.append((ch, spec))
    for i, (ch, spec) in enumerate(flat):
        u = new(soup, "div", "gd-unit", id="u-" + spec["id"])
        u["data-ch"] = ch["id"]
        u["data-title"] = spec["title"]
        first_id = ch["specs"][0]["id"]
        crumb = new(soup, "nav", "gd-crumb", **{"aria-label": "Where you are"})
        crumb.append(new(soup, "a", href="#start", text=crumb_root))
        crumb.append(new(soup, "span", "gd-crumb__sep", text="/", **{"aria-hidden": "true"}))
        a = new(soup, "a", href="#" + (ch["id"] if ch["specs"][0]["chapter"] else first_id))
        a.append(new(soup, "span", "gd-crumb__no", text=ch["label"]))
        a.append(NavigableString(" · " + ch["short"]))
        crumb.append(a)
        u.append(crumb)

        cols = new(soup, "div", "gd-cols")
        prose = new(soup, "div", "gd-prose")
        for n in spec["nodes"]:
            prose.append(n)
        cols.append(prose)
        # the title stands above both columns (a printable form keeps its own inside the sheet)
        h = spec["head"]
        tn = None
        if spec["chapter"] and isinstance(spec["nodes"][0], Tag) and spec["nodes"][0].name == "header":
            tn = spec["nodes"][0]
        elif h is not None and h.parent is prose:
            tn = h
        if tn is not None:
            u.append(tn.extract())
        # the unit's own heading is its title
        if h is not None:
            h["class"] = (h.get("class") or []) + ["gd-title"]
            h["aria-level"] = "1"
            h["tabindex"] = "-1"
        for h4 in prose.find_all("h4"):
            h4["aria-level"] = "2"
        for h5 in prose.find_all("h5"):
            h5["aria-level"] = "3"
        # a short list of the sub-headings when there are enough to need one
        subs = [x for x in prose.find_all("h4") if x.get("id") and "label" not in (x.get("class") or [])
                and not x.find_parent("aside")]
        if len(subs) >= 3:
            toc = new(soup, "nav", "gd-toc", **{"aria-label": "In this topic"})
            toc.append(new(soup, "p", "gd-toc__t", text="In this topic"))
            ol = new(soup, "ol")
            for x in subs:
                li = new(soup, "li")
                li.append(new(soup, "a", href="#" + x["id"], text=text_of(x)))
                ol.append(li)
            toc.append(ol)
            cols.append(toc)
        # notes the topic cites travel with it
        # (a note cited in the topic's own title counts too: the title sits above the prose)
        refs = (tn.find_all("a", class_="fnref") if tn is not None else []) + prose.find_all("a", class_="fnref")
        if refs:
            box = new(soup, "aside", "hb-notes", **{"aria-label": "Notes"})
            box.append(new(soup, "p", "hb-notes__title", text="Notes"))
            ol = new(soup, "ol")
            for ref in refs:
                li = ch["notes"].get(ref["href"][1:])
                if li is not None:
                    ol.append(li)
            box.append(ol)
            prose.append(box)
        u.append(cols)

        # previous / next across the whole book
        pager = new(soup, "nav", "gd-pager", **{"aria-label": "Previous and next topic"})
        for rel, j in (("prev", i - 1), ("next", i + 1)):
            if 0 <= j < len(flat):
                och, ospec = flat[j]
                href = "#" + (och["id"] if ospec["chapter"] else ospec["id"])
                link = new(soup, "a", "gd-pager__" + rel, href=href, rel=rel)
                where = "Previous" if rel == "prev" else "Next"
                if och is not ch:
                    where += " · " + och["label"]
                link.append(new(soup, "span", "gd-pager__dir", text=where))
                link.append(new(soup, "span", "gd-pager__t", text=ospec["title"]))
                pager.append(link)
        u.append(pager)
        ch["body"].append(u)
        spec["unit"] = u
    return flat


def _tree(soup, chs):
    nav = new(soup, "nav", "gd-tree", **{"aria-label": "Handbook contents"})
    top = new(soup, "div", "gd-tree__top")
    top.append(new(soup, "a", "gd-tree__start", href="#start", text="Start here"))
    top.append(new(soup, "a", href="#index", text="A–Z index"))
    nav.append(top)
    ol = new(soup, "ol", "gd-chs")
    for ch in chs:
        li = new(soup, "li", "gd-ch" + (" gd-ch--app" if ch["is_app"] else ""))
        li["data-ch"] = ch["id"]
        row = new(soup, "div", "gd-ch__row")
        first = ch["specs"][0]
        a = new(soup, "a", "gd-ch__a", href="#" + (ch["id"] if first["chapter"] else first["id"]))
        a.append(new(soup, "span", "gd-ch__no", text=ch["num"], **{"aria-hidden": "true"}))
        a.append(new(soup, "span", "gd-ch__t", text=ch["short"]))
        a["title"] = f"{ch['label']}. {ch['title']}"
        row.append(a)
        subs = [sp for sp in ch["specs"] if not sp["chapter"]]
        if subs:
            btn = new(soup, "button", "gd-ch__tog", type="button",
                      **{"aria-expanded": "true", "aria-label": f"Topics in {ch['label']}"})
            btn.append(icon(soup, "chevron"))
            row.append(btn)
        li.append(row)
        if subs:
            ul = new(soup, "ul", "gd-subs")
            for sp in subs:
                sli = new(soup, "li")
                sli.append(new(soup, "a", href="#" + sp["id"], text=sp["title"]))
                ul.append(sli)
            li.append(ul)
        ol.append(li)
    nav.append(ol)
    return nav


def _target_href(t, q, ids):
    """A question target is a heading id on this page, or "@edition#id" for a topic
    that another edition keeps (checked against the complete guide and that edition's
    own list of left-out topics)."""
    if t.startswith("@"):
        key, _, frag = t[1:].partition("#")
        other = next((x for x in TRACKS if x["key"] == key), None)
        if other is None or frag not in FULL["ids"] or frag in other["drop"]:
            raise SystemExit(f"guide: question target not in that edition: {t!r} ({q})")
        return other["file"] + "#" + frag
    if t not in ids:
        raise SystemExit(f"guide: question target not found in the handbook: {t!r} ({q})")
    return "#" + t


def _situations(soup, ids, situations=None):
    wrap = new(soup, "div", "gd-situ")
    for title, qs in (situations or SITUATIONS):
        col = new(soup, "section", "gd-situ__col")
        col.append(new(soup, "h2", "gd-situ__h", text=title))
        ul = new(soup, "ul", "gd-q")
        for q, targets in qs:
            hrefs = [_target_href(t, q, ids) for _, t in targets]
            li = new(soup, "li", "gd-q__row")
            if len(targets) == 1:
                a = new(soup, "a", "gd-q__link", href=hrefs[0])
                a.append(new(soup, "span", text=q))
                a.append(icon(soup, "arrow"))
                li.append(a)
            else:
                li.append(new(soup, "p", "gd-q__ask", text=q))
                chips = new(soup, "p", "gd-chips")
                for (label, _), href in zip(targets, hrefs):
                    chips.append(new(soup, "a", "gd-chip", href=href, text=label))
                li.append(chips)
            ul.append(li)
        col.append(ul)
        wrap.append(col)
    return wrap


def _browse(soup, chs):
    ol = new(soup, "ol", "hb-toc gd-browse")
    for ch in chs:
        li = new(soup, "li", "hb-toc__ch" + (" hb-toc__ch--app" if ch["is_app"] else ""))
        li.append(new(soup, "span", "hb-toc__no", text=ch["num"]))
        main = new(soup, "div", "hb-toc__main")
        first = ch["specs"][0]
        main.append(new(soup, "a", "hb-toc__link", href="#" + (ch["id"] if first["chapter"] else first["id"]),
                        text=ch["title"]))
        subs = [sp for sp in ch["specs"] if not sp["chapter"]]
        if subs:
            ul = new(soup, "ul", "hb-toc__subs")
            for sp in subs:
                sli = new(soup, "li")
                sli.append(new(soup, "a", href="#" + sp["id"], text=sp["title"]))
                ul.append(sli)
            main.append(ul)
        li.append(main)
        ol.append(li)
    return ol


def _az(soup, chs, scope="the handbook"):
    """Every heading in the handbook, alphabetically, with where it sits."""
    entries = []
    for ch in chs:
        for sp in ch["specs"]:
            ctx = f"{ch['label']} · {ch['short']}"
            if not sp["chapter"] or not any(not s["chapter"] for s in ch["specs"]):
                entries.append((sp["title"], sp["id"], ctx))
            for h4 in sp["unit"].find_all("h4"):
                if h4.get("id") and "label" not in (h4.get("class") or []) and not h4.find_parent("aside") \
                        and not h4.find_parent("article"):
                    entries.append((text_of(h4), h4["id"], sp["title"]))
    def key(e):
        t = re.sub(r"^(the|a|an)\s+", "", e[0].lower())
        return re.sub(r"[^a-z0-9 ]+", "", t)
    entries.sort(key=key)
    seen, groups = set(), {}
    for t, i, c in entries:
        if i in seen:
            continue
        seen.add(i)
        k = key((t, i, c))[:1].upper() or "#"
        groups.setdefault(k if k.isalpha() else "#", []).append((t, i, c))
    view = new(soup, "section", "gd-view gd-view--index", id="index")
    inner = new(soup, "div", "gd-view__in")
    inner.append(new(soup, "h1", "gd-view__title gd-title", text="A–Z index", tabindex="-1"))
    inner.append(new(soup, "p", "gd-lead",
                     text=f"Every heading in {scope}, in alphabetical order, with the section it sits in."))
    jump = new(soup, "nav", "gd-az", **{"aria-label": "Jump to a letter"})
    for k in sorted(groups):
        jump.append(new(soup, "a", href="#az-" + k.lower(), text=k))
    inner.append(jump)
    for k in sorted(groups):
        sec = new(soup, "section", "gd-az__g", id="az-" + k.lower())
        sec.append(new(soup, "h2", "gd-az__l", text=k))
        ul = new(soup, "ul", "gd-az__list")
        for t, i, c in groups[k]:
            li = new(soup, "li")
            li.append(new(soup, "a", href="#" + i, text=t))
            li.append(new(soup, "span", "gd-az__ctx", text=c))
            ul.append(li)
        sec.append(ul)
        inner.append(sec)
    view.append(inner)
    return view


# What the complete guide holds, filled in by its build and read by the editions'
# builds: every id on the page, and every topic as (section, id, title).
FULL = {"ids": set(), "units": []}


def _edition_links(soup, track):
    """Links to the other guides: the other editions, and the complete guide (all
    programs). Returns (label, href, current) rows in a fixed order."""
    rows = [(x["label"], x["file"], x is track) for x in TRACKS]
    rows.append((EDITION_LABEL, GUIDE.name, track is None))
    return rows


def _keep_links_working(root, track):
    """A link inside a kept topic may point at a topic this edition leaves out
    (a Section 5 cross-reference, an appendix). Those go to the same place in the
    complete guide. Anything else without a target is a mistake in the build."""
    have = {t["id"] for t in root.find_all(id=True)}
    bad = set()
    for a in root.find_all("a", href=True):
        h = a["href"]
        if not h.startswith("#") or len(h) == 1 or h[1:] in have or h.startswith("#q="):
            continue
        if track is not None and h[1:] in FULL["ids"]:
            a["href"] = GUIDE.name + h
            a["title"] = "Opens in the complete guide"
        else:
            bad.add(h)
    if bad:
        msg = f"guide: links with no target on the page: {sorted(bad)}"
        if track is not None:
            raise SystemExit(msg)
        print("warning: " + msg)


def guide_block(soup, chapters, track=None):
    for hid in PROMOTE:
        h = soup.find(id=hid)
        if h is not None and h.name == "h4":
            h.name = "h3"
            cls = [c for c in (h.get("class") or []) if c != "label"]
            if cls:
                h["class"] = cls
            else:
                del h["class"]
    for a in soup.find_all("a", href="#contents"):
        a["href"] = "#start"
    chs = _split_chapters(soup, chapters)
    if track is None:
        FULL["units"] = [(ch["num"], sp["id"], sp["title"]) for ch in chs for sp in ch["specs"]]
    else:
        # leave out what belongs to the other families of programs
        drop = track["drop"]
        known = {sp["id"] for ch in chs for sp in ch["specs"]}
        if drop - known:
            raise SystemExit(f"guide: {track['key']} edition leaves out topics that no longer exist: "
                             f"{sorted(drop - known)}")
        for ch in chs:
            ch["specs"] = [sp for sp in ch["specs"] if sp["id"] not in drop]
        chs = [ch for ch in chs if ch["specs"]]
    flat = _make_units(soup, chs, crumb_root=track["short"] if track else "Handbook")
    ids = {t["id"] for t in soup.find_all(id=True)} | {c["id"] for c in chs}
    if track is None:
        FULL["ids"] = ids

    root = soup.new_tag("div")
    body = new(soup, "div", "gd-body")

    side = new(soup, "aside", "gd-side", id="gd-side", **{"aria-label": "Contents"})
    side.append(_tree(soup, chs))
    foot = new(soup, "div", "gd-side__foot")
    foot.append(new(soup, "p", "gd-side__lab", text="Guides by program"))
    for label, href, here in _edition_links(soup, track):
        a = new(soup, "a", href=href, text=label)
        if here:
            a["aria-current"] = "page"
        foot.append(a)
    foot.append(new(soup, "p", "gd-side__lab", text="More"))
    for label, href in (("Single-page edition", "junior-member-handbook.html"),
                        ("Download the PDF", PDF.name), (CALENDAR[0], CALENDAR[1])):
        a = new(soup, "a", href=href, text=label)
        if href == PDF.name:
            a["target"] = "_blank"
            a["rel"] = "noopener nofollow"
        foot.append(a)
    side.append(foot)
    body.append(side)
    body.append(new(soup, "div", "gd-scrim", hidden=""))

    main = new(soup, "main", "gd-main", id="gd-main", tabindex="-1")

    # the front door
    start = new(soup, "section", "gd-view gd-view--start", id="start")
    hero = new(soup, "div", "gd-hero")
    hin = new(soup, "div", "gd-hero__in")
    if track:
        hin.append(new(soup, "p", "gd-hero__kicker", text=track["kicker"]))
    hin.append(new(soup, "h1", "gd-hero__title gd-title", text="Junior Member Handbook", tabindex="-1"))
    hin.append(new(soup, "p", "gd-hero__year", text="2026–2027"))
    hin.append(new(soup, "p", "gd-hero__sub", text=track["sub"] if track else
                   "Find the rule, the date or the person you need."))
    form = new(soup, "form", "gd-bigsearch", role="search", action="#")
    form.append(new(soup, "label", "gd-sr", text="Search the handbook", **{"for": "gd-q2"}))
    row = new(soup, "div", "gd-bigsearch__row")
    inp = new(soup, "input", id="gd-q2", type="search", autocomplete="off",
              placeholder="Search the handbook",
              **{"data-search": ""})
    inp["name"] = "q"
    row.append(inp)
    btn = new(soup, "button", "gd-bigsearch__go", type="submit", **{"aria-label": "Search"})
    btn.append(icon(soup, "search"))
    row.append(btn)
    form.append(row)
    hin.append(form)
    sug = new(soup, "p", "gd-suggest")
    sug.append(new(soup, "span", text="Often looked up:"))
    for w in (track["suggest"] if track else SUGGEST):
        sug.append(new(soup, "a", href="#q=" + w.replace(" ", "+"), text=w))
    hin.append(sug)
    # the way to the other guides, in the hero so a reader on the wrong one can leave
    eds = new(soup, "p", "gd-editions")
    eds.append(new(soup, "span", text="Not your program?" if track else "Prefer a shorter guide?"))
    for label, href, here in _edition_links(soup, track):
        if not here:
            eds.append(new(soup, "a", href=href, text=label))
    hin.append(eds)
    hero.append(hin)
    start.append(hero)
    sin = new(soup, "div", "gd-view__in")
    sin.append(new(soup, "h2", "gd-sec", text="Start with your situation"))
    sin.append(_situations(soup, ids, track["situations"] if track else None))
    sin.append(new(soup, "h2", "gd-sec", text="Or browse every section"))
    sin.append(_browse(soup, chs))
    start.append(sin)
    main.append(start)

    main.append(_az(soup, chs, "this guide" if track else "the handbook"))

    res = new(soup, "section", "gd-view gd-view--results", id="results")
    rin = new(soup, "div", "gd-view__in")
    rin.append(new(soup, "h1", "gd-view__title gd-title", id="results-title", tabindex="-1", text="Search results"))
    rin.append(new(soup, "p", "gd-lead", id="results-meta", **{"aria-live": "polite"}))
    if track:
        # under the count, not after the list: it matters most when the list is short
        more = new(soup, "p", "gd-lead gd-results-full", id="results-full", hidden="")
        more.append(NavigableString("This guide leaves out topics that belong to other programs. "))
        more.append(new(soup, "a", href=GUIDE.name, text="Search every program"))
        more.append(NavigableString("."))
        rin.append(more)
    rin.append(new(soup, "ol", "gd-results", id="results-list"))
    res.append(rin)
    main.append(res)

    chwrap = new(soup, "div", "gd-chapters")
    for ch in chs:
        chwrap.append(ch["sec"].extract())
    main.append(chwrap)
    body.append(main)
    root.append(body)
    _keep_links_working(root, track)
    html = "".join(str(c) for c in root.contents)
    html = html.replace("</section>", "</section>\n").replace("<section", "\n<section")
    return html


def _sub1(pattern, repl, text):
    out, n = re.subn(pattern, lambda m: repl, text, count=1)
    if n != 1:
        raise SystemExit(f"guide: edition page shell: nothing matched {pattern!r}")
    return out


def track_shell(track):
    """The <head> and top bar of an edition: the complete guide's, retitled."""
    text = GUIDE.read_text()
    a, b = text.index(START), text.index(END)
    pre, post = text[: a + len(START)], text[b:]
    esc = lambda x: htmllib.escape(x, quote=True)
    title = f"Junior Member Handbook 2026–2027, {track['label']} — Institute for Christian Studies"
    canonical = "https://www.icscanada.edu/academics/" + track["file"][:-5]
    blurb = (f"{track['kicker']}. Start from your situation, search every topic, "
             "or browse by section.")
    pre = _sub1(r"<title>.*?</title>", f"<title>{esc(title)}</title>", pre)
    pre = _sub1(r'<meta name="description" content="[^"]*">',
                f'<meta name="description" content="{esc(track["description"])}">', pre)
    pre = _sub1(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{canonical}">', pre)
    pre = _sub1(r'<meta property="og:title" content="[^"]*">',
                f'<meta property="og:title" content="{esc(title)}">', pre)
    pre = _sub1(r'<meta property="og:description" content="[^"]*">',
                f'<meta property="og:description" content="{esc(blurb)}">', pre)
    pre = _sub1(r'<meta property="og:url" content="[^"]*">',
                f'<meta property="og:url" content="{canonical}">', pre)
    pre = _sub1(r'<span class="gd-brand__y">[^<]*</span>',
                f'<span class="gd-brand__y">{esc(track["short"])}</span>', pre)
    pre = _sub1(r'<body class="gd">',
                f'<body class="gd" data-full="{GUIDE.name}" '
                f'data-base="{esc("Junior Member Handbook 2026–2027 · " + track["short"])}">', pre)
    return pre, post


def write_track(track, html):
    pre, post = track_shell(track)
    stamp = ("\n<!-- Generated by scripts/build-handbook.py from the Registrar's Word file."
             " Edit the Word file and re-run; changes here are overwritten. -->\n")
    (ROOT / "academics" / track["file"]).write_text(pre + stamp + html + "\n" + post)


def build(docx, guide=False, track=None):
    soup = BeautifulSoup(pandoc(docx), "html.parser")
    if soup.body is None:
        soup = BeautifulSoup(f"<html><body>{soup}</body></html>", "html.parser")
    clean(soup)
    fix_headings(soup)
    bold_runs_to_lists(soup)
    run_in_heads(soup)
    chapters = wrap_chapters(soup)
    for c in chapters:
        build_chapter(soup, *c)
    ledgerize_tables(soup)
    deadline_rows(soup)
    for sec, num, *_ in chapters:
        if num == "15":
            lexicon(soup, sec)
        if num == "16":
            contacts(soup, sec)
    mark_forms(soup)
    signoffs(soup)
    people(soup)
    fix_links(soup)
    for sec, num, *_ in chapters:
        if num.isdigit():
            join_split_paragraphs(sec)
    move_footnotes(soup, chapters)

    if guide:
        return guide_block(soup, chapters, track), chapters

    out = soup.new_tag("div")
    out.append(bar(soup))
    layout = new(soup, "div", "hb-layout")
    layout.append(side(soup, chapters))
    body = new(soup, "div", "hb-main")
    body.append(contents(soup, chapters))
    main = new(soup, "div", "container hb-chapters")
    for sec, *_ in chapters:
        main.append(sec.extract())
    body.append(main)
    layout.append(body)
    out.append(layout)
    html = "".join(str(c) for c in out.contents)
    html = html.replace("</section>", "</section>\n").replace("<section", "\n<section")
    return html, chapters


def write_page(html, target=None):
    target = target or PAGE
    page = target.read_text()
    a, b = page.index(START), page.index(END)
    stamp = ("\n<!-- Generated by scripts/build-handbook.py from the Registrar's Word file."
             " Edit the Word file and re-run; changes here are overwritten. -->\n")
    target.write_text(page[: a + len(START)] + stamp + html + "\n" + page[b:])


def write_pdf():
    from weasyprint import HTML
    HTML(filename=str(PAGE), base_url=str(PAGE.parent) + "/", media_type="print").write_pdf(
        str(PDF))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    copy_photos()
    html, chapters = build(Path(sys.argv[1]))
    write_page(html)
    print(f"wrote {PAGE.relative_to(ROOT)}: {len(chapters)} chapters")
    if GUIDE.exists():
        ghtml, gchapters = build(Path(sys.argv[1]), guide=True)
        write_page(ghtml, GUIDE)
        print(f"wrote {GUIDE.relative_to(ROOT)}: {len(gchapters)} chapters")
        for track in TRACKS:
            thtml, tchapters = build(Path(sys.argv[1]), guide=True, track=track)
            write_track(track, thtml)
            kept = len(FULL["units"]) - len(track["drop"])
            print(f"wrote academics/{track['file']}: {kept} of {len(FULL['units'])} topics")
        orphans = [u for u in FULL["units"] if all(u[1] in t["drop"] for t in TRACKS)]
        if orphans:
            sys.exit(f"guide: topics that no edition shows: {orphans}")
    if "--pdf" in sys.argv:
        write_pdf()
        print(f"wrote {PDF.relative_to(ROOT)}")
