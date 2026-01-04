export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface Task {
    id: string;
    title: string;
    description?: string;
    assignee: string;
    status: TaskStatus;
    start_date: string;
    end_date: string;
    completed_at?: string;
    completed_by?: string;
    is_deleted: boolean;
    deleted_at?: string;
    deleted_by?: string;

    created_at: string;
    updated_at: string;
}
