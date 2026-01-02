import { createClient } from '@/lib/supabase/server';
import TemplateEditor from '../components/TemplateEditor';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: PageProps) {
    const { id } = await params;
    const isNew = id === 'new';
    const supabase = await createClient();

    let template = null;
    let leaveTypes = [];
    let noticeTypes = [];
    let requisitionTypes = [];
    let complaintTypes = [];
    let stakeholderTypes = [];
    let issueCategories = [];
    let sampleProjects = [];
    let sampleNotices = [];
    let sampleProcesses = [];

    if (!isNew) {
        const { data, error } = await supabase
            .from('company_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return <div>Error loading template</div>;
        }
        template = data;

        // Fetch related data
        const [
            leaveRes,
            noticeRes,
            reqRes,
            complaintRes,
            stakeholderRes,
            issueRes,
            sampleProjectsRes,
            sampleNoticesRes,
            sampleProcessesRes
        ] = await Promise.all([
            supabase.from('template_leave_types').select('*').eq('template_id', id),
            supabase.from('template_notice_types').select('*').eq('template_id', id),
            supabase.from('template_requisition_types').select('*').eq('template_id', id),
            supabase.from('template_complaint_types').select('*').eq('template_id', id),
            supabase.from('template_stakeholder_types').select('*').eq('template_id', id),
            supabase.from('template_stakeholder_issue_categories').select('*').eq('template_id', id),
            supabase.from('template_sample_projects').select('*, tasks:template_sample_tasks(*)').eq('template_id', id),
            supabase.from('template_sample_notices').select('*').eq('template_id', id),
            supabase.from('template_sample_processes').select('*, steps:template_sample_process_steps(*)').eq('template_id', id)
        ]);

        leaveTypes = leaveRes.data || [];
        noticeTypes = noticeRes.data || [];
        requisitionTypes = reqRes.data || [];
        complaintTypes = complaintRes.data || [];
        stakeholderTypes = stakeholderRes.data || [];
        issueCategories = issueRes.data || [];
        sampleProjects = sampleProjectsRes.data || [];
        sampleNotices = sampleNoticesRes.data || [];
        sampleProcesses = sampleProcessesRes.data || [];
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground-primary">
                    {isNew ? 'Create New Template' : `Edit Template: ${template?.name}`}
                </h1>
            </div>

            <TemplateEditor
                template={template}
                initialData={{
                    leaveTypes,
                    noticeTypes,
                    requisitionTypes,
                    complaintTypes,
                    stakeholderTypes,
                    issueCategories,
                    sampleProjects,
                    sampleNotices,
                    sampleProcesses
                }}
                isNew={isNew}
            />
        </div>
    );
}
