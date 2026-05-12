import React, { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../../../config/axiosConfig';
import { useToast } from '../../../context/ToastContext';
import extractPDFText from 'react-pdftotext';
import mammoth from 'mammoth';
import AILoader from '../../../components/ui/AILoader';
import { AnimatePresence } from 'framer-motion';
import { paymentService } from '../../../services/paymentService';

// Single dynamic template renderer
import DynamicTemplate from '../../../components/resume-templates/DynamicTemplate';
import DUMMY_DATA from '../../../data/resumeDummyData';

const ACCENT_COLOR = '#3B82F6';
const REPORT_SESSION_KEY = 'resumeScoreReportJson';
const TEMPLATE_UPLOAD_SESSION_KEY = 'resumeTemplateUploadedDataJson';

function ResumePreview({ templateConfig, accentColor, data }) {
    return <DynamicTemplate data={data} accentColor={accentColor} templateConfig={templateConfig} />;
}

const asArray = (v) => (Array.isArray(v) ? v : []);

const formatText = (v) => {
    if (typeof v === 'string') return v.trim();
    if (v == null) return '';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'object') {
        return [v.title, v.name, v.role, v.company, v.degree, v.school, v.institution, v.summary, v.description]
            .filter(Boolean)
            .join(' - ')
            .trim();
    }
    return '';
};

const extractRawSections = (text) => {
    if (!text) return {};
    const sections = {};
    const spaced = (s) => s.split('').map(c => c === ' ' ? '\\s*' : c + '\\s*').join('');
    const headers = [
        { key: 'summary', regex: new RegExp(`PROFILE\\s*SUMMARY|SUMMARY|ABOUT|OBJECTIVE`, 'i') },
        { key: 'experience', regex: new RegExp(`${spaced('EXPERIENCE')}|WORK\\s*EXPERIENCE|PROFESSIONAL\\s*EXPERIENCE|EMPLOYMENT\\s*HISTORY`, 'i') },
        { key: 'internship', regex: new RegExp(`${spaced('INTERNSHIP')}`, 'i') },
        { key: 'projects', regex: new RegExp(`${spaced('PROJECTS')}|${spaced('PROJECT')}:?|PERSONAL\\s*PROJECTS|ACADEMIC\\s*PROJECTS|KEY\\s*PROJECTS`, 'i') },
        { key: 'education', regex: new RegExp(`${spaced('EDUCATION')}|ACADEMIC\\s*BACKGROUND`, 'i') },
        { key: 'skills', regex: new RegExp(`${spaced('SKILLS')}|TECHNICAL\\s*SKILLS|CORE\\s*COMPETENCIES|EXPERTISE`, 'i') },
        { key: 'achievements', regex: new RegExp(`${spaced('ACHIEVEMENTS')}|AWARDS|ACCOMPLISHMENTS`, 'i') },
        { key: 'certifications', regex: new RegExp(`${spaced('CERTIFICATES')}|${spaced('CERTIFICATIONS')}|LICENSES`, 'i') },
        { key: 'languages', regex: /(^|\n)\s*(LANGUAGES)\s*(:|\n|$)/i },
        { key: 'hobbies', regex: new RegExp(`${spaced('HOBBIES')}|INTERESTS`, 'i') },
    ];

    const foundHeaders = [];
    headers.forEach(h => {
        const re = new RegExp(h.regex.source, 'gi');
        let match;
        while ((match = re.exec(text)) !== null) {
            foundHeaders.push({ key: h.key, index: match.index, length: match[0].length });
        }
    });

    foundHeaders.sort((a, b) => a.index - b.index);

    // Filter out "sub-headers" like "Programming Languages" inside "Skills"
    // By checking if they are reasonably far from the last header. 
    // This is simple but effective.
    const filteredHeaders = [];
    for (let i = 0; i < foundHeaders.length; i++) {
        const cur = foundHeaders[i];
        const last = filteredHeaders[filteredHeaders.length - 1];
        if (last && cur.key === 'languages' && last.key === 'skills' && (cur.index - last.index < 150)) {
            continue; // Skip Languages if it's very close to Skills (probably "Programming Languages:")
        }
        filteredHeaders.push(cur);
    }

    for (let i = 0; i < filteredHeaders.length; i++) {
        const start = filteredHeaders[i].index + filteredHeaders[i].length;
        const end = filteredHeaders[i + 1] ? filteredHeaders[i + 1].index : text.length;
        const content = text.slice(start, end).trim();
        if (content) {
            sections[filteredHeaders[i].key] = (sections[filteredHeaders[i].key] ? (sections[filteredHeaders[i].key] + '\n' + content) : content);
        }
    }
    return sections;
};

const recoverVerbatim = (blockText, entryTitle, entryCompany, nextEntryTitle, nextEntryCompany, fallbackText = '') => {
    const search = (text) => {
        if (!text) return null;
        const clean = (s) => (s || '').toLowerCase().trim();
        const findIndex = (t, c) => {
            const titleIdx = (t && t.length > 3) ? text.toLowerCase().indexOf(clean(t)) : -1;
            const compIdx = (c && c.length > 3) ? text.toLowerCase().indexOf(clean(c)) : -1;
            if (titleIdx === -1) return compIdx;
            if (compIdx === -1) return titleIdx;
            return Math.min(titleIdx, compIdx);
        };
        const startIdx = findIndex(entryTitle, entryCompany);
        if (startIdx === -1) return null;
        const nextIdx = findIndex(nextEntryTitle, nextEntryCompany);
        const endIdx = (nextIdx !== -1 && nextIdx > startIdx) ? nextIdx : text.length;
        const limit = (nextIdx === -1) ? Math.min(text.length, startIdx + 2000) : endIdx;
        return text.slice(startIdx, limit).trim();
    };

    return search(blockText) || search(fallbackText) || '';
};

const isPlaceholder = (text) => {
    if (!text) return true;
    const p = text.toLowerCase();
    return p.includes('key achievements') || p.includes('what it does') || p.includes('your responsibilities') || p.length < 25 || p.trim() === '.';
};

const smoothBullets = (text) => {
    if (!text) return '';
    const lines = text
        .replace(/[•●▪◦⬧]/g, '\n• ')
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
    
    const joined = [];
    lines.forEach(line => {
        if (line.match(/^[•\-\–\*]/)) {
            joined.push(line);
        } else if (joined.length > 0) {
            joined[joined.length - 1] += ' ' + line;
        } else {
            joined.push(line);
        }
    });

    return joined
        .map(l => l.replace(/^[•\-\–\*]\s?/, '').replace(/^\.\s?/, '').trim())
        .filter(l => l.length > 0 && l !== '.')
        .join('\n');
};

const parseSkillsBlock = (text) => {
    if (!text) return [];
    
    // Guard: If it looks like a paragraph (long text with no commas/colons), it's likely mis-extracted summary noise
    if (text.length > 250 && !text.includes(',') && !text.includes(':')) return [];

    // Pre-insert newlines before potential categories (e.g. "Languages:")
    const normalized = text.replace(/([A-Z][A-Za-z\s]{2,20}):/g, '\n$1:');
    const lines = normalized.split('\n');
    const groups = [];
    let currentSkills = [];

    lines.forEach(line => {
        const trimmed = line.trim().replace(/^[:&]\s*/, '').replace(/\s+[:&]\s*$/, '');
        if (!trimmed || trimmed.length < 2) return;
        
        if (trimmed.match(/^\d{4}\s*[-–]\s*\d{4}$/)) return;

        const match = trimmed.match(/^([^:]+):\s*(.*)$/);
        if (match) {
            if (currentSkills.length > 0) {
                groups.push({ category: 'Skills', skills: [...new Set(currentSkills)] });
                currentSkills = [];
            }
            const cat = match[1].trim();
            const vals = match[2].split(/[,|;]/).map(s => s.trim().replace(/^[:&]\s*/, '')).filter(Boolean);
            groups.push({ category: cat, skills: vals });
        } else {
            const vals = trimmed.split(/[,|;]/).map(s => s.trim().replace(/^[:&]\s*/, '')).filter(Boolean);
            currentSkills.push(...vals);
        }
    });

    if (currentSkills.length > 0) {
        groups.push({ category: 'Skills', skills: [...new Set(currentSkills)] });
    }
    // Filter out groups that look like summary text (too many words per skill)
    return groups.filter(g => g.skills.every(s => s.split(' ').length < 8));
};

const mapReportToTemplateDraft = (report, fileName, rawText = '') => {
    const rawSections = extractRawSections(rawText);
    const info = report?.candidate_info || {};
    const social = info.social_links || {};
    const original = report?.original_resume || {};
    const projectsRaw = asArray(original.projects || original.project);
    const skillsRaw = asArray(original.skills);
    const toolsRaw = asArray(original.tools);

    const isNoise = (s) => !s || s.match(/^\d{4}/) || s.length < 2 || s === '.';
    const skillValues = [
        ...skillsRaw.map(formatText),
        ...toolsRaw.map(formatText),
    ].map(s => s.replace(/^[:&]\s*/, '').trim()).filter(s => !isNoise(s));

    const mergedSummary = (isPlaceholder(original.about || report.summary) && rawSections.summary) 
        ? rawSections.summary 
        : (original.about || report.summary || '');

    const resumeData = {
        __strictMode: true,
        personal_info: {
            full_name: info.full_name || info.name || '',
            profession: info.profession || info.title || info.current_role || '',
            email: info.email || '',
            phone: info.phone || '',
            location: info.location || info.address || [info.city, info.state].filter(Boolean).join(', ') || '',
            linkedin: social.linkedin || info.linkedin || '',
            github: social.github || info.github || '',
            website: social.website || social.portfolio || info.website || '',
            facebook: '',
            instagram: '',
        },
        professional_summary: (mergedSummary || '').trim(),
        experience: (() => {
            const expAll = asArray(original.experience);
            const rawIntBlock = (rawSections.internship || '').toLowerCase();
            const mapped = expAll.map((e, idx) => {
                let start_date = e.start_date || '';
                let end_date = e.end_date || '';
                if (!start_date && end_date && /^\d{4}-\d{2}$/.test(end_date)) start_date = '';
                if (!end_date && e.start_date && /^\d{4}-\d{2}$/.test(e.start_date)) { end_date = e.start_date; start_date = ''; }
                
                return {
                    company: e.company || '',
                    position: e.position || e.role || '',
                    location: e.location || '',
                    project_title: e.project_title || '',
                    project_link: e.project_link || e.link || '',
                    start_date,
                    end_date,
                    is_current: Boolean(e.is_current),
                    description: (() => {
                        const aiDesc = [
                            e.description || e.summary || '',
                            ...asArray(e.bullets || e.points || e.responsibilities || e.highlights || e.tasks).map(formatText)
                        ].filter(Boolean).join('\n');
                        if (!isPlaceholder(aiDesc)) return aiDesc;
                        const verbatim = recoverVerbatim(rawSections.experience, e.position, e.company, expAll[idx+1]?.position, expAll[idx+1]?.company, rawText);
                        return smoothBullets(verbatim || aiDesc);
                    })(),
                };
            });

            // Split into experience and internship
            const isInt = (e, i) => {
                const comp = (expAll[i].company || '').toLowerCase();
                const role = (expAll[i].position || expAll[i].role || '').toLowerCase();
                return (comp && rawIntBlock.includes(comp)) || role.includes('intern');
            };

            const finalExp = mapped.filter((_, i) => !isInt(_, i));
            const finalInt = mapped.filter((_, i) => isInt(_, i));
            
            // Return experience, but attach internship to result temporarily to extract it later
            finalExp.__internships = finalInt;
            return finalExp;
        })(),
        education: asArray(original.education).map((e) => {
            // ... (keep education mapping same)
            let start_date = e.start_date || '';
            let graduation_date = e.graduation_date || e.end_date || '';
            if (!start_date && graduation_date && /^\d{4}-\d{2}$/.test(graduation_date)) start_date = '';
            if (!graduation_date && e.start_date && /^\d{4}-\d{2}$/.test(e.start_date)) { graduation_date = e.start_date; start_date = ''; }
            let gpa = e.gpa || '';
            if (!gpa && e.description) {
                const match = e.description.match(/(\d+(?:\.\d+)?%?|CGPA\s*:?\s*\d+(?:\.\d+)?)/i);
                if (match) gpa = match[0];
            }
            return {
                institution: e.institution || e.school || '',
                location: e.location || '',
                degree: e.degree || '',
                field: e.field || '',
                start_date,
                graduation_date,
                gpa,
                description: e.description || '',
            };
        }),
        internship: [], // Placeholder, will populate below
        skills: skillValues,
        skillGroups: (() => {
            const aiGroups = [
                { category: 'Skills', skills: skillsRaw.map(formatText).filter(Boolean) },
                { category: 'Tools', skills: toolsRaw.map(formatText).filter(Boolean) },
            ].filter((g) => g.skills.length > 0);

            const rawGroups = parseSkillsBlock(rawSections.skills);
            
            if (rawGroups.length > 0) return rawGroups;
            if (aiGroups.length > 0) return aiGroups;
            return [{ category: 'Skills', skills: [] }];
        })(),
        project: asArray(original.projects || original.project).map((p, idx) => {
            const aiDesc = p.description || p.summary || '';
            const nextEntry = asArray(original.projects || original.project)[idx + 1];
            // Recover verbatim for projects too
            const verbatim = isPlaceholder(aiDesc) 
                ? recoverVerbatim(rawSections.projects, p.title || p.name, '', nextEntry?.title || nextEntry?.name, '', rawText)
                : aiDesc;
            
            return {
                name: p.title || p.name || `Project ${idx + 1}`,
                link: p.link || p.url || '',
                description: smoothBullets(verbatim || aiDesc),
                bullets: [
                    ...asArray(p.bullets || p.points || p.highlights || p.features).map(formatText)
                ].filter(Boolean).join('\n'),
            };
        }),
        certificates: asArray(original.certificates || original.certifications).map((c) => ({
            title: c.title || c.name || '',
            issuer: c.issuer || c.organization || '',
            link: c.link || c.url || '',
            date: c.date || '',
            description: c.description || '',
        })),
        achievements: asArray(original.achievements).map((a) => ({
            title: a.title || a.name || '',
            date: a.date || '',
            description: a.description || '',
            points: asArray(a.points).map(formatText).filter(Boolean).join('\n'),
        })),
        languages: (() => {
            const aiVal = asArray(original.languages).map(formatText).filter(Boolean).join(', ');
            if (aiVal && aiVal.length < 300) return aiVal;
            return (rawSections.languages || aiVal || '').trim();
        })(),
        hobbies: (() => {
            const aiVal = asArray(original.hobbies).map(formatText).filter(Boolean).join(', ');
            if (aiVal && aiVal.length < 300) return aiVal;
            return (rawSections.hobbies || aiVal || '').trim();
        })(),
        // Capture everything else as custom sections
        custom_sections: Object.keys(original)
            .filter(key => ![
                'about', 'experience', 'skills', 'tools', 'projects', 'education', 
                'certificates', 'certifications', 'achievements', 'languages', 'hobbies',
                'social_links', 'candidate_info'
            ].includes(key))
            .map(key => ({
                id: `custom-${key}`,
                title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                content: typeof original[key] === 'string' 
                    ? original[key] 
                    : asArray(original[key]).map(formatText).filter(Boolean).join('\n')
            }))
    };

    // Extract internship from the temporary property on experience
    resumeData.internship = resumeData.experience.__internships || [];
    delete resumeData.experience.__internships;

    if (resumeData.internship.length === 0 && (rawSections.internship || rawText.match(/INTERNSHIP/i))) {
        // Fallback for raw internship if AI didn't structure it
        resumeData.internship = [{
            company: 'Internship',
            position: 'Intern',
            description: smoothBullets(rawSections.internship || recoverVerbatim(rawText.split('\n').filter(l => l.toUpperCase().includes('INTERNSHIP')).join('\n'), 'INTERNSHIP', '', '', '', rawText))
        }];
    }

    const hasContacts = Boolean(
        resumeData.personal_info.full_name ||
        resumeData.personal_info.profession ||
        resumeData.personal_info.email ||
        resumeData.personal_info.phone ||
        resumeData.personal_info.location ||
        resumeData.personal_info.linkedin ||
        resumeData.personal_info.github ||
        resumeData.personal_info.website
    );

    const sectionLayout = [
        { id: 'sec-summary', title: 'Professional Summary', source: 'about', enabled: !!resumeData.professional_summary, location: 'full' },
        { id: 'sec-experience', title: 'Work Experience', source: 'experience', enabled: resumeData.experience.length > 0, location: 'full' },
        { id: 'sec-internship', title: 'Internship', source: 'internship', enabled: resumeData.internship.length > 0, location: 'full' },
        { id: 'sec-projects', title: 'Projects', source: 'projects', enabled: resumeData.project.length > 0, location: 'full' },
        { id: 'sec-education', title: 'Education', source: 'education', enabled: resumeData.education.length > 0, location: 'full' },
        { id: 'sec-skills', title: 'Skills', source: 'skills', enabled: resumeData.skills.length > 0, location: 'full' },
        { id: 'sec-languages', title: 'Languages', source: 'languages', enabled: resumeData.languages.length > 0, location: 'full' },
        { id: 'sec-hobbies', title: 'Hobbies', source: 'hobbies', enabled: resumeData.hobbies.length > 0, location: 'full' },
        { id: 'sec-certs', title: 'Certification', source: 'certificates', enabled: resumeData.certificates.length > 0, location: 'full' },
        { id: 'sec-achievements', title: 'Achievements', source: 'achievements', enabled: resumeData.achievements.length > 0, location: 'full' },
        { id: 'sec-contacts', title: 'Personal Details', source: 'personal_info', enabled: hasContacts, location: 'full' },
        ...resumeData.custom_sections.map(cs => ({
            id: cs.id,
            title: cs.title,
            source: cs.id,
            enabled: true,
            location: 'full'
        }))
    ]
        .filter((s) => s.enabled)
        .map((s, idx) => ({ ...s, order: idx + 1 }));

    return {
        source: 'uploaded-resume',
        fileName,
        uploadedAt: new Date().toISOString(),
        sectionLayout,
        resumeData,
        rawReport: report,
    };
};

export default function ResumeTemplatesPage() {
    const navigate     = useNavigate();
    const location     = useLocation();
    const { showToast } = useToast();
    const fileInputRef = useRef(null);

    const [templates,   setTemplates]   = useState([]);
    const [isLoading,   setIsLoading]   = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectionModal, setSelectionModal] = useState({ open: false, template: null });

    useEffect(() => {
        axiosInstance.get('/api/resume/templates')
            .then(r => setTemplates(r.data.data || []))
            .catch(() => showToast('Failed to load templates', 'error'))
            .finally(() => setIsLoading(false));
    }, [showToast]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'upload') {
            handleUploadClick();
            navigate(location.pathname, { replace: true });
        }
    }, [location.search, navigate]);

    const handleUploadClick = () => fileInputRef.current?.click();

    const openTemplateChoice = (tpl) => setSelectionModal({ open: true, template: tpl });

    const handleManualCreate = async () => {
        const template = selectionModal.template;
        if (!template) return;

        // Determine price based on tier (Basic: 15, Premium: 25, Pro: 40)
        let price = 15;
        if (template.tier === 'Premium' || template.isPremium) price = 25;
        if (template.tier === 'Pro') price = 40;

        setSelectionModal({ open: false, template: null });
        setIsAnalyzing(true);
        try {
            // 1. Credit Deduction
            const creditRes = await paymentService.deductCredits({
                serviceType: 'RESUME',
                serviceName: `Resume Template Unlock (Manual) - ${template.name}`,
                creditsToDeduct: price,
                metadata: { templateId: template._id, tier: template.tier || 'Basic', mode: 'manual' }
            });

            if (!creditRes.success) {
                showToast(creditRes.message || 'Insufficient credits for this template.', 'error');
                setIsAnalyzing(false);
                return;
            }

            sessionStorage.removeItem(TEMPLATE_UPLOAD_SESSION_KEY);
            setIsAnalyzing(false);
            navigate(`/resume-template-studio/${template._id}/editor`);
        } catch (err) {
            console.error('Template unlock error:', err);
            const errorMsg = err.response?.data?.message || 'Failed to unlock template.';
            showToast(errorMsg, 'error');
            setIsAnalyzing(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        setIsAnalyzing(true);
        try {
            // 1. Credit Deduction (ATS Score Analysis - 30 Credits)
            const creditRes = await paymentService.deductCredits({
                serviceType: 'RESUME',
                serviceName: `ATS Resume Score Analysis - ${file.name}`,
                creditsToDeduct: 30,
                metadata: { fileName: file.name, type: 'ATS_CHECK' }
            });

            if (!creditRes.success) {
                showToast(creditRes.message || 'Insufficient credits for ATS Analysis.', 'error');
                setIsAnalyzing(false);
                return;
            }

            let text = '';
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'pdf') {
                text = await extractPDFText(file);
            } else if (ext === 'docx') {
                const ab = await file.arrayBuffer();
                const r  = await mammoth.extractRawText({ arrayBuffer: ab });
                text = r.value;
            } else {
                showToast('Unsupported file format. Upload PDF or DOCX.', 'error');
                return;
            }

            if (!text || text.trim().length < 50) {
                showToast('Could not extract text from the resume.', 'error');
                return;
            }

            const res = await axiosInstance.post('/api/resume/analyze', {
                resumeText: text,
                fileName: file.name,
            });

            if (res.data.success) {
                // Replace previous transient report JSON with latest upload result.
                sessionStorage.removeItem(REPORT_SESSION_KEY);
                sessionStorage.setItem(REPORT_SESSION_KEY, JSON.stringify(res.data.data));
                
                // Also store the raw text and mapped draft for high-fidelity fallback
                const uploadDraft = mapReportToTemplateDraft(res.data.data, file.name, text);
                sessionStorage.removeItem(TEMPLATE_UPLOAD_SESSION_KEY);
                sessionStorage.setItem(TEMPLATE_UPLOAD_SESSION_KEY, JSON.stringify(uploadDraft));

                navigate('/resume/report/preview', { state: { report: res.data.data, uploadDraft } });
            }
        } catch (err) {
            console.error('ATS Analysis error:', err);
            const errorMsg = err.response?.data?.message || 'Analysis failed. Please try again.';
            showToast(errorMsg, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleTemplateUploadResume = async (e) => {
        const template = selectionModal.template;
        if (!template) return;
        const file = e.target.files[0];
        if (!file) return;

        // Determine price based on tier (Basic: 15, Premium: 25, Pro: 40)
        let price = 15;
        if (template.tier === 'Premium' || template.isPremium) price = 25;
        if (template.tier === 'Pro') price = 40;

        setSelectionModal({ open: false, template: null });
        setIsAnalyzing(true);
        try {
            // 1. Credit Deduction
            const creditRes = await paymentService.deductCredits({
                serviceType: 'RESUME',
                serviceName: `Resume Template Unlock - ${template.name}`,
                creditsToDeduct: price,
                metadata: { templateId: template._id, tier: template.tier || 'Basic' }
            });

            if (!creditRes.success) {
                showToast(creditRes.message || 'Insufficient credits for this template.', 'error');
                setIsAnalyzing(false);
                return;
            }

            let text = '';
                const ext = file.name.split('.').pop().toLowerCase();
                if (ext === 'pdf') {
                    text = await extractPDFText(file);
                } else if (ext === 'docx') {
                    const ab = await file.arrayBuffer();
                    const r = await mammoth.extractRawText({ arrayBuffer: ab });
                    text = r.value;
                } else {
                    showToast('Unsupported file format. Upload PDF or DOCX.', 'error');
                    setIsAnalyzing(false);
                    return;
                }

                if (!text || text.trim().length < 50) {
                    showToast('Could not extract text from the resume.', 'error');
                    setIsAnalyzing(false);
                    return;
                }

                const res = await axiosInstance.post('/api/resume/analyze', {
                    resumeText: text,
                    fileName: file.name,
                });

                if (!res.data?.success) {
                    showToast('Resume analysis failed. Please try again.', 'error');
                    setIsAnalyzing(false);
                    return;
                }

                const uploadDraft = mapReportToTemplateDraft(res.data.data, file.name, text);

            sessionStorage.removeItem(TEMPLATE_UPLOAD_SESSION_KEY);
            sessionStorage.setItem(TEMPLATE_UPLOAD_SESSION_KEY, JSON.stringify(uploadDraft));

            setSelectionModal({ open: false, template: null });
            setIsAnalyzing(false);
            navigate(`/resume-template-studio/${template._id}/editor`, {
                state: { uploadedDraft: uploadDraft },
            });
        } catch (err) {
            console.error('Resume upload error:', err);
            const errorMsg = err.response?.data?.message || 'Failed to upload and extract resume data.';
            showToast(errorMsg, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
            <AnimatePresence>{isAnalyzing && <AILoader />}</AnimatePresence>

            {/* ── Header ── */}
            <div className="px-1 pt-2 pb-6 flex items-center justify-between gap-4 shrink-0">
                <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight">
                    Resume ATS
                </h1>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.docx"
                    />
                    <button
                        onClick={handleUploadClick}
                        className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Upload className="-ml-0.5 h-3.5 w-3.5" aria-hidden="true" />
                        Check Resume Score
                    </button>
                </div>
            </div>

            {/* ── Template Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                {isLoading && Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-xl border-2 border-slate-200 bg-slate-50 animate-pulse h-[220px]"
                    />
                ))}

                {!isLoading && templates.map((tpl) => (
                    <button
                        key={tpl._id || tpl.key}
                        onClick={() => openTemplateChoice(tpl)}
                        className="text-left rounded-xl border-2 border-slate-200 bg-slate-50 p-3 transition-all hover:border-blue-400 hover:shadow-md hover:bg-blue-50 focus:outline-none"
                    >
                        {/* Mini rendered thumbnail */}
                        <div
                            className="w-full h-36 rounded-lg mb-2 overflow-hidden border border-slate-200 relative bg-white"
                            style={{ fontSize: '4px' }}
                        >
                            <div className="pointer-events-none scale-[0.16] origin-top-left absolute w-[625%] h-auto">
                                <ResumePreview
                                    templateConfig={tpl}
                                    accentColor={tpl.thumbnailColor || tpl.styleConfig?.accentColor || ACCENT_COLOR}
                                    data={DUMMY_DATA}
                                />
                            </div>
                        </div>

                        <span className="block text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                            {tpl.name}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                            {tpl.description}
                        </p>
                    </button>
                ))}
            </div>

            {selectionModal.open && createPortal(
                <div className="fixed inset-0 z-[9999] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center px-4">
                    <div className="w-full max-w-[560px] rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 relative">
                        <button
                            onClick={() => setSelectionModal({ open: false, template: null })}
                            className="absolute top-3 right-3 h-7 w-7 rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-base leading-none"
                            aria-label="Close"
                        >
                            ×
                        </button>

                        <h3 className="text-base font-bold text-slate-900">Create Resume Template</h3>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                            Would you like to create the resume manually, or upload your resume and create the template from extracted data?
                        </p>

                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                onClick={handleManualCreate}
                                className="w-fit rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Enter Details
                            </button>

                            <label className="w-fit rounded-lg border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-semibold text-white text-center cursor-pointer hover:bg-blue-500">
                                Upload Resume
                                <input
                                    type="file"
                                    onChange={handleTemplateUploadResume}
                                    className="hidden"
                                    accept=".pdf,.docx"
                                />
                            </label>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
