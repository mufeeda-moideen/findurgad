'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Pause,
  Edit3,
  Trash2,
  Copy,
  Check,
  Upload,
  Mic,
  Square,
  Radio,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  adId: string;
  imageUrl: string;
  description: string;
  category?: string;
  voiceFileName: string;
  voiceUrl?: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Gadgets');
  const [editAdId, setEditAdId] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVoiceFileName, setEditVoiceFileName] = useState('');
  const [editVoiceUrl, setEditVoiceUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Check admin authentication
    const auth = localStorage.getItem('findurgad_auth');
    if (auth !== 'true') {
      router.push('/');
      return;
    }
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products?id=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        setEditName(data.name || '');
        setEditCategory(data.category || 'Gadgets');
        setEditAdId(data.adId || '');
        setEditImageUrl(data.imageUrl || '');
        setEditDescription(data.description || '');
        setEditVoiceFileName(data.voiceFileName || '');
        setEditVoiceUrl(data.voiceUrl || '');
      } else {
        setProduct(null);
      }
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCopyAdId = () => {
    if (product?.adId) {
      navigator.clipboard?.writeText(product.adId);
      setCopied(true);
      showToast('Meta Ad ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Real Audio Playback Toggle
  const togglePlayAudio = () => {
    if (!product?.voiceUrl) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const audio = new Audio(product.voiceUrl);
      audioRef.current = audio;
      setIsPlaying(true);
      audio.play().catch(() => setIsPlaying(false));
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
    } catch {
      setIsPlaying(false);
    }
  };

  // Handle Image Upload for Edit
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    showToast('Uploading new image...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        setEditImageUrl(data.url);
        showToast('✓ Image uploaded successfully');
      } else {
        showToast(data.error || 'Failed to upload image');
      }
    } catch {
      showToast('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Audio Upload for Edit
  const handleEditAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    showToast('Uploading new voice note...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        setEditVoiceUrl(data.url);
        setEditVoiceFileName(file.name);
        showToast(`✓ Voice note attached: ${file.name}`);
      } else {
        showToast(data.error || 'Failed to upload audio');
      }
    } catch {
      showToast('Error uploading voice note');
    } finally {
      setUploadingAudio(false);
    }
  };

  // Live Mic Recording for Edit
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
            setEditVoiceUrl(data.url);
            setEditVoiceFileName('Live Mic Recording');
            showToast('✓ Live voice note saved');
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
      showToast('Recording... Speak clearly into your mic');
    } catch {
      showToast('Microphone access denied or not supported');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Save Product Changes
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Product name is required');
      return;
    }
    if (!editAdId.trim()) {
      showToast('Meta Ad ID is required');
      return;
    }
    if (!editImageUrl) {
      showToast('Product image is required');
      return;
    }

    const updatedData: Product = {
      id: productId,
      name: editName.trim(),
      category: editCategory || 'Gadgets',
      adId: editAdId.trim(),
      imageUrl: editImageUrl,
      description: editDescription.trim(),
      voiceFileName: editVoiceFileName,
      voiceUrl: editVoiceUrl,
    };

    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (res.ok) {
        setProduct(updatedData);
        setIsEditOpen(false);
        showToast('✓ Product updated');
      } else {
        showToast('Failed to update product');
      }
    } catch {
      showToast('Error updating product');
    }
  };

  // Delete Product
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products?id=${productId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Product deleted from catalog');
        setTimeout(() => {
          router.push('/');
        }, 800);
      } else {
        showToast('Failed to delete product');
        setIsDeleting(false);
      }
    } catch {
      showToast('Error deleting product');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] text-slate-800 flex items-center justify-center font-sans">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-[#C6FF00] animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Product Not Found</h2>
          <p className="text-xs text-slate-500">
            This item may have been removed or does not exist in the catalog.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans selection:bg-[#C6FF00] selection:text-[#111111]">
      {/* Top Header Bar */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
              <span>Back to Products</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="FIND UR GAD" className="w-8 h-8 object-contain" />
              <span className="font-black text-xs tracking-tight text-slate-900 uppercase">
                FIND UR GAD
              </span>
            </div>
          </div>

          {/* Action Buttons: Edit, Delete */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C6FF00] hover:bg-[#b4ea00] text-[#111111] text-xs font-bold transition shadow-xs active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Product</span>
            </button>

            <button
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition"
              title="Delete Product"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Image Container & Ad ID */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex items-center justify-center">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Meta Ad Referral ID Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Meta Ad Referral ID
                </span>
                <span className="font-mono text-xs text-slate-900 font-bold">
                  {product.adId || 'None assigned'}
                </span>
              </div>
              {product.adId && (
                <button
                  onClick={handleCopyAdId}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  title="Copy Ad ID"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Title, Pricing, Voice Note & Details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C6FF00]/30 text-[#111111] text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  <span>FIND UR GAD</span>
                </div>
                {product.category && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {product.category}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
                {product.name}
              </h1>
            </div>

            {/* Specifications Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-3 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Product Details
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Voice Note Player Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-[#C6FF00] flex items-center justify-center font-bold">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Voice Note Audio
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Dispatched with product enquiry
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md truncate max-w-[140px]">
                  {product.voiceFileName || 'voice_note.mp3'}
                </span>
              </div>

              {product.voiceUrl ? (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlayAudio}
                      className="w-11 h-11 rounded-xl bg-[#C6FF00] hover:bg-[#b4ea00] text-[#111111] flex items-center justify-center shadow-xs transition active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-[#111111]" />
                      ) : (
                        <Play className="w-4 h-4 fill-[#111111] ml-0.5" />
                      )}
                    </button>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">
                        {isPlaying ? 'Playing Audio...' : 'Play Voice Note'}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Audio Attachment
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="w-1 h-3.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="w-1 h-5 bg-emerald-500 rounded-full animate-pulse delay-75" />
                    <span className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse delay-150" />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  No voice note attached. Click &quot;Edit Product&quot; to upload or record one.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* EDIT PRODUCT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Edit Product</h3>
                <p className="text-xs text-slate-500">
                  Update product details and voice note
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
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
                    value={editAdId}
                    onChange={(e) => setEditAdId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Product Image</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-slate-200 hover:border-slate-900 bg-slate-50 rounded-xl p-3.5 text-center cursor-pointer transition flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600 font-medium">
                      {uploadingImage ? 'Uploading image...' : 'Upload New Image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      className="hidden"
                    />
                  </label>

                  {editImageUrl && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
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
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed focus:outline-none focus:bg-white focus:border-slate-900"
                />
              </div>

              {/* Voice Note Upload / Live Mic */}
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
                        : editVoiceFileName || 'Upload Audio (MP3/M4A)'}
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleEditAudioUpload}
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
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#C6FF00] hover:bg-[#b4ea00] text-[#111111] text-xs font-bold transition shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-slate-900">Delete Product?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-900">{product.name}</strong> from
                your WhatsApp catalog?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
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
