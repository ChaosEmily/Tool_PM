import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Task } from '../types';

export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial tasks
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

    // Subscribe to Realtime changes
    useEffect(() => {
        console.log('Setting up Realtime subscription...');
        fetchTasks();

        // Use a unique channel name to avoid conflicts between multiple useTasks instances
        const channelId = `tasks-${Math.random().toString(36).substring(7)}`;
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
                    console.log('Realtime event received:', payload.eventType, payload);

                    // Handle different events
                    if (payload.eventType === 'INSERT') {
                        const newTask = payload.new as Task;
                        console.log('Processing INSERT:', newTask.title);
                        // Only add if not deleted and not already in list
                        if (!newTask.is_deleted) {
                            setTasks((prev) => {
                                if (prev.find(t => t.id === newTask.id)) return prev;
                                return [newTask, ...prev];
                            });
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedTask = payload.new as Task;
                        console.log('Processing UPDATE:', updatedTask.title, 'is_deleted:', updatedTask.is_deleted);
                        // If it was soft deleted, remove from list
                        if (updatedTask.is_deleted) {
                            setTasks((prev) => prev.filter((t) => t.id !== updatedTask.id));
                        } else {
                            // Otherwise update or ADD back if it was restored
                            setTasks((prev) => {
                                const exists = prev.find(t => t.id === updatedTask.id);
                                if (exists) {
                                    return prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
                                }
                                // It was restored! Add it back.
                                return [updatedTask, ...prev];
                            });
                        }
                    } else if (payload.eventType === 'DELETE') {
                        console.log('Processing DELETE:', payload.old.id);
                        // Hard delete
                        setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Realtime subscription status (${channelId}):`, status);
                if (status === 'CHANNEL_ERROR') {
                    console.error('Realtime subscription failed. Check if table has Realtime enabled.');
                }
            });

        return () => {
            console.log(`Cleaning up Realtime subscription (${channelId})...`);
            supabase.removeChannel(channel);
        };
    }, [fetchTasks]);

    // Create Task
    const createTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'completed_by' | 'is_deleted' | 'deleted_at' | 'deleted_by'>) => {
        try {
            const { data, error } = await supabase.from('tasks').insert([
                {
                    ...task,
                },
            ]).select().single();

            if (error) throw error;

            console.log('Task created, data returned:', data);

            // Manually update state for instant feedback
            if (data) {
                setTasks((prev) => [data, ...prev]);
            } else {
                console.warn('Task created but no data returned. Fetching all tasks...');
                fetchTasks();
            }
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    // Update Task
    const updateTask = async (id: string, updates: Partial<Task>) => {
        try {
            // Determine if we need to set completed_at
            const finalUpdates: any = { ...updates };
            if ((updates.status as string) === 'done') {
                finalUpdates.completed_at = new Date().toISOString();
            } else if (updates.status && (updates.status as string) !== 'done') {
                // If moving away from 'done', might want to clear it (optional, but cleaner)
                finalUpdates.completed_at = null;
            }

            // Optimistic update
            setTasks((prev) =>
                prev.map((t) => (t.id === id ? {
                    ...t,
                    ...finalUpdates,
                    updated_at: new Date().toISOString()
                } : t))
            );

            const { error } = await supabase
                .from('tasks')
                .update({
                    ...finalUpdates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            fetchTasks(); // Revert/Refresh on error
        }
    };

    // Soft Delete Task
    const deleteTask = async (id: string, userId: string) => {
        try {
            // Optimistic update: Remove immediately from current list
            setTasks((prev) => prev.filter((t) => t.id !== id));

            const { error } = await supabase
                .from('tasks')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString(),
                    deleted_by: userId
                })
                .eq('id', id);

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            fetchTasks();
        }
    };

    // Restore Task
    const restoreTask = async (id: string) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    is_deleted: false,
                    deleted_at: null,
                    deleted_by: null
                })
                .eq('id', id);

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Batch Restore Tasks
    const batchRestoreTasks = async (ids: string[]) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    is_deleted: false,
                    deleted_at: null,
                    deleted_by: null
                })
                .in('id', ids);

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    // Permanent Delete Task
    const permanentDeleteTask = async (id: string) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Batch Permanent Delete Tasks
    const batchPermanentDeleteTasks = async (ids: string[]) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .in('id', ids);

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    return {
        tasks,
        loading,
        error,
        createTask,
        updateTask,
        deleteTask,
        restoreTask,
        batchRestoreTasks,
        permanentDeleteTask,
        batchPermanentDeleteTasks,
        refreshTasks: fetchTasks
    };
}
