import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useTaskContext } from '../../context/TaskContext';
import type { Task } from '../../types';
import { X, RotateCcw, Trash2, Loader2, Info, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';

interface RecycleBinProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RecycleBin({ isOpen, onClose }: RecycleBinProps) {
    const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const { batchRestoreTasks, batchPermanentDeleteTasks, permanentDeleteTask, restoreTask } = useTaskContext();

    const fetchDeletedTasks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('is_deleted', true)
                .order('deleted_at', { ascending: false });

            if (error) throw error;
            setDeletedTasks(data || []);
            setSelectedIds(new Set()); // Reset selection
        } catch (err) {
            console.error('Error fetching deleted tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchDeletedTasks();
        }
    }, [isOpen]);

    const isAllSelected = useMemo(() => {
        return deletedTasks.length > 0 && selectedIds.size === deletedTasks.length;
    }, [deletedTasks, selectedIds]);

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(deletedTasks.map(t => t.id)));
        }
    };

    const toggleSelectTask = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBatchRestore = async () => {
        if (selectedIds.size === 0) return;

        setActionLoading(true);
        try {
            await batchRestoreTasks(Array.from(selectedIds));
            window.location.reload();
        } catch (err) {
            console.error('批量還原失敗:', err);
            alert('批量還原失敗，請稍後再試');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBatchPermanentDelete = async () => {
        if (selectedIds.size === 0) return;

        if (confirm(`確定要永久刪除這 ${selectedIds.size} 個任務嗎？此操作無法復原。`)) {
            setActionLoading(true);
            try {
                await batchPermanentDeleteTasks(Array.from(selectedIds));
                const remaining = deletedTasks.filter(t => !selectedIds.has(t.id));
                setDeletedTasks(remaining);
                setSelectedIds(new Set());
            } catch (err) {
                console.error('批量刪除失敗:', err);
                alert('批量刪除失敗，請稍後再試');
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await restoreTask(id);
            window.location.reload();
        } catch (err) {
            console.error('還原失敗:', err);
            alert('還原失敗，請稍後再試');
        }
    };

    const handlePermanentDelete = async (id: string) => {
        if (confirm('確定要「永久刪除」此任務嗎？此操作無法復原。')) {
            await permanentDeleteTask(id);
            setDeletedTasks(prev => prev.filter(t => t.id !== id));
            const newSet = new Set(selectedIds);
            newSet.delete(id);
            setSelectedIds(newSet);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-900">回收站</h2>
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                            {deletedTasks.length} 個任務
                        </span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {deletedTasks.length > 0 && !loading && (
                    <div className="px-6 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                            全選
                        </button>

                        <div className="flex items-center gap-2">
                            {selectedIds.size > 0 && (
                                <>
                                    <span className="text-xs text-blue-600 font-medium mr-2">已選擇 {selectedIds.size} 項</span>
                                    <button
                                        onClick={handleBatchRestore}
                                        disabled={actionLoading}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors border border-blue-100"
                                    >
                                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                        批量還原
                                    </button>
                                    <button
                                        onClick={handleBatchPermanentDelete}
                                        disabled={actionLoading}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors border border-red-100"
                                    >
                                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        批量刪除
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p>載入中...</p>
                        </div>
                    ) : deletedTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                            <Trash2 className="w-12 h-12 mb-3 opacity-20" />
                            <p>回收站目前是空的</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {deletedTasks.map(task => (
                                <div
                                    key={task.id}
                                    className={`p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition shadow-sm bg-white flex items-start gap-3 ${selectedIds.has(task.id) ? 'border-blue-200 bg-blue-50/10' : ''}`}
                                >
                                    <button
                                        onClick={() => toggleSelectTask(task.id)}
                                        className="mt-1 flex-shrink-0"
                                    >
                                        {selectedIds.has(task.id) ? (
                                            <CheckSquare className="w-4.5 h-4.5 text-blue-600 fill-blue-50" />
                                        ) : (
                                            <Square className="w-4.5 h-4.5 text-gray-300" />
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">👤 負責人: {task.assignee}</span>
                                                    <span className="flex items-center gap-1 text-red-500">
                                                        🗑 刪除時間: {task.deleted_at ? format(new Date(task.deleted_at), 'yyyy-MM-dd HH:mm') : '未知'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                                                <button
                                                    onClick={() => handleRestore(task.id)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="還原"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handlePermanentDelete(task.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                    title="永久刪除"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                    <Info className="w-4 h-4" />
                    還原後的任務將會回到其原始狀態欄位中。
                </div>
            </div>
        </div>
    );
}
