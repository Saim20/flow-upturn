"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash, FloppyDisk, PencilSimple, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface SimpleType {
    id: string;
    name: string;
}

interface SimpleTypeManagerProps {
    templateId: string;
    tableName: string;
    title: string;
    initialData: SimpleType[];
}

export default function SimpleTypeManager({ templateId, tableName, title, initialData }: SimpleTypeManagerProps) {
    const [items, setItems] = useState<SimpleType[]>(initialData);
    const [newName, setNewName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    const handleAdd = async () => {
        if (!newName.trim()) return;

        setIsAdding(true);
        try {
            const { data, error } = await supabase
                .from(tableName)
                .insert({ template_id: templateId, name: newName.trim() })
                .select()
                .single();

            if (error) throw error;

            setItems([...items, data]);
            setNewName('');
            router.refresh();
        } catch (error) {
            console.error(`Error adding to ${tableName}:`, error);
            alert('Failed to add item');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdate = async () => {
        if (!newName.trim() || !editingId) return;

        setIsAdding(true);
        try {
            const { data, error } = await supabase
                .from(tableName)
                .update({ name: newName.trim() })
                .eq('id', editingId)
                .select()
                .single();

            if (error) throw error;

            setItems(items.map(i => i.id === editingId ? data : i));
            setNewName('');
            setEditingId(null);
            router.refresh();
        } catch (error) {
            console.error(`Error updating ${tableName}:`, error);
            alert('Failed to update item');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;

        try {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', id);

            if (error) throw error;

            setItems(items.filter(i => i.id !== id));
            router.refresh();
        } catch (error) {
            console.error(`Error deleting from ${tableName}:`, error);
            alert('Failed to delete item');
        }
    };

    const startEdit = (item: SimpleType) => {
        setEditingId(item.id);
        setNewName(item.name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setNewName('');
    };

    return (
        <div className="bg-surface-primary border border-border-primary rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground-primary mb-4">{title}</h3>

            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={editingId ? "Update item name..." : "Add new item..."}
                    className="flex-1 px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && (editingId ? handleUpdate() : handleAdd())}
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

            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item.id} className={`flex justify-between items-center p-3 rounded-lg group ${editingId === item.id ? 'bg-primary-50 border border-primary-200' : 'bg-background-secondary'}`}>
                        <span className="text-foreground-primary">{item.name}</span>
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
                    <p className="text-foreground-tertiary text-sm text-center py-4">No items yet</p>
                )}
            </div>
        </div>
    );
}
