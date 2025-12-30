"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash, FloppyDisk, CaretDown, CaretRight, PencilSimple, X, CaretUp } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface SampleTask {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    due_days: number;
}

interface SampleProject {
    id: string;
    title: string;
    description: string | null;
    duration_days: number;
    tasks?: SampleTask[];
}

interface SampleProjectManagerProps {
    templateId: string;
    initialData: SampleProject[];
}

export default function SampleProjectManager({ templateId, initialData }: SampleProjectManagerProps) {
    const [projects, setProjects] = useState<SampleProject[]>(initialData);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);

    // New/Edit Project State
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [newProjectDuration, setNewProjectDuration] = useState(30);
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

    // New Task State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('normal');
    const [newTaskDueDays, setNewTaskDueDays] = useState(7);
    const [isAddingTask, setIsAddingTask] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    const handleAddProject = async () => {
        if (!newProjectTitle.trim()) return;

        setIsAddingProject(true);
        try {
            const { data, error } = await supabase
                .from('template_sample_projects')
                .insert({
                    template_id: templateId,
                    title: newProjectTitle.trim(),
                    description: newProjectDesc.trim() || null,
                    duration_days: newProjectDuration
                })
                .select()
                .single();

            if (error) throw error;

            setProjects([...projects, { ...data, tasks: [] }]);
            setNewProjectTitle('');
            setNewProjectDesc('');
            setNewProjectDuration(30);
            router.refresh();
        } catch (error) {
            console.error('Error adding project:', error);
            alert('Failed to add project');
        } finally {
            setIsAddingProject(false);
        }
    };

    const handleUpdateProject = async () => {
        if (!newProjectTitle.trim() || !editingProjectId) return;

        setIsAddingProject(true);
        try {
            const { data, error } = await supabase
                .from('template_sample_projects')
                .update({
                    title: newProjectTitle.trim(),
                    description: newProjectDesc.trim() || null,
                    duration_days: newProjectDuration
                })
                .eq('id', editingProjectId)
                .select()
                .single();

            if (error) throw error;

            setProjects(projects.map(p => p.id === editingProjectId ? { ...p, ...data } : p));
            setNewProjectTitle('');
            setNewProjectDesc('');
            setNewProjectDuration(30);
            setEditingProjectId(null);
            router.refresh();
        } catch (error) {
            console.error('Error updating project:', error);
            alert('Failed to update project');
        } finally {
            setIsAddingProject(false);
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (!confirm('Are you sure? This will delete all tasks in this project.')) return;

        try {
            const { error } = await supabase
                .from('template_sample_projects')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setProjects(projects.filter(p => p.id !== id));
            router.refresh();
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project');
        }
    };

    const startEditProject = (project: SampleProject) => {
        setEditingProjectId(project.id);
        setNewProjectTitle(project.title);
        setNewProjectDesc(project.description || '');
        setNewProjectDuration(project.duration_days);
    };

    const cancelEditProject = () => {
        setEditingProjectId(null);
        setNewProjectTitle('');
        setNewProjectDesc('');
        setNewProjectDuration(30);
    };

    const handleAddTask = async (projectId: string) => {
        if (!newTaskTitle.trim()) return;

        setIsAddingTask(projectId);
        try {
            const { data, error } = await supabase
                .from('template_sample_tasks')
                .insert({
                    project_id: projectId,
                    title: newTaskTitle.trim(),
                    description: newTaskDesc.trim() || null,
                    priority: newTaskPriority,
                    due_days: newTaskDueDays
                })
                .select()
                .single();

            if (error) throw error;

            setProjects(projects.map(p => {
                if (p.id === projectId) {
                    return { ...p, tasks: [...(p.tasks || []), data] };
                }
                return p;
            }));

            setNewTaskTitle('');
            setNewTaskDesc('');
            setNewTaskPriority('normal');
            setNewTaskDueDays(7);
            router.refresh();
        } catch (error) {
            console.error('Error adding task:', error);
            alert('Failed to add task');
        } finally {
            setIsAddingTask(null);
        }
    };

    const handleDeleteTask = async (taskId: string, projectId: string) => {
        if (!confirm('Are you sure?')) return;

        try {
            const { error } = await supabase
                .from('template_sample_tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;

            setProjects(projects.map(p => {
                if (p.id === projectId) {
                    return { ...p, tasks: p.tasks?.filter(t => t.id !== taskId) };
                }
                return p;
            }));
            router.refresh();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        }
    };

    return (
        <div className="bg-surface-primary border border-border-primary rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground-primary mb-4">Sample Projects & Tasks</h3>

            {/* Add/Edit Project Form */}
            <div className={`bg-background-secondary p-4 rounded-lg mb-6 ${editingProjectId ? 'border-2 border-primary-500' : ''}`}>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-foreground-primary">
                        {editingProjectId ? 'Edit Project' : 'Add New Project'}
                    </h4>
                    {editingProjectId && (
                        <button onClick={cancelEditProject} className="text-foreground-tertiary hover:text-foreground-primary">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="grid gap-3">
                    <input
                        type="text"
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        placeholder="Project Title"
                        className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <textarea
                        value={newProjectDesc}
                        onChange={(e) => setNewProjectDesc(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none h-20"
                    />
                    <div className="flex gap-3">
                        <div className="w-32">
                            <label className="block text-xs text-foreground-secondary mb-1">Duration (Days)</label>
                            <input
                                type="number"
                                value={newProjectDuration}
                                onChange={(e) => setNewProjectDuration(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2 bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div className="flex-1 flex items-end">
                            {editingProjectId ? (
                                <div className="flex gap-2 w-full">
                                    <button
                                        onClick={handleUpdateProject}
                                        disabled={isAddingProject || !newProjectTitle.trim()}
                                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isAddingProject ? 'Saving...' : 'Update Project'}
                                    </button>
                                    <button
                                        onClick={cancelEditProject}
                                        className="px-4 py-2 bg-background-tertiary text-foreground-primary rounded-lg hover:bg-surface-hover transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleAddProject}
                                    disabled={isAddingProject || !newProjectTitle.trim()}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors w-full"
                                >
                                    {isAddingProject ? 'Adding...' : 'Add Project'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Projects List */}
            <div className="space-y-4">
                {projects.map((project) => (
                    <div key={project.id} className={`border border-border-primary rounded-lg overflow-hidden ${editingProjectId === project.id ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div
                            className="flex justify-between items-center p-4 bg-background-secondary cursor-pointer hover:bg-surface-hover transition-colors"
                            onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                        >
                            <div className="flex items-center gap-3">
                                {expandedProject === project.id ? <CaretUp size={16} /> : <CaretDown size={16} />}
                                <div>
                                    <h5 className="font-medium text-foreground-primary">{project.title}</h5>
                                    <p className="text-xs text-foreground-secondary">{project.duration_days} days duration</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startEditProject(project);
                                    }}
                                    className="p-2 text-foreground-tertiary hover:text-primary-600 rounded-lg transition-colors"
                                >
                                    <PencilSimple size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProject(project.id);
                                    }}
                                    className="p-2 text-foreground-tertiary hover:text-red-600 rounded-lg transition-colors"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>

                        {expandedProject === project.id && (
                            <div className="p-4 border-t border-border-primary bg-surface-primary">
                                {project.description && (
                                    <p className="text-sm text-foreground-secondary mb-4">{project.description}</p>
                                )}

                                {/* Tasks Section */}
                                <h6 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider mb-3">Tasks</h6>

                                <div className="space-y-2 mb-4">
                                    {project.tasks?.map((task) => (
                                        <div key={task.id} className="flex justify-between items-center p-3 border border-border-primary rounded-lg">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-foreground-primary">{task.title}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                        task.priority === 'low' ? 'bg-green-100 text-green-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-foreground-secondary mt-1">Due in {task.due_days} days</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteTask(task.id, project.id)}
                                                className="text-foreground-tertiary hover:text-red-600 transition-colors"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!project.tasks || project.tasks.length === 0) && (
                                        <p className="text-sm text-foreground-tertiary italic">No tasks added yet.</p>
                                    )}
                                </div>

                                {/* Add Task Form */}
                                <div className="bg-background-secondary p-3 rounded-lg">
                                    <p className="text-xs font-medium text-foreground-secondary mb-2">Add Task</p>
                                    <div className="grid gap-2">
                                        <input
                                            type="text"
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            placeholder="Task Title"
                                            className="w-full px-3 py-1.5 text-sm bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <select
                                                value={newTaskPriority}
                                                onChange={(e) => setNewTaskPriority(e.target.value)}
                                                className="px-3 py-1.5 text-sm bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                            >
                                                <option value="low">Low</option>
                                                <option value="normal">Normal</option>
                                                <option value="high">High</option>
                                            </select>
                                            <input
                                                type="number"
                                                value={newTaskDueDays}
                                                onChange={(e) => setNewTaskDueDays(parseInt(e.target.value) || 0)}
                                                placeholder="Due Days"
                                                className="w-20 px-3 py-1.5 text-sm bg-background-primary border border-border-primary rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                            <button
                                                onClick={() => handleAddTask(project.id)}
                                                disabled={isAddingTask === project.id || !newTaskTitle.trim()}
                                                className="flex-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {projects.length === 0 && (
                    <p className="text-foreground-tertiary text-sm text-center py-4">No sample projects yet</p>
                )}
            </div>
        </div>
    );
}
