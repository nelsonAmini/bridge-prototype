"""Writes the static seed data (one JSON file per NoSQL collection) into public/data.

Edit the content here and run `python3 scripts/build-seed.py`, then `npm run reset && npm start`.
The JSON files are committed, so running this script is optional.
"""
import json, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
os.makedirs(OUT, exist_ok=True)

def write(name, docs):
    for i, d in enumerate(docs):
        d.setdefault('order', i)
    with open(os.path.join(OUT, name + '.json'), 'w') as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)

# ---------------------------------------------------------------- users / people
write('users', [{
    '_id': 'u-pm', 'name': 'Prime Minister', 'office': 'Office of the PM', 'initials': 'PM',
    'firstName': 'Jane', 'email': '[account email]', 'wallet': '0x…[wallet id]',
    'agentName': 'Bridge', 'agentLook': 'Gold', 'topics': ['Finance', 'Health'],
    'priorities': '', 'answerStyle': 'summary', 'readAloud': False, 'onboarded': False,
    'language': 'English', 'notifications': True, 'keepLearning': True,
    'homeCard': 'briefing',
    'usage': [
        {'label': 'Chats', 'used': 10, 'limit': 100, 'display': '10 / 100'},
        {'label': 'Documents', 'used': 2, 'limit': 500, 'display': '2 / 500'},
        {'label': 'Storage', 'used': 0, 'limit': 1, 'display': '0 MB / 1 GB'},
        {'label': 'Tool runs today', 'used': 0, 'limit': 1000, 'display': '0 / 1000'},
    ],
}])

write('people', [
    {'_id': 'p-ac', 'name': 'Andrea Clarke', 'initials': 'AC', 'tone': 'blue', 'role': 'Permanent Secretary'},
    {'_id': 'p-mt', 'name': 'Marcus Thorne', 'initials': 'MT', 'tone': 'dark', 'role': 'Policy Adviser'},
    {'_id': 'p-kd', 'name': 'Kemar Daniel', 'initials': 'KD', 'tone': 'green', 'role': 'Ministry of Finance'},
    {'_id': 'p-ks', 'name': 'Kerry-Ann Small', 'initials': 'KS', 'tone': 'purple', 'role': 'Cabinet Office'},
    {'_id': 'p-lu', 'name': 'Lucille', 'initials': 'LU', 'tone': 'blue', 'role': 'Assistant to the PM'},
    {'_id': 'p-ho', 'name': 'Horace O.', 'initials': 'HO', 'tone': 'green', 'role': 'Ministry of Health'},
    {'_id': 'p-kb', 'name': 'Kerry Best', 'initials': 'KB', 'tone': 'purple', 'role': 'Health Policy Unit'},
])

# ---------------------------------------------------------------- onboarding options
write('topics', [{'_id': 't' + str(i), 'name': n, 'description': d} for i, (n, d) in enumerate([
    ('Finance', 'Budgets, revenue and fiscal policy'),
    ('Health', 'Clinics, public health and staffing'),
    ('Agriculture', 'Food security, farmers and exports'),
    ('Education', 'Schools, teachers and results'),
    ('Housing', 'Programmes, land and construction'),
    ('Climate and resilience', 'Hurricanes, water and energy'),
    ('Justice and policing', 'Courts, crime and public safety'),
    ('Foreign affairs', 'Caricom, partners and missions'),
])])

# ---------------------------------------------------------------- research
write('briefing', [{
    '_id': 'brief-today', 'date': 'Thursday 29 October', 'prepared': '6:30 AM', 'listen': '3 min',
    'song': {'title': 'King Tubby Meets Rockers Uptown', 'artist': 'Augustus Pablo', 'note': 'picked from your favourites'},
    'summary': 'Six papers came in overnight from four ministries. Three are waiting for your signature, one has waited nine days, and the housing paper conflicts with the Covenant of Hope.',
    'stats': [
        {'label': 'To sign', 'value': '3', 'delta': '+1 vs yesterday'},
        {'label': 'Oldest waiting', 'value': '9 days', 'delta': 'Land Administration'},
        {'label': 'Flagged', 'value': '1', 'delta': 'Conflict · housing'},
        {'label': 'New complaints', 'value': '14', 'delta': '−3 vs last week'},
    ],
    'backlogNote': 'Most of the backlog is one paper. Land Administration has waited nine days; the others arrived this week.',
    'waiting': [
        {'title': 'Land Administration System Replacement', 'days': 9},
        {'title': 'Impact of the 2026 Financial Reporting Changes on Digital ID Uptake', 'days': 3},
        {'title': 'National Housing Programme – Phase 2', 'days': 2},
    ],
    'alignment': [
        {'paper': 'Digital ID uptake', 'mission': 'Aligned', 'covenant': 'Aligned', 'manifesto': 'Aligned', 'past': 'No conflict'},
        {'paper': 'Land Administration', 'mission': 'Aligned', 'covenant': 'Aligned', 'manifesto': 'Partly', 'past': 'No conflict'},
        {'paper': 'Housing Phase 2', 'mission': 'Aligned', 'covenant': 'Conflict', 'manifesto': 'Aligned', 'past': 'Check 2024 decision'},
    ],
    'illustrative': True,
}])

write('threads', [{
    '_id': 'th-land', 'question': 'The land administration system is failing. How do we protect the data and what are our options to replace it?',
    'time': 'Today, 9:12 AM',
    'plan': [
        {'title': 'I’ll answer', 'text': 'How to protect land data and replace the system, in order'},
        {'title': 'I’ll look at', 'text': 'The 2025 audit, Lands and Surveys reports, two replacement proposals'},
        {'title': 'You’ll get', 'text': 'Backup first, then open process gaps, then options with risks and a recommended order'},
    ],
    'steps': ['Backing up land records sources', 'Reviewing open process gaps', 'Comparing replacement options', 'Writing the answer'],
    'answer': {
        'summary': 'The land registry can still be read but is failing under load. Protect the data first: take a full, verified backup off the failing servers, then freeze changes while the two critical audit gaps are closed.',
        'stats': [
            {'label': 'Parcels on record', 'value': '[x]k', 'note': 'Stable'},
            {'label': 'Last full backup', 'value': '[x] days', 'note': 'Late'},
            {'label': 'Open process gaps', 'value': '2 critical', 'note': 'from audit [2]'},
        ],
        'order': [
            {'title': 'Back up and verify every record', 'when': 'Week 1–2', 'text': 'Take a full, verified copy off the failing servers and test that it restores.'},
            {'title': 'Freeze changes to the old system', 'when': 'Week 2', 'text': 'Only fixes that protect data. No new features or fields.'},
            {'title': 'Close the process gaps', 'when': 'Weeks 2–8', 'text': 'Fix the 2 critical gaps from the audit first, so bad data stops entering.'},
            {'title': 'Choose a replacement', 'when': 'Weeks 4–10', 'text': 'Compare the options below with Lands and Surveys and Finance.'},
            {'title': 'Migrate in stages', 'when': 'From month 3', 'text': 'Move parish by parish, running old and new side by side.'},
        ],
        'sources': ['Lands and Surveys – system status, Oct 2026', '2025 Land Registry audit', 'Replacement proposal A', 'Replacement proposal B'],
    },
}])

# ---------------------------------------------------------------- directory
write('papers', [
    {'_id': 'pa-1', 'title': 'Report on the Caribbean Public Health Agency Annual Meeting', 'topic': 'Public health', 'related': 3, 'code': 'K(A)', 'ministry': 'MHW', 'ministryName': 'Ministry of Health and Wellness', 'cabinetDate': 'Thu 12 Dec 2024', 'created': '12 Dec 2024', 'createdBy': 'System import', 'modified': '3 Feb 2025', 'modifiedBy': 'K. Best', 'classification': 'Confidential', 'tags': ['Topic: Regional public health', 'Policy area: Health', 'Stakeholder: CARPHA', 'Legislation: Health Services Act, Cap. 44'], 'peopleTags': ['PAHO', 'MFEI'], 'pages': 42},
    {'_id': 'pa-2', 'title': 'Travel Report – World Health Assembly, Geneva', 'topic': 'Global health', 'related': 1, 'code': 'K(A)', 'ministry': 'MHW', 'ministryName': 'Ministry of Health and Wellness', 'cabinetDate': 'Thu 13 Jun 2024', 'created': '13 Jun 2024', 'createdBy': 'System import', 'modified': '13 Jun 2024', 'modifiedBy': 'System import', 'classification': 'Confidential', 'tags': ['Policy area: Health'], 'peopleTags': [], 'pages': 18},
    {'_id': 'pa-3', 'title': 'Report of the Drug Formulary Committee', 'topic': 'Pharmaceuticals', 'related': 0, 'code': 'K(B)', 'ministry': 'MHW', 'ministryName': 'Ministry of Health and Wellness', 'cabinetDate': None, 'created': '4 Mar 2024', 'createdBy': 'System import', 'modified': '4 Mar 2024', 'modifiedBy': 'System import', 'classification': 'Confidential', 'tags': ['Policy area: Health'], 'peopleTags': [], 'pages': 26},
    {'_id': 'pa-4', 'title': 'Report on the Barbados Drug Service Procurement Review', 'topic': 'Procurement', 'related': 2, 'code': 'K(B)', 'ministry': 'MHW', 'ministryName': 'Ministry of Health and Wellness', 'cabinetDate': 'Thu 22 Feb 2024', 'created': '22 Feb 2024', 'createdBy': 'System import', 'modified': '22 Feb 2024', 'modifiedBy': 'System import', 'classification': 'Confidential', 'tags': ['Policy area: Procurement'], 'peopleTags': [], 'pages': 31},
    {'_id': 'pa-5', 'title': 'Travel Report – PAHO Executive Committee, Washington D.C.', 'topic': 'Regional public health', 'related': 1, 'code': 'K(A)', 'ministry': 'MHW', 'ministryName': 'Ministry of Health and Wellness', 'cabinetDate': '20 Nov 2024', 'created': '20 Nov 2024', 'createdBy': 'System import', 'modified': '22 Nov 2024', 'modifiedBy': 'Horace O.', 'classification': 'Confidential', 'tags': ['Policy area: Health'], 'peopleTags': ['PAHO'], 'pages': 12},
    {'_id': 'pa-6', 'title': 'Report on Hurricane Beryl Recovery Works', 'topic': 'Resilience', 'related': 4, 'code': 'F(A)', 'ministry': 'MTW', 'ministryName': 'Ministry of Transport and Works', 'cabinetDate': 'Thu 4 Jul 2024', 'created': '2 Jul 2024', 'createdBy': 'System import', 'modified': '9 Jul 2024', 'modifiedBy': 'System import', 'classification': 'Confidential', 'tags': ['Policy area: Resilience'], 'peopleTags': [], 'pages': 54},
    {'_id': 'pa-7', 'title': 'National ID Act Amendment Bill – Drafting Instructions', 'topic': 'Digital identity', 'related': 2, 'code': 'I(A)', 'ministry': 'MIST', 'ministryName': 'Ministry of Innovation, Science and Technology', 'cabinetDate': 'Thu 10 Oct 2024', 'created': '1 Oct 2024', 'createdBy': 'System import', 'modified': '10 Oct 2024', 'modifiedBy': 'System import', 'classification': 'Secret', 'tags': ['Policy area: Digital'], 'peopleTags': [], 'pages': 9},
    {'_id': 'pa-8', 'title': 'Fiscal Responsibility (Amendment) Bill', 'topic': 'Fiscal policy', 'related': 3, 'code': 'F(A)', 'ministry': 'MFEI', 'ministryName': 'Ministry of Finance, Economic Affairs and Investment', 'cabinetDate': 'Thu 22 Oct 2026', 'created': '15 Oct 2026', 'createdBy': 'System import', 'modified': '22 Oct 2026', 'modifiedBy': 'System import', 'classification': 'Confidential', 'tags': ['Policy area: Finance'], 'peopleTags': [], 'pages': 14},
])

write('folders', [
    {'_id': 'fo-health', 'name': 'Health reform', 'count': 23, 'synced': True},
])

write('myPapers', [
    {'_id': 'mp-0', 'folderId': 'fo-health', 'type': 'folder', 'title': 'Stakeholder consultations', 'subtitle': 'Folder', 'created': '2 Sep 2024', 'modified': '18 Jan 2025', 'modifiedBy': '—', 'classification': None, 'kb': '6 papers', 'kbState': 'neutral', 'due': None},
    {'_id': 'mp-1', 'folderId': 'fo-health', 'type': 'paper', 'title': 'NHI Feasibility Study – Interim Report', 'subtitle': 'Ink on 4 pages · from iPad', 'created': '14 Nov 2024', 'modified': '6 Jan 2025', 'modifiedBy': 'You', 'classification': 'Confidential', 'kb': 'In KB since 6 Jan', 'kbState': 'success', 'due': None},
    {'_id': 'mp-2', 'folderId': 'fo-health', 'type': 'paper', 'title': 'Draft Cabinet Note – Primary Care Reform', 'subtitle': 'Health reform', 'created': '9 Jan 2025', 'modified': '28 Jan 2025', 'modifiedBy': 'You', 'classification': 'Confidential', 'kb': 'Pending review', 'kbNote': 'Submitted 29 Jan', 'kbState': 'warning', 'due': 'Thu 6 Feb'},
    {'_id': 'mp-3', 'folderId': 'fo-health', 'type': 'paper', 'title': 'Health Sector Workforce Survey 2024', 'subtitle': 'Health reform', 'created': '3 Dec 2024', 'modified': '3 Dec 2024', 'modifiedBy': 'You', 'classification': 'Confidential', 'kb': 'Not accepted', 'kbNote': 'Duplicate of K(B) 2024-118', 'kbState': 'danger', 'due': None},
    {'_id': 'mp-4', 'folderId': 'fo-health', 'type': 'paper', 'title': 'Notes – PAHO briefing (annotated)', 'subtitle': 'Ink on 2 pages · from iPad', 'created': '21 Nov 2024', 'modified': '22 Nov 2024', 'modifiedBy': 'You · iPad', 'classification': 'Private', 'kb': '—', 'kbState': 'neutral', 'due': None},
])

write('cabinetDates', [
    {'_id': 'cd-1', 'title': 'Travel Report – PAHO Executive Committee, Washington D.C.', 'code': 'K(A)', 'folder': '2024/2024-11-20/', 'cabinetDate': '20 Nov 2024', 'weekday': 'Wednesday', 'issue': 'notThursday'},
    {'_id': 'cd-2', 'title': 'Report on Hurricane Beryl Recovery Works', 'code': 'F(A)', 'folder': '2024/2024-07-02/', 'cabinetDate': '2 Jul 2024', 'weekday': 'Tuesday', 'issue': 'notThursday'},
    {'_id': 'cd-3', 'title': 'Report of the Drug Formulary Committee', 'code': 'K(B)', 'folder': '2024/unsorted/', 'cabinetDate': None, 'weekday': '—', 'issue': 'noDate'},
    {'_id': 'cd-4', 'title': 'Memo – Customs waiver requests, Q3', 'code': 'F(B)', 'folder': '2024/unsorted/', 'cabinetDate': None, 'weekday': '—', 'issue': 'noDate'},
])

# ---------------------------------------------------------------- create
write('templates', [
    {'_id': 'tpl-blank', 'name': 'Blank', 'kind': 'Blank', 'category': 'Basic', 'description': 'Start from an empty page'},
    {'_id': 'tpl-cabinet', 'name': 'Cabinet paper', 'kind': 'Cabinet Paper', 'category': 'Cabinet', 'description': 'Matter for consideration, decision, background, financial implications'},
    {'_id': 'tpl-travel', 'name': 'Travel report', 'kind': 'Travel', 'category': 'Reports', 'description': 'Purpose, delegation, outcomes and costs of official travel'},
    {'_id': 'tpl-memo', 'name': 'Memo', 'kind': 'Memo', 'category': 'Letters and memos', 'description': 'Short internal memo'},
    {'_id': 'tpl-report', 'name': 'Report', 'kind': 'Report', 'category': 'Reports', 'description': 'Structured report with findings and recommendations'},
])

CAB_SECTIONS = [
    {'id': 'meta', 'heading': None, 'style': 'meta', 'body': 'Cabinet of Barbados · Ministry of Innovation, Science and Technology · Paper code K(A) · For decision'},
    {'id': 'moc', 'heading': '1. Matter for consideration', 'body': 'The Ministry of Finance’s new financial reporting rules, announced on 5 February 2026, add quarterly disclosure steps for capital projects [3]. Applied to the NDIF, they would delay disbursement by up to two quarters, slowing digital identity uptake just as public registration is meant to scale [5]. This paper asks Cabinet to exempt the NDIF from the new cycle until Q1 2027.'},
    {'id': 'dec', 'heading': '2. Decision requested', 'body': 'It is recommended that Cabinet:', 'bullets': ['approve $15 million from the Contingency Reserve for the NDIF;', 'designate the National ID Act Amendment Bill a legislative priority;', 'authorise the Minister to agree revised milestones with the World Bank.']},
    {'id': 'bg', 'heading': '3. Background', 'body': 'The National Digital Identity Framework (NDIF) was approved in 2022 to move paper-based identity systems onto a secure national digital platform [1]. The policy is approved, but procurement is 14 weeks behind because of cross-departmental data integration [2].', 'tail': 'The delay risks breaching Clause 4.1 of the World Bank Development Loan (P.L. 345/2023), which requires substantial progress by the end of Q1 [4].'},
    {'id': 'fin', 'heading': '4. Financial implications', 'table': [
        ['Item', 'Q4 Year 1', 'Next 3 years', 'Notes'],
        ['Operational acceleration', '$15M (contingency)', '$0', 'Fixed-term specialist consultancy [5]'],
        ['Annual maintenance', '$2M', '$6M / year', 'Existing Ministry of Technology budget'],
        ['Total immediate impact', '+$15M', '—', 'Offset by avoiding the $5M penalty'],
    ]},
]
SOURCES = ['MoF – Financial reporting changes, 5 Feb 2026', 'Digital ID uptake survey 2025', 'National Digital Identity Framework (2022)', 'World Bank Development Loan P.L. 345/2023', 'Nation News – “ID rollout faces reporting hurdle”']

write('documents', [
    {'_id': 'doc-cabinet', 'title': 'Impact of the 2026 Financial Reporting Changes on Digital ID Uptake', 'template': 'Cabinet Paper', 'status': 'First draft by Bridge · 5 sources', 'owner': 'You', 'modified': '11 Feb 2026, 16:24', 'section': 'mine', 'pinned': True,
     'sections': CAB_SECTIONS, 'sources': SOURCES,
     'messages': [
         {'role': 'user', 'text': 'Refer to the Ministry of Finance changes to financial reporting announced on 5 February 2026. Draft a policy paper showing how they could slow the uptake of digital identity among the public in Barbados. I’ve attached a few sources to start from.'},
         {'role': 'bridge', 'time': '16:24', 'text': 'Your first draft is ready. I filled all five sections from your two files, three links and the Directory, and cited each claim. Review the highlighted assumptions before sharing.', 'sources': True},
     ],
     'suggestions': ['Strengthen the recommendations', 'Check against Cabinet paper rules', 'Share with a colleague for review'],
     'script': []},
    {'_id': 'doc-2', 'title': 'Notes – PAHO briefing (annotated)', 'template': 'Report', 'status': 'Shared by Horace O. · you can comment', 'owner': 'Horace O.', 'modified': '22 Nov 2024', 'section': 'shared', 'newerVersion': True, 'sections': [{'id': 's1', 'heading': 'Summary', 'body': 'Notes from the PAHO Executive Committee briefing. §3: should we cite the CARPHA costing here as well?'}], 'sources': [], 'messages': [], 'suggestions': [], 'script': []},
    {'_id': 'doc-3', 'title': 'Housing paper vs Covenant – comparison', 'template': 'Report', 'status': 'Draft', 'owner': 'You', 'modified': '27 Oct 2026', 'section': 'mine', 'sections': [{'id': 's1', 'heading': 'Summary', 'body': 'Where Phase 2 of the National Housing Programme departs from the Covenant of Hope commitments.'}], 'sources': [], 'messages': [], 'suggestions': [], 'script': []},
    {'_id': 'doc-4', 'title': 'Speech – CARICOM Heads of Government opening', 'template': 'Memo', 'status': 'Draft', 'owner': 'You', 'modified': '20 Oct 2026', 'section': 'mine', 'sections': [{'id': 's1', 'heading': None, 'body': 'Colleagues, friends, it is my honour to welcome you to Bridgetown.'}], 'sources': [], 'messages': [], 'suggestions': [], 'script': []},
])

# Scripted assistant turns for a new Blank document (from the Figma journey)
write('scripts', [
    {'_id': 'blank', 'steps': [
        {'trigger': 'title', 'bridge': 'It looks like you’re writing a Cabinet paper. Would you like help drafting the sections?', 'suggestions': ['Yes, draft a Cabinet paper', 'No, I’ll write it myself']},
        {'trigger': 'reply', 'bridge': 'I’ve drafted the sections a Cabinet paper needs to be compliant. Would you like to rework the Matter for consideration around the Ministry of Finance announcement?', 'apply': 'draft', 'suggestions': ['Yes, rework it', 'Add a financial implications table']},
        {'trigger': 'reply', 'bridge': 'I’ve updated the Matter for consideration to set out how the new reporting rules could slow digital identity uptake, and added the financial implications table. What would you like to recommend to Cabinet to offset this?', 'apply': 'rework', 'suggestions': ['Find local and international examples', 'Strengthen the recommendations']},
        {'trigger': 'reply', 'bridge': 'Noted. I’ll keep the recommendations as they are for now. Ask me to check the paper against Cabinet paper rules when you’re ready.', 'suggestions': ['Check against Cabinet paper rules']},
    ]},
])

write('comments', [
    {'_id': 'c-a', 'documentId': 'doc-cabinet', 'sectionId': 'moc', 'quote': 'The Ministry of Finance’s new financial reporting rules, announced on 5 February 2026…', 'status': 'open', 'author': 'p-ac',
     'comments': [{'author': 'p-ac', 'time': '11 Feb, 16:40', 'body': 'Can we put a number on “slowing uptake”? The Minister will ask how many people are affected.'},
                  {'author': 'p-mt', 'time': '11 Feb, 16:52', 'body': 'The 2025 uptake survey has registration projections. I’ll pull them in.'}]},
    {'_id': 'c-b', 'documentId': 'doc-cabinet', 'sectionId': 'dec', 'bullet': 0, 'quote': 'approve $15 million from the Contingency Reserve for the NDIF;', 'status': 'open', 'author': 'p-kd',
     'comments': [{'author': 'p-kd', 'time': '12 Feb, 09:15', 'body': 'The Contingency Reserve is under pressure this quarter. Can we add reallocation from the capital budget as an alternative?'}]},
    {'_id': 'c-c', 'documentId': 'doc-cabinet', 'sectionId': 'fin', 'quote': '“4. Financial implications” table', 'status': 'open', 'author': 'p-ks', 'mentionsMe': True,
     'comments': [{'author': 'p-ks', 'time': '12 Feb, 10:02', 'body': '@Marcus Thorne the Notes column needs a source for every figure before this goes to Cabinet.'}]},
])

# Bridge review results (used when you ask Bridge to check against Cabinet paper rules)
write('reviewRules', [
    {'_id': 'r-1', 'sectionId': 'moc', 'quote': '“…delay disbursement by up to two quarters…”', 'body': '“Up to two quarters” has no source. Cite the MoF guidance [3] or soften the claim.'},
    {'_id': 'r-2', 'sectionId': 'dec', 'bullet': 2, 'quote': '“authorise the Minister to agree revised milestones with the World Bank.”', 'body': 'Add a deadline for agreeing the milestones so Cabinet can track it.'},
    {'_id': 'r-3', 'sectionId': 'fin', 'quote': '“4. Financial implications”', 'body': 'Rule 239 papers need a “Source of funds” line. Add one under the table.'},
])

# ---------------------------------------------------------------- my reviews
write('reviewFolders', [
    {'_id': 'rf-land', 'name': 'Land Administration', 'pinned': True},
    {'_id': 'rf-29oct', 'name': 'Cabinet · 29 Oct', 'fullName': 'Cabinet · 29 Oct 2026', 'pinned': True, 'filedBy': 'Lucille', 'bridgeNote': 'Lucille added 6 papers here. Bridge tagged 3 “To sign” and left them where she put them.'},
    {'_id': 'rf-22oct', 'name': 'Cabinet · 22 Oct', 'fullName': 'Cabinet · 22 Oct 2026'},
    {'_id': 'rf-notes', 'name': 'Personal notes'},
    {'_id': 'rf-speech', 'name': 'Speeches'},
])

write('reviews', [
    {'_id': 'rv-1', 'folderId': 'rf-29oct', 'title': 'Impact of the 2026 Financial Reporting Changes on Digital ID Uptake', 'kind': 'Cabinet Paper', 'status': 'To sign', 'meta': 'Due Thu', 'favourite': True, 'documentId': 'doc-cabinet', 'code': 'K(A)', 'ministry': 'Ministry of Innovation, Science and Technology', 'dueSoon': True,
     'bridge': 'Supports 4 of 5 Mission Barbados pillars. No conflict with earlier Cabinet decisions. The costings in §4 rely on one source [5].',
     'voiceNote': {'title': 'Voice note · p. 3', 'meta': '0:42 · transcribed', 'transcript': '“Ask the Ministry of Finance for revised costings before this goes back to Cabinet.”'},
     'ink': {'highlightBullet': 0, 'note': 'ask MoF for revised costings?'}, 'notes': []},
    {'_id': 'rv-2', 'folderId': 'rf-29oct', 'title': 'Land Administration System Replacement', 'kind': 'Cabinet Paper', 'status': 'To sign', 'meta': 'Waiting 9 days', 'bridge': 'Recommends option B. Matches the 2025 audit findings.', 'notes': []},
    {'_id': 'rv-3', 'folderId': 'rf-29oct', 'title': 'National Housing Programme – Phase 2', 'kind': 'Cabinet Paper', 'status': 'To sign', 'meta': 'Conflict with Covenant', 'bridge': 'Conflicts with the Covenant of Hope commitment on affordable units (§2.4).', 'notes': []},
    {'_id': 'rv-4', 'folderId': 'rf-29oct', 'title': 'PAHO Executive Committee – Travel Report', 'kind': 'Travel', 'status': 'To read', 'meta': 'Voice note', 'bridge': 'Information only. No decision needed.', 'notes': []},
    {'_id': 'rv-5', 'folderId': 'rf-29oct', 'title': 'Hurricane Season Preparedness Update', 'kind': 'Report', 'status': 'To read', 'meta': 'Due Fri', 'dueSoon': True, 'bridge': 'Two shelters still lack generators.', 'notes': []},
    {'_id': 'rv-6', 'folderId': 'rf-29oct', 'title': 'Fiscal Responsibility (Amendment) Bill', 'kind': 'Memo', 'status': 'Signed', 'meta': '22 Oct', 'bridge': 'Signed and sent on 22 Oct.', 'notes': []},
    {'_id': 'rv-7', 'folderId': 'rf-22oct', 'title': 'Customs Waivers – Q3 Summary', 'kind': 'Report', 'status': 'Signed', 'meta': '22 Oct', 'bridge': '', 'notes': []},
    {'_id': 'rv-8', 'folderId': 'rf-land', 'title': 'Lands and Surveys – System Status', 'kind': 'Report', 'status': 'To read', 'meta': 'Oct 2026', 'bridge': '', 'notes': []},
])

# ---------------------------------------------------------------- skills, learning, activity
write('skills', [
    {'_id': 'sk-1', 'name': 'Morning Briefing', 'schedule': 'Weekdays, 6:30 AM', 'on': True, 'suggested': False, 'description': 'Your day, papers and deadlines at 6:30 AM'},
    {'_id': 'sk-2', 'name': 'Cabinet Paper Review', 'schedule': 'Wednesdays, before Cabinet', 'on': True, 'suggested': False, 'description': 'Checks papers against Cabinet paper rules'},
    {'_id': 'sk-3', 'name': 'Signature Tracker', 'schedule': 'Always', 'on': True, 'suggested': False, 'description': 'Flags papers waiting for your signature'},
    {'_id': 'sk-4', 'name': 'Papers to sign, Mon and Wed', 'schedule': 'Suggested · you ask for this often', 'on': False, 'suggested': True},
    {'_id': 'sk-5', 'name': 'Alignment Check', 'schedule': 'When papers arrive', 'on': True, 'suggested': False, 'onboarding': True, 'hidden': True, 'description': 'Checks new papers against Mission Barbados, the Covenant and past decisions'},
])

write('learned', [
    {'_id': 'l-1', 'group': 'decide', 'fact': 'Summary first, then the detail', 'source': 'You told me'},
    {'_id': 'l-2', 'group': 'decide', 'fact': 'Checks papers against the Covenant of Hope', 'source': 'Learned from your chats'},
    {'_id': 'l-3', 'group': 'decide', 'fact': 'Outcomes are approved, deferred or withdrawn', 'source': 'You told me'},
    {'_id': 'l-4', 'group': 'rhythm', 'fact': 'Reads early, signs in the afternoon', 'source': 'Learned this week · is this right?', 'confirm': True},
    {'_id': 'l-5', 'group': 'rhythm', 'fact': 'Talks rather than types', 'source': 'Learned from your activity'},
    {'_id': 'l-6', 'group': 'rhythm', 'fact': 'Lucille and Reva upload papers for you', 'source': 'From your setup'},
])

write('activity', [{
    '_id': 'act', 'since': '6:30 AM', 'paused': False,
    'needsYou': [{'id': 'n1', 'title': 'Reply to Ministry of Housing is ready', 'body': 'Asks for revised costings and explains the August deferral.'}],
    'working': [{'title': 'Land administration brief', 'done': 3, 'total': 5}, {'title': 'Checking 3 new papers', 'done': 1, 'total': 3}],
    'scheduled': [{'title': 'Morning Briefing', 'when': 'Tomorrow 6:30 AM'}, {'title': 'Cabinet Paper Review', 'when': 'Wed 4:00 PM'}],
}])

write('recent', [
    {'_id': 'rc-1', 'title': 'Land administration options', 'route': '#/research/thread/th-land'},
    {'_id': 'rc-2', 'title': 'Housing paper vs Covenant', 'route': '#/create/doc/doc-3'},
    {'_id': 'rc-3', 'title': 'UN speeches, one place', 'route': '#/research'},
])

print('Seed data written to', os.path.abspath(OUT))
