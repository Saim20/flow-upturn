"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash, FloppyDisk, PencilSimple, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface SampleNotice {
    id: string;
    title: string;
    description: string | null;
    urgency: string;
    valid_days: number;
    type_name: string;
}

interface SampleNoticeManagerProps {
    templateId: string;
    initialData: SampleNotice[];
    availableTypes: string[]; // List of notice type names available in this template
}

export default function SampleNoticeManager({ templateId, initialData, availableTypes }: SampleNoticeManagerProps) {
    const [notices, setNotices] = useState<SampleNotice[]>(initialData);

    // New/Edit Notice State
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newUrgency, setNewUrgency] = useState('normal');
    const [newValidDays, setNewValidDays] = useState(30);
    const [newTypeName, setNewTypeName] = useState(availableTypes[0] || '');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    const handleAdd = async () => {
        if (!newTitle.trim() || !newTypeName) {
            if (!newTypeName) alert('Please create Notice Types first in the Notice Types tab.');
            return;
        }

        setIsAdding(true);
        try {
            const { data, error } = await supabase
                .from('template_sample_notices')
                .insert({
                    template_id: templateId,
                    title: newTitle.trim(),
                    description: newDesc.trim() || null,
                    urgency: newUrgency,
                    valid_days: newValidDays,
                    type_name: newTypeName
                })
                .select()
                .single();

            if (error) throw error;

            setNotices([...notices, data]);
            setNewTitle('');
            setNewDesc('');
            setNewUrgency('normal');
            setNewValidDays(30);
            router.refresh();
        } catch (error) {
            console.error('Error adding notice:', error);
            alert('Failed to add notice');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdate = async () => {
        if (!newTitle.trim() || !newTypeName || !editingId) return;

        setIsAdding(true);
        try {
            const { data, error } = await supabase
                .from('template_sample_notices')
                .update({
                    title: newTitle.trim(),
                    description: newDesc.trim() || null,
                    urgency: newUrgency,
                    valid_days: newValidDays,
                    type_name: newTypeName
                })
                .eq('id', editingId)
                .select()
                .single();

            if (error) throw error;

            setNotices(notices.map(n => n.id === editingId ? data : n));
            setNewTitle('');
            setNewDesc('');
            setNewUrgency('normal');
            setNewValidDays(30);
            setEditingId(null);
            router.refresh();
        } catch (error) {
            console.error('Error updating notice:', error);
            alert('Failed to update notice');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;

        try {
            const { error } = await supabase
                .from('template_sample_notices')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setNotices(notices.filter(n => n.id !== id));
            router.refresh();
        } catch (error) {
            console.error('Error deleting notice:', error);
            alert('Failed to delete notice');
        }
    };

    const startEdit = (notice: SampleNotice) => {
        setEditingId(notice.id);
        setNewTitle(notice.title);
        setNewDesc(notice.description || '');
        setNewUrgency(notice.urgency);
        setNewValidDays(notice.valid_days);
        setNewTypeName(notice.type_name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setNewTitle('');
        setNewDesc('');
        setNewUrgency('normal');
        setNewValidDays(30);
    };

    if (availableTypes.length === 0) {
        return (
            <div className="bg-surface-primary border border-border-primary rounded-xl p-6 text-center">
                <p className="text-foreground-secondary">Please add Notice Types in the "Notice Types" tab before creating sample notices.</p>
            </div>
        );
    }

    return (
        <div className="bg-surface-primary border border-border-primary rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground-primary mb-4">Sample Notices</h3>

            {/* Add/Edit Notice Form */}
            <div className={`bg-background-secondary p-4 rounded-lg mb-6 ${editingId ? 'border-2 border-primary-500' : ''}`}>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-foreground-primary">
                        {editingId ? 'Edit Notice' : 'Add New Notice'}
                    </h4>
                    {editingId && (
                        <button onClick={cancelEdit} className="text-foreground-tertiary hover:text-foreground-primary">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="grid gap-3">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Notice Title"
                        className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <textarea
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Content (optional)"
                        className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none h-20"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-foreground-secondary mb-1">Type</label>
                            <select
                                value={newTypeName}
                                onChange={(e) => setNewTypeName(e.target.value)}
                                className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            >
                                {availableTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-secondary mb-1">Urgency</label>
                            <select
                                value={newUrgency}
                                onChange={(e) => setNewUrgency(e.target.value)}
                                className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-secondary mb-1">Valid Days</label>
                            <input
                                type="number"
                                value={newValidDays}
                                onChange={(e) => setNewValidDays(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>
                    {editingId ? (
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={handleUpdate}
                                disabled={isAdding || !newTitle.trim()}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                            >
                                {isAdding ? 'Saving...' : 'Update Notice'}
                            </button>
                            <button
                                onClick={cancelEdit}
                                className="px-4 py-2 bg-background-tertiary text-foreground-primary rounded-lg hover:bg-surface-hover transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAdd}
                            disabled={isAdding || !newTitle.trim()}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors w-full mt-2"
                        >
                            {isAdding ? 'Adding...' : 'Add Notice'}
                        </button>
                    )}
                </div>
            </div>

            {/* Notices List */}
            <div className="space-y-3">
                {notices.map((notice) => (
                    <div key={notice.id} className={`flex justify-between items-start p-4 border border-border-primary rounded-lg bg-background-secondary ${editingId === notice.id ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-foreground-primary">{notice.title}</h5>
                                <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">{notice.type_name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${notice.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                                    notice.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                    {notice.urgency}
                                </span>
                            </div>
                            <p className="text-sm text-foreground-secondary mb-2">{notice.description}</p>
                            <p className="text-xs text-foreground-tertiary">Valid for {notice.valid_days} days</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => startEdit(notice)}
                                className="p-2 text-foreground-tertiary hover:text-primary-600 rounded-lg transition-colors"
                            >
                                <PencilSimple size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(notice.id)}
                                className="p-2 text-foreground-tertiary hover:text-red-600 rounded-lg transition-colors"
                            >
                                <Trash size={18} />
                            </button>
                        </div>
                    </div>
                ))}
                {notices.length === 0 && (
                    <p className="text-foreground-tertiary text-sm text-center py-4">No sample notices yet</p>
                )}
            </div>
        </div>
    );
}
