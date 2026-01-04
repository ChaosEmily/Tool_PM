import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../types';

interface TaskItemProps {
    task: Task;
    onClick: (task: Task) => void;
    onDelete: (e: React.MouseEvent, taskId: string) => void;
}

export function TaskItem({ task, onClick, onDelete }: TaskItemProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onClick(task)}
            className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer group touch-none"
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">{task.title}</h4>
                <button
                    onClick={(e) => onDelete(e, task.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                >
                    <span className="text-xl leading-none">×</span>
                </button>
            </div>
            <div className="text-xs text-gray-500 mb-2">
                <span className="font-medium">👤 {task.assignee}</span>
            </div>
            <div className="text-xs text-gray-400">
                {task.end_date}
            </div>
        </div>
    );
}
