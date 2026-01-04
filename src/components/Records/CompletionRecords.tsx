import { useMemo, useState } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Search, Calendar, User, ArrowLeft, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CompletionRecords() {
    const { tasks, loading } = useTaskContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [assigneeFilter, setAssigneeFilter] = useState('all');

    const completedTasks = useMemo(() => {
        return tasks
            .filter(t => t.status === 'done' && !t.is_deleted)
            .filter(t => {
                const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (t.description?.toLowerCase().includes(searchTerm.toLowerCase()));
                const matchesAssignee = assigneeFilter === 'all' || t.assignee === assigneeFilter;
                return matchesSearch && matchesAssignee;
            })
            .sort((a, b) => {
                const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
                const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
                return dateB - dateA; // Newest first
            });
    }, [tasks, searchTerm, assigneeFilter]);

    const assignees = useMemo(() => {
        const set = new Set(tasks.map(t => t.assignee));
        return Array.from(set).sort();
    }, [tasks]);

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                            完工紀錄
                        </h1>
                        <p className="text-gray-500 text-sm">回顧所有已完成的任務與專案進度</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜尋任務..."
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent focus:outline-none cursor-pointer"
                            value={assigneeFilter}
                            onChange={e => setAssigneeFilter(e.target.value)}
                        >
                            <option value="all">所有負責人</option>
                            {assignees.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-200">
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">任務名稱</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">負責人</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">原本期限</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">完工時間</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">狀態</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {completedTasks.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                    找不到相符的完工紀錄
                                </td>
                            </tr>
                        ) : (
                            completedTasks.map(task => (
                                <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{task.title}</div>
                                        {task.description && (
                                            <div className="text-xs text-gray-500 truncate mt-1 max-w-sm" title={task.description}>
                                                {task.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                            <User className="w-3 h-3" />
                                            {task.assignee}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500 text-sm">
                                        <div className="flex items-center justify-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {task.end_date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-sm font-medium text-gray-900">
                                            {task.completed_at ? format(parseISO(task.completed_at), 'yyyy-MM-dd') : '---'}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            {task.completed_at ? format(parseISO(task.completed_at), 'HH:mm') : ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Done
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">小提示</p>
                    這裡僅顯示所有標記為「Done」的歷史任務。您可以透過搜尋或負責人篩選來快速查找過去的工作紀錄。
                </div>
            </div>
        </div>
    );
}
