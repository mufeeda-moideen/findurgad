'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Heart,
  Share2,
  Bookmark,
  MoreHorizontal,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  adId: string;
  imageUrl: string;
  description: string;
  voiceFileName: string;
  voiceUrl?: string;
}

export default function AdPreviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [phone, setPhone] = useState('918921901702');
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      })
      .catch(() => {});
  }, []);

  const activeProduct = products[selectedIndex] || {
    id: 'prod_1',
    name: 'Wireless ANC Headphones',
    adId: 'act_49182371',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    description: 'Flagship active noise cancellation, 50-hour battery life, 1-year store warranty. Price: $179.',
  };

  const handleAdClick = async () => {
    setIsSending(true);
    setSentSuccess(false);

    try {
      const res = await fetch('/api/whatsapp/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: activeProduct.id,
          testPhone: phone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSentSuccess(true);
        setTimeout(() => setSentSuccess(false), 8000);
      }
    } catch {
      // ignore
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex flex-col items-center font-sans">
      {/* Top Controls & Navigation */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Live Client Ad Simulator</span>
        </div>
      </div>

      {/* Target Recipient Selector */}
      <div className="w-full max-w-md bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-700">
            Target WhatsApp Number:
          </label>
          <span className="text-[11px] text-emerald-600 font-mono">
            Verified recipient
          </span>
        </div>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 918921901702"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
        />

        {/* Product Selector Pill Bar */}
        {products.length > 1 && (
          <div className="pt-1 flex gap-2 overflow-x-auto">
            {products.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setSelectedIndex(idx)}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
                  selectedIndex === idx
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Realistic Instagram Feed Ad Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden transition">
        {/* Ad Header */}
        <div className="p-3.5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center p-0.5">
                <div className="w-full h-full rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                  VP
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-900">
                  voltpulse_electronics
                </span>
                <span className="text-[10px] text-blue-500 font-bold">✓</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Sponsored • Meta Ad ID: {activeProduct.adId}
              </p>
            </div>
          </div>
          <button className="text-slate-400 p-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Ad Creative Image */}
        <div className="relative aspect-square w-full bg-slate-950 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeProduct.imageUrl}
            alt={activeProduct.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* OFFICIAL META CLICK-TO-WHATSAPP CTA BAR */}
        <button
          onClick={handleAdClick}
          disabled={isSending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white p-3.5 flex items-center justify-between transition group shadow-inner"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-xs">
              <MessageCircle className="w-4 h-4 fill-emerald-600" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold tracking-wide uppercase leading-tight">
                {isSending ? 'Connecting to WhatsApp...' : 'Send WhatsApp Message'}
              </span>
              <span className="block text-[10px] text-emerald-100 font-normal">
                Instant price, photos & staff voice guide
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-100 group-hover:translate-x-1 transition">
            <span className="text-xs font-semibold">Chat</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>

        {/* Action Buttons (Likes, Comments, Shares) */}
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLiked(!liked)}
                className={`transition ${liked ? 'text-red-500' : 'hover:text-slate-900'}`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-red-500' : ''}`} />
              </button>
              <button
                onClick={handleAdClick}
                className="hover:text-slate-900 transition"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button className="hover:text-slate-900 transition">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
            <button className="hover:text-slate-900 transition">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs font-bold text-slate-900">
            {liked ? '1,429 likes' : '1,428 likes'}
          </p>

          {/* Ad Caption */}
          <div className="text-xs text-slate-700 leading-relaxed space-y-1">
            <p>
              <span className="font-bold text-slate-900 mr-1.5">
                voltpulse_electronics
              </span>
              {activeProduct.description}
            </p>
            <p className="text-slate-400 text-[11px]">
              #gadgets #deals #whatsappcommerce #electronics
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {sentSuccess && (
        <div className="w-full max-w-md mt-4 bg-emerald-950 text-white p-4 rounded-2xl shadow-xl border border-emerald-500/30 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-emerald-200">
              ⚡ Automation Triggered Successfully!
            </h4>
            <p className="text-emerald-100/90 leading-relaxed">
              Meta WhatsApp Cloud API has delivered the product photo, price info, and playable voice note directly to <strong>+{phone}</strong>.
            </p>
            <p className="text-[11px] text-emerald-300 font-medium pt-1">
              Check WhatsApp on your phone right now to experience it live.
            </p>
          </div>
        </div>
      )}

      {/* Client Explanation Footer */}
      <div className="w-full max-w-md mt-6 text-center text-xs text-slate-400 space-y-1">
        <p>This interactive preview simulates the real Meta CTWA ad click.</p>
        <p>Connected live to WhatsApp Cloud API via Cloudflare Webhook.</p>
      </div>
    </div>
  );
}

