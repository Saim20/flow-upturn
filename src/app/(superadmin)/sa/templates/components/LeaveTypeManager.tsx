"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash, FloppyDisk, PencilSimple, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface LeaveType {
    id: string;
    name: string;
    annual_quota: number;
}

interface LeaveTypeManagerProps {
    templateId: string;
    initialData: LeaveType[];
}

export default function LeaveTypeManager({ templateId, initialData }: LeaveTypeManagerProps) {
    const [items, setItems] = useState<LeaveType[]>(initialData);
    const [newName, setNewName] = useState('');
    const [newQuota, setNewQuota] = useState(0);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    const handleAdd = async () => {
        if (!newName.trim()) return;

        setIsAdding(true);
        try {
            const { data, error } = await supabase
                .from('template_leave_types')
                .insert({
                    template_id: templateId,
                    name: newName.trim(),
                    annual_quota: newQuota
                })
                .select()
                .single();

            if (error) throw error;

            setItems([...items, data]);
            setNewName('');
            setNewQuota(0);
            router.refresh();
        } catch (error) {
            console.error('Error adding leave type:', error);
            alert('Failed to add leave type');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdate = async () => {
        if (!newName.trim() || !editingId) return;

        setIsAdding(true);
        try {
            const { data, error } = await supabase
                .from('template_leave_types')
                .update({
                    name: newName.trim(),
                    annual_quota: newQuota
                })
                .eq('id', editingId)
                .select()
                .single();

            if (error) throw error;

            setItems(items.map(i => i.id === editingId ? data : i));
            setNewName('');
            setNewQuota(0);
            setEditingId(null);
            router.refresh();
        } catch (error) {
            console.error('Error updating leave type:', error);
            alert('Failed to update leave type');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;

        try {
            const { error } = await supabase
                .from('template_leave_types')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setItems(items.filter(i => i.id !== id));
            router.refresh();
        } catch (error) {
            console.error('Error deleting leave type:', error);
            alert('Failed to delete leave type');
        }
    };

    const startEdit = (item: LeaveType) => {
        setEditingId(item.id);
        setNewName(item.name);
        setNewQuota(item.annual_quota);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setNewName('');
        setNewQuota(0);
    };

    return (
        <div className="bg-surface-primary border border-border-primary rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground-primary mb-4">Leave Types</h3>

            <div className="flex gap-2 mb-6 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">Name</label>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Annual Leave"
                        className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
                <div className="w-32">
                    <label className="block text-xs font-medium text-foreground-secondary mb-1">Quota (Days)</label>
                    <input
                        type="number"
                        value={newQuota}
                        onChange={(e) => setNewQuota(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
                {editingId ? (
                    <>
                        <button
                            onClick={handleUpdate}
                            disabled={isAdding || !newName.trim()}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors h-[42px]"
                        >
                            {isAdding ? <FloppyDisk size={20} className="animate-pulse" /> : <FloppyDisk size={20} />}
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-background-tertiary text-foreground-primary rounded-lg hover:bg-surface-hover transition-colors h-[42px]"
                        >
                            <X size={20} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={handleAdd}
                        disabled={isAdding || !newName.trim()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors h-[42px]"
                    >
                        {isAdding ? <FloppyDisk size={20} className="animate-pulse" /> : <Plus size={20} />}
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item.id} className={`flex justify-between items-center p-3 rounded-lg group ${editingId === item.id ? 'bg-primary-50 border border-primary-200' : 'bg-background-secondary'}`}>
                        <div>
                            <span className="text-foreground-primary font-medium">{item.name}</span>
                            <span className="ml-2 text-sm text-foreground-secondary">({item.annual_quota} days)</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
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
                    <p className="text-foreground-tertiary text-sm text-center py-4">No leave types yet</p>
                )}
            </div>
        </div>
    );
}
