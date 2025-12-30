"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash, FloppyDisk, PencilSimple, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface IssueCategory {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
}

interface IssueCategoryManagerProps {
    templateId: string;
    initialData: IssueCategory[];
}

export default function IssueCategoryManager({ templateId, initialData }: IssueCategoryManagerProps) {
    const [items, setItems] = useState<IssueCategory[]>(initialData);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newColor, setNewColor] = useState('#3B82F6');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    const handleAdd = async () => {
        if (!newName.trim()) return;

        setIsAdding(true);
        try {
            const { data, error } = await supabase
                .from('template_stakeholder_issue_categories')
                .insert({
                    template_id: templateId,
                    name: newName.trim(),
                    description: newDesc.trim() || null,
                    color: newColor
                })
                .select()
                .single();

            if (error) throw error;

            setItems([...items, data]);
            setNewName('');
            setNewDesc('');
            setNewColor('#3B82F6');
            router.refresh();
        } catch (error) {
            console.error('Error adding issue category:', error);
            alert('Failed to add issue category');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdate = async () => {
        if (!newName.trim() || !editingId) return;

        setIsAdding(true);
        try {
            const { data, error } = await supabase
                .from('template_stakeholder_issue_categories')
                .update({
                    name: newName.trim(),
                    description: newDesc.trim() || null,
                    color: newColor
                })
                .eq('id', editingId)
                .select()
                .single();

            if (error) throw error;

            setItems(items.map(i => i.id === editingId ? data : i));
            setNewName('');
            setNewDesc('');
            setNewColor('#3B82F6');
            setEditingId(null);
            router.refresh();
        } catch (error) {
            console.error('Error updating issue category:', error);
            alert('Failed to update issue category');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;

        try {
            const { error } = await supabase
                .from('template_stakeholder_issue_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setItems(items.filter(i => i.id !== id));
            router.refresh();
        } catch (error) {
            console.error('Error deleting issue category:', error);
            alert('Failed to delete issue category');
        }
    };

    const startEdit = (item: IssueCategory) => {
        setEditingId(item.id);
        setNewName(item.name);
        setNewDesc(item.description || '');
        setNewColor(item.color || '#3B82F6');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setNewName('');
        setNewDesc('');
        setNewColor('#3B82F6');
    };

    return (
        <div className="bg-surface-primary border border-border-primary rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground-primary mb-4">Issue Categories</h3>

            <div className="flex flex-col gap-3 mb-6">
                <div className="flex gap-2">
                    <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border-primary cursor-pointer p-1 bg-background-primary"
                    />
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Name (e.g. Technical Issue)"
                        className="flex-1 px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    {editingId ? (
                        <>
                            <button
                                onClick={handleUpdate}
                                disabled={isAdding || !newName.trim()}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                            >
                                {isAdding ? <FloppyDisk size={20} className="animate-pulse" /> : <FloppyDisk size={20} />}
                            </button>
                            <button
                                onClick={cancelEdit}
                                className="px-4 py-2 bg-background-tertiary text-foreground-primary rounded-lg hover:bg-surface-hover transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleAdd}
                            disabled={isAdding || !newName.trim()}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                            {isAdding ? <FloppyDisk size={20} className="animate-pulse" /> : <Plus size={20} />}
                        </button>
                    )}
                </div>
                <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none h-20"
                />
            </div>

            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item.id} className={`flex justify-between items-start p-3 rounded-lg group ${editingId === item.id ? 'bg-primary-50 border border-primary-200' : 'bg-background-secondary'}`}>
                        <div className="flex gap-3">
                            <div
                                className="w-4 h-4 rounded-full mt-1 shrink-0"
                                style={{ backgroundColor: item.color || '#ccc' }}
                            />
                            <div>
                                <div className="text-foreground-primary font-medium">{item.name}</div>
                                {item.description && (
                                    <div className="text-sm text-foreground-secondary mt-1">{item.description}</div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all mt-1">
                            <button
                                onClick={() => startEdit(item)}
                                disabled={!!editingId}
                                className="text-foreground-tertiary hover:text-primary-600 disabled:opacity-30"
                            >
                                <PencilSimple size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(item.id)}
                                disabled={!!editingId}
                                className="text-foreground-tertiary hover:text-red-600 disabled:opacity-30"
                            >
                                <Trash size={18} />
                            </button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <p className="text-foreground-tertiary text-sm text-center py-4">No issue categories yet</p>
                )}
            </div>
        </div>
    );
}
