import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const returnTo = location.state?.from?.pathname || '/dashboard';

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    const result = await login(form);
    setIsLoading(false);

    if (result.success) {
      toast.success('Welcome back!');
      navigate(returnTo, { replace: true });
    } else {
      toast.error(result.message);
      setErrors({ general: result.message });
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Left — decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-brand-600 relative overflow-hidden flex-col justify-between p-12">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Floating cards */}
        <div className="absolute top-1/4 -right-8 w-48 h-32 bg-white/10 backdrop-blur rounded-2xl border border-white/20 transform rotate-6" />
        <div className="absolute top-1/3 -right-4 w-48 h-32 bg-white/10 backdrop-blur rounded-2xl border border-white/20 transform -rotate-3" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Layers size={18} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">CollabBoard</span>
        </div>

        {/* Quote */}
        <div className="relative z-10">
          <blockquote className="text-white/90 text-2xl font-light leading-relaxed mb-6">
            "The best ideas happen when everyone can see and build them together."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#3B82F6', '#8B5CF6', '#EC4899'].map((color, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white/30"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-white/70 text-sm">Join thousands of collaborators</p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Layers size={15} className="text-white" />
            </div>
            <span className="font-semibold text-surface-900">CollabBoard</span>
          </div>

          <h1 className="text-2xl font-bold text-surface-900 mb-1">
            Welcome back
          </h1>
          <p className="text-surface-500 text-sm mb-8">
            Sign in to your workspace
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Email address"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              leftIcon={<Mail size={16} />}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="current-password"
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-0.5 hover:text-surface-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {errors.general && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="text-brand-600 hover:underline">Terms</Link> and{' '}
            <Link to="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm text-surface-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-brand-600 font-medium hover:text-brand-700 transition-colors"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
