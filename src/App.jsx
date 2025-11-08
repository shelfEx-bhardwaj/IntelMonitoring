import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Calendar, Clock, AlertCircle, CheckCircle, XCircle, Loader, RefreshCw, Trash2, PlayCircle, StopCircle, Eye, Search, Filter, TrendingUp } from 'lucide-react';

const API_BASE = 'https://unhaltered-giuliana-complementally.ngrok-free.dev';

const ScraperMonitor = () => {
  const [tasks, setTasks] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [health, setHealth] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    completed: 0,
    failed: 0,
    scheduled: 0
  });

  const [newTask, setNewTask] = useState({
    location: '',
    gcs_products_url: '',
    client_id: '',
    scheduled_delay_seconds: 0,
    recurring: false,
    platform: 'all'
  });

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/tasks?limit=50`);
      const data = await response.json();
      setTasks(data.recent_tasks || []);
      
      // Calculate stats
      const stats = {
        total: data.recent_tasks?.length || 0,
        running: data.recent_tasks?.filter(t => t.status === 'RUNNING').length || 0,
        completed: data.recent_tasks?.filter(t => t.status === 'COMPLETED').length || 0,
        failed: data.recent_tasks?.filter(t => t.status === 'FAILED').length || 0,
        scheduled: 0
      };
      setStats(stats);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/schedules`);
      const data = await response.json();
      setSchedules(data.all_schedules || []);
      setStats(prev => ({ ...prev, scheduled: data.active_recurring || 0 }));
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Failed to fetch health:', error);
      setHealth({ status: 'error', error: error.message });
    }
  }, []);

  const fetchTaskDetails = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/status/${taskId}`);
      const data = await response.json();
      setSelectedTask(data);
    } catch (error) {
      console.error('Failed to fetch task details:', error);
    }
  };

  const cancelTask = async (taskId) => {
    if (!confirm('Are you sure you want to cancel this task?')) return;
    
    try {
      await fetch(`${API_BASE}/endScrape/${taskId}`, { method: 'DELETE' });
      fetchTasks();
      if (selectedTask?.task_id === taskId) setSelectedTask(null);
    } catch (error) {
      console.error('Failed to cancel task:', error);
      alert('Failed to cancel task: ' + error.message);
    }
  };

  const cancelSchedule = async (scheduleId) => {
    if (!confirm('Are you sure you want to cancel this schedule?')) return;
    
    try {
      await fetch(`${API_BASE}/schedules/${scheduleId}`, { method: 'DELETE' });
      fetchSchedules();
    } catch (error) {
      console.error('Failed to cancel schedule:', error);
      alert('Failed to cancel schedule: ' + error.message);
    }
  };

  const startNewTask = async () => {
    if (!newTask.location || !newTask.gcs_products_url || !newTask.client_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const endpoint = newTask.platform === 'all' 
        ? `${API_BASE}/scrape`
        : `${API_BASE}/scrape/${newTask.platform}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      
      if (!response.ok) throw new Error('Failed to start task');
      
      const data = await response.json();
      alert('Task started successfully! Task ID: ' + data.task_id);
      setNewTask({
        location: '',
        gcs_products_url: '',
        client_id: '',
        scheduled_delay_seconds: 0,
        recurring: false,
        platform: 'all'
      });
      fetchTasks();
      fetchSchedules();
    } catch (error) {
      console.error('Failed to start task:', error);
      alert('Failed to start task: ' + error.message);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchSchedules();
    fetchHealth();
  }, [fetchTasks, fetchSchedules, fetchHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchTasks();
      fetchSchedules();
      fetchHealth();
      if (selectedTask) fetchTaskDetails(selectedTask.task_id);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, selectedTask, fetchTasks, fetchSchedules, fetchHealth]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'RUNNING':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'RUNNING': return 'bg-blue-100 text-blue-800';
      case 'PARTIALLY_COMPLETED': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = searchQuery === '' || 
      task.task_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.client_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = searchQuery === '' ||
      schedule.task_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.params?.location?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-600" />
                Scraper Control Center
              </h1>
              <p className="text-gray-600 mt-1">Monitor and manage multi-platform scraping operations</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
              </button>
              {health && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  health.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {health.status === 'healthy' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  System {health.status}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard icon={Activity} label="Total Tasks" value={stats.total} color="blue" />
          <StatCard icon={Loader} label="Running" value={stats.running} color="blue" />
          <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="green" />
          <StatCard icon={XCircle} label="Failed" value={stats.failed} color="red" />
          <StatCard icon={Calendar} label="Recurring" value={stats.scheduled} color="purple" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 px-6 py-4 font-medium transition ${
                activeTab === 'tasks'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Tasks
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`flex-1 px-6 py-4 font-medium transition ${
                activeTab === 'schedules'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Schedules
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`flex-1 px-6 py-4 font-medium transition ${
                activeTab === 'new'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              New Task
            </button>
          </div>

          {/* Search and Filter */}
          {(activeTab === 'tasks' || activeTab === 'schedules') && (
            <div className="p-4 border-b flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by task ID, location, or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {activeTab === 'tasks' && (
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="RUNNING">Running</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="PENDING">Pending</option>
                </select>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {activeTab === 'tasks' && (
              <TasksView
                tasks={filteredTasks}
                selectedTask={selectedTask}
                onSelectTask={fetchTaskDetails}
                onCancelTask={cancelTask}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            )}

            {activeTab === 'schedules' && (
              <SchedulesView
                schedules={filteredSchedules}
                onCancelSchedule={cancelSchedule}
                getStatusColor={getStatusColor}
              />
            )}

            {activeTab === 'new' && (
              <NewTaskForm
                newTask={newTask}
                setNewTask={setNewTask}
                onSubmit={startNewTask}
              />
            )}
          </div>
        </div>

        {/* Task Details Panel */}
        {selectedTask && (
          <TaskDetailsPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            getStatusIcon={getStatusIcon}
            getStatusColor={getStatusColor}
          />
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

const TasksView = ({ tasks, selectedTask, onSelectTask, onCancelTask, getStatusIcon, getStatusColor }) => (
  <div className="space-y-3">
    {tasks.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No tasks found</p>
      </div>
    ) : (
      tasks.map(task => (
        <div
          key={task.task_id}
          className={`border rounded-lg p-4 transition hover:shadow-md cursor-pointer ${
            selectedTask?.task_id === task.task_id ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => onSelectTask(task.task_id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {getStatusIcon(task.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-gray-600 truncate">
                    {task.task_id.slice(0, 8)}...
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                  {task.recurring && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Recurring
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>📍 {task.location || 'N/A'}</span>
                  <span>👤 {task.client_id || 'N/A'}</span>
                  <span>🕐 {new Date(task.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTask(task.task_id);
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
              {task.status === 'RUNNING' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelTask(task.task_id);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Cancel Task"
                >
                  <StopCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Platform Status Pills */}
          {(task.swiggy_status || task.zepto_status || task.blinkit_status) && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              {task.swiggy_status && (
                <div className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(task.swiggy_status)}`}>
                  Swiggy: {task.swiggy_status}
                </div>
              )}
              {task.zepto_status && (
                <div className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(task.zepto_status)}`}>
                  Zepto: {task.zepto_status}
                </div>
              )}
              {task.blinkit_status && (
                <div className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(task.blinkit_status)}`}>
                  Blinkit: {task.blinkit_status}
                </div>
              )}
            </div>
          )}
        </div>
      ))
    )}
  </div>
);

const SchedulesView = ({ schedules, onCancelSchedule, getStatusColor }) => (
  <div className="space-y-3">
    {schedules.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No scheduled tasks</p>
      </div>
    ) : (
      schedules.map(schedule => (
        <div key={schedule.task_id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm text-gray-600">
                  {schedule.task_id.slice(0, 8)}...
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(schedule.status)}`}>
                  {schedule.status}
                </span>
                {schedule.recurring && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    🔄 Recurring every {schedule.delay_seconds}s
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>📍 Location: {schedule.params?.location || 'N/A'}</div>
                <div>⏰ Next run: {schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : 'N/A'}</div>
                <div>🎯 Platform: {schedule.params?.platform || 'All'}</div>
                <div>🔢 Executions: {schedule.execution_count || 0}</div>
              </div>
              {schedule.last_executed_at && (
                <div className="text-xs text-gray-500 mt-2">
                  Last executed: {new Date(schedule.last_executed_at).toLocaleString()}
                </div>
              )}
            </div>
            {schedule.status === 'SCHEDULED' && (
              <button
                onClick={() => onCancelSchedule(schedule.task_id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Cancel Schedule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))
    )}
  </div>
);

const NewTaskForm = ({ newTask, setNewTask, onSubmit }) => (
  <div className="max-w-2xl mx-auto space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
      <select
        value={newTask.platform}
        onChange={(e) => setNewTask({ ...newTask, platform: e.target.value })}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Platforms</option>
        <option value="swiggy">Swiggy Only</option>
        <option value="zepto">Zepto Only</option>
        <option value="blinkit">Blinkit Only</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
      <input
        type="text"
        value={newTask.location}
        onChange={(e) => setNewTask({ ...newTask, location: e.target.value })}
        placeholder="e.g., Mumbai, Delhi"
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        required
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">GCS Products URL *</label>
      <input
        type="text"
        value={newTask.gcs_products_url}
        onChange={(e) => setNewTask({ ...newTask, gcs_products_url: e.target.value })}
        placeholder="gs://bucket/path/to/products.txt"
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        required
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Client ID *</label>
      <input
        type="text"
        value={newTask.client_id}
        onChange={(e) => setNewTask({ ...newTask, client_id: e.target.value })}
        placeholder="client-123"
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        required
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Delay (seconds)</label>
      <input
        type="number"
        value={newTask.scheduled_delay_seconds}
        onChange={(e) => setNewTask({ ...newTask, scheduled_delay_seconds: parseInt(e.target.value) || 0 })}
        placeholder="0 = Run immediately only"
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        min="0"
      />
      <p className="text-xs text-gray-500 mt-1">
        0 = immediate only, &gt;0 = run now AND schedule for later
      </p>
    </div>

    {newTask.scheduled_delay_seconds > 0 && (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={newTask.recurring}
          onChange={(e) => setNewTask({ ...newTask, recurring: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          id="recurring"
        />
        <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
          Make this a recurring task (repeats every {newTask.scheduled_delay_seconds} seconds)
        </label>
      </div>
    )}

    <button
      onClick={onSubmit}
      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
    >
      <PlayCircle className="w-5 h-5" />
      Start Scraping Task
    </button>
  </div>
);

const TaskDetailsPanel = ({ task, onClose, getStatusIcon, getStatusColor }) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-xl font-bold text-gray-900">Task Details</h3>
      <button
        onClick={onClose}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
      >
        <XCircle className="w-5 h-5" />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <DetailItem label="Task ID" value={task.task_id} mono />
        <DetailItem label="Status" value={task.status} badge badgeClass={getStatusColor(task.status)} />
        <DetailItem label="Location" value={task.location} />
        <DetailItem label="Client ID" value={task.client_id} />
        <DetailItem label="Created" value={new Date(task.created_at).toLocaleString()} />
        {task.completed_at && (
          <DetailItem label="Completed" value={new Date(task.completed_at).toLocaleString()} />
        )}
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Platform Status</h4>
        
        {task.swiggy_status && (
          <PlatformDetail
            name="Swiggy"
            status={task.swiggy_status}
            result={task.swiggy_result}
            getStatusIcon={getStatusIcon}
            getStatusColor={getStatusColor}
          />
        )}
        
        {task.zepto_status && (
          <PlatformDetail
            name="Zepto"
            status={task.zepto_status}
            result={task.zepto_result}
            getStatusIcon={getStatusIcon}
            getStatusColor={getStatusColor}
          />
        )}
        
        {task.blinkit_status && (
          <PlatformDetail
            name="Blinkit"
            status={task.blinkit_status}
            result={task.blinkit_result}
            getStatusIcon={getStatusIcon}
            getStatusColor={getStatusColor}
          />
        )}
      </div>
    </div>

    {task.error_message && (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm font-medium text-red-800 mb-1">Error Message:</p>
        <p className="text-sm text-red-700">{task.error_message}</p>
      </div>
    )}
  </div>
);

const DetailItem = ({ label, value, mono, badge, badgeClass }) => (
  <div>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    {badge ? (
      <span className={`px-3 py-1 rounded text-sm font-medium ${badgeClass}`}>
        {value}
      </span>
    ) : (
      <p className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>
        {value || 'N/A'}
      </p>
    )}
  </div>
);

const PlatformDetail = ({ name, status, result, getStatusIcon, getStatusColor }) => (
  <div className="border rounded-lg p-3">
    <div className="flex items-center gap-2 mb-2">
      {getStatusIcon(status)}
      <span className="font-medium">{name}</span>
      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
        {status}
      </span>
    </div>
    {result && (
      <div className="text-xs text-gray-600 space-y-1 mt-2">
        {result.output_path && (
          <p className="truncate">📁 {result.output_path}</p>
        )}
        {result.connection_type && (
          <p>🌐 {result.connection_type}</p>
        )}
        {result.attempt && (
          <p>🔄 Attempt {result.attempt}</p>
        )}
        {result.cleaned !== undefined && (
          <p>✨ Cleaned: {result.cleaned ? 'Yes' : 'No'}</p>
        )}
        {result.completed_at && (
          <p>⏱️ {new Date(result.completed_at).toLocaleTimeString()}</p>
        )}
        {result.error && (
          <p className="text-red-600 mt-1">❌ {result.error}</p>
        )}
      </div>
    )}
  </div>
);

export default ScraperMonitor;
