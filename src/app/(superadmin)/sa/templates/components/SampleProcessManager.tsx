"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash, CaretDown, CaretRight, ArrowUp, ArrowDown, PencilSimple, X, CaretUp } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface SampleStep {
    id: string;
    name: string;
    description: string | null;
    step_order: number;
    assigned_team_role: string;
}

interface SampleProcess {
    id: string;
    name: string;
    description: string | null;
    steps?: SampleStep[];
}

interface SampleProcessManagerProps {
    templateId: string;
    initialData: SampleProcess[];
}

export default function SampleProcessManager({ templateId, initialData }: SampleProcessManagerProps) {
    const [processes, setProcesses] = useState<SampleProcess[]>(initialData);
    const [expandedProcess, setExpandedProcess] = useState<string | null>(null);

    // New/Edit Process State
    const [newProcessName, setNewProcessName] = useState('');
    const [newProcessDesc, setNewProcessDesc] = useState('');
    const [isAddingProcess, setIsAddingProcess] = useState(false);
    const [editingProcessId, setEditingProcessId] = useState<string | null>(null);

    // New Step State
    const [newStepName, setNewStepName] = useState('');
    const [newStepDesc, setNewStepDesc] = useState('');
    const [newStepTeam, setNewStepTeam] = useState('Admin'); // Maps to default teams
    const [isAddingStep, setIsAddingStep] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    const handleAddProcess = async () => {
        if (!newProcessName.trim()) return;

        setIsAddingProcess(true);
        try {
            const { data, error } = await supabase
                .from('template_sample_processes')
                .insert({
                    template_id: templateId,
                    name: newProcessName.trim(),
                    description: newProcessDesc.trim() || null
                })
                .select()
                .single();

            if (error) throw error;

            setProcesses([...processes, { ...data, steps: [] }]);
            setNewProcessName('');
            setNewProcessDesc('');
            router.refresh();
        } catch (error) {
            console.error('Error adding process:', error);
            alert('Failed to add process');
        } finally {
            setIsAddingProcess(false);
        }
    };

    const handleUpdateProcess = async () => {
        if (!newProcessName.trim() || !editingProcessId) return;

        setIsAddingProcess(true);
        try {
            const { data, error } = await supabase
                .from('template_sample_processes')
                .update({
                    name: newProcessName.trim(),
                    description: newProcessDesc.trim() || null
                })
                .eq('id', editingProcessId)
                .select()
                .single();

            if (error) throw error;

            setProcesses(processes.map(p => p.id === editingProcessId ? { ...p, ...data } : p));
            setNewProcessName('');
            setNewProcessDesc('');
            setEditingProcessId(null);
            router.refresh();
        } catch (error) {
            console.error('Error updating process:', error);
            alert('Failed to update process');
        } finally {
            setIsAddingProcess(false);
        }
    };

    const handleDeleteProcess = async (id: string) => {
        if (!confirm('Are you sure? This will delete all steps in this process.')) return;

        try {
            const { error } = await supabase
                .from('template_sample_processes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setProcesses(processes.filter(p => p.id !== id));
            router.refresh();
        } catch (error) {
            console.error('Error deleting process:', error);
            alert('Failed to delete process');
        }
    };

    const startEditProcess = (process: SampleProcess) => {
        setEditingProcessId(process.id);
        setNewProcessName(process.name);
        setNewProcessDesc(process.description || '');
    };

    const cancelEditProcess = () => {
        setEditingProcessId(null);
        setNewProcessName('');
        setNewProcessDesc('');
    };

    const handleAddStep = async (processId: string) => {
        if (!newStepName.trim()) return;

        setIsAddingStep(processId);
        try {
            // Determine next order
            const currentSteps = processes.find(p => p.id === processId)?.steps || [];
            const nextOrder = currentSteps.length > 0
                ? Math.max(...currentSteps.map(s => s.step_order)) + 1
                : 1;

            const { data, error } = await supabase
                .from('template_sample_process_steps')
                .insert({
                    process_id: processId,
                    name: newStepName.trim(),
                    description: newStepDesc.trim() || null,
                    step_order: nextOrder,
                    assigned_team_role: newStepTeam
                })
                .select()
                .single();

            if (error) throw error;

            setProcesses(processes.map(p => {
                if (p.id === processId) {
                    return { ...p, steps: [...(p.steps || []), data].sort((a, b) => a.step_order - b.step_order) };
                }
                return p;
            }));

            setNewStepName('');
            setNewStepDesc('');
            setNewStepTeam('Admin');
            router.refresh();
        } catch (error) {
            console.error('Error adding step:', error);
            alert('Failed to add step');
        } finally {
            setIsAddingStep(null);
        }
    };

    const handleDeleteStep = async (stepId: string, processId: string) => {
        if (!confirm('Are you sure?')) return;

        try {
            const { error } = await supabase
                .from('template_sample_process_steps')
                .delete()
                .eq('id', stepId);

            if (error) throw error;

            setProcesses(processes.map(p => {
                if (p.id === processId) {
                    return { ...p, steps: p.steps?.filter(s => s.id !== stepId) };
                }
                return p;
            }));
            router.refresh();
        } catch (error) {
            console.error('Error deleting step:', error);
            alert('Failed to delete step');
        }
    };

    return (
        <div className="bg-surface-primary border border-border-primary rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground-primary mb-4">Sample Processes</h3>

            {/* Add/Edit Process Form */}
            <div className={`bg-background-secondary p-4 rounded-lg mb-6 ${editingProcessId ? 'border-2 border-primary-500' : ''}`}>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-foreground-primary">
                        {editingProcessId ? 'Edit Process' : 'Add New Process'}
                    </h4>
                    {editingProcessId && (
                        <button onClick={cancelEditProcess} className="text-foreground-tertiary hover:text-foreground-primary">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="grid gap-3">
                    <input
                        type="text"
                        value={newProcessName}
                        onChange={(e) => setNewProcessName(e.target.value)}
                        placeholder="Process Name"
                        className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <textarea
                        value={newProcessDesc}
                        onChange={(e) => setNewProcessDesc(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none h-20"
                    />
                    {editingProcessId ? (
                        <div className="flex gap-2">
                            <button
                                onClick={handleUpdateProcess}
                                disabled={isAddingProcess || !newProcessName.trim()}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                            >
                                {isAddingProcess ? 'Saving...' : 'Update Process'}
                            </button>
                            <button
                                onClick={cancelEditProcess}
                                className="px-4 py-2 bg-background-tertiary text-foreground-primary rounded-lg hover:bg-surface-hover transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAddProcess}
                            disabled={isAddingProcess || !newProcessName.trim()}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors w-full"
                        >
                            {isAddingProcess ? 'Adding...' : 'Add Process'}
                        </button>
                    )}
                </div>
            </div>

            {/* Processes List */}
            <div className="space-y-4">
                {processes.map((process) => (
                    <div key={process.id} className={`border border-border-primary rounded-lg overflow-hidden ${editingProcessId === process.id ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div
                            className="flex justify-between items-center p-4 bg-background-secondary cursor-pointer hover:bg-surface-hover transition-colors"
                            onClick={() => setExpandedProcess(expandedProcess === process.id ? null : process.id)}
                        >
                            <div className="flex items-center gap-3">
                                {expandedProcess === process.id ? <CaretUp size={16} /> : <CaretDown size={16} />}
                                <div>
                                    <h5 className="font-medium text-foreground-primary">{process.name}</h5>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startEditProcess(process);
                                    }}
                                    className="p-2 text-foreground-tertiary hover:text-primary-600 rounded-lg transition-colors"
                                >
                                    <PencilSimple size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProcess(process.id);
                                    }}
                                    className="p-2 text-foreground-tertiary hover:text-red-600 rounded-lg transition-colors"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>

                        {expandedProcess === process.id && (
                            <div className="p-4 border-t border-border-primary bg-surface-primary">
                                {process.description && (
                                    <p className="text-sm text-foreground-secondary mb-4">{process.description}</p>
                                )}

                                {/* Steps Section */}
                                <h6 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider mb-3">Process Steps</h6>

                                <div className="space-y-2 mb-4">
                                    {process.steps?.map((step, index) => (
                                        <div key={step.id} className="flex justify-between items-center p-3 border border-border-primary rounded-lg relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-l-lg"></div>
                                            <div className="pl-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-primary-100 text-primary-700 text-xs font-bold rounded-full">
                                                        {index + 1}
                                                    </span>
                                                    <span className="font-medium text-sm text-foreground-primary">{step.name}</span>
                                                </div>
                                                <p className="text-xs text-foreground-secondary mt-1 pl-8">Assigned to: {step.assigned_team_role}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteStep(step.id, process.id)}
                                                className="text-foreground-tertiary hover:text-red-600 transition-colors"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!process.steps || process.steps.length === 0) && (
                                        <p className="text-sm text-foreground-tertiary italic">No steps added yet.</p>
                                    )}
                                </div>

                                {/* Add Step Form */}
                                <div className="bg-background-secondary p-3 rounded-lg">
                                    <p className="text-xs font-medium text-foreground-secondary mb-2">Add Step</p>
                                    <div className="grid gap-2">
                                        <input
                                            type="text"
                                            value={newStepName}
                                            onChange={(e) => setNewStepName(e.target.value)}
                                            placeholder="Step Name"
                                            className="w-full px-3 py-1.5 text-sm bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <select
                                                value={newStepTeam}
                                                onChange={(e) => setNewStepTeam(e.target.value)}
                                                className="px-3 py-1.5 text-sm bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                            >
                                                <option value="Admin">Administrators Team</option>
                                                <option value="Manager">Managers Team</option>
                                                <option value="Employee">Employees Team</option>
                                            </select>
                                            <button
                                                onClick={() => handleAddStep(process.id)}
                                                disabled={isAddingStep === process.id || !newStepName.trim()}
                                                className="flex-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                            >
                                                Add Step
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {processes.length === 0 && (
                    <p className="text-foreground-tertiary text-sm text-center py-4">No sample processes yet</p>
                )}
            </div>
        </div>
    );
}
