import { useDroppable } from '@dnd-kit/core';
import type { Task } from '../../types';
import { TaskItem } from './TaskItem';

interface ColumnProps {
    status: string;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onDeleteTask: (e: React.MouseEvent, taskId: string) => void;
}

export function Column({ status, tasks, onTaskClick, onDeleteTask }: ColumnProps) {
    const { setNodeRef } = useDroppable({
        id: status,
    });

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'todo': return 'bg-gray-100/50 border-gray-200 text-gray-600';
            case 'in_progress': return 'bg-blue-50 border-blue-100 text-blue-600';
            case 'review': return 'bg-yellow-50 border-yellow-100 text-yellow-600';
            case 'done': return 'bg-green-50 border-green-100 text-green-600';
            default: return 'bg-gray-50/50 border-gray-100 text-gray-700';
        }
    };

    const styles = getStatusStyles(status);

    return (
        <div className={`flex flex-col gap-4 rounded-xl p-4 border h-full transition-colors ${styles.split(' ').filter(s => s.startsWith('bg-') || s.startsWith('border-')).join(' ')}`}>
            <div className="flex items-center justify-between">
                <h3 className={`font-bold capitalize flex items-center gap-2 ${styles.split(' ').find(s => s.startsWith('text-'))}`}>
                    <span className={`w-2 h-2 rounded-full ${status === 'todo' ? 'bg-gray-400' : status === 'in_progress' ? 'bg-blue-500' : status === 'review' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                    {status.replace('_', ' ')}
                </h3>
                <span className="bg-white/80 backdrop-blur-sm text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">{tasks.length}</span>
            </div>

            <div ref={setNodeRef} className="space-y-3 flex-1 overflow-y-auto min-h-[100px]">
                {tasks.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center text-gray-400 text-sm">
                        No tasks
                    </div>
                ) : (
                    tasks.map(task => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onClick={onTaskClick}
                            onDelete={onDeleteTask}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
