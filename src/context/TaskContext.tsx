import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Task } from '../types';

interface TaskContextType {
    tasks: Task[];
    loading: boolean;
    error: string | null;
    realtimeStatus: string;
    createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'completed_by' | 'is_deleted' | 'deleted_at' | 'deleted_by'>) => Promise<void>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (id: string, userId: string) => Promise<void>;
    restoreTask: (id: string) => Promise<void>;
    batchRestoreTasks: (ids: string[]) => Promise<void>;
    permanentDeleteTask: (id: string) => Promise<void>;
    batchPermanentDeleteTasks: (ids: string[]) => Promise<void>;
    refreshTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [realtimeStatus, setRealtimeStatus] = useState<string>('INITIALIZING');

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTasks(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();

        const channelId = 'global-tasks-subscription';
        console.log(`[Realtime] Initializing channel: ${channelId}`);

        const channel = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                },
                (payload) => {
                    console.log('[Realtime] Event received:', payload.eventType, payload);

                    if (payload.eventType === 'INSERT') {
                        const newTask = payload.new as Task;
                        if (!newTask.is_deleted) {
                            setTasks((prev) => {
                                if (prev.find(t => t.id === newTask.id)) return prev;
                                return [newTask, ...prev];
                            });
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedTask = payload.new as Task;
                        console.log('[Realtime] Processing UPDATE:', updatedTask);

                        if (updatedTask.is_deleted) {
                            setTasks((prev) => prev.filter((t) => t.id !== updatedTask.id));
                        } else {
                            setTasks((prev) => {
                                const exists = prev.find(t => t.id === updatedTask.id);
                                if (exists) {
                                    // Merge partial update with existing task
                                    return prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
                                }
                                // It was restored or just didn't exist in local state
                                return [updatedTask, ...prev];
                            });
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status) => {
                console.log(`[Realtime] Status change: ${status}`);
                setRealtimeStatus(status);
            });

        return () => {
            console.log(`[Realtime] Cleaning up channel: ${channelId}`);
            supabase.removeChannel(channel);
        };
    }, [fetchTasks]);

    const createTask = async (task: any) => {
        try {
            const { data, error } = await supabase.from('tasks').insert([task]).select().single();
            if (error) throw error;
            if (data) setTasks(prev => [data, ...prev]);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateTask = async (id: string, updates: Partial<Task>) => {
        try {
            const finalUpdates: any = { ...updates };
            if ((updates.status as string) === 'done') {
                finalUpdates.completed_at = new Date().toISOString();
            } else if (updates.status && (updates.status as string) !== 'done') {
                finalUpdates.completed_at = null;
            }

            // Optimistic update
            setTasks(prev => prev.map(t => t.id === id ? { ...t, ...finalUpdates, updated_at: new Date().toISOString() } : t));

            const { error } = await supabase
                .from('tasks')
                .update({ ...finalUpdates, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            fetchTasks();
        }
    };

    const deleteTask = async (id: string, userId: string) => {
        try {
            setTasks(prev => prev.filter(t => t.id !== id));
            const { error } = await supabase
                .from('tasks')
                .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId })
                .eq('id', id);
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            fetchTasks();
        }
    };

    const restoreTask = async (id: string) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ is_deleted: false, deleted_at: null, deleted_by: null })
                .eq('id', id);
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
        }
    };

    const batchRestoreTasks = async (ids: string[]) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ is_deleted: false, deleted_at: null, deleted_by: null })
                .in('id', ids);
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const permanentDeleteTask = async (id: string) => {
        try {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
        }
    };

    const batchPermanentDeleteTasks = async (ids: string[]) => {
        try {
            const { error } = await supabase.from('tasks').delete().in('id', ids);
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    return (
        <TaskContext.Provider value={{
            tasks, loading, error, realtimeStatus,
            createTask, updateTask, deleteTask, restoreTask, batchRestoreTasks,
            permanentDeleteTask, batchPermanentDeleteTasks, refreshTasks: fetchTasks
        }}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTaskContext() {
    const context = useContext(TaskContext);
    if (context === undefined) {
        throw new Error('useTaskContext must be used within a TaskProvider');
    }
    return context;
}
