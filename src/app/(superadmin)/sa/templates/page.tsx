import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import TemplateList from './components/TemplateList';

export default async function TemplatesPage() {
    const supabase = await createClient();
    const { data: templates, error } = await supabase
        .from('company_templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching templates:', error);
        return <div>Error loading templates</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground-primary">Company Templates</h1>
                    <p className="text-foreground-secondary">Manage initialization templates for new companies</p>
                </div>
                <Link
                    href="/sa/templates/new"
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <Plus size={20} weight="bold" />
                    <span>New Template</span>
                </Link>
            </div>

            <TemplateList initialTemplates={templates || []} />
        </div>
    );
}
