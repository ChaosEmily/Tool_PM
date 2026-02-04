import { useMemo, useState } from 'react';
import {
    differenceInDays,
    addDays,
    format,
    startOfWeek,
    endOfWeek,
    parseISO,
    startOfDay,
    startOfMonth,
    addMonths,
    isFirstDayOfMonth
} from 'date-fns';
import type { Task } from '../../types';

interface GanttChartProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

type TimeSpan = 'auto' | '3months' | '1year';

export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
    const [timeSpan, setTimeSpan] = useState<TimeSpan>('auto');

    // 1. Determine timeline range based on timeSpan
    const { startDate, totalDays, colWidth } = useMemo(() => {
        const baseStart = tasks.length > 0
            ? startOfDay(new Date(Math.min(...tasks.flatMap(t => [parseISO(t.start_date).getTime(), parseISO(t.end_date).getTime()]))))
            : startOfDay(new Date());

        if (timeSpan === 'auto') {
            const dates = tasks.flatMap(t => [
                startOfDay(parseISO(t.start_date)),
                startOfDay(parseISO(t.end_date))
            ]);

            if (dates.length > 0) {
                const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

                const start = startOfDay(startOfWeek(addDays(minDate, -7)));
                const end = startOfDay(endOfWeek(addDays(maxDate, 7)));

                return {
                    startDate: start,
                    totalDays: differenceInDays(end, start) + 1,
                    colWidth: 40
                };
            }
            const start = startOfDay(startOfWeek(addDays(baseStart, -7)));
            return { startDate: start, totalDays: 45, colWidth: 40 };
        } else if (timeSpan === '3months') {
            const start = startOfDay(startOfMonth(baseStart));
            const daysCount = differenceInDays(addMonths(start, 3), start);
            return { startDate: start, totalDays: daysCount, colWidth: 25 };
        } else { // '1year'
            const start = startOfDay(startOfMonth(baseStart));
            const daysCount = differenceInDays(addMonths(start, 12), start);
            return { startDate: start, totalDays: daysCount, colWidth: 10 };
        }
    }, [tasks, timeSpan]);

    // 2. Generate calendar headers
    const days = useMemo(() => {
        return Array.from({ length: totalDays }, (_, i) => {
            const date = addDays(startDate, i);
            return {
                date,
                label: format(date, 'd'),
                dayName: format(date, 'EEE'),
                monthName: isFirstDayOfMonth(date) ? format(date, 'MMM') : null,
                isWeekend: date.getDay() === 0 || date.getDay() === 6,
                fullDate: format(date, 'yyyy-MM-dd')
            };
        });
    }, [startDate, totalDays]);

    const getTaskStyle = (task: Task) => {
        const start = startOfDay(parseISO(task.start_date));
        const end = startOfDay(parseISO(task.end_date));
        const actualEnd = end < start ? start : end;

        const offsetDays = differenceInDays(start, startDate);
        const durationDays = Math.max(1, differenceInDays(actualEnd, start) + 1);

        // 确保横条不会延伸到负位置，防止遮挡左侧任务名称栏位
        // 如果任务的开始日期早于视图开始日期，从第1列开始显示
        const startColumn = Math.max(1, offsetDays + 1);
        // 如果任务开始位置被截断，需要调整持续时间
        const adjustedDuration = offsetDays < 0
            ? Math.max(1, durationDays + offsetDays)
            : durationDays;

        return {
            gridColumn: `${startColumn} / span ${adjustedDuration}`,
            gridRow: 1
        };
    };

    const getStatusColor = (status: Task['status']) => {
        switch (status) {
            case 'todo': return 'bg-gray-400 border-gray-500';
            case 'in_progress': return 'bg-blue-500 border-blue-600';
            case 'review': return 'bg-yellow-500 border-yellow-600';
            case 'done': return 'bg-green-500 border-green-600';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Range Selectors */}
            <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100 bg-gray-50/50 gap-2">
                <span className="text-xs text-gray-500 mr-2">時間跨度:</span>
                <div className="flex bg-white border border-gray-200 rounded-lg p-1">
                    {(['auto', '3months', '1year'] as const).map(span => (
                        <button
                            key={span}
                            onClick={() => setTimeSpan(span)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeSpan === span ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            {span === 'auto' ? '自動' : span === '3months' ? '一季' : '一年'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto flex-1">
                {/* Header Row */}
                <div
                    className="grid sticky top-0 z-20 border-b border-gray-200 bg-gray-50 min-w-max"
                    style={{
                        gridTemplateColumns: `200px repeat(${totalDays}, ${colWidth}px)`,
                        minHeight: timeSpan === '1year' ? '32px' : '56px'
                    }}
                >
                    <div className="sticky left-0 bg-gray-50 z-30 border-r border-gray-200 p-2 font-semibold text-gray-700 w-[200px] max-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                        Task Name / Assignee
                    </div>
                    {days.map(day => (
                        <div
                            key={day.fullDate}
                            className={`flex flex-col items-center justify-end border-r border-gray-100 relative ${day.isWeekend ? 'bg-gray-100/50' : ''} ${day.monthName ? 'border-l-2 border-l-blue-200' : ''}`}
                            style={{
                                minWidth: `${colWidth}px`,
                                maxWidth: `${colWidth}px`,
                                width: `${colWidth}px`,
                                paddingBottom: '4px'
                            }}
                        >
                            {/* 月份标签：確保在所有時間跨度下都可見，且不被遮擋 */}
                            {day.monthName && (
                                <div className={`absolute flex justify-center z-10 pointer-events-none top-1 left-0 right-0`}>
                                    <span className={`bg-blue-600 text-white px-1.5 rounded-sm shadow-sm whitespace-nowrap ${timeSpan === '1year' ? 'text-[8px] py-0' : 'text-[10px] py-0.5'}`}>
                                        {day.monthName}
                                    </span>
                                </div>
                            )}

                            {/* 日期顯示：一年視圖下隱藏具體日期以防重疊 */}
                            {timeSpan !== '1year' && (
                                <>
                                    <span className="text-[9px] text-gray-400 leading-none">{day.dayName}</span>
                                    <span className="text-[11px] font-medium text-gray-700">{day.label}</span>
                                </>
                            )}
                            {/* 一年視圖僅在月初顯示標記，或者完全隱藏日期數字 */}
                            {timeSpan === '1year' && isFirstDayOfMonth(day.date) && (
                                <div className="w-[1px] h-2 bg-gray-300 mb-1" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Task Rows */}
                <div className="relative min-w-max">
                    {tasks.map(task => (
                        <div
                            key={`${task.id}-${task.start_date}-${task.end_date}-${task.status}-${timeSpan}`}
                            className="grid border-b border-gray-100 group transition-colors hover:bg-gray-50/50"
                            style={{ gridTemplateColumns: `200px repeat(${totalDays}, ${colWidth}px)` }}
                        >
                            {/* Fixed Left Column */}
                            <div className="sticky left-0 bg-white group-hover:bg-gray-50 z-20 border-r border-gray-200 p-2 text-sm font-medium text-gray-900 flex flex-col justify-center w-[200px] max-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                                <span className="truncate w-full block" title={task.title}>{task.title}</span>
                                <span
                                    className="text-[10px] text-gray-500 font-normal truncate w-full flex items-center gap-1 mt-0.5"
                                    title={task.assignee}
                                >
                                    👤 {task.assignee}
                                </span>
                            </div>

                            {/* Timeline Track Layer */}
                            <div
                                className="col-start-2 col-end-[-1] h-12 relative"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${totalDays}, ${colWidth}px)`,
                                    gridTemplateRows: '1fr'
                                }}
                            >
                                {/* Layer 1: Grid Lines */}
                                <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${totalDays}, ${colWidth}px)` }}>
                                    {days.map((day, i) => (
                                        <div
                                            key={i}
                                            className={`border-r border-gray-50 h-full ${day.isWeekend ? 'bg-gray-50/10' : ''} ${day.monthName ? 'border-l border-l-blue-100' : ''}`}
                                        />
                                    ))}
                                </div>

                                {/* Layer 2: The Task Bar */}
                                <div
                                    onClick={() => onTaskClick(task)}
                                    className={`z-0 self-center h-6 rounded shadow-sm cursor-pointer hover:shadow-md hover:brightness-110 transition-all px-2 flex items-center text-[10px] text-white overflow-hidden whitespace-nowrap border ${getStatusColor(task.status)}`}
                                    style={getTaskStyle(task)}
                                    title={`${task.title} (${task.start_date} ~ ${task.end_date}) - 負責人: ${task.assignee}`}
                                >
                                    {colWidth > 30 && <span className="truncate">{task.title}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
