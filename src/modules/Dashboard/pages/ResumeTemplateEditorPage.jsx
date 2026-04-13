import React, { useEffect, useLayoutEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    ChevronLeft, Settings, Download, Sparkles, RefreshCw, Plus,
    Trash2, Save, FileText, ChevronDown, ChevronRight, X,
    Menu, AlertCircle, CheckCircle2, Copy, GripVertical
} from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../../../config/axiosConfig';
import { useToast } from '../../../context/ToastContext';
import DynamicTemplate from '../../../components/resume-templates/DynamicTemplate';
import DUMMY_DATA from '../../../data/resumeDummyData';


function ResumePreview({ templateConfig, accentColor, data }) {
    return <DynamicTemplate data={data} accentColor={accentColor} templateConfig={templateConfig} />;
}

// A4 page dimensions at 96 dpi
const A4_W = 794;
const A4_HEIGHT = 1123;
const PAGE_GAP = 40;  // gray gap between page boxes (and top/bottom of scroll area)
const PAGE_INNER_PAD = 48;  // inner gap on all 4 sides INSIDE each white page box
// Page box dimensions — larger than A4 so inner padding is visible on all 4 sides
const PAGE_BOX_W = A4_W + PAGE_INNER_PAD * 2;  // 890
const PAGE_BOX_H = A4_HEIGHT + PAGE_INNER_PAD * 2;  // 1219
const TEMPLATE_UPLOAD_SESSION_KEY = 'resumeTemplateUploadedDataJson';

const ACCENT_COLORS = [
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#000000', // Black
    '#475569', // Slate
];

/**
 * Get element's top position relative to a container.
 * Uses offsetTop traversal — NOT affected by CSS transform:scale() on ancestors.
 * Safe because the measurement container is position:fixed (offsetParent for all children).
 */
function getOffsetTopIn(el, container) {
    let t = 0;
    let cur = el;
    while (cur && cur !== container) {
        t += cur.offsetTop;
        cur = cur.offsetParent;
    }
    return t;
}

/**
 * Compute smart page-break start positions using offsetTop (layout coords, scale-independent).
 * - [data-nobreak]      — whole block moves to next page if it straddles boundary
 * - [data-keepwithnext] — section heading moves to next page if ≤ 120px from boundary
 */
function computePageBreaks(container, totalH, pageH) {
    const breaks = [0];
    let pageStart = 0;
    const noBreakEls = Array.from(container.querySelectorAll('[data-nobreak]'));
    const headingEls = Array.from(container.querySelectorAll('[data-keepwithnext]'));

    while (true) {
        const pageEnd = pageStart + pageH;
        if (pageEnd >= totalH) break;

        let breakAt = pageEnd;

        // 1. [data-nobreak]: item straddles this boundary → break before its top
        for (const el of noBreakEls) {
            const top = getOffsetTopIn(el, container);
            const bottom = top + el.offsetHeight;
            if (top > pageStart && top < pageEnd && bottom > pageEnd) {
                if (top < breakAt) breakAt = top;
                break;
            }
        }

        // 2. [data-keepwithnext]: heading within 120px of end → push to next page
        for (const el of headingEls) {
            const top = getOffsetTopIn(el, container);
            const bottom = top + el.offsetHeight;
            // heading is cut, or heading is orphaned close to page bottom
            if (top > pageStart && top < pageEnd && (bottom > pageEnd || (pageEnd - top) < 120)) {
                if (top < breakAt) breakAt = top;
                break;
            }
        }

        if (breakAt <= pageStart) breakAt = pageEnd;
        pageStart = breakAt;
        breaks.push(pageStart);
    }
    return breaks;
}

/**
 * Renders content as properly-broken A4 pages.
 * KEY FIX: inner clip height = min(A4_HEIGHT, nextBreak - thisBreak) for non-last pages.
 * This means cut content can NEVER "peek through" the bottom of a page — the clip
 * stops exactly at the next break point, and the white page box background shows below.
 */

function buildDefaultSections(data) {
    const d = data || {};
    const pi = d.personal_info || {};
    const fmt = (arr, fn) => (Array.isArray(arr) ? arr.map(fn).join('\n\n') : '');
    return [
        {
            id: 'sec-summary', title: 'Professional Summary', type: 'paragraph', enabled: true, items: [],
            placeholder: 'Write a brief summary of your professional experience here',
            content: d.professional_summary || '',
        },
        {
            id: 'sec-education', title: 'Education', type: 'bullets', enabled: true, items: [],
            placeholder: 'Add your educational background',
            content: fmt(d.education, (e) =>
                `${e.degree || ''} in ${e.field || ''}, ${e.institution || ''} (${e.graduation_date || ''})${e.gpa ? ` — GPA ${e.gpa}` : ''}`
            ),
        },
        {
            id: 'sec-experience', title: 'Work Experience', type: 'bullets', enabled: true, items: [],
            placeholder: 'Describe your work experience and achievements',
            content: fmt(d.experience, (e) =>
                `${e.position || ''} at ${e.company || ''} (${e.start_date || ''}${e.is_current ? ' – Present' : e.end_date ? ` – ${e.end_date}` : ''})\n${e.description || ''}`
            ),
        },
        {
            id: 'sec-internship', title: 'Internship', type: 'bullets', enabled: true, items: [],
            placeholder: 'Describe your internship experience',
            content: fmt(d.internship, (e) =>
                `${e.position || ''} at ${e.company || ''} (${e.start_date || ''}${e.is_current ? ' – Present' : e.end_date ? ` – ${e.end_date}` : ''})\n${e.description || ''}`
            ),
        },
        {
            id: 'sec-certs', title: 'Certification', type: 'bullets', enabled: true, items: [],
            placeholder: 'List your certifications and credentials',
            content: '',
        },
        {
            id: 'sec-projects', title: 'Projects', type: 'bullets', enabled: true, items: [],
            placeholder: 'Describe your projects',
            content: '',
        },
        {
            id: 'sec-contacts', title: 'Personal Details', type: 'paragraph', enabled: true, items: [],
            placeholder: 'Add your phone, email, and location',
            content: [pi.email, pi.phone, pi.location].filter(Boolean).join('\n'),
        },
        {
            id: 'sec-skills', title: 'Skills', type: 'tags', enabled: true, items: [],
            placeholder: 'List your key professional skills',
            content: Array.isArray(d.skills) ? d.skills.join(', ') : '',
        },
        {
            id: 'sec-achievements', title: 'Achievements', type: 'bullets', enabled: true, items: [],
            placeholder: 'List your awards, recognitions and achievements',
            content: Array.isArray(d.achievements) ? d.achievements.map((a) => `${a.title || ''}${a.date ? ' — ' + a.date : ''}${a.description ? '\n' + a.description : ''}`).join('\n\n') : '',
        },
        {
            id: 'sec-languages', title: 'Languages', type: 'tags', enabled: true, items: [],
            placeholder: 'e.g. English, Spanish',
            content: Array.isArray(d.languages) ? d.languages.join(', ') : '',
        },
        {
            id: 'sec-hobbies', title: 'Hobbies', type: 'paragraph', enabled: true, items: [],
            placeholder: 'Share your interests and hobbies',
            content: Array.isArray(d.hobbies) ? d.hobbies.join(', ') : '',
        },
    ];
}

function createDraftSection(index = 1) {
    return {
        id: `section-${Date.now()}-${index}`,
        title: `Section ${index}`,
        type: 'paragraph',
        enabled: true,
        content: '',
        items: [],
        placeholder: ''
    };
}

export default function ResumeTemplateEditorPage() {
    const { templateId: paramId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const previewRef = useRef(null);
    const editablePreviewRef = useRef(null);
    const selectedRangeRef = useRef(null);

    // Template state
    const [template, setTemplate] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [templateSelected, setTemplateSelected] = useState('classic');
    const [accentColor, setAccentColor] = useState('#3B82F6');
    const [customColor, setCustomColor] = useState('#3B82F6');
    const [templatesLoading, setTemplatesLoading] = useState(true);

    // Section editing
    const [sections, setSections] = useState([]);
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [draggedId, setDraggedId] = useState('');

    // Accordion + AI enhancement state
    const [expandedSectionId, setExpandedSectionId] = useState('');
    const [aiLoadingId, setAiLoadingId] = useState('');
    const [aiLoadingEduIdx, setAiLoadingEduIdx] = useState(-1);
    const [aiLoadingExpIdx, setAiLoadingExpIdx] = useState(-1);
    const [aiLoadingCertIdx, setAiLoadingCertIdx] = useState(-1);
    const [aiLoadingProjectDescIdx, setAiLoadingProjectDescIdx] = useState(-1);
    const [aiLoadingProjectBulletsIdx, setAiLoadingProjectBulletsIdx] = useState(-1);
    const [aiLoadingAchievementDescIdx, setAiLoadingAchievementDescIdx] = useState(-1);
    const [aiLoadingAchievementPointsIdx, setAiLoadingAchievementPointsIdx] = useState(-1);
    const [aiLoadingIntIdx, setAiLoadingIntIdx] = useState(-1);

    // Structured education entries
    const [eduEntries, setEduEntries] = useState(DUMMY_DATA.education.map((e) => ({ ...e })));

    const updateEduEntry = (index, patch) =>
        setEduEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));

    const addEduEntry = () =>
        setEduEntries((prev) => [...prev, {
            institution: '', location: '', degree: '', field: '',
            start_date: '', graduation_date: '', gpa: '', description: ''
        }]);

    const removeEduEntry = (index) =>
        setEduEntries((prev) => prev.filter((_, i) => i !== index));

    // Structured work experience entries
    const [expEntries, setExpEntries] = useState(DUMMY_DATA.experience.map((e) => ({ ...e })));

    const updateExpEntry = (index, patch) =>
        setExpEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));

    const addExpEntry = () =>
        setExpEntries((prev) => [...prev, {
            company: '', position: '', location: '',
            project_title: '', project_link: '',
            start_date: '', end_date: '', is_current: false, description: ''
        }]);

    const removeExpEntry = (index) =>
        setExpEntries((prev) => prev.filter((_, i) => i !== index));

    // Structured internship entries
    const [intEntries, setIntEntries] = useState([]);

    const updateIntEntry = (index, patch) =>
        setIntEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));

    const addIntEntry = () =>
        setIntEntries((prev) => [...prev, {
            company: '', position: '', location: '',
            project_title: '', project_link: '',
            start_date: '', end_date: '', is_current: false, description: ''
        }]);

    const removeIntEntry = (index) =>
        setIntEntries((prev) => prev.filter((_, i) => i !== index));

    // Structured certification entries
    const [certEntries, setCertEntries] = useState(DUMMY_DATA.certificates.map((c) => ({ ...c })));

    const updateCertEntry = (index, patch) =>
        setCertEntries((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

    const addCertEntry = () =>
        setCertEntries((prev) => [...prev, {
            title: '', issuer: '', link: '', date: '', description: ''
        }]);

    const removeCertEntry = (index) =>
        setCertEntries((prev) => prev.filter((_, i) => i !== index));

    // Structured project entries
    const [projectEntries, setProjectEntries] = useState(DUMMY_DATA.project.map((p) => ({ ...p })));

    const updateProjectEntry = (index, patch) =>
        setProjectEntries((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

    const addProjectEntry = () =>
        setProjectEntries((prev) => [...prev, {
            name: '', link: '', description: '', bullets: ''
        }]);

    const removeProjectEntry = (index) =>
        setProjectEntries((prev) => prev.filter((_, i) => i !== index));

    // Structured skill entries — each has an optional category label + comma-separated skills string
    const initSkillEntries = () => {
        if (Array.isArray(DUMMY_DATA.skillGroups) && DUMMY_DATA.skillGroups.length > 0) {
            return DUMMY_DATA.skillGroups.map((g) => ({
                category: g.category || '',
                skills: Array.isArray(g.skills) ? g.skills.join(', ') : (g.skills || ''),
            }));
        }
        return [{ category: '', skills: Array.isArray(DUMMY_DATA.skills) ? DUMMY_DATA.skills.join(', ') : '' }];
    };
    const [skillEntries, setSkillEntries] = useState(initSkillEntries);

    const updateSkillEntry = (index, patch) =>
        setSkillEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));

    const addSkillEntry = () =>
        setSkillEntries((prev) => [...prev, { category: '', skills: '' }]);

    const removeSkillEntry = (index) =>
        setSkillEntries((prev) => prev.filter((_, i) => i !== index));

    // Structured achievement entries
    const [achievementEntries, setAchievementEntries] = useState(
        Array.isArray(DUMMY_DATA.achievements) && DUMMY_DATA.achievements.length > 0
            ? DUMMY_DATA.achievements.map((a) => ({ ...a, points: a.points || '' }))
            : [{ title: '', date: '', description: '', points: '' }]
    );

    const updateAchievementEntry = (index, patch) =>
        setAchievementEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));

    const addAchievementEntry = () =>
        setAchievementEntries((prev) => [...prev, { title: '', date: '', description: '', points: '' }]);

    const removeAchievementEntry = (index) =>
        setAchievementEntries((prev) => prev.filter((_, i) => i !== index));

    // Structured personal details (name, designation, contacts, social links)
    const [personalInfo, setPersonalInfo] = useState({
        full_name: DUMMY_DATA.personal_info.full_name || '',
        profession: DUMMY_DATA.personal_info.profession || '',
        email: DUMMY_DATA.personal_info.email || '',
        phone: DUMMY_DATA.personal_info.phone || '',
        location: DUMMY_DATA.personal_info.location || '',
        linkedin: DUMMY_DATA.personal_info.linkedin || '',
        github: DUMMY_DATA.personal_info.github || '',
        facebook: DUMMY_DATA.personal_info.facebook || '',
        instagram: DUMMY_DATA.personal_info.instagram || '',
        website: DUMMY_DATA.personal_info.website || '',
    });

    const updatePersonalInfo = (patch) =>
        setPersonalInfo((prev) => ({ ...prev, ...patch }));

    // Resume data — initialized from DUMMY_DATA; candidates edit directly in the preview
    const [resumeData, setResumeData] = useState(DUMMY_DATA);
    const [uploadSourceMeta, setUploadSourceMeta] = useState(null);
    const [showAddSectionModal, setShowAddSectionModal] = useState(false);
    const [newSectionForm, setNewSectionForm] = useState({
        title: '',
        type: 'paragraph',
        date: '',
        content: '',
    });
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const [previewEditMode, setPreviewEditMode] = useState(false);
    const [selectionUi, setSelectionUi] = useState({
        open: false,
        x: 0,
        y: 0,
        text: '',
    });
    const [selectionAiBusy, setSelectionAiBusy] = useState(false);
    const [aiPopover, setAiPopover] = useState({
        open: false,
        x: 0,
        y: 0,
        stage: 'input',
        action: '',
        source: '',
        prompt: '',
        suggestion: '',
    });

    const buildSectionsFromLayout = (data, sectionLayout) => {
        const defaults = buildDefaultSections(data);
        if (!Array.isArray(sectionLayout) || sectionLayout.length === 0) return defaults;

        const byId = new Map(defaults.map((s) => [s.id, s]));
        const ordered = [...sectionLayout]
            .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)))
            .map((meta) => {
                const sec = byId.get(meta.id);
                // For standard sections found in byId, merge them.
                if (sec) {
                    return {
                        ...sec,
                        enabled: meta.enabled !== false,
                        sourceField: meta.source || '',
                        locationHint: meta.location || 'full',
                        content: (meta.source === 'about' ? data.professional_summary : (data[meta.id] || data[meta.source] || '')),
                    };
                }
                // For custom sections (missing from byId), explicitly preserve them if they start with 'custom-'
                if (meta.id && meta.id.startsWith('custom-')) {
                    const customObj = data.customSections?.find(cs => cs.id === meta.id);
                    const customContent = data[meta.id] || customObj?.content || '';
                    return {
                        id: meta.id,
                        title: meta.title,
                        enabled: meta.enabled !== undefined ? meta.enabled : (customObj?.enabled !== undefined ? customObj.enabled : true),
                        sourceField: meta.id,
                        locationHint: meta.location || 'full',
                        content: customContent,
                    };
                }
                return null;
            })
            .filter(Boolean);

        return ordered;
    };

    const hydrateFromUploadDraft = (draft) => {
        if (!draft?.resumeData) return false;

        const data = draft.resumeData;
        setResumeData(data);

        const pi = data.personal_info || {};
        setPersonalInfo({
            full_name: pi.full_name || '',
            profession: pi.profession || '',
            email: pi.email || '',
            phone: pi.phone || '',
            location: pi.location || '',
            linkedin: pi.linkedin || '',
            github: pi.github || '',
            facebook: pi.facebook || '',
            instagram: pi.instagram || '',
            website: pi.website || '',
        });

        setEduEntries(Array.isArray(data.education) ? data.education.map((e) => ({ ...e })) : []);
        setExpEntries(Array.isArray(data.experience) ? data.experience.map((e) => ({ ...e })) : []);
        setIntEntries(Array.isArray(data.internship) ? data.internship.map((e) => ({ ...e })) : []);
        setCertEntries(Array.isArray(data.certificates) ? data.certificates.map((c) => ({ ...c })) : []);
        setProjectEntries(Array.isArray(data.project) ? data.project.map((p) => ({ ...p })) : []);

        const groups = Array.isArray(data.skillGroups) && data.skillGroups.length > 0
            ? data.skillGroups
            : [{ category: 'Skills', skills: Array.isArray(data.skills) ? data.skills : [] }];
        setSkillEntries(
            groups.map((g) => ({
                category: g.category || '',
                skills: Array.isArray(g.skills) ? g.skills.join(', ') : (g.skills || ''),
            }))
        );

        setAchievementEntries(
            Array.isArray(data.achievements) && data.achievements.length > 0
                ? data.achievements.map((a) => ({ ...a, points: a.points || '' }))
                : [{ title: '', date: '', description: '', points: '' }]
        );

        const loadedSections = buildSectionsFromLayout(data, draft.sectionLayout);
        setSections(loadedSections);
        setExpandedSectionId(loadedSections[0]?.id || '');

        setUploadSourceMeta({
            fileName: draft.fileName || 'Uploaded Resume',
            uploadedAt: draft.uploadedAt || '',
            source: draft.source || 'uploaded-resume',
        });
        return true;
    };

    // Load template
    useEffect(() => {
        const loadTemplate = async () => {
            try {
                const res = await axiosInstance.get(`/api/resume/templates/${paramId}`);
                const data = res.data?.data;
                setTemplate(data);
                // Use saved editor sections if they carry sec-* IDs (user has typed content).
                // Plain-ID migration sections have no content field — always rebuild from dummy.
                const dbSecs = data?.sections;
                const hasSavedContent = Array.isArray(dbSecs) && dbSecs.length > 0 && dbSecs[0]?.id?.startsWith('sec-');
                const loaded = hasSavedContent
                    ? dbSecs
                    : buildDefaultSections(data?.dummyData || DUMMY_DATA);
                setSections(loaded);
                setExpandedSectionId((s) => s || loaded[0]?.id || '');
                if (data?.templateId) setTemplateSelected(data.templateId);
                if (data?.accentColor) { setAccentColor(data.accentColor); setCustomColor(data.accentColor); }
                if (data?.dummyData) setResumeData(data.dummyData);

                let uploadDraft = location.state?.uploadedDraft || null;
                if (!uploadDraft) {
                    try {
                        const raw = sessionStorage.getItem(TEMPLATE_UPLOAD_SESSION_KEY);
                        uploadDraft = raw ? JSON.parse(raw) : null;
                    } catch {
                        uploadDraft = null;
                    }
                }
                if (uploadDraft?.resumeData) {
                    hydrateFromUploadDraft(uploadDraft);
                } else {
                    setUploadSourceMeta(null);
                }
            } catch (error) {
                console.error('Failed to load template:', error);
                showToast('Failed to load template', 'error');
            }
        };

        if (paramId) loadTemplate();
    }, [paramId, showToast, location.state]);

    // Fetch templates from API
    useEffect(() => {
        (async () => {
            setTemplatesLoading(true);
            try {
                const res = await fetch('/api/resume/templates').then(r => r.json());
                setTemplates(res.data || []);
            } catch (err) {
                console.error('Template fetch error:', err);
            } finally {
                setTemplatesLoading(false);
            }
        })();
    }, []);

    // Initialize sections with defaults pre-filled from DUMMY_DATA
    useEffect(() => {
        setSections((prev) => {
            if (prev.length > 0) return prev;
            const defaults = buildDefaultSections(DUMMY_DATA);
            setExpandedSectionId(defaults[0].id);
            return defaults;
        });
    }, []);

    // Update handlers
    const updateSection = (sectionId, patch) => {
        setSections((prev) =>
            prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s))
        );
    };

    const addSection = () => {
        const newSection = createDraftSection(sections.length + 1);
        setSections((prev) => [...prev, newSection]);
        setSelectedSectionId(newSection.id);
    };

    const createCustomSection = () => {
        let title = (newSectionForm.title || '').trim();
        let id;
        let type = newSectionForm.type || 'paragraph';

        if (title === 'Other') {
            title = (newSectionForm.customTitle || '').trim();
            if (!title) {
                showToast('Please enter section title', 'error');
                return;
            }
            id = `sec-custom-${Date.now()}`;
        } else {
            // Mapping for predefined sections to ensure correct UI is rendered
            const idMap = {
                'Professional Summary': 'sec-summary',
                'Education': 'sec-education',
                'Work Experience': 'sec-experience',
                'Certification': 'sec-certs',
                'Projects': 'sec-projects',
                'Personal Details': 'sec-contacts',
                'Skills': 'sec-skills',
                'Achievements': 'sec-achievements',
                'Languages': 'sec-languages',
                'Hobbies': 'sec-hobbies'
            };
            const typeMap = {
                'Education': 'bullets',
                'Work Experience': 'bullets',
                'Certification': 'bullets',
                'Projects': 'bullets',
                'Skills': 'tags',
                'Achievements': 'bullets',
                'Languages': 'tags'
            };
            id = idMap[title] || `sec-custom-${Date.now()}`;
            if (typeMap[title]) type = typeMap[title];
        }

        const section = {
            id,
            title,
            type,
            enabled: true,
            items: [],
            placeholder: 'Add details here',
            content: (newSectionForm.content || '').trim(),
            date: newSectionForm.date || '',
            isCustom: title === 'Other' || !id.startsWith('sec-'),
        };

        setSections((prev) => [...prev, section]);
        setExpandedSectionId(id);
        setSelectedSectionId(id);
        setShowAddSectionModal(false);
        setNewSectionForm({ title: '', customTitle: '', type: 'paragraph', date: '', content: '' });
    };

    const deleteSection = (sectionId) => {
        setSections((prev) => {
            const filtered = prev.filter((s) => s.id !== sectionId);
            if (selectedSectionId === sectionId) {
                setSelectedSectionId(filtered[0]?.id || '');
            }
            return filtered;
        });
    };

    const handleEduDescriptionEnhance = async (idx) => {
        const entry = eduEntries[idx];
        if (!entry?.description?.trim()) {
            showToast('Type some content first, then click AI Enhance', 'error');
            return;
        }
        setAiLoadingEduIdx(idx);
        try {
            const response = await fetch('/api/resume/enhance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sectionTitle: 'Education',
                    sectionType: 'education',
                    content: entry.description,
                }),
            });
            if (!response.ok) throw new Error(`Server error ${response.status}`);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let enhanced = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const lines = decoder.decode(value, { stream: true }).split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const parsed = JSON.parse(line.slice(6));
                        if (parsed.error) throw new Error(parsed.error);
                        if (parsed.done) break;
                        if (parsed.text) {
                            enhanced += parsed.text;
                            updateEduEntry(idx, { description: enhanced });
                        }
                    } catch { /* skip malformed line */ }
                }
            }
        } catch (err) {
            showToast('AI enhance failed: ' + err.message, 'error');
        } finally {
            setAiLoadingEduIdx(-1);
        }
    };

    const handleExpDescriptionEnhance = async (idx) => {
        const entry = expEntries[idx];
        if (!entry?.description?.trim()) {
            showToast('Type some content first, then click AI Enhance', 'error');
            return;
        }
        setAiLoadingExpIdx(idx);
        try {
            const response = await fetch('/api/resume/enhance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sectionTitle: 'Work Experience',
                    sectionType: 'experience',
                    content: entry.description,
                }),
            });
            if (!response.ok) throw new Error(`Server error ${response.status}`);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let enhanced = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const lines = decoder.decode(value, { stream: true }).split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const parsed = JSON.parse(line.slice(6));
                        if (parsed.error) throw new Error(parsed.error);
                        if (parsed.done) break;
                        if (parsed.text) {
                            enhanced += parsed.text;
                            updateExpEntry(idx, { description: enhanced });
                        }
                    } catch { /* skip malformed line */ }
                }
            }
        } catch (err) {
            showToast('AI enhance failed: ' + err.message, 'error');
        } finally {
            setAiLoadingExpIdx(-1);
        }
    };

    const handleIntDescriptionEnhance = async (idx) => {
        const entry = intEntries[idx];
        if (!entry?.description?.trim()) {
            showToast('Type some content first, then click AI Enhance', 'error');
            return;
        }
        setAiLoadingIntIdx(idx);
        try {
            await streamEnhance(entry.description, 'Internship', 'experience', (t) => updateIntEntry(idx, { description: t }));
        } catch (err) {
            showToast('AI enhance failed: ' + err.message, 'error');
        } finally {
            setAiLoadingIntIdx(-1);
        }
    };

    // Reusable streaming enhance helper
    const streamEnhance = async (content, sectionTitle, sectionType, onChunk) => {
        const response = await fetch('/api/resume/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sectionTitle, sectionType, content }),
        });
        if (!response.ok) throw new Error(`Server error ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let enhanced = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value, { stream: true }).split('\n');
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.error) throw new Error(parsed.error);
                    if (parsed.done) break;
                    if (parsed.text) { enhanced += parsed.text; onChunk(enhanced); }
                } catch { /* skip malformed line */ }
            }
        }
    };

    const handleCertDescriptionEnhance = async (idx) => {
        const entry = certEntries[idx];
        if (!entry?.description?.trim()) { showToast('Type some content first, then click AI Enhance', 'error'); return; }
        setAiLoadingCertIdx(idx);
        try { await streamEnhance(entry.description, 'Certification', 'certification', (t) => updateCertEntry(idx, { description: t })); }
        catch (err) { showToast('AI enhance failed: ' + err.message, 'error'); }
        finally { setAiLoadingCertIdx(-1); }
    };

    const handleProjectDescriptionEnhance = async (idx) => {
        const entry = projectEntries[idx];
        if (!entry?.description?.trim()) { showToast('Type some content first, then click AI Enhance', 'error'); return; }
        setAiLoadingProjectDescIdx(idx);
        try { await streamEnhance(entry.description, 'Projects', 'projects', (t) => updateProjectEntry(idx, { description: t })); }
        catch (err) { showToast('AI enhance failed: ' + err.message, 'error'); }
        finally { setAiLoadingProjectDescIdx(-1); }
    };

    const handleProjectBulletsEnhance = async (idx) => {
        const entry = projectEntries[idx];
        if (!entry?.bullets?.trim()) { showToast('Type some content first, then click AI Enhance', 'error'); return; }
        setAiLoadingProjectBulletsIdx(idx);
        try { await streamEnhance(entry.bullets, 'Projects', 'projects', (t) => updateProjectEntry(idx, { bullets: t })); }
        catch (err) { showToast('AI enhance failed: ' + err.message, 'error'); }
        finally { setAiLoadingProjectBulletsIdx(-1); }
    };

    const handleAchievementDescriptionEnhance = async (idx) => {
        const entry = achievementEntries[idx];
        if (!entry?.description?.trim()) { showToast('Type some content first, then click AI Enhance', 'error'); return; }
        setAiLoadingAchievementDescIdx(idx);
        try { await streamEnhance(entry.description, 'Achievements', 'achievements', (t) => updateAchievementEntry(idx, { description: t })); }
        catch (err) { showToast('AI enhance failed: ' + err.message, 'error'); }
        finally { setAiLoadingAchievementDescIdx(-1); }
    };

    const handleAchievementPointsEnhance = async (idx) => {
        const entry = achievementEntries[idx];
        if (!entry?.points?.trim()) { showToast('Type some content first, then click AI Enhance', 'error'); return; }
        setAiLoadingAchievementPointsIdx(idx);
        try { await streamEnhance(entry.points, 'Achievements', 'achievements', (t) => updateAchievementEntry(idx, { points: t })); }
        catch (err) { showToast('AI enhance failed: ' + err.message, 'error'); }
        finally { setAiLoadingAchievementPointsIdx(-1); }
    };

    const handleDragStart = (sectionId) => {
        setDraggedId(sectionId);
    };

    const handleDrop = (targetId) => {
        if (!draggedId || draggedId === targetId) return;
        const from = sections.findIndex((s) => s.id === draggedId);
        const to = sections.findIndex((s) => s.id === targetId);
        if (from === -1 || to === -1) return;

        const next = [...sections];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        setSections(next);
        setDraggedId('');
    };

    const moveSectionByStep = (sectionId, step) => {
        const idx = sections.findIndex((s) => s.id === sectionId);
        const target = idx + step;
        if (idx < 0 || target < 0 || target >= sections.length) return;
        const next = [...sections];
        const [item] = next.splice(idx, 1);
        next.splice(target, 0, item);
        setSections(next);
    };

    const handleAiEnhance = async (section) => {
        if (!section.content?.trim()) {
            showToast('Type some content first, then click AI Enhance', 'error');
            return;
        }
        setAiLoadingId(section.id);
        try {
            const response = await fetch('/api/resume/enhance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sectionTitle: section.title,
                    sectionType: section.type,
                    content: section.content,
                }),
            });
            if (!response.ok) throw new Error(`Server error ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let enhanced = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const lines = decoder.decode(value, { stream: true }).split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const parsed = JSON.parse(line.slice(6));
                        if (parsed.error) throw new Error(parsed.error);
                        if (parsed.done) break;
                        if (parsed.text) {
                            enhanced += parsed.text;
                            updateSection(section.id, { content: enhanced });
                        }
                    } catch {
                        // skip malformed line
                    }
                }
            }
        } catch (err) {
            console.error('AI enhance error:', err);
            showToast('AI enhance failed: ' + err.message, 'error');
        } finally {
            setAiLoadingId('');
        }
    };

    // Find selected section
    const selectedSection = useMemo(
        () => sections.find((s) => s.id === selectedSectionId) || null,
        [sections, selectedSectionId]
    );

    const previewTemplateConfig = useMemo(() => {
        if (!template) return template;
        return {
            ...template,
            sections: sections.map((s) => ({
                ...s,
                id: String(s.id || '').replace(/^sec-/, ''),
                enabled: s.enabled !== false,
            })),
        };
    }, [template, sections]);

    // Derive live resume data from section content so preview updates on every keystroke
    const liveResumeData = useMemo(() => {
        const get = (id) => sections.find((s) => s.id === id)?.content || '';

        // Work experience comes directly from structured expEntries state
        const experience = expEntries.length > 0 ? expEntries : resumeData.experience;

        // Parse education from structured eduEntries state (not text)
        const education = eduEntries.length > 0 ? eduEntries : resumeData.education;

        // Skills: from structured skillEntries → produce both flat array and grouped
        const skillGroups = skillEntries
            .map((e) => ({
                category: e.category.trim(),
                skills: e.skills.split(',').map((s) => s.trim()).filter(Boolean),
            }))
            .filter((g) => g.skills.length > 0);
        const skills = skillGroups.flatMap((g) => g.skills);

        // Certs come directly from structured certEntries state
        const certificates = certEntries.length > 0 ? certEntries : resumeData.certificates;

        // Contacts → use structured personalInfo state
        const personal_info = {
            ...resumeData.personal_info,
            ...personalInfo,
        };

        // Achievements: from structured achievementEntries state
        const achievements = achievementEntries.length > 0 ? achievementEntries : resumeData.achievements;

        // Languages: comma-separated → array
        const languagesContent = get('sec-languages');
        const languages = languagesContent.trim()
            ? languagesContent.split(',').map((l) => l.trim()).filter(Boolean)
            : resumeData.languages;

        // Hobbies: comma-separated or newline
        const hobbiesContent = get('sec-hobbies');
        const hobbies = hobbiesContent.trim()
            ? hobbiesContent.split(/,|\n/).map((h) => h.trim()).filter(Boolean)
            : resumeData.hobbies;

        const customSections = sections
            .filter((s) => String(s.id || '').startsWith('sec-custom-'))
            .map((s) => {
                const points = (s.content || '')
                    .split('\n')
                    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
                    .filter(Boolean);

                return {
                    id: String(s.id).replace(/^sec-/, ''),
                    title: s.title || 'Custom Section',
                    type: s.type || 'paragraph',
                    date: s.date || '',
                    content: s.type === 'bullets' ? '' : (s.content || ''),
                    points: s.type === 'bullets' ? points : [],
                };
            });

        return {
            ...resumeData,
            personal_info,
            professional_summary: get('sec-summary') || resumeData.professional_summary,
            experience,
            internship: intEntries.length > 0 ? intEntries : resumeData.internship,
            education,
            skills,
            skillGroups,
            certificates,
            project: projectEntries.length > 0 ? projectEntries : resumeData.project,
            achievements,
            languages,
            hobbies,
            custom_sections: customSections,
        };
    }, [sections, resumeData, eduEntries, expEntries, intEntries, certEntries, projectEntries, personalInfo, skillEntries, achievementEntries]);

    const clearSelectionUi = () => {
        selectedRangeRef.current = null;
        setSelectionUi((prev) => ({ ...prev, open: false, text: '' }));
    };

    const clearAiPopover = () => {
        setAiPopover({ open: false, x: 0, y: 0, stage: 'input', action: '', source: '', prompt: '', suggestion: '' });
    };

    const getSavedRangeRect = () => {
        if (selectedRangeRef.current) {
            return selectedRangeRef.current.getBoundingClientRect();
        }
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        return sel.getRangeAt(0).getBoundingClientRect();
    };

    const captureSelectionUi = () => {
        if (!previewEditMode) return;
        const root = editablePreviewRef.current;
        const sel = window.getSelection();
        if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
            clearSelectionUi();
            return;
        }

        const range = sel.getRangeAt(0);
        const ancestor = range.commonAncestorContainer;
        const inPreview = root.contains(ancestor.nodeType === Node.ELEMENT_NODE ? ancestor : ancestor.parentElement);
        const txt = sel.toString().trim();

        if (!inPreview || !txt) {
            clearSelectionUi();
            return;
        }

        const rect = range.getBoundingClientRect();
        selectedRangeRef.current = range.cloneRange();
        setSelectionUi({
            open: true,
            x: rect.left + (rect.width / 2),
            y: Math.max(rect.top - 8, 16),
            text: txt,
        });
    };

    const handleExport = () => {
        // Simple and robust export using window.print()
        // We ensure the print mode looks good with @media print CSS below
        window.print();
    };

    const handlePreviewInput = (e) => {
        if (!previewEditMode) return;
        const target = e.target;
        // Find nearest element with data-section
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        let el = sel.anchorNode;
        if (el.nodeType === Node.TEXT_NODE) el = el.parentElement;

        const sectionEl = el.closest('[data-section]');
        if (!sectionEl) return;

        const sectionId = sectionEl.getAttribute('data-section');
        const field = sectionEl.getAttribute('data-field');
        const index = sectionEl.hasAttribute('data-index') ? parseInt(sectionEl.getAttribute('data-index')) : null;
        const newText = sectionEl.innerText;

        if (sectionId === 'sec-summary' && field === 'content') {
            updateSection('sec-summary', { content: newText });
        } else if (sectionId === 'sec-experience' && index !== null) {
            updateExpEntry(index, { [field]: newText });
        } else if (sectionId === 'sec-internship' && index !== null) {
            updateIntEntry(index, { [field]: newText });
        } else if (sectionId === 'sec-education' && index !== null) {
            updateEduEntry(index, { [field]: newText });
        } else if (sectionId === 'sec-projects' && index !== null) {
            updateProjectEntry(index, { [field]: newText });
        } else if (sectionId === 'sec-skills' && field === 'content') {
            updateSection('sec-skills', { content: newText });
        } else if (sectionId === 'sec-languages' && field === 'content') {
            updateSection('sec-languages', { content: newText });
        } else if (sectionId === 'sec-hobbies' && field === 'content') {
            updateSection('sec-hobbies', { content: newText });
        } else if (sectionId === 'sec-achievements' && index !== null) {
            updateAchievementEntry(index, { [field]: newText });
        } else if (sectionId === 'sec-certs' && index !== null) {
            updateCertEntry(index, { [field]: newText });
        } else if (field === 'full_name') {
            updatePersonalInfo({ full_name: newText });
        } else if (field === 'profession') {
            updatePersonalInfo({ profession: newText });
        }
    };

    const restoreSelection = () => {
        const saved = selectedRangeRef.current;
        if (!saved) return false;
        const sel = window.getSelection();
        if (!sel) return false;
        sel.removeAllRanges();
        sel.addRange(saved);
        return true;
    };

    const applySelectionCommand = (command, value = null) => {
        if (!previewEditMode) return;
        const root = editablePreviewRef.current;
        if (!root) return;
        root.focus();
        if (!restoreSelection()) return;
        document.execCommand(command, false, value);
        setTimeout(captureSelectionUi, 0);
    };

    const streamSelectedTextEnhance = async (selectedText, rolePrompt) => {
        const response = await fetch('/api/resume/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sectionTitle: 'Selected Text',
                sectionType: 'paragraph',
                content: selectedText,
                role: rolePrompt,
            }),
        });
        if (!response.ok) throw new Error(`Server error ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let enhanced = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value, { stream: true }).split('\n');
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.error) throw new Error(parsed.error);
                    if (parsed.done) break;
                    if (parsed.text) enhanced += parsed.text;
                } catch {
                    // ignore malformed line
                }
            }
        }
        return enhanced;
    };

    const countWords = (text = '') => text.trim().split(/\s+/).filter(Boolean).length;

    const isDetailedRequest = (text = '') => /\b(detailed|detail|elaborate|expand|longer|explain more|in depth)\b/i.test(text);
    const isShortRequest = (text = '') => /\b(short|brief|concise|one line|one-liner|few words|minimal)\b/i.test(text);

    const getTargetWordLimit = (selectedText = '', userNeed = '', action = 'analyze') => {
        const base = Math.max(countWords(selectedText), 1);
        const detailed = isDetailedRequest(userNeed);
        const shortReq = isShortRequest(userNeed);

        if (shortReq) return Math.min(Math.max(Math.round(base * 0.9), 6), 35);
        if (detailed) return Math.min(Math.max(Math.round(base * 1.8), 24), 140);
        if (action === 'match') return Math.min(Math.max(Math.round(base * 1.1), 10), 70);
        return Math.min(Math.max(Math.round(base * 1.15), 10), 60);
    };

    const softTrimToWordLimit = (text = '', limit = 60) => {
        const words = text.trim().split(/\s+/).filter(Boolean);
        // Let slightly-over-limit outputs pass; trim only when too long.
        if (words.length <= Math.ceil(limit * 1.2)) return text.trim();
        return words.slice(0, limit).join(' ').trim();
    };

    const buildSelectionRolePrompt = ({ action, selectedText, userNeed = '' }) => {
        const limit = getTargetWordLimit(selectedText, userNeed, action);
        const baseRules = [
            'Rewrite ONLY the provided selected text.',
            'Do NOT add any new claims, metrics, tools, companies, projects, roles, or facts not present in the selected text.',
            'Keep meaning faithful to the selected text.',
            'Return plain text only (no markdown, no headings).',
            `Target length: about ${limit} words.`,
            'If user asks short, keep it short. If user explicitly asks detailed, provide more detail.',
        ];

        if (action === 'match') {
            return `${baseRules.join(' ')} Optimize wording for JD alignment and ATS readability without inventing details.`;
        }

        return `${baseRules.join(' ')} User request: ${userNeed}`;
    };

    const replaceSelectedText = (newText) => {
        const root = editablePreviewRef.current;
        if (!root) return;
        root.focus();
        if (!restoreSelection()) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
        sel.removeAllRanges();
        clearSelectionUi();
    };

    const runSelectionAiAction = async (action) => {
        const selectedText = selectionUi.text?.trim();
        if (!selectedText) {
            showToast('Select some text in preview first', 'error');
            return;
        }

        const rect = getSavedRangeRect();
        const x = rect ? rect.left + (rect.width / 2) : window.innerWidth / 2;
        const y = rect ? rect.bottom + 10 : 80;

        // Close format popup and open AI popup below selected text.
        setSelectionUi((prev) => ({ ...prev, open: false }));

        if (action === 'analyze') {
            setAiPopover({
                open: true,
                x,
                y,
                stage: 'input',
                action,
                source: selectedText,
                prompt: '',
                suggestion: '',
            });
            return;
        }

        // Match JD: show same popup and stream suggestion inside it.
        setAiPopover({ open: true, x, y, stage: 'loading', action, source: selectedText, prompt: '', suggestion: '' });
        setSelectionAiBusy(true);
        try {
            const prompt = buildSelectionRolePrompt({ action: 'match', selectedText, userNeed: '' });
            const improved = await streamSelectedTextEnhance(selectedText, prompt);
            const normalized = softTrimToWordLimit(improved || '', getTargetWordLimit(selectedText, '', 'match'));
            setAiPopover((prev) => ({ ...prev, stage: 'result', suggestion: normalized }));
        } catch (err) {
            showToast('AI action failed: ' + err.message, 'error');
            clearAiPopover();
        } finally {
            setSelectionAiBusy(false);
        }
    };

    const generateAnalyzeSuggestion = async () => {
        const selectedText = aiPopover.source?.trim();
        if (!selectedText) {
            showToast('Select some text in preview first', 'error');
            return;
        }

        const userNeed = aiPopover.prompt?.trim();
        if (!userNeed) {
            showToast('Tell AI what you need first', 'error');
            return;
        }

        setSelectionAiBusy(true);
        setAiPopover((prev) => ({ ...prev, stage: 'loading' }));
        try {
            const prompt = buildSelectionRolePrompt({ action: 'analyze', selectedText, userNeed });
            const improved = await streamSelectedTextEnhance(selectedText, prompt);
            const normalized = softTrimToWordLimit(improved || '', getTargetWordLimit(selectedText, userNeed, 'analyze'));
            setAiPopover((prev) => ({ ...prev, stage: 'result', suggestion: normalized }));
        } catch (err) {
            showToast('AI action failed: ' + err.message, 'error');
            clearAiPopover();
        } finally {
            setSelectionAiBusy(false);
        }
    };

    useEffect(() => {
        if (!previewEditMode) return;
        const onSelectionChange = () => captureSelectionUi();
        const onKeyUp = () => captureSelectionUi();
        const onMouseUp = () => captureSelectionUi();

        document.addEventListener('selectionchange', onSelectionChange);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('selectionchange', onSelectionChange);
            document.removeEventListener('keyup', onKeyUp);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [previewEditMode]);

    // ════════════════════════════════════════════════════════════════════════
    const editorSidebar = (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                <button
                    onClick={() => setShowAddSectionModal(true)}
                    className="w-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-blue-600 border border-dashed border-blue-200 rounded-xl py-2.5 hover:bg-blue-50/50 transition-all active:scale-[0.98]"
                >
                    <Plus className="w-3.5 h-3.5" /> Add New Section
                </button>
            </div>

            {sections.map((section, index) => {
                const isExpanded = expandedSectionId === section.id;
                return (
                    <div
                        key={section.id}
                        className={`${index > 0 ? 'border-t border-gray-100' : ''} transition-all ${isExpanded ? 'bg-slate-50/30 shadow-inner' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(section.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(section.id)}
                    >
                        {/* Header Row */}
                        <div
                            onClick={() => setExpandedSectionId(isExpanded ? '' : section.id)}
                            className={`w-full px-4 py-3 flex items-center gap-3 cursor-pointer select-none transition-colors hover:bg-slate-50/80 ${isExpanded ? 'bg-slate-50/50' : ''}`}
                        >
                            <span
                                className="cursor-grab text-slate-300 hover:text-slate-500 transition-colors"
                                title="Drag to reorder"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <GripVertical className="w-4 h-4" />
                            </span>
                            <span className="flex-1 text-[13px] font-bold text-slate-700 truncate">
                                {section.title || 'Untitled'}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSection(section.id);
                                    }}
                                    className="h-7 w-7 rounded-lg border border-slate-200 text-slate-300 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all flex items-center justify-center"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Expanded Content with fields */}
                        {isExpanded && (
                            <div className="px-4 pb-5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="space-y-4 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                                    {/* Personal Info */}
                                    {section.id === 'sec-contacts' && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                                                    <input value={personalInfo.full_name} onChange={e => updatePersonalInfo({ full_name: e.target.value })} className="w-full text-xs border border-slate-100 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Profession</label>
                                                    <input value={personalInfo.profession} onChange={e => updatePersonalInfo({ profession: e.target.value })} className="w-full text-xs border border-slate-100 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email</label>
                                                    <input value={personalInfo.email} onChange={e => updatePersonalInfo({ email: e.target.value })} className="w-full text-xs border border-slate-100 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Phone</label>
                                                    <input value={personalInfo.phone} onChange={e => updatePersonalInfo({ phone: e.target.value })} className="w-full text-xs border border-slate-100 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Location</label>
                                                <input value={personalInfo.location} onChange={e => updatePersonalInfo({ location: e.target.value })} className="w-full text-xs border border-slate-100 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">LinkedIn</label>
                                                    <input value={personalInfo.linkedin} onChange={e => updatePersonalInfo({ linkedin: e.target.value })} className="w-full text-xs border border-slate-100 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">GitHub</label>
                                                    <input value={personalInfo.github} onChange={e => updatePersonalInfo({ github: e.target.value })} className="w-full text-xs border border-slate-100 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 text-center">FB</label>
                                                    <input value={personalInfo.facebook} onChange={e => updatePersonalInfo({ facebook: e.target.value })} className="w-full text-xs border border-slate-100 rounded-lg px-1 py-2 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 text-center">IG</label>
                                                    <input value={personalInfo.instagram} onChange={e => updatePersonalInfo({ instagram: e.target.value })} className="w-full text-xs border border-slate-100 rounded-lg px-1 py-2 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 text-center font-bold">Web</label>
                                                    <input value={personalInfo.website} onChange={e => updatePersonalInfo({ website: e.target.value })} className="w-full text-xs border border-slate-100 rounded-lg px-1 py-2 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Education */}
                                    {section.id === 'sec-education' && (
                                        <div className="space-y-6">
                                            {eduEntries.map((edu, idx) => (
                                                <div key={idx} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3 relative group shadow-sm transition-all hover:shadow-md">
                                                    <button onClick={() => removeEduEntry(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1 transition-all"><X className="w-4 h-4" /></button>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Institution</label>
                                                        <input value={edu.institution} onChange={e => updateEduEntry(idx, { institution: e.target.value })} className="w-full text-xs font-bold border border-slate-200 bg-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-400" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Degree</label>
                                                            <input value={edu.degree} onChange={e => updateEduEntry(idx, { degree: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Field</label>
                                                            <input value={edu.field} onChange={e => updateEduEntry(idx, { field: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Start Date</label>
                                                            <input value={edu.start_date} onChange={e => updateEduEntry(idx, { start_date: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Graduation</label>
                                                            <input value={edu.graduation_date} onChange={e => updateEduEntry(idx, { graduation_date: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Location</label>
                                                            <input value={edu.location} onChange={e => updateEduEntry(idx, { location: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">GPA/Marks</label>
                                                            <input value={edu.gpa} onChange={e => updateEduEntry(idx, { gpa: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                                                            <button
                                                                onClick={() => handleEduDescriptionEnhance(idx)}
                                                                disabled={aiLoadingEduIdx === idx}
                                                                className="text-[9px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 disabled:opacity-50"
                                                            >
                                                                {aiLoadingEduIdx === idx ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Enhance
                                                            </button>
                                                        </div>
                                                        <textarea value={edu.description} onChange={e => updateEduEntry(idx, { description: e.target.value })} className="w-full text-[11px] border border-slate-200 rounded-lg p-2 min-h-[70px] resize-none outline-none focus:border-blue-300" placeholder="Activities, honors, etc." />
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={addEduEntry} className="w-full py-2.5 text-[10px] font-extrabold text-blue-600 hover:bg-blue-50/50 rounded-xl border border-dashed border-blue-200 transition-all">+ ADD EDUCATION ENTRY</button>
                                        </div>
                                    )}

                                    {/* Work Experience */}
                                    {section.id === 'sec-experience' && (
                                        <div className="space-y-6">
                                            {expEntries.map((exp, idx) => (
                                                <div key={idx} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3 relative group shadow-sm transition-all hover:shadow-md">
                                                    <button onClick={() => removeExpEntry(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1 transition-all"><X className="w-4 h-4" /></button>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Company</label>
                                                        <input value={exp.company} onChange={e => updateExpEntry(idx, { company: e.target.value })} className="w-full text-xs font-bold border border-slate-200 bg-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-400" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Position</label>
                                                        <input value={exp.position} onChange={e => updateExpEntry(idx, { position: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Start Date</label>
                                                            <input value={exp.start_date} onChange={e => updateExpEntry(idx, { start_date: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">End Date</label>
                                                            <input value={exp.end_date} onChange={e => updateExpEntry(idx, { end_date: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Location</label>
                                                        <input value={exp.location} onChange={e => updateExpEntry(idx, { location: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Project Title</label>
                                                            <input value={exp.project_title} onChange={e => updateExpEntry(idx, { project_title: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Project Link</label>
                                                            <input value={exp.project_link} onChange={e => updateExpEntry(idx, { project_link: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                                                            <button
                                                                onClick={() => handleExpDescriptionEnhance(idx)}
                                                                disabled={aiLoadingExpIdx === idx}
                                                                className="text-[9px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 disabled:opacity-50"
                                                            >
                                                                {aiLoadingExpIdx === idx ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Enhance
                                                            </button>
                                                        </div>
                                                        <textarea value={exp.description || ''} onChange={e => updateExpEntry(idx, { description: e.target.value })} className="w-full text-[11px] border border-slate-200 rounded-lg p-2 min-h-[90px] resize-none outline-none focus:border-blue-300" placeholder="Responsibility Highlights (one per line)" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={addExpEntry} className="w-full py-2.5 text-[10px] font-extrabold text-blue-600 hover:bg-blue-50/50 rounded-xl border border-dashed border-blue-200 transition-all">+ ADD EXPERIENCE ENTRY</button>
                                        </div>
                                    )}

                                    {/* Internship */}
                                    {section.id === 'sec-internship' && (
                                        <div className="space-y-6">
                                            {intEntries.map((exp, idx) => (
                                                <div key={idx} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3 relative group shadow-sm transition-all hover:shadow-md">
                                                    <button onClick={() => removeIntEntry(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1 transition-all"><X className="w-4 h-4" /></button>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Company/Organization</label>
                                                        <input value={exp.company} onChange={e => updateIntEntry(idx, { company: e.target.value })} className="w-full text-xs font-bold border border-slate-200 bg-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-400" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Position/Role</label>
                                                        <input value={exp.position} onChange={e => updateIntEntry(idx, { position: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Start Date</label>
                                                            <input value={exp.start_date} onChange={e => updateIntEntry(idx, { start_date: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">End Date</label>
                                                            <input value={exp.end_date} onChange={e => updateIntEntry(idx, { end_date: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Location</label>
                                                        <input value={exp.location} onChange={e => updateIntEntry(idx, { location: e.target.value })} className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                                                            <button
                                                                onClick={() => handleIntDescriptionEnhance(idx)}
                                                                disabled={aiLoadingIntIdx === idx}
                                                                className="text-[9px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 disabled:opacity-50"
                                                            >
                                                                {aiLoadingIntIdx === idx ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Enhance
                                                            </button>
                                                        </div>
                                                        <textarea value={exp.description || ''} onChange={e => updateIntEntry(idx, { description: e.target.value })} className="w-full text-[11px] border border-slate-200 rounded-lg p-2 min-h-[90px] resize-none outline-none focus:border-blue-300" placeholder="Responsibility Highlights (one per line)" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={addIntEntry} className="w-full py-2.5 text-[10px] font-extrabold text-blue-600 hover:bg-blue-50/50 rounded-xl border border-dashed border-blue-200 transition-all">+ ADD INTERNSHIP ENTRY</button>
                                        </div>
                                    )}

                                    {/* Skills */}
                                    {section.id === 'sec-skills' && (
                                        <div className="space-y-4">
                                            {skillEntries.map((group, idx) => (
                                                <div key={idx} className="space-y-1.5 relative group border border-slate-50 rounded-lg p-2.5 bg-slate-50/30">
                                                    {skillEntries.length > 1 && <button onClick={() => removeSkillEntry(idx)} className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 bg-white shadow-sm border border-rose-100 rounded-full text-rose-500 p-1 transition-all"><X className="w-3 h-3" /></button>}
                                                    <input value={group.category} onChange={e => updateSkillEntry(idx, { category: e.target.value })} placeholder="Skill Category (e.g. Tools)" className="w-full text-[11px] font-bold text-slate-500 uppercase tracking-tight outline-none bg-transparent focus:text-blue-600" />
                                                    <textarea value={group.skills} onChange={e => updateSkillEntry(idx, { skills: e.target.value })} placeholder="Skill1, Skill2, Skill3..." className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-2 min-h-[60px] resize-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 outline-none" />
                                                </div>
                                            ))}
                                            <button onClick={addSkillEntry} className="w-full py-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50/50 rounded-xl border border-dashed border-blue-200 transition-all">+ ADD SKILL CATEGORY</button>
                                        </div>
                                    )}

                                    {/* Projects */}
                                    {section.id === 'sec-projects' && (
                                        <div className="space-y-6">
                                            {projectEntries.map((proj, idx) => (
                                                <div key={idx} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3 relative group">
                                                    <button onClick={() => removeProjectEntry(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1"><X className="w-4 h-4" /></button>
                                                    <input value={proj.name} onChange={e => updateProjectEntry(idx, { name: e.target.value })} placeholder="Project Name" className="w-full text-xs font-bold bg-transparent outline-none focus:text-blue-600" />
                                                    <input value={proj.link} onChange={e => updateProjectEntry(idx, { link: e.target.value })} placeholder="Project Link" className="w-full text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white" />

                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Project Description</label>
                                                            <button onClick={() => handleProjectDescriptionEnhance(idx)} disabled={aiLoadingProjectDescIdx === idx} className="text-[9px] font-bold text-blue-600 flex items-center gap-1">
                                                                {aiLoadingProjectDescIdx === idx ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Enhance
                                                            </button>
                                                        </div>
                                                        <textarea value={proj.description} onChange={e => updateProjectEntry(idx, { description: e.target.value })} className="w-full text-[11px] border border-slate-200 rounded-lg p-2 min-h-[60px] resize-none bg-white" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Key Features (Bullets)</label>
                                                            <button onClick={() => handleProjectBulletsEnhance(idx)} disabled={aiLoadingProjectBulletsIdx === idx} className="text-[9px] font-bold text-blue-600 flex items-center gap-1">
                                                                {aiLoadingProjectBulletsIdx === idx ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Enhance
                                                            </button>
                                                        </div>
                                                        <textarea value={proj.bullets} onChange={e => updateProjectEntry(idx, { bullets: e.target.value })} className="w-full text-[11px] border border-slate-200 rounded-lg p-2 min-h-[60px] resize-none bg-white" placeholder="One point per line" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={addProjectEntry} className="w-full py-2.5 text-[10px] font-extrabold text-blue-600 hover:bg-blue-50/50 rounded-xl border border-dashed border-blue-200">+ ADD PROJECT</button>
                                        </div>
                                    )}

                                    {/* Certification */}
                                    {section.id === 'sec-certs' && (
                                        <div className="space-y-6">
                                            {certEntries.map((cert, idx) => (
                                                <div key={idx} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3 relative group">
                                                    <button onClick={() => removeCertEntry(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1"><X className="w-4 h-4" /></button>
                                                    <input value={cert.title} onChange={e => updateCertEntry(idx, { title: e.target.value })} placeholder="Certificate Title" className="w-full text-xs font-bold outline-none" />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input value={cert.issuer} onChange={e => updateCertEntry(idx, { issuer: e.target.value })} placeholder="Issuer" className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5" />
                                                        <input value={cert.date} onChange={e => updateCertEntry(idx, { date: e.target.value })} placeholder="Date" className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5" />
                                                    </div>
                                                    <input value={cert.link} onChange={e => updateCertEntry(idx, { link: e.target.value })} placeholder="Cert Link" className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5" />
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold text-slate-400">Description</label>
                                                            <button onClick={() => handleCertDescriptionEnhance(idx)} disabled={aiLoadingCertIdx === idx} className="text-[9px] font-bold text-blue-600 flex items-center gap-1">
                                                                {aiLoadingCertIdx === idx ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Enhance
                                                            </button>
                                                        </div>
                                                        <textarea value={cert.description} onChange={e => updateCertEntry(idx, { description: e.target.value })} className="w-full text-[11px] border border-slate-200 rounded-lg p-2 min-h-[50px] resize-none bg-white" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={addCertEntry} className="w-full py-2.5 text-[10px] font-extrabold text-blue-600 hover:bg-blue-50/50 rounded-xl border border-dashed border-blue-200">+ ADD CERTIFICATE</button>
                                        </div>
                                    )}

                                    {/* Achievements */}
                                    {section.id === 'sec-achievements' && (
                                        <div className="space-y-6">
                                            {achievementEntries.map((acv, idx) => (
                                                <div key={idx} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3 relative group">
                                                    <button onClick={() => removeAchievementEntry(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1"><X className="w-4 h-4" /></button>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input value={acv.title} onChange={e => updateAchievementEntry(idx, { title: e.target.value })} placeholder="Achievement Title" className="w-full text-xs font-bold outline-none" />
                                                        <input value={acv.date} onChange={e => updateAchievementEntry(idx, { date: e.target.value })} placeholder="Date" className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold text-slate-400">Short Description</label>
                                                            <button onClick={() => handleAchievementDescriptionEnhance(idx)} disabled={aiLoadingAchievementDescIdx === idx} className="text-[9px] font-bold text-blue-600 flex items-center gap-1">
                                                                {aiLoadingAchievementDescIdx === idx ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Enhance
                                                            </button>
                                                        </div>
                                                        <textarea value={acv.description} onChange={e => updateAchievementEntry(idx, { description: e.target.value })} className="w-full text-[11px] border border-slate-200 rounded-lg p-2 min-h-[50px] resize-none bg-white" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold text-slate-400">Impact Points (Bullets)</label>
                                                            <button onClick={() => handleAchievementPointsEnhance(idx)} disabled={aiLoadingAchievementPointsIdx === idx} className="text-[9px] font-bold text-blue-600 flex items-center gap-1">
                                                                {aiLoadingAchievementPointsIdx === idx ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Enhance
                                                            </button>
                                                        </div>
                                                        <textarea value={acv.points} onChange={e => updateAchievementEntry(idx, { points: e.target.value })} className="w-full text-[11px] border border-slate-200 rounded-lg p-2 min-h-[50px] resize-none bg-white" placeholder="One point per line" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={addAchievementEntry} className="w-full py-2.5 text-[10px] font-extrabold text-blue-600 hover:bg-blue-50/50 rounded-xl border border-dashed border-blue-200">+ ADD ACHIEVEMENT</button>
                                        </div>
                                    )}

                                    {/* Professional Summary */}
                                    {section.id === 'sec-summary' && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Professional Summary</label>
                                                <button
                                                    onClick={() => handleAiEnhance(section)}
                                                    disabled={aiLoadingId === section.id}
                                                    className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 disabled:opacity-50"
                                                >
                                                    {aiLoadingId === section.id ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Enhance
                                                </button>
                                            </div>
                                            <textarea
                                                value={section.content || ''}
                                                onChange={e => updateSection(section.id, { content: e.target.value })}
                                                placeholder="Write a brief summary of your professional experience..."
                                                className="w-full text-xs border border-slate-100 rounded-xl px-4 py-3 min-h-[140px] resize-none outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200 transition-all font-medium leading-relaxed"
                                            />
                                        </div>
                                    )}

                                    {/* Languages */}
                                    {section.id === 'sec-languages' && (
                                        <div className="space-y-4">
                                            <div className="space-y-1.5 relative group border border-slate-50 rounded-lg p-2.5 bg-slate-50/30">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">Languages (Comma Separated)</label>
                                                <textarea
                                                    value={section.content || ''}
                                                    onChange={e => updateSection(section.id, { content: e.target.value })}
                                                    placeholder="e.g. English, Hindi, Spanish"
                                                    className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-2 min-h-[60px] resize-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Hobbies */}
                                    {section.id === 'sec-hobbies' && (
                                        <div className="space-y-4">
                                            <div className="space-y-1.5 relative group border border-slate-50 rounded-lg p-2.5 bg-slate-50/30">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">Hobbies & Interests</label>
                                                <textarea
                                                    value={section.content || ''}
                                                    onChange={e => updateSection(section.id, { content: e.target.value })}
                                                    placeholder="e.g. Reading, Football, Traveling"
                                                    className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-2 min-h-[60px] resize-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Fallback for basic text sections + custom */}
                                    {!['sec-contacts', 'sec-education', 'sec-experience', 'sec-internship', 'sec-skills', 'sec-projects', 'sec-certs', 'sec-achievements', 'sec-summary', 'sec-languages', 'sec-hobbies'].includes(section.id) && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Section Content</label>
                                                <button
                                                    onClick={() => handleAiEnhance(section)}
                                                    disabled={aiLoadingId === section.id}
                                                    className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 disabled:opacity-50"
                                                >
                                                    {aiLoadingId === section.id ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Enhance
                                                </button>
                                            </div>
                                            <textarea
                                                value={section.content || ''}
                                                onChange={e => updateSection(section.id, { content: e.target.value })}
                                                placeholder={`Enter ${section.title} details...`}
                                                className="w-full text-xs border border-slate-100 rounded-xl px-4 py-3 min-h-[160px] resize-none outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200 transition-all"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col relative">

            {/* ── Top header ── */}
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setMobileSidebarOpen(true)}
                        className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <h1 className="text-[15px] font-semibold text-slate-800 truncate max-w-[120px] sm:max-w-none">{template?.name || 'Resume Editor'}</h1>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mobile Only Edit Button */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold shadow-sm hover:bg-blue-700 transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>
                    <button
                        onClick={() => setMobileSidebarOpen(true)}
                        className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-lg text-[11px] font-bold shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Sections
                    </button>
                </div>
            </header>

            {uploadSourceMeta && (
                <div className="bg-blue-50 border-b border-blue-100 px-5 py-2.5">
                    <p className="text-xs text-blue-900">
                        Showing extracted content from uploaded resume:
                        <span className="font-semibold"> {uploadSourceMeta.fileName}</span>
                    </p>
                </div>
            )}

            {/* ── Main split ── */}
            <div className="flex flex-1 overflow-hidden gap-0">

                {/* ── Mobile Sidebar Drawer ── */}
                <div className={`lg:hidden fixed inset-0 z-[100] flex transition-opacity duration-300 ${mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                    <div className={`relative w-[300px] max-w-[80vw] h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <span className="font-bold text-slate-800">Sections</span>
                            <button
                                onClick={() => setMobileSidebarOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        {editorSidebar}
                    </div>
                </div>

                {/* ══ LEFT PANEL — Sections (Desktop) ═══════════════════════════ */}
                <aside className="hidden lg:flex w-full max-w-[320px] min-w-[260px] bg-white border-r border-slate-100 flex-col overflow-hidden shrink-0">
                    {editorSidebar}
                </aside>

                {/* ══ RIGHT PANEL — Editable Preview ══════════════════════════ */}
                <main className="flex-1 h-full overflow-hidden flex flex-col bg-slate-200">

                    {/* Preview toolbar */}
                    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">
                                Live Preview
                            </span>
                            <button
                                onClick={() => {
                                    setPreviewEditMode((v) => !v);
                                    setTimeout(captureSelectionUi, 0);
                                }}
                                className={`ml-2 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${previewEditMode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {previewEditMode ? 'Editing On' : 'Click To Edit'}
                            </button>
                        </div>
                        {/* Inline color swatch */}
                        <div className="flex items-center gap-1.5">
                            {ACCENT_COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => { setAccentColor(c); setCustomColor(c); }}
                                    className="w-4 h-4 rounded-full border transition-transform hover:scale-125"
                                    style={{
                                        backgroundColor: c,
                                        borderColor: accentColor === c ? '#2563eb' : 'transparent',
                                        outline: accentColor === c ? '2px solid #bfdbfe' : 'none',
                                    }}
                                    title={c}
                                />
                            ))}
                            <input
                                type="color"
                                value={customColor}
                                onChange={(e) => { setCustomColor(e.target.value); setAccentColor(e.target.value); }}
                                className="w-5 h-5 rounded-full border border-slate-300 cursor-pointer"
                                title="Custom color"
                            />
                        </div>
                    </div>

                    {/* Preview area — A4 paged layout */}
                    <div className="flex-1 overflow-x-auto overflow-y-auto bg-slate-300 flex flex-col items-center py-5 px-4 custom-scrollbar">
                        <div
                            className="[--preview-scale:0.75] xl:[--preview-scale:0.85] 2xl:[--preview-scale:0.9] flex flex-col items-center origin-top-center transition-all"
                            style={{
                                transform: 'scale(var(--preview-scale))',
                                width: `${PAGE_BOX_W}px`,
                                flexShrink: 0,
                                marginBottom: '-100px' // Compensate for scaled phantom space
                            }}
                        >
                            <div
                                className="bg-white shadow-2xl relative"
                                style={{
                                    width: PAGE_BOX_W,
                                    minHeight: PAGE_BOX_H,
                                    padding: PAGE_INNER_PAD,
                                }}
                            >
                                {!previewEditMode ? (
                                    <div onClick={() => setPreviewEditMode(true)} title="Click to edit">
                                        <ResumePreview templateConfig={previewTemplateConfig} accentColor={accentColor} data={liveResumeData} />
                                    </div>
                                ) : (
                                    <div
                                        ref={editablePreviewRef}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={handlePreviewInput}
                                        onMouseUp={captureSelectionUi}
                                        onKeyUp={captureSelectionUi}
                                        className="outline-none"
                                        style={{ width: A4_W, minHeight: A4_HEIGHT }}
                                    >
                                        <ResumePreview templateConfig={previewTemplateConfig} accentColor={accentColor} data={liveResumeData} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {previewEditMode && selectionUi.open && !aiPopover.open && createPortal(
                        <div
                            className="fixed z-50 -translate-x-1/2 -translate-y-full"
                            style={{ left: selectionUi.x, top: selectionUi.y }}
                        >
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-lg px-2 py-2 flex items-center gap-1.5">
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => applySelectionCommand('bold')}
                                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold"
                                    title="Bold"
                                >
                                    B
                                </button>
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => applySelectionCommand('italic')}
                                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 italic"
                                    title="Italic"
                                >
                                    I
                                </button>
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => applySelectionCommand('underline')}
                                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 underline"
                                    title="Underline"
                                >
                                    U
                                </button>
                                <input
                                    type="color"
                                    defaultValue="#111827"
                                    onChange={(e) => applySelectionCommand('foreColor', e.target.value)}
                                    className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full"
                                    title="Text color"
                                />
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => applySelectionCommand('increaseFontSize')}
                                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                                    title="Increase text size"
                                >
                                    A+
                                </button>

                                <div className="w-px h-6 bg-slate-200 mx-0.5" />

                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => runSelectionAiAction('analyze')}
                                    disabled={selectionAiBusy}
                                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1"
                                >
                                    {selectionAiBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    AI Analysis
                                </button>
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => runSelectionAiAction('match')}
                                    disabled={selectionAiBusy}
                                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1"
                                >
                                    <Target className="w-3 h-3" />
                                    Match JD
                                </button>
                            </div>
                        </div>,
                        document.body
                    )}

                    {previewEditMode && aiPopover.open && createPortal(
                        <div
                            className="fixed z-50 -translate-x-1/2"
                            style={{ left: aiPopover.x, top: aiPopover.y }}
                        >
                            <div className="w-[360px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                        {aiPopover.action === 'match' ? 'Match JD' : 'AI Analysis'}
                                    </p>
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={clearAiPopover}
                                        className="text-[11px] px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                                    >
                                        Close
                                    </button>
                                </div>

                                {aiPopover.stage === 'input' && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-600">Tell AI what you need for this selected text.</p>
                                        <input
                                            value={aiPopover.prompt}
                                            onChange={(e) => setAiPopover((prev) => ({ ...prev, prompt: e.target.value }))}
                                            placeholder="e.g. make it more concise and ATS-friendly"
                                            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={generateAnalyzeSuggestion}
                                                disabled={selectionAiBusy}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-1"
                                            >
                                                {selectionAiBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                Generate Suggestion
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {aiPopover.stage === 'loading' && (
                                    <div className="py-3 flex items-center gap-2 text-xs text-slate-600">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        Generating suggestion...
                                    </div>
                                )}

                                {aiPopover.stage === 'result' && (
                                    <div className="space-y-2">
                                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5">
                                            <p className="text-[11px] uppercase tracking-wide text-blue-700 mb-1">Suggestion</p>
                                            <p className="text-xs text-slate-800 whitespace-pre-wrap">{aiPopover.suggestion}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    replaceSelectedText(aiPopover.suggestion);
                                                    clearAiPopover();
                                                    showToast('Selected text replaced', 'success');
                                                }}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                            >
                                                Replace Selected Text
                                            </button>
                                            <button
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={clearAiPopover}
                                                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                                            >
                                                Keep Original
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>,
                        document.body
                    )}

                    {showAddSectionModal && createPortal(
                        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center px-4">
                            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 relative flex flex-col">
                                <button
                                    onClick={() => setShowAddSectionModal(false)}
                                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-xl"
                                    title="Close"
                                >
                                    ×
                                </button>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Add New Section</h3>
                                <p className="text-xs text-slate-500 mb-3">
                                    Select a section to add, or choose "Other" to create a custom section.
                                </p>
                                <select
                                    value={newSectionForm.title}
                                    onChange={e => setNewSectionForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 mb-3"
                                >
                                    <option value="">Select section…</option>
                                    {['Professional Summary', 'Education', 'Work Experience', 'Certification', 'Projects', 'Personal Details', 'Skills', 'Achievements', 'Languages', 'Hobbies'].filter(
                                        s => !sections.some(sec => sec.title === s)
                                    ).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                    <option value="Other">Other (Custom)</option>
                                </select>
                                {['Languages', 'Hobbies', 'Skills', 'Achievements', 'Certification', 'Projects', 'Education', 'Work Experience', 'Personal Details', 'Professional Summary'].includes(newSectionForm.title) && (
                                    <div className="mb-3">
                                        {/* Predefined format preview for known sections */}
                                        <div className="text-xs text-slate-600 mb-1">Predefined format for <span className="font-semibold">{newSectionForm.title}</span>:</div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 whitespace-pre-line">
                                            {(() => {
                                                switch (newSectionForm.title) {
                                                    case 'Languages':
                                                        return 'e.g. English, Hindi, Spanish';
                                                    case 'Hobbies':
                                                        return 'e.g. Reading, Football, Painting';
                                                    case 'Skills':
                                                        return 'e.g. React, Node.js, SQL';
                                                    case 'Achievements':
                                                        return 'Title\nDate\nDescription\nBullet Points (one per line)';
                                                    case 'Certification':
                                                        return 'Title\nIssuer\nDate\nLink\nDescription';
                                                    case 'Projects':
                                                        return 'Title\nLink\nDescription\nBullet Points (one per line)';
                                                    case 'Education':
                                                        return 'Degree\nField\nInstitution\nLocation\nStart Date\nEnd Date\nGPA\nDescription';
                                                    case 'Work Experience':
                                                        return 'Company\nPosition\nLocation\nStart Date\nEnd Date\nProject Title\nProject Link\nDescription';
                                                    case 'Personal Details':
                                                        return 'Full Name\nProfession\nEmail\nPhone\nLocation\nLinkedIn\nGitHub\nFacebook\nInstagram\nWebsite';
                                                    case 'Professional Summary':
                                                        return 'A short summary paragraph about your professional experience.';
                                                    default:
                                                        return '';
                                                }
                                            })()}
                                        </div>
                                    </div>
                                )}
                                {newSectionForm.title === 'Other' && (
                                    <div className="mb-3 space-y-2">
                                        <input
                                            value={newSectionForm.customTitle || ''}
                                            onChange={e => setNewSectionForm(prev => ({ ...prev, customTitle: e.target.value }))}
                                            placeholder="Custom section name/title"
                                            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                        <textarea
                                            rows={3}
                                            value={newSectionForm.content}
                                            onChange={e => setNewSectionForm(prev => ({ ...prev, content: e.target.value }))}
                                            placeholder="Description, paragraph, bullet points (all in one input)"
                                            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                                        />
                                        <input
                                            type="month"
                                            value={newSectionForm.date || ''}
                                            onChange={e => setNewSectionForm(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                                            placeholder="Date (optional)"
                                        />
                                        <input
                                            type="url"
                                            value={newSectionForm.link || ''}
                                            onChange={e => setNewSectionForm(prev => ({ ...prev, link: e.target.value }))}
                                            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                                            placeholder="Link (optional)"
                                        />
                                    </div>
                                )}
                                <div className="mt-3 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => setShowAddSectionModal(false)}
                                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={createCustomSection}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Add Section
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </main>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        margin: 10mm 4mm 10mm 1mm ; /* Consistent gap on all sides for every page (Top, Bottom, Left, Right) */
                        size: A4 portrait;
                    }

                    /* Hide specific application UI elements */
                    header.sticky,
                    header.bg-white.border-b,
                    aside,
                    .no-print,
                    button,
                    [role="alert"],
                    .fixed.inset-0.z-\\[9999\\],
                    .sticky.top-0,
                    .bg-blue-50.border-b.border-blue-100 {
                        display: none !important;
                    }

                    /* Reset main container and background */
                    body, html {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .flex-1.overflow-x-auto.overflow-y-auto.bg-slate-300 {
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        display: block !important;
                        width: 100% !important;
                    }

                    /* Un-scale the wrapper */
                    .flex-1.overflow-x-auto.overflow-y-auto.bg-slate-300 > div {
                        transform: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        display: block !important;
                    }

                    /* Style the white resume box to fit the printable area */
                    .bg-white.shadow-2xl.relative {
                        box-shadow: none !important;
                        padding: 0 !important; /* Rely on template's internal padding */
                        width: 100% !important; /* Resizes to fit within @page margins */
                        min-height: auto !important;
                        border: none !important;
                        margin: 0 !important;
                        background: white !important;
                        display: block !important;
                        position: static !important;
                    }

                    /* Ensure template content fills the available width */
                    .bg-white.shadow-2xl.relative > div {
                        width: 100% !important;
                    }

                    /* Ensure resume content is fully visible */
                    .bg-white.shadow-2xl.relative header,
                    .bg-white.shadow-2xl.relative div {
                        visibility: visible !important;
                        opacity: 1 !important;
                    }
                }
            `}} />
        </div>
    );
}
