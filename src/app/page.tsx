'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Mic,
  Image as ImageIcon,
  Play,
  Pause,
  Plus,
  MessageCircle,
  Settings,
  X,
  Copy,
  Check,
  Send,
  Square,
  Radio,
  Lock,
  User,
  ArrowRight,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
  Star,
  ShieldCheck,
  Truck,
  CreditCard,
  Headphones,
  SlidersHorizontal,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  adId: string;
  imageUrl: string;
  description: string;
  voiceFileName: string;
  voiceUrl?: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  category?: string;
}

export default function FindUrGadAdmin() {
  const router = useRouter();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Audio Playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Add Product Modal Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Gadgets');
  const [adId, setAdId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('₹1,299');
  const [voiceFileName, setVoiceFileName] = useState('');
  const [voiceUrl, setVoiceUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Check login on load
  useEffect(() => {
    const auth = localStorage.getItem('findurgad_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchProducts();
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (username.trim() === 'admin' && password === 'admin@123') {
      localStorage.setItem('findurgad_auth', 'true');
      setIsAuthenticated(true);
      fetchProducts();
      showToast('Welcome back, Admin');
    } else {
      setAuthError('Invalid credentials. Use admin / admin@123');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('findurgad_auth');
    setIsAuthenticated(false);
    showToast('Logged out');
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Real Audio Player
  const togglePlayAudio = (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;

    if (playingId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingId(id);
      audio.play().catch(() => setPlayingId(null));
      audio.onended = () => {
        setPlayingId(null);
        audioRef.current = null;
      };
    } catch {
      setPlayingId(null);
    }
  };

  // Upload Product Image
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    showToast('Uploading image...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setImageUrl(data.url);
        showToast('✓ Image uploaded');
      } else {
        showToast(data.error || 'Failed to upload image');
      }
    } catch {
      showToast('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload Voice Note
  const handleVoiceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    showToast('Uploading voice note...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setVoiceUrl(data.url);
        setVoiceFileName(file.name);
        showToast(`✓ Voice note saved: ${file.name}`);
      } else {
        showToast(data.error || 'Failed to upload audio');
      }
    } catch {
      showToast('Error uploading voice note');
    } finally {
      setUploadingAudio(false);
    }
  };

  // Live Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.mp3`, {
          type: 'audio/mp3',
        });

        setUploadingAudio(true);
        showToast('Saving recorded audio...');

        try {
          const formData = new FormData();
          formData.append('file', audioFile);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success && data.url) {
            setVoiceUrl(data.url);
            setVoiceFileName('Recorded Voice Note (Live Mic)');
            showToast('✓ Live voice note attached');
          }
        } catch {
          showToast('Failed to save audio');
        } finally {
          setUploadingAudio(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      showToast('Recording... Speak into your microphone');
    } catch {
      showToast('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Save New Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter product name');
      return;
    }
    if (!adId.trim()) {
      showToast('Please enter Meta Ad ID');
      return;
    }
    if (!imageUrl) {
      showToast('Please upload a product image');
      return;
    }
    if (!description.trim()) {
      showToast('Please enter product description');
      return;
    }

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      name: name.trim(),
      category: category || 'Gadgets',
      adId: adId.trim(),
      imageUrl: imageUrl,
      description: description.trim(),
      voiceFileName: voiceFileName || '',
      voiceUrl: voiceUrl || '',
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProd),
      });
      if (res.ok) {
        setProducts([newProd, ...products]);
        setName('');
        setCategory('Gadgets');
        setAdId('');
        setImageUrl('');
        setDescription('');
        setVoiceFileName('');
        setVoiceUrl('');
        setIsAddModalOpen(false);
        showToast('✓ Product added to WhatsApp catalog');
      }
    } catch {
      showToast('Error saving product');
    }
  };

  // 1. CLEAN, REFINED, PROFESSIONAL ADMIN LOGIN VIEW
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#0F1115] text-slate-100 flex flex-col justify-center items-center px-4 py-12 font-sans selection:bg-[#C6FF00] selection:text-[#111111]">
        <div className="max-w-[390px] w-full space-y-7">
          {/* Brand Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xl p-2.5 mx-auto flex items-center justify-center border border-slate-200/80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="FIND UR GAD" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                FIND UR GAD
              </h1>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Gadgets • Accessories • Custom Cases
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-[#171A21] rounded-2xl border border-white/[0.08] p-7 shadow-2xl space-y-5">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white tracking-tight">Admin Sign In</h2>
              <p className="text-xs text-slate-400">
                Manage your product catalog and WhatsApp ad automation.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#0D0F12] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C6FF00] focus:ring-1 focus:ring-[#C6FF00]/30 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#0D0F12] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C6FF00] focus:ring-1 focus:ring-[#C6FF00]/30 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#C6FF00] hover:bg-[#b4ea00] text-[#111111] rounded-xl text-xs font-extrabold uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Login to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (isAuthenticated === null || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-slate-700 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#111111] border-t-[#C6FF00] animate-spin" />
      </div>
    );
  }

  // Filter products by selected category
  const filteredProducts = products.filter((p: Product) => {
    if (selectedCategory === 'All') return true;
    if (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase()) return true;
    return (
      p.name.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      p.description.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  });

  // 2. LOGGED-IN ADMIN PRODUCTS DASHBOARD (MATCHING IMAGE 2 E-COMMERCE DESIGN)
  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans selection:bg-[#C6FF00] selection:text-[#111111]">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Clean Admin Title */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="FIND UR GAD" className="w-9 h-9 object-contain" />
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight text-slate-900 uppercase">
                FIND UR GAD
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Admin
              </span>
            </div>
          </div>

          {/* Simple Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C6FF00] hover:bg-[#b4ea00] text-[#111111] text-xs font-bold transition shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Product</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-red-600 transition"
              title="Logout Admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-7">
        {/* Clean Admin Summary Banner */}
        <div className="rounded-3xl bg-[#111111] text-white p-6 sm:p-8 overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Product Management
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Manage your gadget catalog and Meta ad IDs.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-center min-w-[105px]">
                <span className="block text-2xl font-black text-[#C6FF00]">{products.length}</span>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Live Products
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          {['All', 'Gadgets', 'Accessories', 'Custom Cases', 'Audio', 'Smart Home'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-[#C6FF00] text-[#111111] font-bold shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Section Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                Products Catalog
              </h3>
              <span className="text-xs font-bold font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {selectedCategory === 'All' ? products.length : `${filteredProducts.length} of ${products.length}`}
              </span>
            </div>

            {selectedCategory !== 'All' && (
              <button
                onClick={() => setSelectedCategory('All')}
                className="text-xs text-slate-500 hover:text-slate-900 underline font-medium"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Clean Ecommerce Products Grid (Exact Match with Image 2) */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3">
              <Layers className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                {products.length === 0 ? 'No products published yet' : `No products found in "${selectedCategory}"`}
              </p>
              <p className="text-xs text-slate-400">
                {products.length === 0
                  ? 'Click "Add Product" to publish your first gadget with voice note.'
                  : 'Try selecting another category or add a new product under this category.'}
              </p>
              {products.length > 0 && selectedCategory !== 'All' && (
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Show All Products
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/products/${p.id}`)}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 p-4 shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Image Container with light backdrop */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                      />

                      {/* Meta Ad ID Pill Badge */}
                      {p.adId && (
                        <div className="absolute top-2 left-2 bg-[#111111]/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-mono text-[#C6FF00] font-bold">
                          Ad ID: {p.adId}
                        </div>
                      )}
                    </div>

                    {/* Product Name & Description */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition truncate">
                          {p.name}
                        </h4>
                        {p.category && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            {p.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </div>

                  {/* Voice Note Player (if audio attached) */}
                  {p.voiceUrl && (
                    <div className="pt-3 border-t border-slate-100 mt-3">
                      <button
                        type="button"
                        onClick={(e) => togglePlayAudio(p.voiceUrl || '', p.id, e)}
                        className="w-full py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition hover:text-emerald-700"
                      >
                        {playingId === p.id ? (
                          <Pause className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />
                        )}
                        <span>{playingId === p.id ? 'Playing...' : 'Play Voice Note'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Add New Product</h3>
                <p className="text-xs text-slate-500">
                  Publish a new gadget with audio voice note
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Product name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 cursor-pointer"
                  >
                    <option value="Gadgets">Gadgets</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Custom Cases">Custom Cases</option>
                    <option value="Audio">Audio</option>
                    <option value="Smart Home">Smart Home</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Meta Ad ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Meta Ad ID"
                    value={adId}
                    onChange={(e) => setAdId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Product Image */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Product Image</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-slate-200 hover:border-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl p-3.5 text-center cursor-pointer transition flex items-center justify-center gap-2 group">
                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-slate-900" />
                    <span className="text-xs text-slate-600 group-hover:text-slate-900 font-medium">
                      {uploadingImage ? 'Uploading image...' : 'Upload Image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>

                  {imageUrl && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Product description and details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 leading-relaxed focus:outline-none focus:bg-white focus:border-slate-900"
                />
              </div>

              {/* Voice Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Voice Note (Audio)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="flex-1 border border-slate-200 hover:border-slate-900 bg-slate-50 rounded-xl p-3 text-center cursor-pointer transition flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600 truncate font-medium">
                      {uploadingAudio
                        ? 'Uploading...'
                        : voiceFileName || 'Upload Audio (MP3/M4A)'}
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleVoiceFileChange}
                      className="hidden"
                    />
                  </label>

                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-pulse shrink-0"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shrink-0"
                    >
                      <Radio className="w-3.5 h-3.5 text-red-400" />
                      <span>Record Mic</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#C6FF00] hover:bg-[#b4ea00] text-[#111111] text-xs font-bold transition shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#C6FF00] shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
