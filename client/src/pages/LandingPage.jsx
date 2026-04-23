import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Layers, Users, Zap, Lock, ArrowRight, Github, Twitter, Linkedin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

const LandingPage = () => {
  const { user, isLoading } = useAuth();

  // If user is already logged in, they can still view the landing page, 
  // but we should change "Sign In" to "Go to Dashboard"
  
  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-surface-50 font-sans text-surface-900 overflow-x-hidden">
      {/* ── Navbar ────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-surface-200 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-brand-700 transition-colors">
              <Layers size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-surface-900">CollabBoard</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-surface-600 hover:text-brand-600 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-surface-600 hover:text-brand-600 transition-colors">How it Works</a>
            <a href="#security" className="text-sm font-medium text-surface-600 hover:text-brand-600 transition-colors">Security</a>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button variant="primary">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-surface-600 hover:text-brand-600 transition-colors hidden sm:block">
                  Log in
                </Link>
                <Link to="/register">
                  <Button variant="primary" className="shadow-sm">Sign up free</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-6 relative">
        {/* Background blobs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-brand-200/50 rounded-full blur-3xl -z-10 mix-blend-multiply opacity-50 pointer-events-none"></div>
        <div className="absolute top-40 right-0 w-96 h-96 bg-purple-200/50 rounded-full blur-3xl -z-10 mix-blend-multiply opacity-50 pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-surface-900 mb-6 leading-[1.1]">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">Infinite Canvas</span> for Limitless Teams
          </h1>
          <p className="text-lg md:text-xl text-surface-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Brainstorm, diagram, and build better products together. CollabBoard gives your team a real-time digital whiteboard to bring ideas to life instantly.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button variant="primary" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-semibold shadow-xl shadow-brand-500/20 group">
                  Open your workspace
                  <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button variant="primary" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-semibold shadow-xl shadow-brand-500/20 group">
                  Start drawing for free
                  <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            )}
            <p className="text-sm text-surface-500 sm:ml-4">No credit card required.</p>
          </div>
        </div>

        {/* Hero Image/Mockup */}
        <div className="max-w-6xl mx-auto mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-surface-50 via-transparent to-transparent z-10 top-1/2"></div>
          <div className="rounded-2xl border border-surface-200/80 bg-white/50 backdrop-blur-sm shadow-2xl p-2 md:p-4 rotate-1 hover:rotate-0 transition-transform duration-500">
            <div className="rounded-xl overflow-hidden bg-surface-100 border border-surface-200 relative aspect-[16/9] flex items-center justify-center">
              {/* Mockup UI representation */}
              <div className="absolute top-0 w-full h-12 bg-white border-b border-surface-200 flex items-center px-4 gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="h-6 bg-surface-100 rounded-md flex-1 max-w-sm mx-auto border border-surface-200"></div>
              </div>
              <div className="w-full h-full pt-12 flex">
                <div className="w-16 border-r border-surface-200 bg-white flex flex-col items-center py-4 gap-4">
                  <div className="w-8 h-8 rounded-md bg-brand-100"></div>
                  <div className="w-8 h-8 rounded-md bg-surface-100"></div>
                  <div className="w-8 h-8 rounded-md bg-surface-100"></div>
                  <div className="w-8 h-8 rounded-md bg-surface-100"></div>
                </div>
                <div className="flex-1 relative p-8" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  {/* Fake drawing elements */}
                  <div className="absolute top-20 left-32 w-48 h-32 bg-yellow-100 border-2 border-yellow-300 rounded-lg shadow-sm flex items-center justify-center transform -rotate-3">
                    <p className="font-serif italic text-yellow-800 font-medium">Idea: Real-time Sync!</p>
                  </div>
                  <div className="absolute top-40 right-48 w-40 h-40 bg-blue-100 border-2 border-blue-300 rounded-full shadow-sm flex items-center justify-center">
                    <p className="font-medium text-blue-800">Database</p>
                  </div>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    <path d="M 320 150 Q 450 150 550 220" fill="none" stroke="#94a3b8" strokeWidth="4" strokeDasharray="8 8" />
                  </svg>
                  {/* Fake cursors */}
                  <div className="absolute top-24 left-64 flex flex-col items-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3B82F6" stroke="white" strokeWidth="2"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.42a.5.5 0 00.35-.85L5.5 3.21z" /></svg>
                    <div className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md mt-1">Yug</div>
                  </div>
                  <div className="absolute top-48 right-40 flex flex-col items-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#EC4899" stroke="white" strokeWidth="2"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.42a.5.5 0 00.35-.85L5.5 3.21z" /></svg>
                    <div className="bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md mt-1">Sarah</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-brand-600 font-bold tracking-wide uppercase text-sm mb-3">Core Features</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-surface-900 mb-4">Everything you need to collaborate</h3>
            <p className="text-lg text-surface-600">Built with modern web technologies to provide a seamless, low-latency drawing experience for teams of all sizes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-surface-50 rounded-2xl p-8 border border-surface-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Users size={24} className="text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-surface-900 mb-3">Live Multiplayer</h4>
              <p className="text-surface-600 leading-relaxed">See cursors fly across the screen. Changes appear instantly for everyone in the room thanks to optimized WebSockets.</p>
            </div>
            
            <div className="bg-surface-50 rounded-2xl p-8 border border-surface-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <Zap size={24} className="text-amber-600" />
              </div>
              <h4 className="text-xl font-bold text-surface-900 mb-3">Lightning Fast Sync</h4>
              <p className="text-surface-600 leading-relaxed">Powered by Yjs CRDTs (Conflict-free Replicated Data Types) ensuring your canvas state is always perfectly synchronized.</p>
            </div>

            <div className="bg-surface-50 rounded-2xl p-8 border border-surface-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <Lock size={24} className="text-emerald-600" />
              </div>
              <h4 className="text-xl font-bold text-surface-900 mb-3">Secure & Persistent</h4>
              <p className="text-surface-600 leading-relaxed">Your boards are automatically saved to our secure MongoDB database. JWT authentication keeps your data private.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────── */}
      <section className="py-24 bg-brand-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to transform how your team works?</h2>
          <p className="text-xl text-brand-100 mb-10 max-w-2xl mx-auto">
            Join thousands of designers, engineers, and product managers who use CollabBoard to bring their ideas to life.
          </p>
          <Link to="/register">
            <Button variant="primary" size="lg" className="bg-white text-brand-900 hover:bg-surface-50 h-14 px-8 text-lg font-bold shadow-xl">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-surface-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 lg:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                  <Layers size={16} className="text-white" />
                </div>
                <span className="font-bold text-xl text-surface-900">CollabBoard</span>
              </Link>
              <p className="text-surface-500 mb-6 max-w-sm">
                The modern collaborative whiteboard built for speed, reliability, and infinite creativity.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-surface-400 hover:text-brand-600 transition-colors"><Twitter size={20} /></a>
                <a href="#" className="text-surface-400 hover:text-brand-600 transition-colors"><Github size={20} /></a>
                <a href="#" className="text-surface-400 hover:text-brand-600 transition-colors"><Linkedin size={20} /></a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-surface-900 mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-surface-500">
                <li><a href="#" className="hover:text-brand-600 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Changelog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-surface-900 mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-surface-500">
                <li><a href="#" className="hover:text-brand-600 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Community</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-surface-900 mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-surface-500">
                <li><Link to="/terms" className="hover:text-brand-600 transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-brand-600 transition-colors">Privacy Policy</Link></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-surface-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-surface-500">
              &copy; {new Date().getFullYear()} CollabBoard. All rights reserved.
            </p>
            <p className="text-sm text-surface-400">
              Designed with  for remote teams.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
