import { useState } from 'react';
import { DndContext, type DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { useTaskContext } from '../../context/TaskContext';
import { CreateTaskModal } from '../Modals/CreateTaskModal';
import { EditTaskModal } from '../Modals/EditTaskModal';
import type { Task, TaskStatus } from '../../types';
import { Column } from './Column';
import { GanttChart } from '../Gantt/GanttChart';
import { LayoutGrid, Calendar, Wifi, WifiOff } from 'lucide-react';

type ViewMode = 'board' | 'gantt';

export function TaskBoard() {
    const { tasks, loading, error, deleteTask, createTask, updateTask, realtimeStatus } = useTaskContext();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('board');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    if (loading) return <div className="p-6">Loading tasks...</div>;
    if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

    const handleDelete = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(taskId, 'Admin');
        }
    };

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const taskId = active.id as string;
        const newStatus = over.id as TaskStatus;

        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        await updateTask(taskId, { status: newStatus });
    };

    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="p-6 h-full flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${realtimeStatus === 'SUBSCRIBED'
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-yellow-100 text-yellow-700 border border-yellow-200 animate-pulse'
                                }`}>
                                {realtimeStatus === 'SUBSCRIBED' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                {realtimeStatus === 'SUBSCRIBED' ? 'Realtime: Online' : `Realtime: ${realtimeStatus}`}
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm">Manage your team's tasks and progress</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                            <button
                                onClick={() => setViewMode('board')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Kanban Board"
                            >
                                <LayoutGrid size={20} />
                            </button>
                            <button
                                onClick={() => setViewMode('gantt')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'gantt' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Gantt Chart"
                            >
                                <Calendar size={20} />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition shadow-sm"
                        >
                            + New Task
                        </button>
                    </div>
                </div>

                <CreateTaskModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={createTask}
                />

                <EditTaskModal
                    isOpen={!!editingTask}
                    onClose={() => setEditingTask(null)}
                    task={editingTask}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                />

                {viewMode === 'board' ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full min-h-[500px]">
                            {(['todo', 'in_progress', 'review', 'done'] as const).map(status => (
                                <Column
                                    key={status}
                                    status={status}
                                    tasks={tasks.filter(t => t.status === status)}
                                    onTaskClick={setEditingTask}
                                    onDeleteTask={handleDelete}
                                />
                            ))}
                        </div>

                        <DragOverlay>
                            {activeTask ? (
                                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 cursor-grabbing opacity-90 rotate-3">
                                    <h4 className="font-medium text-gray-900">{activeTask.title}</h4>
                                    <div className="text-xs text-gray-500 mt-2">
                                        <span className="font-medium">👤 {activeTask.assignee}</span>
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </>
                ) : (
                    <div className="h-full min-h-[500px] overflow-hidden">
                        <GanttChart tasks={tasks} onTaskClick={setEditingTask} />
                    </div>
                )}
            </div>
        </DndContext>
    );
}
