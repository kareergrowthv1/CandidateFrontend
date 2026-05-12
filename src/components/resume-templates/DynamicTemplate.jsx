/**
 * DynamicTemplate.jsx
 *
 * A single, config-driven resume renderer.
 * All layout / style decisions come from `templateConfig` stored in MongoDB.
 * No separate JSX file is needed per template.
 *
 * Props:
 *   data           – structured resume data (personal_info, experience, education …)
 *   accentColor    – override for the template's default accent colour
 *   templateConfig – full MongoDB template document (layout, sectionStyles, sections, styleConfig)
 */

import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';
import FALLBACK_DUMMY from '../../data/resumeDummyData';

// Default section list used when templateConfig.sections is absent/empty
const DEFAULT_SECTIONS = [
    { id: 'summary',      title: 'Professional Summary',    type: 'paragraph',    enabled: true },
    { id: 'experience',   title: 'Professional Experience', type: 'experience',   enabled: true },
    { id: 'internship',   title: 'Internship',              type: 'experience',   enabled: true },
    { id: 'education',    title: 'Education',               type: 'education',    enabled: true },
    { id: 'projects',     title: 'Projects',                type: 'projects',     enabled: true },
    { id: 'skills',       title: 'Skills',                  type: 'skills',       enabled: true },
    { id: 'certificates', title: 'Certifications',          type: 'certificates', enabled: true },
    { id: 'achievements', title: 'Achievements',            type: 'achievements', enabled: true },
    { id: 'languages',    title: 'Languages',               type: 'languages',    enabled: true },
    { id: 'hobbies',      title: 'Hobbies & Interests',     type: 'hobbies',      enabled: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (str) => {
    if (!str) return '';
    const parts = str.split('-');
    if (parts.length < 2) return str;
    return new Date(+parts[0], +parts[1] - 1).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
    });
};

const hasContent = (d) => {
    if (d == null) return false;
    if (typeof d === 'string') return d.trim().length > 0;
    if (Array.isArray(d)) return d.length > 0;
    return true;
};

const GenericSectionBody = ({ section }) => {
    if (!section) return null;
    const date = section.date || '';
    const points = Array.isArray(section.points) ? section.points.filter((p) => typeof p === 'string' && p.trim()) : [];
    const content = typeof section.content === 'string' ? section.content.trim() : '';

    if (!date && !content && points.length === 0) return null;

    return (
        <div className="space-y-1.5 text-sm text-gray-700 leading-relaxed">
            {date && <p className="text-xs text-gray-500">{date}</p>}
            {content && <p>{content}</p>}
            {points.length > 0 && (
                <ul className="space-y-1">
                    {points.map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-700">• {item}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// Merge user data with dummy data — user wins for every non-empty field.
// If the user hasn't filled a field yet, the dummy value shows instead.
const mergeWithDummy = (userData, dummy) => {
    if (!dummy) return userData || {};
    const u = userData || {};
    const d = dummy;

    // personal_info: merge field by field
    const pi = { ...d.personal_info };
    const upi = u.personal_info || {};
    Object.keys(upi).forEach((k) => {
        if (hasContent(upi[k])) pi[k] = upi[k];
    });

    return {
        personal_info:         pi,
        professional_summary:  hasContent(u.professional_summary) ? u.professional_summary : d.professional_summary,
        experience:            hasContent(u.experience)            ? u.experience            : d.experience,
        internship:            hasContent(u.internship)            ? u.internship            : (d.internship || []),
        education:             hasContent(u.education)             ? u.education             : d.education,
        skills:                hasContent(u.skills)                ? u.skills                : d.skills,
        skillGroups:           hasContent(u.skillGroups)            ? u.skillGroups           : d.skillGroups,
        project:               hasContent(u.project)               ? u.project               : d.project,
        certificates:          hasContent(u.certificates)          ? u.certificates          : d.certificates,
        achievements:          hasContent(u.achievements)          ? u.achievements          : d.achievements,
        languages:             hasContent(u.languages)             ? u.languages             : d.languages,
        hobbies:               hasContent(u.hobbies)               ? u.hobbies               : d.hobbies,
    };
};

// ─── Section Heading ──────────────────────────────────────────────────────────
const SectionHeading = ({ title, headingStyle, accentColor }) => {
    switch (headingStyle) {
        case 'serif':
            return (
                <h2 data-keepwithnext="true" className="text-xl font-serif font-bold mb-3 pb-1 border-b-2"
                    style={{ borderColor: accentColor }}>
                    {title}
                </h2>
            );
        case 'uppercase':
            return (
                <h2 data-keepwithnext="true" className="text-[10px] font-bold uppercase tracking-widest mb-3 pb-1 border-b"
                    style={{ color: accentColor, borderColor: accentColor + '55' }}>
                    {title}
                </h2>
            );
        case 'minimal':
            return (
                <h2 data-keepwithnext="true" className="text-base font-semibold uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-300">
                    {title}
                </h2>
            );
        case 'classic':
            return (
                <h2 data-keepwithnext="true" className="text-xs font-bold uppercase tracking-widest mb-3 pb-1 border-b" style={{ color: accentColor, borderColor: accentColor }}>
                    {title}
                </h2>
            );
        case 'academic':
            return (
                <h2 data-keepwithnext="true" className="text-sm font-bold uppercase tracking-wider mb-3 pb-1 border-b" style={{ color: accentColor, borderColor: accentColor + '60' }}>
                    {title}
                </h2>
            );
        case 'sidebar':
            return (
                <h2 data-keepwithnext="true" className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
                    {title}
                </h2>
            );
        case 'no-border':
            return (
                <h2 data-keepwithnext="true" className="text-2xl font-light mb-4">
                    {title}
                </h2>
            );
        case 'modern':
            return (
                <h2 data-keepwithnext="true" className="text-base font-bold uppercase tracking-widest mb-2 pb-1 border-b border-gray-200">
                    {title}
                </h2>
            );
        default:
            return (
                <h2 data-keepwithnext="true" className="text-2xl font-light mb-4 pb-2 border-b border-gray-200">
                    {title}
                </h2>
            );
    }
};

// ─── Section Body Renderers ────────────────────────────────────────────────────

const SummaryBody = ({ text }) => (
    <p data-section="sec-summary" data-field="content" className="text-sm text-gray-700 leading-relaxed">{text}</p>
);

const ExperienceBody = ({ items, style, accentColor, noBold = false, linkColor = null }) => (
    <div className="space-y-4">
        {items.map((exp, i) => (
            (() => {
                const dateText = `${fmtDate(exp.start_date)}${exp.start_date ? ' – ' : ''}${exp.is_current ? 'Present' : fmtDate(exp.end_date)}`;
                return (
            <div
                key={i}
                data-nobreak="true"
                className={style === 'border-left' ? 'pl-4 border-l-2' : ''}
                style={style === 'border-left' ? { borderColor: accentColor } : {}}
            >
                <div className="flex justify-between items-start flex-wrap gap-1 mb-0.5">
                    <div>
                        <h3 data-section="sec-experience" data-index={i} data-field="position" className={`${noBold ? 'font-normal' : 'font-semibold'} text-sm text-gray-900`}>
                            {exp.position}
                            {style === 'academic-inline-date' && (
                                <span className="ml-2 font-normal text-gray-500">{dateText}</span>
                            )}
                        </h3>
                        <p data-section="sec-experience" data-index={i} data-field="company" className={`text-xs ${noBold ? 'text-gray-900' : 'font-medium'}`} style={noBold ? {} : { color: accentColor }}>
                            {exp.company}{exp.location ? ` – ${exp.location}` : ''}
                        </p>
                    </div>
                    {style !== 'academic-inline-date' && (
                        <span className={`text-xs text-gray-500 whitespace-nowrap ${style !== 'compact' ? 'bg-gray-100 px-2 py-0.5 rounded' : ''}`}>
                            {dateText}
                        </span>
                    )}
                </div>
                {exp.project_title && (
                    <p className="text-xs mt-0.5">
                        <span className={`${noBold ? 'font-normal' : 'font-medium'} text-gray-600`}>Project: </span>
                        {exp.project_link
                            ? <a href={exp.project_link} target="_blank" rel="noreferrer"
                                className="underline underline-offset-2" style={{ color: linkColor || accentColor }}>
                                {exp.project_title}
                              </a>
                            : <span className="text-gray-700">{exp.project_title}</span>
                        }
                    </p>
                )}
                {exp.description && (
                    <ul data-section="sec-experience" data-index={i} data-field="description" className="mt-1 space-y-0.5">
                        {exp.description.split('\n').filter(Boolean).map((line, j) => (
                            <li key={j} className="text-xs text-gray-700 flex gap-1.5">
                                <span className="shrink-0 mt-0.5">•</span>
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
                );
            })()
        ))}
    </div>
);

const EducationBody = ({ items, accentColor, inverted = false, noBold = false }) => (
    <div className="space-y-3">
        {items.map((edu, i) => (
            <div key={i} data-nobreak="true">
                <h3 data-section="sec-education" data-index={i} data-field="degree" className={`${noBold ? 'font-normal' : 'font-semibold'} text-sm ${inverted ? 'text-white' : 'text-gray-900'}`}>
                    {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                </h3>
                <p data-section="sec-education" data-index={i} data-field="institution" className={`text-xs ${noBold ? 'text-gray-900' : ''}`} style={noBold ? {} : { color: accentColor }}>
                    {edu.institution}{edu.location ? ` – ${edu.location}` : ''}
                </p>
                <div className={`flex text-xs mt-0.5 ${inverted ? 'text-white/70' : 'text-gray-500'}`}>
                    <span>
                        {edu.start_date && fmtDate(edu.start_date)}
                        {edu.start_date && edu.graduation_date && ' – '}
                        {edu.graduation_date && fmtDate(edu.graduation_date)}
                    </span>
                </div>
                {edu.gpa && <p className={`text-xs mt-0.5 ${inverted ? 'text-white/70' : 'text-gray-500'}`}>GPA: {edu.gpa}</p>}
                {edu.description && (
                    <ul className="mt-1 space-y-0.5">
                        {edu.description.split('\n').filter(Boolean).map((line, j) => (
                            <li key={j} className={`text-xs ${inverted ? 'text-white/80' : 'text-gray-600'} flex gap-1.5`}>
                                <span className="shrink-0">•</span>
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        ))}
    </div>
);

// Grouped skills renderer (when items are [{category, skills:[]}])
const SkillGroupsBody = ({ groups, inverted = false }) => {
    const labelClass = inverted ? 'text-white font-semibold' : 'text-gray-800 font-semibold';
    const valueClass = inverted ? 'text-white/90' : 'text-gray-700';
    return (
        <div className="space-y-1.5">
            {groups.map((g, i) => (
                <div key={i} data-nobreak="true" className="flex flex-wrap items-baseline gap-x-1.5">
                    {g.category && (
                        <span className={`text-xs shrink-0 ${labelClass}`}>{g.category}:</span>
                    )}
                    <span className={`text-xs ${valueClass}`}>{g.skills.join(', ')}</span>
                </div>
            ))}
        </div>
    );
};

// skills / languages / hobbies — all driven by `style`
const StringListBody = ({ items, style, accentColor, inverted = false }) => {
    // Detect grouped skills [{category, skills:[]}]
    if (Array.isArray(items) && items.length > 0 && typeof items[0] === 'object' && 'skills' in items[0]) {
        return <SkillGroupsBody groups={items} accentColor={accentColor} inverted={inverted} />;
    }

    const textClass = inverted ? 'text-white/90' : 'text-gray-700';
    const dotColor  = inverted ? '#ffffff' : accentColor;

    if (style === 'dot-join') {
        return <p data-nobreak="true" data-section="sec-skills" data-field="content" className={`text-xs ${textClass}`}>{items.join(' • ')}</p>;
    }
    if (style === 'grid3') {
        return (
            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
                {items.map((s, i) => <span key={i} data-nobreak="true" className={`text-xs ${textClass}`}>{s}</span>)}
            </div>
        );
    }
    if (style === 'grid2') {
        return (
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {items.map((s, i) => (
                    <span key={i} data-nobreak="true" className={`text-xs ${textClass} flex items-center gap-1`}>
                        <span>▸</span>{s}
                    </span>
                ))}
            </div>
        );
    }
    if (style === 'dot-list') {
        return (
            <ul className="space-y-1">
                {items.map((s, i) => (
                    <li key={i} data-nobreak="true" className={`text-xs ${textClass} flex items-center gap-2`}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        {s}
                    </li>
                ))}
            </ul>
        );
    }
    if (style === 'pills') {
        return (
            <div className="flex flex-wrap gap-1.5">
                {items.map((s, i) => (
                    <span key={i} data-nobreak="true" className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: dotColor + '22', color: dotColor }}>
                        {s}
                    </span>
                ))}
            </div>
        );
    }
    // plain text (default)
    return (
        <p className={`text-xs ${textClass}`}>{items.join(', ')}</p>
    );
};

const ProjectsBody = ({ items, accentColor, noBold = false, linkColor = null }) => (
    <div className="space-y-4">
        {items.map((p, i) => (
            <div key={i} data-nobreak="true" className="pl-1">
                <div className="flex items-center gap-2 flex-wrap">
                    {p.link
                        ? <a data-section="sec-projects" data-index={i} data-field="name" href={p.link} target="_blank" rel="noreferrer"
                            className={`${noBold ? 'font-normal' : 'font-semibold'} text-sm underline underline-offset-2`}
                            style={{ color: linkColor || accentColor }}>{p.name}</a>
                        : <h3 data-section="sec-projects" data-index={i} data-field="name" className={`${noBold ? 'font-normal' : 'font-semibold'} text-sm text-gray-900`}>{p.name}</h3>
                    }
                </div>
                {p.description && (
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{p.description}</p>
                )}
                {p.bullets && (
                    <ul data-section="sec-projects" data-index={i} data-field="bullets" className="mt-1 space-y-0.5">
                        {p.bullets.split('\n').filter(Boolean).map((line, j) => (
                            <li key={j} className="text-xs text-gray-700 flex gap-1.5">
                                <span className="shrink-0 mt-0.5">•</span>
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        ))}
    </div>
);

const CertificatesBody = ({ items, accentColor, noBold = false, linkColor = null }) => (
    <div className="space-y-2">
        {items.map((c, i) => (
            <div key={i} data-nobreak="true">
                <div className="flex justify-between items-baseline flex-wrap gap-1">
                    {c.link
                        ? <a data-section="sec-certs" data-index={i} data-field="title" href={c.link} target="_blank" rel="noreferrer"
                            className={`${noBold ? 'font-normal' : 'font-semibold'} text-sm underline underline-offset-2`}
                            style={{ color: linkColor || accentColor }}>{c.title}</a>
                        : <h3 data-section="sec-certs" data-index={i} data-field="title" className={`${noBold ? 'font-normal' : 'font-semibold'} text-sm text-gray-900`}>{c.title}</h3>
                    }
                    {c.date && <span data-section="sec-certs" data-index={i} data-field="date" className="text-xs text-gray-400">{fmtDate(c.date)}</span>}
                </div>
                {c.issuer && (
                    <p data-section="sec-certs" data-index={i} data-field="issuer" className={`text-xs ${noBold ? 'text-gray-900' : 'italic'}`} style={noBold ? {} : { color: accentColor }}>
                        {c.issuer}
                    </p>
                )}
                {c.description && <p data-section="sec-certs" data-index={i} data-field="description" className="text-xs text-gray-600 mt-0.5">{c.description}</p>}
            </div>
        ))}
    </div>
);

const AchievementsBody = ({ items, accentColor, noBold = false }) => (
    <div className="space-y-2">
        {items.map((a, i) => (
            <div key={i} data-nobreak="true">
                <div className="flex justify-between items-baseline flex-wrap gap-1">
                    <h3 data-section="sec-achievements" data-index={i} data-field="title" className={`${noBold ? 'font-normal' : 'font-semibold'} text-sm text-gray-900`}>{a.title}</h3>
                    {a.date && <span data-section="sec-achievements" data-index={i} data-field="date" className="text-xs text-gray-400">{a.date}</span>}
                </div>
                {a.description && <p data-section="sec-achievements" data-index={i} data-field="description" className="text-xs text-gray-600 mt-0.5">{a.description}</p>}
                {a.points && (
                    <ul data-section="sec-achievements" data-index={i} data-field="points" className="mt-1 space-y-0.5">
                        {a.points.split('\n').filter(Boolean).map((line, j) => (
                            <li key={j} className="text-xs text-gray-700 flex gap-1.5">
                                <span className="mt-[3px] w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                                {line}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        ))}
    </div>
);

// ─── Contact sidebar block ────────────────────────────────────────────────────
const ContactSidebar = ({ pi, accentColor, inverted }) => {
    const textClass = inverted ? 'text-white/90' : 'text-gray-700';
    const iconColor = inverted ? '#ffffff' : accentColor;
    const items = [
        pi.email    && { icon: <Mail     className="w-3 h-3 shrink-0" />, text: pi.email },
        pi.phone    && { icon: <Phone    className="w-3 h-3 shrink-0" />, text: pi.phone },
        pi.location && { icon: <MapPin   className="w-3 h-3 shrink-0" />, text: pi.location },
        pi.linkedin && {
            icon: <Linkedin className="w-3 h-3 shrink-0" />,
            text: pi.linkedin.replace('https://www.', ''),
            href: pi.linkedin,
        },
        pi.website  && {
            icon: <Globe    className="w-3 h-3 shrink-0" />,
            text: pi.website.replace('https://', ''),
            href: pi.website,
        },
    ].filter(Boolean);

    return (
        <ul className="space-y-2">
            {items.map((c, i) => (
                <li key={i} className={`flex items-start gap-2 text-xs ${textClass}`}>
                    <span className="mt-0.5" style={{ color: iconColor }}>{c.icon}</span>
                    {c.href
                        ? <a href={c.href} target="_blank" rel="noreferrer" className="break-all">{c.text}</a>
                        : <span className="break-all">{c.text}</span>
                    }
                </li>
            ))}
        </ul>
    );
};

// ─── Data accessor ────────────────────────────────────────────────────────────
const getSectionData = (id, data) => {
    if (id?.startsWith('custom-')) {
        const custom = Array.isArray(data.custom_sections) ? data.custom_sections : [];
        return custom.find((s) => s.id === id) || null;
    }

    return ({
        summary:      data.professional_summary,
        experience:   data.experience,
        internship:   data.internship,
        education:    data.education,
        skills:       data.skillGroups && data.skillGroups.length > 0 ? data.skillGroups : data.skills,
        projects:     data.project,
        certificates: data.certificates,
        achievements: data.achievements,
        languages:    data.languages,
        hobbies:      data.hobbies,
    }[id]);
};

const renderBody = (sectionId, data, accentColor, sectionStyles, inverted = false, noBold = false, linkColor = null) => {
    const d     = getSectionData(sectionId, data);
    const style = sectionStyles?.[sectionId] || '';

    if (sectionId?.startsWith('custom-')) {
        return <GenericSectionBody section={d} />;
    }

    if (!hasContent(d)) return null;

    switch (sectionId) {
        case 'summary':      return <SummaryBody        text={d} />;
        case 'experience':   return <ExperienceBody     items={d} style={style}         accentColor={accentColor} noBold={noBold} linkColor={linkColor} />;
        case 'internship':   return <ExperienceBody     items={d} style={style}         accentColor={accentColor} noBold={noBold} linkColor={linkColor} />;
        case 'education':    return <EducationBody      items={d}                       accentColor={accentColor} inverted={inverted} noBold={noBold} />;
        case 'skills':       return <StringListBody     items={d} style={style}         accentColor={accentColor} inverted={inverted} />;
        case 'projects':     return <ProjectsBody       items={d}                       accentColor={accentColor} noBold={noBold} linkColor={linkColor} />;
        case 'certificates': return <div data-section="sec-certs"><CertificatesBody  items={d}                       accentColor={accentColor} noBold={noBold} linkColor={linkColor} /></div>;
        case 'achievements': return <AchievementsBody  items={d} accentColor={accentColor} noBold={noBold} />;
        case 'languages':    return <div data-section="sec-languages" data-field="content"><StringListBody     items={d} style={style || 'dot-join'} accentColor={accentColor} inverted={inverted} /></div>;
        case 'hobbies':      return <div data-section="sec-hobbies" data-field="content"><StringListBody     items={d} style={style || 'pills'}    accentColor={accentColor} inverted={inverted} /></div>;
        default:             return null;
    }
};

// ─── Header renderers ─────────────────────────────────────────────────────────
const renderHeader = (headerStyle, pi, accentColor) => {
    const contacts = [
        pi.email    && { icon: <Mail     className="w-3 h-3" />, text: pi.email },
        pi.phone    && { icon: <Phone    className="w-3 h-3" />, text: pi.phone },
        pi.location && { icon: <MapPin   className="w-3 h-3" />, text: pi.location },
        pi.linkedin && { icon: <Linkedin className="w-3 h-3" />, text: pi.linkedin.replace('https://www.', ''), href: pi.linkedin },
        pi.website  && { icon: <Globe    className="w-3 h-3" />, text: pi.website.replace('https://', ''),     href: pi.website  },
    ].filter(Boolean);

    const contactRow = (cls = '') => contacts.map((c, i) =>
        c.href
            ? <a key={i} href={c.href} target="_blank" rel="noreferrer" className={`flex items-center gap-1 ${cls}`}>{c.icon}<span className="break-all">{c.text}</span></a>
            : <span key={i} className={`flex items-center gap-1 ${cls}`}>{c.icon}<span>{c.text}</span></span>
    );

    // ── accent coloured full-width header ──
    if (headerStyle === 'accent-bg') {
        return (
            <header className="text-white" style={{ backgroundColor: accentColor }}>
                <h1 data-field="full_name" className="text-4xl font-light mb-1">{pi.full_name || 'Your Name'}</h1>
                {pi.profession && <p data-field="profession" className="text-base opacity-90 mb-3">{pi.profession}</p>}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {contactRow()}
                </div>
            </header>
        );
    }

    // ── centred with thick bottom border ──
    if (headerStyle === 'centered-border') {
        return (
            <header className="text-center border-b-4" style={{ borderColor: accentColor }}>
                <h1 data-field="full_name" className="text-3xl font-bold tracking-wide text-gray-900 mb-0.5">{pi.full_name || 'Your Name'}</h1>
                {pi.profession && <p data-field="profession" className="text-sm font-medium mb-2" style={{ color: accentColor }}>{pi.profession}</p>}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-600">
                    {contactRow()}
                </div>
            </header>
        );
    }

    // ── serif centred (Academic / CV) ──
    if (headerStyle === 'centered-serif') {
        return (
            <header className="text-center">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-0.5">{pi.full_name || 'Your Name'}</h1>
                {pi.profession && <p className="text-sm font-serif italic mb-2" style={{ color: accentColor }}>{pi.profession}</p>}
                <div className="w-20 mx-auto border-b-2 mb-3" style={{ borderColor: accentColor }} />
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-600">
                    {contacts.map((c, i) =>
                        c.href
                            ? <a key={i} href={c.href} target="_blank" rel="noreferrer">{c.text}</a>
                            : <span key={i}>{c.text}</span>
                    )}
                </div>
            </header>
        );
    }

    // ── left-aligned minimal ──
    if (headerStyle === 'left-minimal') {
        return (
            <header className="pb-4 border-b border-gray-200">
                <h1 data-field="full_name" className="text-3xl font-bold text-gray-900 mb-0.5">{pi.full_name || 'Your Name'}</h1>
                {pi.profession && <p data-field="profession" className="text-sm font-medium mb-2" style={{ color: accentColor }}>{pi.profession}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {contacts.map((c, i) =>
                        c.href
                            ? <a key={i} href={c.href} target="_blank" rel="noreferrer" style={{ color: accentColor }}>{c.text}</a>
                            : <span key={i}>{c.text}</span>
                    )}
                </div>
            </header>
        );
    }

    // ── three-column compact header (ATS-Compact) ──
    if (headerStyle === 'three-col') {
        return (
            <header className="pb-4 border-b-2" style={{ borderColor: accentColor }}>
                <div className="grid grid-cols-3 items-center gap-4">
                    <div className="text-xs text-gray-600 space-y-0.5">
                        {pi.phone    && <p>{pi.phone}</p>}
                        {pi.location && <p>{pi.location}</p>}
                        {pi.email    && <p>{pi.email}</p>}
                    </div>
                    <div className="text-center">
                        <h1 className="text-xl font-bold text-gray-900">{pi.full_name || 'Your Name'}</h1>
                        {pi.profession && <p className="text-xs font-medium" style={{ color: accentColor }}>{pi.profession}</p>}
                    </div>
                    <div className="text-xs text-right space-y-0.5" style={{ color: accentColor }}>
                        {pi.website  && <p>{pi.website.replace('https://', '')}</p>}
                        {pi.github   && <p>{pi.github}</p>}
                        {pi.linkedin && <p>{pi.linkedin.replace('https://www.', '')}</p>}
                    </div>
                </div>
            </header>
        );
    }

    // ── left with coloured bottom border (ATS) ──
    if (headerStyle === 'left-border-bottom') {
        return (
            <header className="pb-3">
                <h1 data-field="full_name" className="text-3xl font-serif font-bold text-gray-900 mb-0.5">{pi.full_name || 'Your Name'}</h1>
                {pi.profession && <p data-field="profession" className="text-sm mb-1" style={{ color: accentColor }}>{pi.profession}</p>}
                <p data-field="header-details" className="text-xs text-gray-600 border-b-2 pb-2" style={{ borderColor: accentColor }}>
                    {[pi.email, pi.phone, pi.location].filter(Boolean).join(' | ')}
                </p>
            </header>
        );
    }

    // fallback
    return renderHeader('left-minimal', pi, accentColor);
};

// ─── Main Component ────────────────────────────────────────────────────────────
const DynamicTemplate = ({ data, accentColor: propAccentColor, templateConfig }) => {
    const cfg           = templateConfig || {};
    const ac            = propAccentColor || cfg.styleConfig?.accentColor || '#3B82F6';
    const fontFamily    = cfg.styleConfig?.fontFamily || 'inherit';
    const layout        = cfg.layout        || { type: 'single', header: 'left-minimal' };
    const sectionStyles = cfg.sectionStyles || {};

    const effectiveData = data?.__strictMode
        ? (data || {})
        : mergeWithDummy(data, cfg.dummyData || FALLBACK_DUMMY);
    const pi            = effectiveData?.personal_info || {};

    const baseSections = (cfg.sections?.length > 0 ? cfg.sections : DEFAULT_SECTIONS)
        .filter(s => s.enabled !== false)
        .map(s => ({ ...s, id: s.id.replace(/^sec-/, '') }));

    const customSecsFromData = Array.isArray(effectiveData.custom_sections)
        ? effectiveData.custom_sections.map(cs => ({ id: cs.id, title: cs.title, enabled: true }))
        : [];

    // Combine base template sections with any custom sections extracted from the resume
    const sections = [...baseSections, ...customSecsFromData];

    // Render a section heading + body block
    const renderSection = (sec, headingStyle = 'default', className = 'mb-5', inverted = false, extraStyles = {}, noBold = false, linkColor = null) => {
        const headingAc = headingStyle === 'sidebar' ? ac : (inverted ? '#fff' : ac);
        if (sec.id === 'contact') {
            return (
                <div key={sec.id} className={className}>
                    <SectionHeading title={sec.title || 'Contact'} headingStyle={headingStyle} accentColor={headingAc} />
                    <ContactSidebar pi={pi} accentColor={ac} inverted={inverted} />
                </div>
            );
        }
        const body = renderBody(sec.id, effectiveData, ac, { ...sectionStyles, ...extraStyles }, inverted, noBold, linkColor);
        if (!body) return null;
        return (
            <div key={sec.id} className={className}>
                <SectionHeading title={sec.title} headingStyle={headingStyle} accentColor={headingAc} />
                {body}
            </div>
        );
    };

    // Shared contact chip row
    const contactChips = (cls = 'text-xs text-gray-500') => [
        pi.email    && { icon: <Mail     className="w-3 h-3 shrink-0" />, text: pi.email,    href: `mailto:${pi.email}` },
        pi.phone    && { icon: <Phone    className="w-3 h-3 shrink-0" />, text: pi.phone },
        pi.location && { icon: <MapPin   className="w-3 h-3 shrink-0" />, text: pi.location },
        pi.linkedin && { icon: <Linkedin className="w-3 h-3 shrink-0" />, text: pi.linkedin.replace(/https?:\/\/(www\.)?/, ''), href: pi.linkedin },
        pi.website  && { icon: <Globe    className="w-3 h-3 shrink-0" />, text: pi.website.replace(/https?:\/\/(www\.)?/, ''), href: pi.website },
    ].filter(Boolean).map((c, i) =>
        c.href
            ? <a key={i} href={c.href} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 ${cls}`}>{c.icon}<span className="break-all">{c.text}</span></a>
            : <span key={i} className={`flex items-center gap-1.5 ${cls}`}>{c.icon}<span>{c.text}</span></span>
    );

    const A4 = { width: '794px', minHeight: '1123px' };

    // ════════════════════════════════════════════════════════════════════════════
    // 1. CLASSIC  — Georgia serif, centered accent name, border-b-2 divider,
    //    uppercase accent section headings, experience with left accent border,
    //    skills & hobbies as accent-tinted pills.
    //    MongoDB layout: single / centered-border
    // ════════════════════════════════════════════════════════════════════════════
    if (layout.type === 'single' && layout.header === 'centered-border') {
        return (
            <div className="bg-white text-gray-800" style={{ ...A4, fontFamily }}>
                <div className="p-8">
                    {/* Header */}
                    <header className="text-center pb-6 mb-3">
                        <h1 className="text-3xl font-bold mb-1 leading-tight" style={{ color: ac }}>
                            {pi.full_name || 'Your Name'}
                        </h1>
                        {pi.profession && (
                            <p className="text-sm font-medium text-gray-600 mb-3">{pi.profession}</p>
                        )}
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
                            {contactChips('text-sm text-gray-600')}
                        </div>
                    </header>
                    {/* Sections */}
                    <div className="space-y-5">
                        {sections.map(s => renderSection(s, 'classic', 'mb-0'))}
                    </div>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 2. MINIMAL  — Cambria serif, left-aligned font-light name, muted gray
    //    labels, clean minimal look with no accent decoration in sections.
    //    MongoDB layout: single / left-minimal
    // ════════════════════════════════════════════════════════════════════════════
    if (layout.type === 'single' && layout.header === 'left-minimal') {
        const minimalTwoCols   = ['education', 'projects'];
        const minimalBottomCols = ['hobbies', 'languages'];
        const minimalBefore    = ['summary', 'experience'];
        const minimalMid       = sections.filter(s => !minimalTwoCols.includes(s.id) && !minimalBefore.includes(s.id) && !minimalBottomCols.includes(s.id));
        const minimalTopSecs   = sections.filter(s => minimalBefore.includes(s.id));
        const minimalLeftSecs  = sections.filter(s => s.id === 'education');
        const minimalRightSecs = sections.filter(s => s.id === 'projects');
        const minimalHobbies   = sections.filter(s => s.id === 'hobbies');
        const minimalLanguages = sections.filter(s => s.id === 'languages');

        return (
            <div className="bg-white text-gray-700" style={{ ...A4, fontFamily }}>
                <div className="p-8">
                    {/* Header */}
                    <header className="pb-2 mb-2">
                        <h1 className="text-3xl font-light tracking-wide text-gray-900 mb-0.5">
                            {pi.full_name || 'Your Name'}
                        </h1>
                        {pi.profession && (
                            <p className="text-sm text-gray-900 mb-2">{pi.profession}</p>
                        )}
                        <div className="flex flex-wrap gap-x-5 gap-y-1">
                            {contactChips('text-xs text-gray-900')}
                        </div>
                    </header>
                    {/* Summary + Experience */}
                    <div className="space-y-5">
                        {minimalTopSecs.map(s => renderSection(s, 'minimal', 'mb-0'))}
                    </div>
                    {/* Two-col: Education left, Projects right */}
                    {(minimalLeftSecs.length > 0 || minimalRightSecs.length > 0) && (
                        <div className="grid grid-cols-2 gap-8 mt-5">
                            <div className="space-y-5">
                                {minimalLeftSecs.map(s => renderSection(s, 'minimal', 'mb-0'))}
                            </div>
                            <div className="space-y-5">
                                {minimalRightSecs.map(s => renderSection(s, 'minimal', 'mb-0'))}
                            </div>
                        </div>
                    )}
                    {/* Skills, Certifications, Achievements */}
                    {minimalMid.length > 0 && (
                        <div className="space-y-5 mt-5">
                            {minimalMid.map(s => renderSection(s, 'minimal', 'mb-0'))}
                        </div>
                    )}
                    {/* Two-col: Hobbies left, Languages right */}
                    {(minimalHobbies.length > 0 || minimalLanguages.length > 0) && (
                        <div className="grid grid-cols-2 gap-8 mt-5">
                            <div className="space-y-5">
                                {minimalHobbies.map(s => renderSection(s, 'minimal', 'mb-0'))}
                            </div>
                            <div className="space-y-5">
                                {minimalLanguages.map(s => renderSection(s, 'minimal', 'mb-0'))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 3. ACADEMIC  — Georgia serif throughout, UPPERCASE accent name, centered
    //    formal CV style, education listed before experience, italic institution.
    //    MongoDB layout: single / centered-serif
    // ════════════════════════════════════════════════════════════════════════════
    if (layout.type === 'single' && layout.header === 'centered-serif') {
        const serifFont = fontFamily.includes('serif') ? fontFamily : 'Georgia, "Times New Roman", serif';
        const researchSec = sections.find(s => s.id === 'summary');
        const remainingAcademicSecs = sections.filter(s => s.id !== 'summary');
        const leftAcademicSecs = [];
        const rightAcademicSecs = [];
        const pinnedLeftIds = new Set(['hobbies']);
        const pinnedRightIds = new Set(['languages']);
        const unpinnedAcademicSecs = remainingAcademicSecs.filter(
            s => !pinnedLeftIds.has(s.id) && !pinnedRightIds.has(s.id)
        );

        unpinnedAcademicSecs.forEach((sec, idx) => {
            if (idx % 2 === 0) leftAcademicSecs.push(sec);
            else rightAcademicSecs.push(sec);
        });

        remainingAcademicSecs.forEach((sec) => {
            if (pinnedLeftIds.has(sec.id)) leftAcademicSecs.push(sec);
            if (pinnedRightIds.has(sec.id)) rightAcademicSecs.push(sec);
        });

        return (
            <div className="bg-white text-gray-900" style={{ ...A4, fontFamily: serifFont }}>
                <div className="p-10">
                    {/* Header */}
                    <header className="text-center pb-3 mb-1">
                        <h1 className="text-3xl font-bold tracking-widest mb-2" style={{ color: ac }}>
                            {(pi.full_name || 'Your Name').toUpperCase()}
                        </h1>
                        {pi.profession && (
                            <p className="text-sm italic text-gray-600 mb-3">{pi.profession}</p>
                        )}
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
                            {contactChips('text-sm text-gray-700')}
                        </div>
                        {(pi.linkedin || pi.website) && (
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 mt-1">
                                {pi.linkedin && <span className="flex items-center gap-1 text-xs text-gray-600"><Linkedin className="w-3 h-3" />{pi.linkedin.replace(/https?:\/\/(www\.)?/, '')}</span>}
                                {pi.website  && <span className="flex items-center gap-1 text-xs text-gray-600"><Globe    className="w-3 h-3" />{pi.website.replace(/https?:\/\/(www\.)?/, '')}</span>}
                            </div>
                        )}
                    </header>
                    {/* Research interests first (full width) */}
                    {researchSec && (
                        <div className="mb-4">
                            {renderSection(researchSec, 'academic', 'mb-0')}
                        </div>
                    )}

                    {/* Remaining sections in equal two columns with center divider */}
                    {remainingAcademicSecs.length > 0 && (
                        <div className="grid grid-cols-2 divide-x divide-gray-200">
                            <div className="pr-6 space-y-5">
                                {leftAcademicSecs.map(s => renderSection(s, 'academic', 'mb-0'))}
                            </div>
                            <div className="pl-6 space-y-5">
                                {rightAcademicSecs.map(s => renderSection(s, 'academic', 'mb-0'))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 4. ATS FRIENDLY  — Georgia serif, bold left-aligned name, all contacts on
    //    one pipe-separated line, thick accent border-b under header.
    //    MongoDB layout: single / left-border-bottom
    // ════════════════════════════════════════════════════════════════════════════
    if (layout.type === 'single' && layout.header === 'left-border-bottom') {
        const serifFont = fontFamily.includes('serif') ? fontFamily : 'Georgia, "Times New Roman", serif';
        return (
            <div className="bg-white text-gray-800" style={{ ...A4, fontFamily: serifFont }}>
                <div className="p-8">
                    {/* Header */}
                    <header className="mb-5">
                        <h1 className="text-3xl font-bold text-gray-900 mb-0.5">
                            {pi.full_name || 'Your Name'}
                        </h1>
                        {pi.profession && (
                            <p className="text-sm font-medium mb-1.5" style={{ color: ac }}>{pi.profession}</p>
                        )}
                        <p className="text-xs text-gray-600 border-b-2 pb-3" style={{ borderColor: ac }}>
                            {[pi.email, pi.phone, pi.location,
                                pi.linkedin && pi.linkedin.replace(/https?:\/\/(www\.)?/, ''),
                                pi.website  && pi.website.replace(/https?:\/\/(www\.)?/, '')
                            ].filter(Boolean).join('   |   ')}
                        </p>
                    </header>
                    {/* Sections */}
                    <div className="space-y-5">
                        {sections.map(s => renderSection(s, 'minimal', 'mb-0'))}
                    </div>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 5. ATS COMPACT  — Three-column header (phone/loc/email | name | links),
    //    dense layout, all sections in compact grid style.
    //    MongoDB layout: single / three-col
    // ════════════════════════════════════════════════════════════════════════════
    if (layout.type === 'single' && layout.header === 'three-col') {
        return (
            <div className="bg-white text-gray-800" style={{ ...A4, fontFamily }}>
                <div className="p-6">
                    {/* Three-col header */}
                    <header className="pb-3 mb-4">
                        <div className="grid grid-cols-3 items-start gap-3">
                            <div className="text-xs text-gray-600 space-y-1">
                                {pi.phone    && <p>{pi.phone}</p>}
                                {pi.location && <p>{pi.location}</p>}
                                {pi.email    && <p className="break-all">{pi.email}</p>}
                            </div>
                            <div className="text-center">
                                <h1 className="text-xl font-bold text-gray-900 leading-tight">{pi.full_name || 'Your Name'}</h1>
                                {pi.profession && <p className="text-xs font-semibold mt-0.5" style={{ color: ac }}>{pi.profession}</p>}
                            </div>
                            <div className="text-xs text-right space-y-1" style={{ color: ac }}>
                                {pi.website  && <p className="break-all">{pi.website.replace(/https?:\/\/(www\.)?/, '')}</p>}
                                {pi.github   && <p className="break-all">{pi.github}</p>}
                                {pi.linkedin && <p className="break-all">{pi.linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, 'in/')}</p>}
                            </div>
                        </div>
                    </header>
                    {/* Sections */}
                    <div className="space-y-4">
                        {sections.map(s => renderSection(
                            s,
                            'uppercase',
                            'mb-0',
                            false,
                            { languages: 'dot-list', hobbies: 'dot-list' },
                            true,
                            '#2563EB'
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 6. MODERN  — Bold full-width accent header, main sections full-width,
    //    then 2-col grid for education (left) + skills (right) at bottom.
    //    MongoDB layout: two-col-bottom / accent-bg
    // ════════════════════════════════════════════════════════════════════════════
    if (layout.type === 'two-col-bottom') {
        const leftIds   = layout.twoColBottom?.left  || ['education'];
        const rightIds  = layout.twoColBottom?.right || ['skills'];
        const bottomIds = [...leftIds, ...rightIds];
        const mainSecs  = sections.filter(s => !bottomIds.includes(s.id));
        const leftSecs  = sections.filter(s =>  leftIds.includes(s.id));
        const rightSecs = sections.filter(s => rightIds.includes(s.id));

        return (
            <div className="bg-white text-gray-800" style={{ ...A4, fontFamily }}>
                {/* Full-width accent header */}
                <header className="text-white p-8 pb-6" style={{ backgroundColor: ac }}>
                    <h1 className="text-4xl font-light leading-tight mb-1">{pi.full_name || 'Your Name'}</h1>
                    {pi.profession && <p className="text-sm opacity-80 mb-3">{pi.profession}</p>}
                    <div className="flex flex-wrap gap-x-5 gap-y-1">
                        {contactChips('text-xs text-white/90')}
                    </div>
                </header>
                {/* Main content */}
                <div className="px-8 pt-5 pb-8">
                    <div className="space-y-4 mb-4">
                        {mainSecs.map(s => renderSection(s, 'modern', 'mb-0'))}
                    </div>
                    {(leftSecs.length > 0 || rightSecs.length > 0) && (
                        <div className="grid grid-cols-2 gap-8 pt-4">
                            <div className="space-y-4">
                                {leftSecs.map(s => renderSection(s, 'modern', 'mb-0'))}
                            </div>
                            <div className="space-y-4">
                                {rightSecs.map(s => renderSection(s, 'modern', 'mb-0'))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 7 & 8.  SIDEBAR-LEFT variants
    // ════════════════════════════════════════════════════════════════════════════
    if (layout.type === 'sidebar-left') {
        const sidebarCfg  = layout.sidebar || {};
        const sidebarIds  = sidebarCfg.sections || ['contact', 'skills', 'education', 'languages', 'hobbies'];
        const isDark      = sidebarCfg.bg === 'dark' || sidebarCfg.bg === 'accent';
        const isGray      = sidebarCfg.bg === 'gray';

        const sidebarSecs = sidebarIds.map(id =>
            id === 'contact' ? { id: 'contact', title: 'Contact', enabled: true } : sections.find(s => s.id === id)
        ).filter(Boolean);
        const mainSecs = sections.filter(s => !sidebarIds.includes(s.id));

        // ── 7. MINIMAL IMAGE — dark sidebar with profile image ────────────────
        if (layout.showProfileImage) {
            const sbBg    = isDark ? '#18181b' : '#f4f4f5';
            const sbText  = isDark ? 'text-white' : 'text-zinc-700';

            return (
                <div className="bg-white text-zinc-800 flex" style={{ ...A4, fontFamily }}>
                    {/* Sidebar */}
                    <aside className={`w-56 shrink-0 flex flex-col ${sbText} border-r border-zinc-200`}
                        style={{ backgroundColor: sbBg, minHeight: '1123px' }}>
                        {/* Profile image */}
                        <div className="flex justify-center pt-8 pb-4 px-5">
                            {pi.image ? (
                                <img
                                    src={typeof pi.image === 'object' ? URL.createObjectURL(pi.image) : pi.image}
                                    alt={pi.full_name}
                                    className="w-28 h-28 rounded-full object-cover ring-2"
                                    style={{ ringColor: ac }}
                                />
                            ) : (
                                <div className="w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                                    style={{ backgroundColor: ac }}>
                                    {(pi.full_name || 'A').charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        {/* Sidebar sections */}
                        <div className="px-5 pb-8 space-y-5 flex-1">
                            {sidebarSecs.map(s => renderSection(s, 'sidebar', 'mb-0', isDark))}
                        </div>
                    </aside>

                    {/* Main content */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Name strip */}
                        <div className="pt-8 pb-5 px-6 border-b border-zinc-200">
                            <h1 className="text-2xl font-bold text-zinc-800 tracking-wide leading-tight">
                                {pi.full_name || 'Your Name'}
                            </h1>
                            {pi.profession && (
                                <p className="text-xs uppercase tracking-widest mt-1 font-medium" style={{ color: ac }}>
                                    {pi.profession}
                                </p>
                            )}
                        </div>
                        {/* Main sections */}
                        <div className="px-6 pt-5 pb-6 space-y-5">
                            {mainSecs.map(s => renderSection(s, 'uppercase', 'mb-0'))}
                        </div>
                    </div>
                </div>
            );
        }

        // ── 8. EXECUTIVE — full-width accent header + gray sidebar ────────────
        const sbBg    = isDark ? '#1e293b' : (isGray ? '#f9fafb' : '#fff');
        const sbBorder = 'border-r border-gray-200';

        return (
            <div className="bg-white text-gray-800" style={{ ...A4, fontFamily }}>
                {/* Full-width accent header */}
                <header className="text-white p-8 pb-6" style={{ backgroundColor: ac }}>
                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold leading-tight mb-1">
                                {pi.full_name || 'Your Name'}
                            </h1>
                            {pi.profession && <p className="text-sm opacity-80">{pi.profession}</p>}
                        </div>
                    </div>
                </header>

                {/* Two-column body */}
                <div className="flex" style={{ minHeight: '877px' }}>
                    {/* Sidebar */}
                    <aside className={`w-56 shrink-0 ${sbBorder} p-6 space-y-5`}
                        style={{ backgroundColor: sbBg }}>
                        {sidebarSecs.map(s => renderSection(s, 'sidebar', 'mb-0', isDark))}
                    </aside>

                    {/* Main */}
                    <main className="flex-1 px-7 pt-6 pb-6 space-y-5 min-w-0">
                        {mainSecs.map(s => renderSection(s, 'uppercase', 'mb-0'))}
                    </main>
                </div>
            </div>
        );
    }

    return <div className="p-8 text-gray-400 text-sm italic">Template layout not configured.</div>;
};

export default DynamicTemplate;
