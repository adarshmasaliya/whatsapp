import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  LogOut, 
  QrCode, 
  CheckCircle2, 
  Loader2,
  Zap,
  LayoutDashboard,
  Settings,
  User,
  Bot,
  Calendar,
  Send,
  Inbox,
  History,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rule, 
  Log, 
  Status, 
  Menu, 
  Booking, 
  Message, 
  User as UserType 
} from './types';

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'automations' | 'chatbot' | 'bookings' | 'broadcast' | 'inbox' | 'logs' | 'settings'>('dashboard');
  const [status, setStatus] = useState<Status>({ connected: false, qr: null });
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastRecipients, setBroadcastRecipients] = useState('');
  const [inboxReply, setInboxReply] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [newReply, setNewReply] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);

  useEffect(() => {
    if (token) {
      fetchStatus();
      fetchRules();
      fetchLogs();
      fetchMenu();
      fetchBookings();
      fetchMessages();
      const interval = setInterval(() => {
        fetchStatus();
        fetchLogs();
        fetchMessages();
        fetchBookings();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMenus(data);
      if (data.length > 0 && !selectedMenuId) {
        setSelectedMenuId(data[0].id);
      }
    } catch (e) {}
  };

  const saveMenus = async (menusToSave: any[]) => {
    try {
      setLoading(true);
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(menusToSave)
      });
      if (res.ok) {
        // Success feedback could be added here
      }
    } catch (e) {
      console.error('Failed to save menus', e);
    } finally {
      setLoading(false);
    }
  };

  const addMenu = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newMenu = {
      id: newId,
      name: 'New Submenu',
      trigger: '',
      text: 'Please choose an option:',
      options: [],
      enabled: true,
      isRoot: false
    };
    const updated = [...menus, newMenu];
    setMenus(updated);
    setSelectedMenuId(newId);
  };

  const deleteMenu = (id: string) => {
    const updated = menus.filter(m => m.id !== id);
    setMenus(updated);
    if (selectedMenuId === id) {
      setSelectedMenuId(updated[0]?.id || null);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBookings(data);
    } catch (e) {}
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data);
    } catch (e) {}
  };

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage || !broadcastRecipients) return;
    setLoading(true);
    try {
      const recipients = broadcastRecipients.split(',').map(r => r.trim());
      await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ message: broadcastMessage, recipients })
      });
      alert('Broadcast sent!');
      setBroadcastMessage('');
      setBroadcastRecipients('');
    } catch (e) {
      alert('Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !inboxReply) return;
    try {
      await fetch('/api/messages/reply', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ to: selectedChat, text: inboxReply })
      });
      setInboxReply('');
      fetchMessages();
    } catch (e) {}
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error('Logs fetch failed');
    }
  };

  const disconnectWhatsApp = async () => {
    if (!confirm('Are you sure you want to disconnect? You will need to scan the QR code again.')) return;
    try {
      await fetch('/api/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStatus();
    } catch (e) {
      console.error('Disconnect failed');
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error('Status fetch failed');
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/rules', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRules(data);
    } catch (e) {
      console.error('Rules fetch failed');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      } else {
        alert(data.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (e) {
      alert('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const skipLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/guest', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      }
    } catch (e) {
      console.error('Guest access failed');
    } finally {
      setLoading(false);
    }
  };

  const connectWhatsApp = async () => {
    setConnecting(true);
    try {
      await fetch('/api/connect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStatus();
    } catch (e) {
      console.error('Connect failed');
    } finally {
      setTimeout(() => setConnecting(false), 2000);
    }
  };

  const addRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword || !newReply) return;
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          keyword: newKeyword, 
          reply: newReply,
          imageUrl: newImageUrl 
        })
      });
      const data = await res.json();
      setRules(data);
      setNewKeyword('');
      setNewReply('');
      setNewImageUrl('');
      setShowAddRule(false);
    } catch (e) {
      console.error('Add rule failed');
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRules(data);
    } catch (e) {
      console.error('Delete rule failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setStatus({ connected: false, qr: null });
    setRules([]);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="text-black fill-black" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AutoSaaS</h1>
              <p className="text-white/40 text-sm">WhatsApp Automation Platform</p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 ml-1">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="name@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 ml-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <button 
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
              <button 
                type="button"
                onClick={skipLogin}
                className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Go
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-white/40 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex">
      {/* Sidebar */}
      <div className="w-20 md:w-64 border-r border-white/10 flex flex-col p-4 gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="text-black fill-black" size={20} />
          </div>
          <span className="hidden md:block font-bold text-xl tracking-tight">AutoSaaS</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-white/5 text-emerald-500' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span className="hidden md:block font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('automations')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${activeTab === 'automations' ? 'bg-white/5 text-emerald-500' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <MessageSquare size={20} />
            <span className="hidden md:block font-medium">Automations</span>
          </button>
          <button 
            onClick={() => setActiveTab('chatbot')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${activeTab === 'chatbot' ? 'bg-white/5 text-emerald-500' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <Bot size={20} />
            <span className="hidden md:block font-medium">Chatbot</span>
          </button>
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${activeTab === 'bookings' ? 'bg-white/5 text-emerald-500' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <Calendar size={20} />
            <span className="hidden md:block font-medium">Bookings</span>
          </button>
          <button 
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${activeTab === 'broadcast' ? 'bg-white/5 text-emerald-500' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <Send size={20} />
            <span className="hidden md:block font-medium">Broadcast</span>
          </button>
          <button 
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${activeTab === 'inbox' ? 'bg-white/5 text-emerald-500' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <Inbox size={20} />
            <span className="hidden md:block font-medium">Team Inbox</span>
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${activeTab === 'logs' ? 'bg-white/5 text-emerald-500' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <History size={20} />
            <span className="hidden md:block font-medium">Logs</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-white/5 text-emerald-500' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <Settings size={20} />
            <span className="hidden md:block font-medium">Settings</span>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <div className="hidden md:flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate">{email}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Pro Plan</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span className="hidden md:block font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight capitalize">{activeTab}</h2>
              <p className="text-white/40">
                {activeTab === 'dashboard' && 'Overview of your WhatsApp automation status.'}
                {activeTab === 'automations' && 'Create and manage your auto-reply rules.'}
                {activeTab === 'chatbot' && 'Configure your menu-style chatbot flow.'}
                {activeTab === 'bookings' && 'View and manage customer appointments.'}
                {activeTab === 'broadcast' && 'Send marketing messages to your contacts.'}
                {activeTab === 'inbox' && 'Shared team inbox for customer support.'}
                {activeTab === 'logs' && 'Real-time history of sent automated replies.'}
                {activeTab === 'settings' && 'Manage your account and WhatsApp connection.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'automations' && (
                <button 
                  onClick={() => setShowAddRule(!showAddRule)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold text-sm transition-all"
                >
                  <Plus size={18} />
                  {showAddRule ? 'Close' : 'New Rule'}
                </button>
              )}
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${status.connected ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status.connected ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                {status.connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-40">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Active Rules</p>
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-bold">{rules.length}</span>
                    <MessageSquare className="text-emerald-500/20" size={40} />
                  </div>
                </div>
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-40">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Total Replies</p>
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-bold">{logs.length}</span>
                    <Zap className="text-emerald-500/20" size={40} />
                  </div>
                </div>
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-40">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Status</p>
                  <div className="flex items-end justify-between">
                    <span className={`text-xl font-bold ${status.connected ? 'text-emerald-500' : 'text-white/20'}`}>
                      {status.connected ? 'Online' : 'Offline'}
                    </span>
                    <CheckCircle2 className={status.connected ? 'text-emerald-500/20' : 'text-white/5'} size={40} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'automations' && (
              <motion.div 
                key="automations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <AnimatePresence>
                  {showAddRule && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-[#141414] border border-emerald-500/30 rounded-2xl p-6 shadow-lg shadow-emerald-500/5">
                        <h3 className="font-semibold mb-6 flex items-center gap-2">
                          <Plus size={18} className="text-emerald-500" />
                          New Automation Rule
                        </h3>
                        <form onSubmit={addRule} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Keyword Trigger</label>
                              <input 
                                type="text" 
                                placeholder="e.g. price, help, info"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Auto Reply Message</label>
                              <input 
                                type="text" 
                                placeholder="Type the reply message..."
                                value={newReply}
                                onChange={(e) => setNewReply(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Image URL (Optional)</label>
                            <div className="flex gap-2">
                              <input 
                                type="url" 
                                placeholder="https://example.com/image.jpg"
                                value={newImageUrl}
                                onChange={(e) => setNewImageUrl(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                              />
                              <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 rounded-xl font-bold transition-colors">
                                Add Rule
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold mb-6">Active Rules</h3>
                  <div className="space-y-3">
                    {rules.length === 0 ? (
                      <div className="text-center py-12 text-white/20 border-2 border-dashed border-white/5 rounded-2xl">
                        No rules found.
                      </div>
                    ) : (
                      rules.map(rule => (
                        <div key={rule.id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:border-emerald-500/20 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded font-mono text-xs font-bold">
                              {rule.keyword}
                            </div>
                            <div className="w-4 h-px bg-white/10" />
                            <div className="flex flex-col">
                              <p className="text-sm text-white/60">{rule.reply}</p>
                              {rule.imageUrl && (
                                <a href={rule.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block w-20 h-20 rounded-lg overflow-hidden border border-white/10 hover:border-emerald-500/50 transition-colors">
                                  <img src={rule.imageUrl} alt="Reply" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </a>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => deleteRule(rule.id)}
                            className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'chatbot' && (
              <motion.div 
                key="chatbot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Menu List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Your Menus</h3>
                    <button 
                      onClick={addMenu}
                      className="text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {menus.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMenuId(m.id)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedMenuId === m.id ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-[#141414] border-white/10 text-white/60 hover:border-white/20'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">{m.name || 'Untitled Menu'}</span>
                          {m.isRoot && <span className="text-[8px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-bold uppercase">Root</span>}
                        </div>
                        <p className="text-[10px] opacity-60 truncate">{m.text}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Menu Editor */}
                <div className="lg:col-span-2 space-y-6">
                  {selectedMenuId ? (
                    <div className="bg-[#141414] border border-white/10 rounded-2xl p-8">
                      {(() => {
                        const m = menus.find(menu => menu.id === selectedMenuId);
                        if (!m) return null;
                        return (
                          <div className="space-y-8">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                  <Bot className="text-emerald-500" />
                                  Edit Menu: {m.name}
                                </h3>
                                <p className="text-xs text-white/40">Configure how this menu behaves on WhatsApp.</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Enabled</span>
                                  <button 
                                    onClick={() => {
                                      const updated = menus.map(item => item.id === m.id ? { ...item, enabled: !item.enabled } : item);
                                      setMenus(updated);
                                    }}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${m.enabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                                  >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${m.enabled ? 'left-6' : 'left-1'}`} />
                                  </button>
                                </div>
                                {!m.isRoot && (
                                  <button 
                                    onClick={() => deleteMenu(m.id)}
                                    className="p-2 text-white/20 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Internal Name</label>
                                <input 
                                  type="text" 
                                  value={m.name}
                                  onChange={(e) => {
                                    const updated = menus.map(item => item.id === m.id ? { ...item, name: e.target.value } : item);
                                    setMenus(updated);
                                  }}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                />
                              </div>
                              {m.isRoot && (
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Trigger Keyword</label>
                                  <input 
                                    type="text" 
                                    value={m.trigger}
                                    onChange={(e) => {
                                      const updated = menus.map(item => item.id === m.id ? { ...item, trigger: e.target.value } : item);
                                      setMenus(updated);
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                    placeholder="e.g. menu, hi"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Menu Message Content</label>
                              <textarea 
                                rows={6}
                                value={m.text}
                                onChange={(e) => {
                                  const updated = menus.map(item => item.id === m.id ? { ...item, text: e.target.value } : item);
                                  setMenus(updated);
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                                placeholder="Welcome to ABC Salon 👋..."
                              />
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Menu Options</label>
                                <button 
                                  onClick={() => {
                                    const newOpt = { id: (m.options.length + 1).toString(), label: 'New Option', action: 'text', value: '' };
                                    const updated = menus.map(item => item.id === m.id ? { ...item, options: [...item.options, newOpt] } : item);
                                    setMenus(updated);
                                  }}
                                  className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400"
                                >
                                  + Add Option
                                </button>
                              </div>

                              <div className="space-y-3">
                                {m.options.map((opt: any, idx: number) => (
                                  <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-4">
                                    <div className="flex items-center gap-4">
                                      <input 
                                        type="text"
                                        value={opt.id}
                                        onChange={(e) => {
                                          const newOpts = [...m.options];
                                          newOpts[idx].id = e.target.value;
                                          const updated = menus.map(item => item.id === m.id ? { ...item, options: newOpts } : item);
                                          setMenus(updated);
                                        }}
                                        className="w-10 bg-black/20 border border-white/10 rounded text-center text-xs font-bold py-1 focus:outline-none focus:border-emerald-500/50"
                                      />
                                      <input 
                                        type="text"
                                        value={opt.label}
                                        onChange={(e) => {
                                          const newOpts = [...m.options];
                                          newOpts[idx].label = e.target.value;
                                          const updated = menus.map(item => item.id === m.id ? { ...item, options: newOpts } : item);
                                          setMenus(updated);
                                        }}
                                        className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none"
                                        placeholder="Option Label"
                                      />
                                      <div className="flex items-center gap-2">
                                        <button 
                                          disabled={idx === 0}
                                          onClick={() => {
                                            const newOpts = [...m.options];
                                            [newOpts[idx], newOpts[idx-1]] = [newOpts[idx-1], newOpts[idx]];
                                            const updated = menus.map(item => item.id === m.id ? { ...item, options: newOpts } : item);
                                            setMenus(updated);
                                          }}
                                          className="p-1 text-white/20 hover:text-white disabled:opacity-0"
                                        >
                                          <Plus size={14} className="rotate-45" /> {/* Using Plus as a placeholder for up/down if needed, but let's just use simple buttons */}
                                        </button>
                                        <button 
                                          onClick={() => {
                                            const newOpts = m.options.filter((_: any, i: number) => i !== idx);
                                            const updated = menus.map(item => item.id === m.id ? { ...item, options: newOpts } : item);
                                            setMenus(updated);
                                          }}
                                          className="p-1 text-white/20 hover:text-red-400"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-bold uppercase tracking-widest text-white/20 ml-1">Action Type</label>
                                        <select 
                                          value={opt.action}
                                          onChange={(e) => {
                                            const newOpts = [...m.options];
                                            newOpts[idx].action = e.target.value;
                                            newOpts[idx].value = '';
                                            const updated = menus.map(item => item.id === m.id ? { ...item, options: newOpts } : item);
                                            setMenus(updated);
                                          }}
                                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                                        >
                                          <option value="text">Reply with Text</option>
                                          <option value="booking">Start Booking Flow</option>
                                          <option value="submenu">Show Submenu</option>
                                          <option value="support">Transfer to Support</option>
                                          <option value="info">Send Business Info</option>
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-bold uppercase tracking-widest text-white/20 ml-1">Action Value</label>
                                        {opt.action === 'submenu' ? (
                                          <select 
                                            value={opt.value}
                                            onChange={(e) => {
                                              const newOpts = [...m.options];
                                              newOpts[idx].value = e.target.value;
                                              const updated = menus.map(item => item.id === m.id ? { ...item, options: newOpts } : item);
                                              setMenus(updated);
                                            }}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                                          >
                                            <option value="">Select a Submenu</option>
                                            {menus.filter(menu => menu.id !== m.id).map(menu => (
                                              <option key={menu.id} value={menu.id}>{menu.name}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <input 
                                            type="text"
                                            disabled={opt.action === 'booking' || opt.action === 'support'}
                                            value={opt.value}
                                            onChange={(e) => {
                                              const newOpts = [...m.options];
                                              newOpts[idx].value = e.target.value;
                                              const updated = menus.map(item => item.id === m.id ? { ...item, options: newOpts } : item);
                                              setMenus(updated);
                                            }}
                                            placeholder={opt.action === 'booking' ? 'N/A' : 'Enter text or info...'}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50 disabled:opacity-30"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button 
                              onClick={() => saveMenus(menus)}
                              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={20} />
                              Save All Changes
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-[#141414] border border-white/10 border-dashed rounded-2xl p-20 flex flex-col items-center justify-center text-center space-y-4">
                      <Bot size={48} className="text-white/10" />
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white/40">No Menu Selected</h3>
                        <p className="text-sm text-white/20">Select a menu from the left or create a new one to start customizing.</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'bookings' && (
              <motion.div 
                key="bookings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-white/10">
                  <h3 className="font-semibold">Customer Bookings</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-widest text-white/30 border-b border-white/5">
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-white/20">No bookings found.</td>
                        </tr>
                      ) : (
                        bookings.map(booking => (
                          <tr key={booking.id} className="text-sm hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs">{booking.phone}</td>
                            <td className="px-6 py-4 text-white/60">{booking.date}</td>
                            <td className="px-6 py-4 text-white/60">{booking.time}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded">Confirmed</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'broadcast' && (
              <motion.div 
                key="broadcast"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-2xl"
              >
                <form onSubmit={sendBroadcast} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Recipients (Phone numbers, comma separated)</label>
                    <textarea 
                      rows={3}
                      value={broadcastRecipients}
                      onChange={(e) => setBroadcastRecipients(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                      placeholder="919876543210, 911234567890"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Marketing Message</label>
                    <textarea 
                      rows={5}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                      placeholder="🎉 Special Offer! 20% discount today."
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Send Broadcast
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'inbox' && (
              <motion.div 
                key="inbox"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]"
              >
                <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold text-sm">Recent Chats</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {Array.from(new Set(messages.map(m => m.from))).map((jid: any) => (
                      <button 
                        key={jid}
                        onClick={() => setSelectedChat(jid)}
                        className={`w-full p-4 text-left hover:bg-white/5 transition-colors border-b border-white/5 ${selectedChat === jid ? 'bg-white/5' : ''}`}
                      >
                        <p className="font-mono text-xs text-emerald-500">{jid?.split('@')[0]}</p>
                        <p className="text-xs text-white/40 truncate mt-1">
                          {messages.find(m => m.from === jid)?.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 bg-[#141414] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                  {selectedChat ? (
                    <>
                      <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                        <h3 className="font-semibold text-sm">{(selectedChat as string).split('@')[0]}</h3>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">Active Chat</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.filter(m => m.from === selectedChat).reverse().map(m => (
                          <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.fromMe ? 'bg-emerald-500 text-black rounded-tr-none' : 'bg-white/5 text-white/80 rounded-tl-none'}`}>
                              {m.text}
                              <p className={`text-[10px] mt-1 ${m.fromMe ? 'text-black/40' : 'text-white/20'}`}>
                                {new Date(m.time).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={sendReply} className="p-4 border-t border-white/10 bg-white/5">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={inboxReply}
                            onChange={(e) => setInboxReply(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm"
                            placeholder="Type a reply..."
                          />
                          <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 rounded-xl font-bold transition-colors">
                            <Send size={18} />
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                      <Inbox size={48} className="mb-4 opacity-10" />
                      <p>Select a chat to start replying</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h3 className="font-semibold">Recent Activity</h3>
                  <button onClick={fetchLogs} className="text-xs text-emerald-500 hover:underline">Refresh</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-widest text-white/30 border-b border-white/5">
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4">Recipient</th>
                        <th className="px-6 py-4">Incoming Message</th>
                        <th className="px-6 py-4">Auto Reply</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-white/20">No activity logged yet.</td>
                        </tr>
                      ) : (
                        logs.map(log => (
                          <tr key={log.id} className="text-sm hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-white/40 whitespace-nowrap">
                              {new Date(log.time).toLocaleTimeString()}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs">{log.to.split('@')[0]}</td>
                            <td className="px-6 py-4 text-white/60">{log.msg}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-500/80">{log.reply}</span>
                                {(log as any).hasImage && (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-bold uppercase tracking-widest rounded border border-emerald-500/20">
                                    Media
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-6">
                  <h3 className="font-semibold flex items-center gap-2">
                    <QrCode size={18} className="text-emerald-500" />
                    WhatsApp Connection
                  </h3>
                  
                  {status.connected ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="text-black" size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-500">Connected & Active</p>
                          <p className="text-xs text-emerald-500/60">Your session is running perfectly.</p>
                        </div>
                      </div>
                      <button 
                        onClick={disconnectWhatsApp}
                        className="w-full py-3 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-bold transition-all"
                      >
                        Disconnect Account
                      </button>
                    </div>
                  ) : (status.qr || connecting) ? (
                    <div className="space-y-6">
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-white p-6 rounded-2xl aspect-square max-w-[280px] mx-auto flex items-center justify-center overflow-hidden">
                          {connecting && !status.qr ? (
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="text-emerald-500 animate-spin" size={40} />
                              <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">Generating QR...</p>
                            </div>
                          ) : (
                            <div className="relative w-full h-full">
                              <img src={status.qr!} alt="QR Code" className="w-full h-full" />
                              {/* Scanner Line Animation */}
                              <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-[scan_2s_linear_infinite]" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-emerald-500">
                          <QrCode size={16} />
                          <p className="text-sm font-bold">Scan to Link</p>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed px-4">
                          1. Open WhatsApp on your phone<br/>
                          2. Tap Menu or Settings and select Linked Devices<br/>
                          3. Tap on Link a Device and point your phone to this screen
                        </p>
                        <button 
                          onClick={connectWhatsApp}
                          className="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                        >
                          Refresh QR Code
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="py-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                          <QrCode className="text-white/10" size={32} />
                        </div>
                        <p className="text-sm text-white/30">No active connection</p>
                      </div>
                      <button 
                        onClick={connectWhatsApp}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all shadow-lg shadow-white/5"
                      >
                        Link New Device
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-6">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User size={18} className="text-emerald-500" />
                    Account Profile
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Email Address</label>
                      <div className="mt-1 p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60">
                        {email}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Subscription Plan</label>
                      <div className="mt-1 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                        <span className="text-sm font-bold text-emerald-500">Pro Lifetime</span>
                        <Zap size={14} className="text-emerald-500" />
                      </div>
                    </div>
                    <button 
                      onClick={logout}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-sm font-bold transition-all"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
