"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FloppyDisk, CheckCircle, ArrowLeft, CaretDown, CaretRight, CaretUp } from '@phosphor-icons/react';
import Link from 'next/link';
import SimpleTypeManager from './SimpleTypeManager';
import LeaveTypeManager from './LeaveTypeManager';
import StakeholderTypeManager from './StakeholderTypeManager';
import IssueCategoryManager from './IssueCategoryManager';
import SampleProjectManager from './SampleProjectManager';
import SampleNoticeManager from './SampleNoticeManager';
import SampleProcessManager from './SampleProcessManager';

interface TemplateEditorProps {
    template: any;
    initialData: any;
    isNew: boolean;
}

export default function TemplateEditor({ template, initialData, isNew }: TemplateEditorProps) {
    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [isDefault, setIsDefault] = useState(template?.is_default || false);
    const [isSaving, setIsSaving] = useState(false);

    // For accordion state. Default to 'general' open.
    const [expandedSections, setExpandedSections] = useState<string[]>(['general']);

    const router = useRouter();
    const supabase = createClient();

    const toggleSection = (id: string) => {
        setExpandedSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleSaveBasicInfo = async () => {
        if (!name.trim()) {
            alert('Name is required');
            return;
        }

        setIsSaving(true);
        try {
            if (isNew) {
                const { data, error } = await supabase
                    .from('company_templates')
                    .insert({
                        name,
                        description,
                        is_default: isDefault
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Redirect to edit page to add types
                router.push(`/sa/templates/${data.id}`);
            } else {
                const { error } = await supabase
                    .from('company_templates')
                    .update({
                        name,
                        description,
                        is_default: isDefault,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', template.id);

                if (error) throw error;

                router.refresh();
                alert('Template updated successfully');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };

    const sections = [
        { id: 'general', label: 'General Info' },
        { id: 'leave', label: 'Leave Types' },
        { id: 'notice', label: 'Notice Types' },
        { id: 'requisition', label: 'Requisition Categories' },
        { id: 'complaint', label: 'Complaint Types' },
        { id: 'stakeholder', label: 'Stakeholder Types' },
        { id: 'issues', label: 'Issue Categories' },
        { id: 'sample_projects', label: 'Sample Projects' },
        { id: 'sample_notices', label: 'Sample Notices' },
        { id: 'sample_processes', label: 'Sample Processes' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/sa/templates" className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
                    <ArrowLeft size={24} className="text-foreground-secondary" />
                </Link>
                <div className="flex-1">
                    <p className="text-sm text-foreground-secondary">Back to Templates</p>
                </div>
            </div>

            <div className="space-y-4">
                {sections.map((section) => {
                    // If isNew, only show General Info
                    if (isNew && section.id !== 'general') return null;

                    const isExpanded = expandedSections.includes(section.id);

                    return (
                        <div key={section.id} className="border border-border-primary rounded-xl overflow-hidden bg-surface-primary">
                            <button
                                onClick={() => toggleSection(section.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors text-left"
                            >
                                <span className="font-semibold text-foreground-primary">{section.label}</span>
                                {isExpanded ? <CaretUp size={20} className="text-foreground-secondary" /> : <CaretDown size={20} className="text-foreground-secondary" />}
                            </button>

                            {isExpanded && (
                                <div className="p-6 border-t border-border-primary">
                                    {section.id === 'general' && (
                                        <div className="max-w-2xl space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                                                    Template Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                                    placeholder="e.g. Standard Tech Company"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none h-32"
                                                    placeholder="Describe what this template is for..."
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 pt-2">
                                                <button
                                                    onClick={() => setIsDefault(!isDefault)}
                                                    className={`flex items-center justify-center w-5 h-5 rounded border ${isDefault ? 'bg-primary-600 border-primary-600 text-white' : 'border-border-primary bg-background-primary'
                                                        }`}
                                                >
                                                    {isDefault && <CheckCircle weight="fill" size={14} />}
                                                </button>
                                                <span className="text-sm text-foreground-primary">Set as default template</span>
                                            </div>

                                            <div className="pt-6">
                                                <button
                                                    onClick={handleSaveBasicInfo}
                                                    disabled={isSaving || !name.trim()}
                                                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {isSaving ? (
                                                        <>
                                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            <span>Saving...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FloppyDisk size={20} weight="bold" />
                                                            <span>{isNew ? 'Create Template' : 'Save Changes'}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {section.id === 'leave' && (
                                        <LeaveTypeManager
                                            templateId={template.id}
                                            initialData={initialData.leaveTypes}
                                        />
                                    )}
                                    {section.id === 'notice' && (
                                        <SimpleTypeManager
                                            templateId={template.id}
                                            tableName="template_notice_types"
                                            title="Notice Types"
                                            initialData={initialData.noticeTypes}
                                        />
                                    )}
                                    {section.id === 'requisition' && (
                                        <SimpleTypeManager
                                            templateId={template.id}
                                            tableName="template_requisition_types"
                                            title="Requisition Categories"
                                            initialData={initialData.requisitionTypes}
                                        />
                                    )}
                                    {section.id === 'complaint' && (
                                        <SimpleTypeManager
                                            templateId={template.id}
                                            tableName="template_complaint_types"
                                            title="Complaint Types"
                                            initialData={initialData.complaintTypes}
                                        />
                                    )}
                                    {section.id === 'stakeholder' && (
                                        <StakeholderTypeManager
                                            templateId={template.id}
                                            initialData={initialData.stakeholderTypes}
                                        />
                                    )}
                                    {section.id === 'issues' && (
                                        <IssueCategoryManager
                                            templateId={template.id}
                                            initialData={initialData.issueCategories}
                                        />
                                    )}
                                    {section.id === 'sample_projects' && (
                                        <SampleProjectManager
                                            templateId={template.id}
                                            initialData={initialData.sampleProjects}
                                        />
                                    )}
                                    {section.id === 'sample_notices' && (
                                        <SampleNoticeManager
                                            templateId={template.id}
                                            initialData={initialData.sampleNotices}
                                            availableTypes={initialData.noticeTypes.map((t: any) => t.name)}
                                        />
                                    )}
                                    {section.id === 'sample_processes' && (
                                        <SampleProcessManager
                                            templateId={template.id}
                                            initialData={initialData.sampleProcesses}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
