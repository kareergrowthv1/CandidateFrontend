import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Clock, CheckCircle2, AlertCircle, ChevronRight, Filter, Search } from 'lucide-react';
import axiosInstance from '../../../config/axiosConfig';
import { useAuth } from '../../../context/AuthContext';

const TasksPage = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        const fetchTasks = async () => {
            if (!user?.id) return;
            try {
                // Fetch tasks from AdminBackend (proxied or direct if configured)
                // Note: Assuming AdminBackend is accessible via relative path if same domain or requires absolute URL
                const res = await axiosInstance.get('/candidates/tasks');
                if (res.data.success) {
                    setTasks(res.data.data.map(t => ({
                        ...t,
                        status: t.task_status // Map task_status from backend
                    })));
                }
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch tasks:', err);
                setLoading(false);
            }
        };
        fetchTasks();
    }, [user]);

    const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400';
            case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
            case 'Pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-400';
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">Assigned Tasks</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage and track tasks assigned by your college admin.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none text-slate-900 dark:text-white"
                        >
                            <option value="All">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 animate-pulse" />
                    ))}
                </div>
            ) : filteredTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTasks.map((task) => (
                        <motion.div 
                            key={task.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700 p-5 shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusStyle(task.status)}`}>
                                    {task.status}
                                </div>
                                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(task.deadline).toLocaleDateString()}
                                </div>
                            </div>
                            
                            <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors capitalize">
                                {task.title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                                {task.description}
                            </p>
                            
                            <div className="pt-4 border-t border-slate-50 dark:border-zinc-700 flex items-center justify-between">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${task.priority === 'High' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-slate-50 text-slate-500 dark:bg-zinc-900 dark:text-slate-400'}`}>
                                    {task.priority} Priority
                                </span>
                                <button className="flex items-center gap-1 text-[12px] font-black text-blue-600 dark:text-blue-400 hover:gap-2 transition-all group/btn">
                                    View Details
                                    <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-zinc-800 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-700">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-zinc-900 flex items-center justify-center mb-4">
                        <ClipboardList className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">No tasks found</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">No tasks have been assigned to you yet or they don't match the current filter.</p>
                </div>
            )}
        </div>
    );
};

export default TasksPage;
