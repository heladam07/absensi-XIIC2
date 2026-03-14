import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Camera, 
  BarChart3, 
  CheckCircle2, 
  UserCircle,
  Calendar as CalendarIcon,
  LogOut,
  ShieldCheck,
  Baby,
  History,
  CameraOff,
  RefreshCw,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Types
interface User {
  id: number;
  name: string;
  role: 'student' | 'teacher' | 'parent';
  username: string;
  class_name?: string;
  child_id?: number;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name?: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  selfie_url?: string;
  notes?: string;
  date: string;
  timestamp: string;
}

const COLORS = {
  Hadir: '#10b981',
  Sakit: '#f59e0b',
  Izin: '#3b82f6',
  Alpa: '#ef4444'
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'stats' | 'profile'>('home');

  // Teacher Data
  const [students, setStudents] = useState<User[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<any[]>([]);

  // Student Data
  const [selfie, setSelfie] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Hadir' | 'Sakit' | 'Izin' | 'Alpa'>('Hadir');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Parent Data
  const [childHistory, setChildHistory] = useState<AttendanceRecord[]>([]);
  const [childName, setChildName] = useState('');

  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchTeacherData();
    } else if (user?.role === 'parent' && user.child_id) {
      fetchParentData(user.child_id);
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (res.ok) {
          setUser(data);
          setActiveTab('home');
        } else {
          setError(data.error || 'Username atau password salah');
        }
      } else {
        const text = await res.text();
        console.error('Server error:', text);
        setError(`Server bermasalah (Status: ${res.status}). Silakan coba lagi nanti.`);
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError('Gagal terhubung ke server. Pastikan koneksi internet Anda stabil.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherData = async () => {
    const [sRes, aRes, stRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/attendance/today'),
      fetch('/api/stats')
    ]);
    setStudents(await sRes.json());
    setTodayAttendance(await aRes.json());
    setStats(await stRes.json());
  };

  const fetchParentData = async (childId: number) => {
    const res = await fetch(`/api/child-attendance/${childId}`);
    const data = await res.json();
    setChildHistory(data.history);
    setChildName(data.child_name);
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Gagal mengakses kamera");
      setIsCameraOpen(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setSelfie(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const submitAttendance = async () => {
    if (!selfie && status === 'Hadir') {
      alert("Silakan ambil selfie terlebih dahulu untuk verifikasi kehadiran.");
      return;
    }
    setLoading(true);
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user?.id,
          status,
          selfie_url: selfie,
          notes
        })
      });
      alert("Absensi berhasil dikirim!");
      setSelfie(null);
      setNotes('');
      if (user?.role === 'teacher') fetchTeacherData();
    } catch (err) {
      alert("Gagal mengirim absensi");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100"
        >
          <div className="text-center mb-8">
            <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Absensi Pintar</h1>
            <p className="text-slate-500">Silakan masuk ke akun Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="Username Anda"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Kata Sandi</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Masuk Sekarang'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-center text-slate-400">
              Akun Demo:<br/>
              Guru: guru (IBU ELNI), guru2 (PAK SERVAS), dll | password: guru123 / password<br/>
              Siswa: siswa1 | password: siswa12<br/>
              Orang Tua: ortu | password: ortu321
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const renderHome = () => {
    if (user.role === 'student') {
      return (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <LayoutDashboard className="text-emerald-500" /> Absensi Hari Ini
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {['Hadir', 'Sakit', 'Izin', 'Alpa'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s as any)}
                    className={`py-3 rounded-2xl font-semibold transition-all border-2 ${status === s ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {status === 'Hadir' && (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">Verifikasi Selfie</label>
                  {!isCameraOpen && !selfie && (
                    <button 
                      onClick={startCamera}
                      className="w-full aspect-video rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-200 transition-all"
                    >
                      <Camera size={48} />
                      <span className="font-semibold">Ambil Selfie</span>
                    </button>
                  )}

                  {isCameraOpen && (
                    <div className="relative rounded-3xl overflow-hidden aspect-video bg-black">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                        <button onClick={takePhoto} className="bg-emerald-500 text-white p-4 rounded-full shadow-lg hover:bg-emerald-600">
                          <Camera size={24} />
                        </button>
                        <button onClick={stopCamera} className="bg-white text-slate-800 p-4 rounded-full shadow-lg hover:bg-slate-100">
                          <CameraOff size={24} />
                        </button>
                      </div>
                    </div>
                  )}

                  {selfie && (
                    <div className="relative rounded-3xl overflow-hidden aspect-video">
                      <img src={selfie} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setSelfie(null)}
                        className="absolute top-4 right-4 bg-white/80 backdrop-blur p-2 rounded-full shadow-lg hover:bg-white"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Keterangan (Opsional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Izin karena urusan keluarga, Sakit demam, dll."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none h-24"
                />
              </div>

              <button 
                onClick={submitAttendance}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
              >
                {loading ? 'Mengirim...' : 'Kirim Absensi'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (user.role === 'teacher') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-xl font-bold">Kehadiran Siswa</h2>
              <div className="text-sm text-slate-400">{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">Siswa</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">Keterangan</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">Selfie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map(student => {
                    const record = todayAttendance.find(a => a.student_id === student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                              {student.name[0]}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{student.name}</div>
                              <div className="text-xs text-slate-400">{student.class_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {record ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              record.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' :
                              record.status === 'Sakit' ? 'bg-amber-100 text-amber-700' :
                              record.status === 'Izin' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {record.status}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300 font-medium italic">Belum Absen</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600 max-w-[200px] truncate" title={record?.notes}>
                            {record?.notes || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {record?.selfie_url ? (
                            <img src={record.selfie_url} className="w-10 h-10 rounded-lg object-cover ml-auto border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 ml-auto flex items-center justify-center text-slate-300">
                              <Camera size={16} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (user.role === 'parent') {
      return (
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-3xl shadow-lg text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Baby size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Pantau Anak: {childName}</h2>
                <p className="opacity-80">Laporan kehadiran real-time untuk buah hati Anda.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-2">
              <History className="text-emerald-500" size={20} />
              <h3 className="font-bold">Riwayat Kehadiran</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {childHistory.length > 0 ? childHistory.map(record => (
                <div key={record.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      record.status === 'Hadir' ? 'bg-emerald-100 text-emerald-600' :
                      record.status === 'Sakit' ? 'bg-amber-100 text-amber-600' :
                      record.status === 'Izin' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {record.status === 'Hadir' ? <CheckCircle2 size={24} /> : <History size={24} />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{new Date(record.date).toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
                      <div className="text-xs text-slate-400">Status: {record.status} • {new Date(record.timestamp).toLocaleTimeString('id-ID')}</div>
                      {record.notes && <div className="text-xs text-slate-500 mt-1 italic">Ket: {record.notes}</div>}
                    </div>
                  </div>
                  {record.selfie_url && (
                    <img src={record.selfie_url} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                  )}
                </div>
              )) : (
                <div className="p-12 text-center text-slate-400 italic">Belum ada riwayat kehadiran.</div>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  const renderStats = () => (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="font-bold mb-6 flex items-center gap-2 text-lg">
          <BarChart3 size={20} className="text-emerald-500" /> Statistik Kehadiran
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.length > 0 ? stats : [{ status: 'Belum Absen', count: 1 }]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="count"
              >
                {stats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS] || '#e2e8f0'} />
                ))}
                {stats.length === 0 && <Cell fill="#e2e8f0" />}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          {['Hadir', 'Sakit', 'Izin', 'Alpa'].map(s => {
            const count = stats.find(st => st.status === s)?.count || 0;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[s as keyof typeof COLORS] }}></div>
                <span className="text-sm font-bold text-slate-600">{s}: {count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
          <CalendarIcon size={20} className="text-emerald-500" /> Kalender Akademik
        </h3>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-4">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 31 }).map((_, i) => (
            <div key={i} className={`aspect-square flex items-center justify-center text-sm rounded-xl transition-colors ${i + 1 === new Date().getDate() ? 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-100' : 'hover:bg-slate-50 text-slate-600'}`}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-emerald-500 h-32 relative">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-lg">
              <div className="w-full h-full rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <UserCircle size={48} />
              </div>
            </div>
          </div>
        </div>
        <div className="pt-16 pb-8 px-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
          <p className="text-slate-500 capitalize">{user.role} {user.class_name ? `• ${user.class_name}` : ''}</p>
          
          <div className="mt-8 space-y-4 text-left">
            <div className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">Username</span>
              <span className="font-semibold">{user.username}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">ID Pengguna</span>
              <span className="font-semibold">#{user.id.toString().padStart(4, '0')}</span>
            </div>
            {user.class_name && (
              <div className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Kelas</span>
                <span className="font-semibold">{user.class_name}</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => setUser(null)}
            className="w-full mt-8 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-2xl transition-all"
          >
            <LogOut size={20} /> Keluar dari Akun
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-1.5 rounded-lg">
              <CheckCircle2 className="text-white" size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight">Absensi Pintar</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold">{user.name}</div>
              <div className="text-xs text-slate-400 capitalize">{user.role} {user.class_name ? `• ${user.class_name}` : ''}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && renderHome()}
            {activeTab === 'stats' && renderStats()}
            {activeTab === 'profile' && renderProfile()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 z-50">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-emerald-500' : 'text-slate-400'}`}
          >
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-bold">Beranda</span>
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'stats' ? 'text-emerald-500' : 'text-slate-400'}`}
          >
            <BarChart3 size={24} />
            <span className="text-[10px] font-bold">Statistik</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-emerald-500' : 'text-slate-400'}`}
          >
            <UserCircle size={24} />
            <span className="text-[10px] font-bold">Profil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
