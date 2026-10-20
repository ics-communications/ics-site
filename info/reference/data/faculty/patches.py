# -*- coding: utf-8 -*-
"""Edits to the carried-over bio text, requested by the faculty themselves.

Each patch names the person, the section, the block it replaces, and a fragment of
the original so the build fails loudly if the source text ever changes underneath it.
Besides `replace`, a patch can carry `drop=True` to remove the block,
`after=[(t, h), ...]` to insert new blocks just after it, or `blocks=[(t, h), ...]`
to replace the whole section. `expect` still has to match
the named block in every case.
"""

import refs

GIDEON_OPENING = (
    'I currently articulate my life-long primal research question as follows: What is good '
    'for humans, taking into consideration what is good for the whole earth? This question '
    'provides the lens through which I ethnographically consider the stories humans tell to '
    'account practically for our actions and critically and appreciatively read theoretical '
    'studies of such stories by philosophers in the Aristotelian, Thomist, Marxist, and '
    'Dooyeweerdian traditions.'
)

GIDEON_CLOSING = (
    'For a little more, see my <a href="https://gideonstrauss.substack.com">Substack</a> '
    'account.'
)

# ─────────────────────────────────────────────────────────────────────────────
# Faculty-Site-Copy-Review-edited.docx (returned September 2026)
# ─────────────────────────────────────────────────────────────────────────────

# Nik Ansell: "convinctions" → "convictions". Spelling only; the paragraph is
# otherwise his own text, reproduced verbatim.
ANSELL_MYSTERY = (
    'My own way of attending to our web of beliefs as we negotiate the interplay between '
    'our ultimate convictions, the contours of our world, and the changing needs of our '
    'time, may be best conveyed in the course descriptions below. I would situate such '
    'work of exploration and re-conception \'between\' the two quotations above. Talk of '
    '"infinite mystery" is meaningful, I believe, if we are talking about the mystery of '
    'our existence, our world, our experience of God; in brief, the mystery we know, '
    'though it (thankfully) exceeds our grasp and keeps our understanding in motion. '
    'Mystery is not mystification. Transcendence and immanence both need to be redefined '
    'and rediscovered. Because, in God\'s grace, we do not need to travel beyond "heavy '
    'metal, morality and beauty" to find the spirituality of existence.'
)

# Neal DeRoo: the first two foci were split into three — phenomenology proper,
# the theological turn, and philosophy of religion — and "Philosophies of
# Oppression" was struck. Two slips in the marked-up copy are corrected here:
# a doubled bracket after "Derrida))" and a stray "d" left behind by the
# rewrite of "…the Nature of God" into "Philosophy of Religion". The carried-over
# list also misspelled Kevin Schilbrack as "Schilbraack".
DEROO_FOCI = (
    '<ul>'
    '<li>Phenomenology (Husserl, Merleau-Ponty, Derrida)</li>'
    '<li>The \u201ctheological turn\u201d in Phenomenology (Henry, Marion, Levinas)</li>'
    '<li>Philosophy of Religion (Caputo, Kearney, Marion)</li>'
    '<li>Critical Phenomenology (Guenther, Hein\u00e4maa, Yancy, al-Saji)</li>'
    '<li>The relationship between God and Materiality (Robbins and Crockett, Lacoste, '
    'Caputo)</li>'
    '<li>What is Religion (Schilbrack, Simmons, Charles Taylor)</li>'
    '<li>Philosophies of Liturgy (Gschwandtner, Benson)</li>'
    '</ul>'
)


# ──────────────────────────────────────────────────────────────────────────────
# Ronald A. Kuipers, by email, 3 September 2026: "Here’s my publications over
# the past decade, if you could update that too." Verbatim from his message,
# formatted to match the other pages. The Research Portal links above stay.
# ──────────────────────────────────────────────────────────────────────────────

KUIPERS_FILES = (
    '<ul>'
    '<li>My monthly prayer reflections can be found at <a href="http://news.icscanada.edu'
    '/search/label/ronald%20a.%20kuipers"><strong>ICS News</strong></a>.</li>'
    '<li>My <em>Critical Faith</em> podcast episodes can be found on the '
    '<a href="https://criticalfaith.podbean.com/?s=kuipers"><strong>ICS website</strong>'
    '</a>.</li>'
    '<li>My <em>Regrowth</em> column can be found on <a href="https://'
    'instituteforchristianstudies.substack.com/s/regrowth"><strong>Substack</strong></a>'
    '.</li>'
    '</ul>'
)

# Titles bold, container italic \u2014 the shape Ansell, Smick and Sweetman all use.
KUIPERS_ARTICLES = refs.ul(
    '<strong>\u201cFrom Liberal Containment to Pluralistic Engagement: Religious '
    'Pluralism, Solidarity, and the Public Life of Canadian Democracy\u201d</strong> in '
    '<em>Dialogue: Canadian Philosophical Review / Revue canadienne de philosophie</em> '
    '(volume 65:1, 2026), 99\u2013123. A special issue on Envisioning Canada / '
    'Envisager le Canada.',

    '<strong>\u201cKind of Blue: Lamenting the Failures of Settler Christianity in a '
    'Twilight Civilization\u201d</strong> in <em>Toronto Journal of Theology</em> '
    '(volume 37:2, 2021), 219\u2013230.',

    '<strong>\u201cNothing but Nihilism? The Spirit of Purposelessness in James '
    'Tartaglia\u2019s <em>Philosophy in a Meaningless Life</em>\u201d</strong> in '
    '<em>Nihilism and the Meaning of Life: A Philosophical Dialogue with James '
    'Tartaglia</em>, ed. Masahiro Morioka, <em>Journal of the Philosophy of Life</em> '
    '(volume 7:1, 2017), 50\u201369.',

    '<strong>\u201cTurning Memory into Prophecy: Roberto Unger and Paul Ricoeur on the '
    'Human Condition between Past and Future\u201d</strong> in <em>The Heythrop '
    'Journal</em> (volume 58:5, September 2017), 806\u2013815.',

    '<strong>\u201cCross-Pressured Authenticity: Charles Taylor on the Modern Challenges '
    'to Religious Identity in a Secular Age\u201d</strong> in <em>Symposium: Canadian '
    'Journal of Continental Philosophy</em> (volume 20:1, Spring 2016), 32\u201351.',
)

KUIPERS_CHAPTERS = refs.ul(
    '<strong>\u201cSuccessful Prophecies, Failed Hopes? Richard Rorty on the Demise of '
    'Social Justice\u201d</strong> in <em>Revisiting Richard Rorty</em> (Wilmington, DE: '
    'Vernon Press, 2020), 25\u201336.',
)

# Neal DeRoo, from the CV he supplied (info/Updates/Neal-DeRoo-CV.docx).
# The CV now lists three authored and six co-edited books, plus the Oxford
# Handbook still to come. His own sentence, with only the counts corrected.
DEROO_BIOGRAPHY = (
    'Neal DeRoo has served in many roles at the intersection of philosophy and religion, '
    'most recently as the Canada Research Chair in Phenomenology and Philosophy of Religion '
    'at The King\'s University. He was the Director of the Andreas Center for Reformed '
    'Scholarship and Service from 2014-2016, the founding editor of <a '
    'href="https://inallthings.org/"><em>in All things</em></a>, and has served on numerous '
    'boards and advisory committees, including the <em>Christian Scholar\'s Review</em>, the '
    'Society for the Phenomenology of Religious Experience, the Society for Existential and '
    'Phenomenological Theory and Culture, and the <em>Canadian Journal for Scholarship and '
    'the Christian Faith</em>. He has published three authored books, six edited books '
    '(with one more on the way), and numerous articles and book chapters on phenomenology, '
    'the philosophy of religion, politics, and more. He speaks and lectures worldwide to '
    'academic, popular and professional audiences, including doing professional development '
    'work with Christian day school teachers. His current work develops the '
    'phenomenological notion of spirituality, which functions as a foundational element of '
    'how we experience things and influences everything from how we intuit the world to '
    'questions of racialization and genderization to how we worship God.'
)

# His page carries a selection, not the whole list. The five items dated after
# the selection was last made are slotted into his reverse-chronological order,
# and every entry is brought to one shape: title bold (italic too, for a book),
# container italic, then the parenthetical. Links only where one exists.
DEROO_PUBS = (
    '<ul>'
    '<li><strong><em>Material Spirituality: A Transcendental Phenomenology of '
    'Religion</em></strong> (London: Bloomsbury, 2026).</li>'
    '<li><strong><em>Oxford Handbook of Phenomenology of Religion</em></strong>, eds. '
    'Neal DeRoo and Veronica Cibotaru (Oxford: Oxford University Press, '
    'forthcoming).</li>'
    '<li><strong>\u201cEmbodying the World: The Spiritual Significance of the '
    'Earth\u201d</strong> in <em>Crossings: The Journal of the International Network for '
    'Philosophy of Religion</em> (volume 4, 2024), 151\u2013161.</li>'
    '<li><strong>\u201cThinking Revelation as Expression in and through '
    'Phenomenology\u201d</strong> in <em>Journal for Continental Philosophy of '
    'Religion</em> (volume 6, 2024), 31\u201350.</li>'
    '<li><a href="https://www.bloomsbury.com/us/philosophies-of-liturgy-9781350349223/">'
    '<strong><em>Philosophies of Liturgy: Explorations of Embodied Religious '
    'Practice</em></strong></a>, eds. J. Aaron Simmons, Bruce Ellis Benson and Neal DeRoo '
    '(New York: Bloomsbury Academic, 2023).</li>'
    '<li><a href="https://www.bloomsbury.com/ca/philosophical-perspectives-on-existential'
    '-gratitude-9781350289123/"><strong><em>Philosophical Perspectives on Existential '
    'Gratitude: Analytic, Continental and Religious</em></strong></a>, eds. Joshua Lee '
    'Harris, Kirk Lougheed and Neal DeRoo (New York: Bloomsbury Academic, 2023).</li>'
    '<li><a href="https://www.fordhampress.com/9781531500054/the-political-logic-of-'
    'experience/"><strong><em>The Political Logic of Experience: Expression in '
    'Phenomenology</em></strong></a> (New York: Fordham University Press, 2022).</li>'
    '<li><a href="https://www.mdpi.com/2077-1444/13/7/649"><strong>\u201cLocating Religious '
    'Violence in the Spiritual Constitution of Experience\u201d</strong></a> in '
    '<em>Religions</em> (volume 13:7, 2022). Available online.</li>'
    '<li>Editor of <em>Religions</em> special issue on <a href="https://www.mdpi.com/'
    'journal/religions/special_issues/phenomenology"><strong>\u201cPhenomenology, '
    'Spirituality and Religion\u201d</strong></a> (volume 12:8, 2021). Available '
    'online.</li>'
    '<li><a href="https://www.mdpi.com/2077-1444/12/8/633/htm"><strong>\u201cThe Everyday '
    'Power of Liturgy: On the Significance of the Transcendental for a Phenomenology of '
    'Liturgy\u201d</strong></a> in <em>Religions</em> (volume 12:8, 2021). Available '
    'online.</li>'
    '<li><a href="https://forumphilosophicum.ignatianum.edu.pl/3669-2501-04.html">'
    '<strong>\u201cPhenomenological Spirituality and its Relationship to '
    'Religion\u201d</strong></a> in <em>Forum Philosophicum</em> (volume 25:1, Spring '
    '2020). Available online.</li>'
    '</ul>'
)


SWEETMAN_SYNTHESIS = (
    'I have been attempting to bring these disparate studies together for a number of years '
    'into a book-length synthesis entitled <em>Exemplary Care: Stoic Therapy, Dominican '
    'Pastoral Literature and the Transformation of the Human Person, 1225–1275</em> in '
    'which I articulate what I am coming to see as the proper spheres of narrative and '
    'argumentative understanding in interaction with these medieval interlocutors.'
)


PATCHES = [
    # info/gideon.txt
    dict(person='Gideon Strauss', section='About My Work', index=0,
         expect='I think about the stories we humans tell',
         replace=GIDEON_OPENING),
    dict(person='Gideon Strauss', section='About My Work', index=-1,
         expect='not very active',
         replace=GIDEON_CLOSING),

    # "Obviously, please remove the 'Academic Dean' position from my page."
    # The title was also the closing clause of his biography. Only that clause is
    # dropped; the sentence and the 2015 date are his own words, untouched.
    # To restore it, delete this patch and rerun build/generate.py.
    dict(person='Gideon Strauss', section='Biography', index=-1,
         expect='appointed as Academic Dean in 2018',
         replace='Gideon started teaching at ICS in 2015.'),

    # ── Faculty-Site-Copy-Review-edited.docx ─────────────────────────────────
    dict(person='Nik Ansell', section='About My Work', index=2,
         expect='ultimate convinctions',
         replace=ANSELL_MYSTERY),

    dict(person='Neal DeRoo', section='Research Foci', index=0,
         expect='Contemporary re-imaginings of the Nature of God',
         replace=DEROO_FOCI),

    # "Theses Directed at ICS → PhD → More info coming soon." A placeholder that
    # never got filled; struck rather than left standing. Highest index first,
    # because a delete shifts everything after it.
    dict(person='Rebekah Smick', section='Teaching', index=6,
         expect='More info coming soon', drop=True),
    dict(person='Rebekah Smick', section='Teaching', index=5,
         expect='PhD', drop=True),

    # ── Ronald A. Kuipers, by email ───────────────────────────────────────────
    dict(person='Ronald A. Kuipers', section='Files', index=0,
         expect='criticalfaith.podbean.com',
         replace=KUIPERS_FILES),
    dict(person='Ronald A. Kuipers', section='Publications', index=1,
         expect='rkuipers.articlelist',
         after=[('h3', '<strong>Articles in Academic Journals</strong>'),
                ('list', KUIPERS_ARTICLES),
                ('h3', '<strong>Chapters in Multi-Author Volumes</strong>'),
                ('list', KUIPERS_CHAPTERS)]),

    # ── Neal DeRoo, from his CV ──────────────────────────────────────────────
    dict(person='Neal DeRoo', section='Publications', index=0,
         expect='philosophies-of-liturgy',
         replace=DEROO_PUBS),

    # The CV now lists three authored and six co-edited books, plus the Oxford
    # Handbook still to come. His own sentence, with only the counts corrected.
    dict(person='Neal DeRoo', section='Biography', index=3,
         expect='two authored books, 5 edited books',
         replace=DEROO_BIOGRAPHY),
    # ── One house style for every reference list (see build/refs.py) ─────────
    # Ansell's whole section is restated: the "Available online at:" and
    # "Reprinted in:" paragraphs that sat between entries are folded into them.
    dict(person='Nik Ansell', section='Publications', index=0,
         expect='Books',
         blocks=[('h3', '<strong>Books</strong>'),
                 ('list', refs.ANSELL_BOOKS),
                 ('h3', '<strong>Selected Articles &amp; Book Chapters</strong>'),
                 ('list', refs.ANSELL_ARTICLES),
                 ('h3', '<strong><em>Third Way</em> commentaries</strong>'),
                 ('list', refs.ANSELL_THIRD_WAY),
                 ('p', refs.ANSELL_PORTAL)]),

    dict(person='Bob Sweetman', section='Publications', index=1,
         expect='Tracing the Lines', replace=refs.SWEETMAN_BOOKS),
    dict(person='Bob Sweetman', section='Publications', index=4,
         expect='Exemplary Care', replace=refs.SWEETMAN_SCHOLASTICISM),
    dict(person='Bob Sweetman', section='Publications', index=6,
         expect='Mystical Knowledge of God', replace=refs.SWEETMAN_PLATONISM),
    dict(person='Bob Sweetman', section='Publications', index=8,
         expect='Julian of Norwich', replace=refs.SWEETMAN_MYSTICISM),
    dict(person='Bob Sweetman', section='Publications', index=11,
         expect='research-portal', replace=refs.PORTAL % 'bsweetman'),

    dict(person='Gideon Strauss', section='Publications', index=1,
         expect='To Honor God', replace=refs.STRAUSS_BOOKS),
    dict(person='Gideon Strauss', section='Publications', index=3,
         expect='four-letter word', replace=refs.STRAUSS_ARTICLES),
    dict(person='Gideon Strauss', section='Publications', index=5,
         expect='Shaping Public Theology', replace=refs.STRAUSS_REVIEWS),

    dict(person='Rebekah Smick', section='Publications', index=1,
         expect='Roman Catholic Sources', replace=refs.SMICK_BOOKS),
    dict(person='Rebekah Smick', section='Publications', index=3,
         expect='Kuyper', replace=refs.SMICK_CHAPTERS),
    dict(person='Rebekah Smick', section='Publications', index=4,
         expect='research-portal', replace=refs.PORTAL % 'rsmick'),

    # Two stragglers in Sweetman's own prose, for the same typographic rules.
    dict(person='Bob Sweetman', section='Publications', index=5,
         expect='Mythologizing',
         replace='<strong>\u201cMythologizing\u201d Platonism</strong>'),
    dict(person='Bob Sweetman', section='Publications', index=9,
         expect='1225-1275',
         replace=SWEETMAN_SYNTHESIS),
]


def apply(bios):
    for p in PATCHES:
        rec = bios[p['person']]
        sec = next(s for s in rec['sections'] if s['heading_text'] == p['section'])
        block = sec['blocks'][p['index']]
        if p['expect'] not in block['h']:
            raise SystemExit(
                'patch no longer matches: %s / %s / block %s\n  expected to find: %r\n'
                '  found: %r' % (p['person'], p['section'], p['index'],
                                 p['expect'], block['h'][:120]))
        if p.get('drop'):
            # Deletes shift every later index in the section, so list them
            # highest-index-first when two fall in the same section.
            del sec['blocks'][p['index']]
        elif p.get('blocks'):
            # Whole-section replacement, for a list whose block structure changes.
            sec['blocks'] = [dict(t=t, h=h) for t, h in p['blocks']]
        elif p.get('after'):
            # `expect` anchors against the block the new ones follow.
            sec['blocks'][p['index'] + 1:p['index'] + 1] = [
                dict(t=t, h=h) for t, h in p['after']]
        else:
            block['h'] = p['replace']
    return bios
