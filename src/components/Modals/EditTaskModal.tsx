import React, { useState, useEffect } from 'react';
import { TEAM_MEMBERS } from '../../constants';
import type { Task } from '../../types';
import { X, Trash2 } from 'lucide-react';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    onUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
    onDelete: (id: string, userId: string) => Promise<void>;
}

export function EditTaskModal({ isOpen, onClose, task, onUpdate, onDelete }: EditTaskModalProps) {
    const teamMembers = TEAM_MEMBERS;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        assignee: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'todo',
    });

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                assignee: task.assignee,
                description: task.description || '',
                start_date: task.start_date,
                end_date: task.end_date,
                status: task.status,
            });
        }
    }, [task]);

    if (!isOpen || !task) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!formData.title || !formData.assignee || !formData.start_date || !formData.end_date) {
                throw new Error('請填寫所有必填欄位');
            }

            if (formData.end_date < formData.start_date) {
                throw new Error('結束日期不能早於開始日期');
            }

            await onUpdate(task.id, {
                title: formData.title,
                assignee: formData.assignee,
                description: formData.description,
                start_date: formData.start_date,
                end_date: formData.end_date,
                status: formData.status as any,
            });

            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (confirm('確定要刪除此任務嗎？')) {
            try {
                // Assuming 'Admin' or current user logic. Since no auth, defaulting to 'Admin' or finding name from somewhere. 
                // But for now hardcode or use existing logic.
                await onDelete(task.id, 'Admin');
                onClose();
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">📝 編輯/檢視任務</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">任務標題 *</label>
                        <input
                            type="text"
                            required
                            maxLength={100}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            placeholder="輸入任務標題..."
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">負責人 *</label>
                        <input
                            type="text"
                            required
                            list="assignees-edit"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            placeholder="輸入或選擇負責人..."
                            value={formData.assignee}
                            onChange={e => setFormData({ ...formData, assignee: e.target.value })}
                        />
                        <datalist id="assignees-edit">
                            {teamMembers.map(member => (
                                <option key={member.id} value={member.name} />
                            ))}
                        </datalist>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">任務狀態 *</label>
                        <select
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-white font-medium"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                        >
                            <option value="todo">待處理 (To Do)</option>
                            <option value="in_progress">進行中 (In Progress)</option>
                            <option value="review">待審核 (Review)</option>
                            <option value="done">已完成 (Done)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">起始日期 *</label>
                            <input
                                type="date"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">結束日期 *</label>
                            <input
                                type="date"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">任務內容 (選填)</label>
                        <textarea
                            rows={3}
                            maxLength={500}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                            placeholder="輸入任務詳細描述..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    {/* Move delete button to left footer */}
                    <div className="flex justify-between items-center pt-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                        >
                            <Trash2 className="w-4 h-4" /> 刪除
                        </button>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? '儲存中...' : '儲存變更'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
