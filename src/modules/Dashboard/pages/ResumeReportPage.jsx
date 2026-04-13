import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Github, Linkedin, Globe, Link2 } from 'lucide-react';

const REPORT_SESSION_KEY = 'resumeScoreReportJson';

const asArray = (v) => (Array.isArray(v) ? v : []);

const uniqText = (...vals) => {
    const seen = new Set();
    const out = [];
    vals.flat().forEach((item) => {
        const text = formatEntry(item).trim();
        if (!text) return;
        const key = text.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            out.push(text);
        }
    });
    return out;
};

const formatEntry = (v) => {
    if (typeof v === 'string') return v;
    if (v == null) return '';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'object') {
        const preferred = [v.title, v.name, v.role, v.company, v.degree, v.school, v.institution, v.summary, v.description]
            .filter(Boolean)
            .join(' - ');
        if (preferred) return preferred;
        try {
            return JSON.stringify(v);
        } catch {
            return '';
        }
    }
    return '';
};

const getSectionExtractedItems = (sectionName, original) => {
    const key = (sectionName || '').toLowerCase();
    if (key.includes('summary') || key.includes('about') || key.includes('profile')) {
        return original.about ? [formatEntry(original.about)] : [];
    }
    if (key.includes('experience')) {
        return asArray(original.experience).map(formatEntry).filter(Boolean);
    }
    if (key.includes('skill')) {
        return asArray(original.skills).map(formatEntry).filter(Boolean);
    }
    if (key.includes('tool') || key.includes('tech')) {
        return asArray(original.tools).map(formatEntry).filter(Boolean);
    }
    if (key.includes('project')) {
        return asArray(original.projects).map(formatEntry).filter(Boolean);
    }
    if (key.includes('education')) {
        return asArray(original.education).map(formatEntry).filter(Boolean);
    }
    return [];
};

const getStatusByScore = (score) => {
    if (score >= 80) return { label: 'Good', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 60) return { label: 'Average', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Needs Work', cls: 'text-rose-700 bg-rose-50 border-rose-200' };
};

const buildSocialLinks = (social = {}, info = {}) => {
    const primary = [
        { label: 'GitHub', href: social.github || social.github_url || info.github, icon: Github },
        { label: 'LinkedIn', href: social.linkedin || social.linkedin_url || info.linkedin, icon: Linkedin },
        { label: 'Website', href: social.website || info.website, icon: Globe },
        { label: 'Portfolio', href: social.portfolio || info.portfolio, icon: Link2 },
    ].filter((x) => !!x.href);

    const seen = new Set(primary.map((x) => String(x.href).trim()));
    const extras = Object.entries(social)
        .filter(([key, value]) => value && !['github', 'github_url', 'linkedin', 'linkedin_url', 'website', 'portfolio'].includes(key))
        .filter(([, value]) => !seen.has(String(value).trim()))
        .map(([key, value]) => ({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            href: value,
            icon: Link2,
        }));

    return [...primary, ...extras];
};

const getIssueBadge = (card) => {
    if (card.urgent > 0) {
        return {
            text: `${card.urgent} Urgent`,
            cls: 'text-rose-600 border-rose-200 bg-rose-50',
        };
    }
    if (card.critical > 0) {
        return {
            text: `${card.critical} Critical`,
            cls: 'text-violet-600 border-violet-200 bg-violet-50',
        };
    }
    return {
        text: `${card.optionalCount} Optional`,
        cls: 'text-amber-600 border-amber-200 bg-amber-50',
    };
};

const buildSectionNarrative = (card) => {
    if (card.sectionSummary) return card.sectionSummary;

    const dynamicSummaryPoints = uniqText(
        card.criticalIssues,
        card.urgentIssues,
        card.keywordGaps,
        card.atsObservations,
        card.formattingIssues,
        card.improvements,
        card.otherIssues,
        card.actionItems
    );

    if (dynamicSummaryPoints.length > 0) {
        return dynamicSummaryPoints.slice(0, 3).join(' ');
    }

    if (card.extracted.length > 0) {
        return `Parsed section details: ${card.extracted.slice(0, 2).join(' | ')}`;
    }

    return 'Detailed AI section narrative is not available in this report response.';
};

const ResumeReportPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const report = useMemo(() => {
        if (location.state?.report) return location.state.report;
        try {
            const raw = sessionStorage.getItem(REPORT_SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, [location.state]);

    if (!report) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Report Data</h3>
                <p className="text-slate-500 mb-6">Run Check Resume Score again to generate a fresh report.</p>
                <button
                    onClick={() => navigate('/resume-template-studio')}
                    className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-transform"
                >
                    Back to Resume Studio
                </button>
            </div>
        );
    }

    const baseSections = Array.isArray(report.sections) ? report.sections : [];
    const recs = Array.isArray(report.overall_recommendations) ? report.overall_recommendations : [];
    const sections = baseSections.length > 0
        ? baseSections
        : (recs.length > 0
            ? [{ section_name: 'Overall Suggestions', urgent_count: 0, critical_count: 0, improvements: recs }]
            : []);
    const fixes = report.fix_counts || { urgent: 0, critical: 0, optional: 0 };
    const original = report.original_resume || {};
    const info = report.candidate_info || {};
    const social = info.social_links || {};
    const status = getStatusByScore(Number(report.overallScore || 0));

    const socialLinks = buildSocialLinks(social, info);

    const sectionCards = sections.map((s, idx) => {
        const extracted = getSectionExtractedItems(s.section_name, original);
        const improvements = asArray(s.improvements).map(formatEntry).filter(Boolean);
        const sectionSummary = formatEntry(
            s.section_summary || s.sectionSummary || s.summary || s.analysis_summary || s.analysisSummary || ''
        );
        const urgentIssues = asArray(s.urgent_issues || s.urgentIssues || s.urgent_fixes || s.urgentFixes || [])
            .map(formatEntry)
            .filter(Boolean);
        const criticalIssues = asArray(s.critical_issues || s.criticalIssues || s.critical_fixes || s.criticalFixes || [])
            .map(formatEntry)
            .filter(Boolean);
        const otherIssues = asArray(s.optional_issues || s.optionalIssues || s.optional_fixes || s.optionalFixes || s.recommendations || [])
            .map(formatEntry)
            .filter(Boolean);
        const strengths = asArray(s.strengths || s.positives || s.good_points || []).map(formatEntry).filter(Boolean);
        const keywordGaps = asArray(s.keyword_gaps || s.missing_keywords || []).map(formatEntry).filter(Boolean);
        const atsObservations = asArray(s.ats_observations || s.ats_notes || []).map(formatEntry).filter(Boolean);
        const formattingIssues = asArray(s.formatting_issues || s.format_issues || []).map(formatEntry).filter(Boolean);
        const actionItems = asArray(s.action_items || s.actionItems || s.next_steps || s.nextSteps || s.recommended_actions || s.recommendedActions)
            .map(formatEntry)
            .filter(Boolean);
        const urgent = Number(s.urgent_count || 0);
        const critical = Number(s.critical_count || 0);
        const optionalCount = uniqText(improvements, otherIssues, keywordGaps, formattingIssues, actionItems).length;
        const keyRecommendations = uniqText(
            criticalIssues,
            urgentIssues,
            otherIssues,
            improvements,
            keywordGaps,
            atsObservations,
            formattingIssues,
            actionItems
        );
        return {
            id: `${s.section_name || 'section'}-${idx}`,
            name: s.section_name || `Section ${idx + 1}`,
            extracted,
            sectionSummary,
            urgentIssues,
            criticalIssues,
            otherIssues,
            improvements,
            strengths,
            keywordGaps,
            atsObservations,
            formattingIssues,
            actionItems,
            keyRecommendations,
            urgent,
            critical,
            optionalCount,
            issueBadge: getIssueBadge({ urgent, critical, optionalCount }),
        };
    });

    const renderSectionExtracted = (card) => {
        const key = (card.name || '').toLowerCase();

        if (key.includes('experience')) {
            const rows = asArray(original.experience);
            if (rows.length === 0) return <p className="text-sm text-slate-500">No extracted content mapped for this section.</p>;
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {rows.map((exp, idx) => (
                        <div key={idx}>
                            <p className="text-sm font-semibold text-slate-800">{exp.position || 'Role'}{exp.company ? ` at ${exp.company}` : ''}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{exp.location || ''}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {exp.start_date || ''}{exp.start_date && (exp.end_date || exp.is_current) ? ' - ' : ''}{exp.is_current ? 'Present' : (exp.end_date || '')}
                            </p>
                            {exp.description && <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{String(exp.description).slice(0, 180)}</p>}
                        </div>
                    ))}
                </div>
            );
        }

        if (key.includes('skill')) {
            const rows = asArray(original.skills);
            if (rows.length === 0) return <p className="text-sm text-slate-500">No extracted content mapped for this section.</p>;
            return (
                <div className="flex flex-wrap gap-2 mt-2">
                    {rows.map((item, idx) => (
                        <span key={idx} className="text-xs text-slate-700">{formatEntry(item)}</span>
                    ))}
                </div>
            );
        }

        if (key.includes('tool')) {
            const rows = asArray(original.tools);
            if (rows.length === 0) return <p className="text-sm text-slate-500">No extracted content mapped for this section.</p>;
            return (
                <div className="flex flex-wrap gap-2 mt-2">
                    {rows.map((item, idx) => (
                        <span key={idx} className="text-xs text-slate-700">{formatEntry(item)}</span>
                    ))}
                </div>
            );
        }

        if (key.includes('project')) {
            const rows = asArray(original.projects);
            if (rows.length === 0) return <p className="text-sm text-slate-500">No extracted content mapped for this section.</p>;
            return (
                <div className="space-y-3 mt-2">
                    {rows.map((p, idx) => (
                        <div key={idx} className="w-full">
                            <p className="text-sm font-semibold text-slate-800">{p.name || p.title || `Project ${idx + 1}`}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{p.description || p.summary || ''}</p>
                        </div>
                    ))}
                </div>
            );
        }

        if (key.includes('education')) {
            const rows = asArray(original.education);
            if (rows.length === 0) return <p className="text-sm text-slate-500">No extracted content mapped for this section.</p>;
            return (
                <div className="space-y-2 mt-2">
                    {rows.map((e, idx) => (
                        <div key={idx}>
                            <p className="text-sm font-semibold text-slate-800">{e.degree || ''}{e.field ? ` in ${e.field}` : ''}</p>
                            <p className="text-xs text-slate-600">{e.institution || e.school || ''}</p>
                        </div>
                    ))}
                </div>
            );
        }

        if (key.includes('summary') || key.includes('about') || key.includes('profile')) {
            const about = original.about || card.extracted?.[0] || '';
            return about
                ? <p className="text-xs text-slate-700 mt-2 leading-relaxed">{about}</p>
                : <p className="text-xs text-slate-500">No extracted content mapped for this section.</p>;
        }

        return card.extracted.length === 0 ? (
            <p className="text-xs text-slate-500">No extracted content mapped for this section.</p>
        ) : (
            <ul className="space-y-1.5 mt-2">
                {card.extracted.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-700 leading-relaxed">• {item}</li>
                ))}
            </ul>
        );
    };

    return (
        <div className="w-full h-full overflow-auto px-1 pt-2 pb-6 bg-transparent">
            <div className="w-full space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
                                {(info.name || report.fileName || 'R').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-bold text-slate-900">{info.name || report.fileName || 'Uploaded Resume'}</h1>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${status.cls}`}>{status.label}</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-0.5">{info.job_title || info.profession || 'Resume Candidate'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Overall Score</p>
                            <p className="text-4xl font-black text-slate-900 leading-none">{report.overallScore || 0}<span className="text-base text-slate-400">/100</span></p>
                        </div>
                    </div>

                    {socialLinks.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                            {socialLinks.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </a>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                        <div className="min-w-[110px] rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-[inset_0_-3px_0_0_#ef4444]">
                            <p className="text-2xl font-black text-slate-900">{fixes.urgent || 0}</p>
                            <p className="text-xs tracking-wide text-slate-600 mt-1">Urgent Fix</p>
                        </div>
                        <div className="min-w-[110px] rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 shadow-[inset_0_-3px_0_0_#7c3aed]">
                            <p className="text-2xl font-black text-slate-900">{fixes.critical || 0}</p>
                            <p className="text-xs tracking-wide text-slate-600 mt-1">Critical Fix</p>
                        </div>
                        <div className="min-w-[110px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-[inset_0_-3px_0_0_#f59e0b]">
                            <p className="text-2xl font-black text-slate-900">{fixes.optional || 0}</p>
                            <p className="text-xs tracking-wide text-slate-600 mt-1">Optional Fix</p>
                        </div>
                    </div>
                    {sections.length === 0 ? (
                        <p className="mt-6 text-xs text-slate-500">No section suggestions returned.</p>
                    ) : (
                        <div className="mt-6 space-y-5">
                            {sectionCards.map((card) => (
                                <div key={card.id} className="pt-1">
                                    <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200">
                                        <h3 className="text-xl font-semibold text-slate-900">{card.name}</h3>
                                        <div className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${card.issueBadge.cls}`}>
                                            {card.issueBadge.text}
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Extracted Data</p>
                                        {renderSectionExtracted(card)}
                                    </div>

                                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-blue-700 mb-1.5">AI Analysis</p>

                                        <div className="mb-2.5">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Section Summary</p>
                                            <p className="text-xs text-slate-700 leading-relaxed">{buildSectionNarrative(card)}</p>
                                        </div>

                                        {card.strengths.length > 0 && (
                                            <div className="mb-2.5">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Strengths Found</p>
                                                <ul className="space-y-1.5">
                                                    {card.strengths.map((item, idx) => (
                                                        <li key={idx} className="text-xs text-slate-700 leading-relaxed">• {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {card.criticalIssues.length > 0 && (
                                            <div className="mb-2.5">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Critical Fix Issues</p>
                                                <ul className="space-y-1.5">
                                                    {card.criticalIssues.map((item, idx) => (
                                                        <li key={idx} className="text-xs text-slate-700 leading-relaxed">• {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {card.urgentIssues.length > 0 && (
                                            <div className="mb-2.5">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Urgent Fix Issues</p>
                                                <ul className="space-y-1.5">
                                                    {card.urgentIssues.map((item, idx) => (
                                                        <li key={idx} className="text-xs text-slate-700 leading-relaxed">• {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {card.otherIssues.length > 0 && (
                                            <div className="mb-2.5">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Other Fix Issues</p>
                                                <ul className="space-y-1.5">
                                                    {card.otherIssues.map((item, idx) => (
                                                        <li key={idx} className="text-xs text-slate-700 leading-relaxed">• {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {card.keywordGaps.length > 0 && (
                                            <div className="mb-2.5">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Keyword Gaps</p>
                                                <ul className="space-y-1.5">
                                                    {card.keywordGaps.map((item, idx) => (
                                                        <li key={idx} className="text-xs text-slate-700 leading-relaxed">• {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {card.atsObservations.length > 0 && (
                                            <div className="mb-2.5">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">ATS Observations</p>
                                                <ul className="space-y-1.5">
                                                    {card.atsObservations.map((item, idx) => (
                                                        <li key={idx} className="text-xs text-slate-700 leading-relaxed">• {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {card.formattingIssues.length > 0 && (
                                            <div className="mb-2.5">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Formatting Issues</p>
                                                <ul className="space-y-1.5">
                                                    {card.formattingIssues.map((item, idx) => (
                                                        <li key={idx} className="text-xs text-slate-700 leading-relaxed">• {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {card.keyRecommendations.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Key Recommendations ({card.keyRecommendations.length})</p>
                                                <ul className="space-y-1.5">
                                                    {card.keyRecommendations.map((imp, idx) => (
                                                        <li key={idx} className="text-xs text-slate-700 leading-relaxed">• {imp}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {card.keyRecommendations.length === 0 &&
                                            card.criticalIssues.length === 0 &&
                                            card.urgentIssues.length === 0 &&
                                            card.otherIssues.length === 0 &&
                                            card.keywordGaps.length === 0 &&
                                            card.atsObservations.length === 0 &&
                                            card.formattingIssues.length === 0 && (
                                            <p className="text-xs text-slate-500">No AI analysis available for this section.</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {(report.summary || report.recommended_summary || recs.length > 0) && (
                        <div className="mt-6 p-0">
                            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Overall Summary</p>
                            <p className="text-xs text-slate-700 leading-relaxed">
                                {report.summary || report.recommended_summary || (recs[0] ? formatEntry(recs[0]) : 'Detailed overall AI summary is not available in this report response.')}
                            </p>

                            {report.recommended_summary && report.recommended_summary !== report.summary && (
                                <p className="text-xs text-slate-700 leading-relaxed mt-2">{report.recommended_summary}</p>
                            )}

                            <ul className="mt-3 space-y-1.5">
                                <li className="text-xs text-slate-700 leading-relaxed">• Sections analyzed: {sectionCards.length}</li>
                                <li className="text-xs text-slate-700 leading-relaxed">• Total urgent fixes: {fixes.urgent || 0}</li>
                                <li className="text-xs text-slate-700 leading-relaxed">• Total critical fixes: {fixes.critical || 0}</li>
                                <li className="text-xs text-slate-700 leading-relaxed">• Total optional improvements: {fixes.optional || 0}</li>
                            </ul>

                            {recs.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Overall Action Points</p>
                                    <ul className="space-y-1.5">
                                        {recs.map((item, idx) => (
                                            <li key={idx} className="text-xs text-slate-700 leading-relaxed">• {formatEntry(item)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResumeReportPage;
