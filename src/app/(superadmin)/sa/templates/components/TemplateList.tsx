"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PencilSimple, Trash, CheckCircle } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

interface Template {
    id: string;
    name: string;
    description: string | null;
    is_default: boolean;
    created_at: string;
}

interface TemplateListProps {
    initialTemplates: Template[];
}

export default function TemplateList({ initialTemplates }: TemplateListProps) {
    const [templates, setTemplates] = useState<Template[]>(initialTemplates);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) return;

        setIsDeleting(id);
        try {
            const { error } = await supabase
                .from('company_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTemplates(templates.filter(t => t.id !== id));
            router.refresh();
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete template');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            // First, unset current default
            await supabase
                .from('company_templates')
                .update({ is_default: false })
                .neq('id', id); // Ideally update all, but RLS might restrict. 
            // Actually, better to do this in a transaction or just update all to false then one to true.
            // Or rely on a database trigger to ensure only one default.
            // For now, let's just update the target to true and others to false.

            // Update all others to false (client-side optimistic update first?)
            // Let's just do it sequentially for safety.
            await supabase
                .from('company_templates')
                .update({ is_default: false })
                .neq('id', id);

            const { error } = await supabase
                .from('company_templates')
                .update({ is_default: true })
                .eq('id', id);

            if (error) throw error;

            // Refresh data
            router.refresh();
            // Optimistic update
            setTemplates(templates.map(t => ({
                ...t,
                is_default: t.id === id
            })));

        } catch (error) {
            console.error('Error setting default template:', error);
            alert('Failed to set default template');
        }
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
                <div
                    key={template.id}
                    className={`bg-surface-primary border rounded-xl p-6 transition-shadow hover:shadow-md ${template.is_default ? 'border-primary-500 ring-1 ring-primary-500' : 'border-border-primary'
                        }`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground-primary mb-1">{template.name}</h3>
                            {template.is_default && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                                    <CheckCircle size={12} weight="fill" />
                                    Default
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href={`/sa/templates/${template.id}`}
                                className="p-2 text-foreground-secondary hover:text-primary-600 hover:bg-surface-hover rounded-lg transition-colors"
                                title="Edit"
                            >
                                <PencilSimple size={20} />
                            </Link>
                            {!template.is_default && (
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    disabled={isDeleting === template.id}
                                    className="p-2 text-foreground-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Delete"
                                >
                                    <Trash size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="text-foreground-secondary text-sm mb-6 line-clamp-2">
                        {template.description || 'No description provided'}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-border-primary">
                        <span className="text-xs text-foreground-tertiary">
                            Created: {new Date(template.created_at).toLocaleDateString()}
                        </span>
                        {!template.is_default && (
                            <button
                                onClick={() => handleSetDefault(template.id)}
                                className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                            >
                                Set as Default
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {templates.length === 0 && (
                <div className="col-span-full text-center py-12 bg-surface-secondary rounded-xl border border-dashed border-border-secondary">
                    <p className="text-foreground-secondary">No templates found. Create one to get started.</p>
                </div>
            )}
        </div>
    );
}
