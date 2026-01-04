import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { LayoutDashboard, Trash2, CheckCircle2 } from 'lucide-react';
import { RecycleBin } from './RecycleBin/RecycleBin';

export function Layout() {
    const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-6">
                    <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <LayoutDashboard className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-lg font-bold tracking-tight">Vibe Coding</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1 border-l border-gray-100 pl-6 ml-0">
                        <Link
                            to="/"
                            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                            任務看板
                        </Link>
                        <Link
                            to="/records"
                            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1.5"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            完工紀錄
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsRecycleBinOpen(true)}
                        className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
                        title="回收站"
                    >
                        <Trash2 className="w-5 h-5" />
                        <span className="text-sm font-medium">回收站</span>
                    </button>
                    {/* User Switcher Removed */}
                </div>
            </header>

            <main className="flex-1 overflow-x-hidden">
                <Outlet />
            </main>

            <RecycleBin
                isOpen={isRecycleBinOpen}
                onClose={() => setIsRecycleBinOpen(false)}
            />
        </div>
    );
}
