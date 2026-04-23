import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Layers, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { cn } from '../utils/helpers';
import toast from 'react-hot-toast';

const passwordRules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Uppercase letter',       test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter',       test: (p) => /[a-z]/.test(p) },
  { label: 'Number',                 test: (p) => /\d/.test(p) },
];

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const passwordStrength = passwordRules.filter((r) => r.test(form.password)).length;
  const strengthColors = ['', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (passwordStrength < 4) errs.password = 'Password does not meet all requirements';
    if (!termsAccepted) errs.terms = 'You must accept the Terms and Privacy Policy to continue.';
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
    const result = await register(form);
    setIsLoading(false);

    if (result.success) {
      toast.success('Account created! Welcome to CollabBoard ');
      navigate('/dashboard', { replace: true });
    } else {
      toast.error(result.message);
      setErrors({ general: result.message });
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Left — decorative */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-brand-600 via-brand-700 to-purple-700 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Layers size={18} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">CollabBoard</span>
        </div>

        <div className="relative z-10 space-y-6">
          {[
            { icon: '', title: 'Real-time canvas', desc: 'Draw, diagram, and design together in real time.' },
            { icon: '', title: 'Live cursors', desc: "See your team's cursors and presence instantly." },
            { icon: '', title: 'Auto-save', desc: 'Every stroke is saved. Never lose your work.' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-lg shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{f.title}</p>
                <p className="text-white/60 text-sm mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Layers size={15} className="text-white" />
            </div>
            <span className="font-semibold text-surface-900">CollabBoard</span>
          </div>

          <h1 className="text-2xl font-bold text-surface-900 mb-1">Create your account</h1>
          <p className="text-surface-500 text-sm mb-8">Free forever. No credit card needed.</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Full name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Yug Bhatt"
              autoComplete="name"
              autoFocus
              leftIcon={<User size={16} />}
            />

            <Input
              label="Email address"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
              leftIcon={<Mail size={16} />}
            />

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={cn('input pl-10 pr-10', errors.password && 'input-error')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength meter */}
              {form.password && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all duration-300',
                          i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-surface-200'
                        )}
                      />
                    ))}
                  </div>
                  <p className={cn(
                    'text-xs transition-colors',
                    passwordStrength >= 4 ? 'text-emerald-600' : 'text-surface-400'
                  )}>
                    {strengthLabels[passwordStrength] || 'Enter password'}
                  </p>
                </div>
              )}

              {/* Requirements */}
              {(passwordFocused || form.password) && (
                <div className="mt-2 space-y-1">
                  {passwordRules.map((rule) => {
                    const passed = rule.test(form.password);
                    return (
                      <div key={rule.label} className="flex items-center gap-2">
                        <div className={cn(
                          'w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors',
                          passed ? 'bg-emerald-500' : 'bg-surface-200'
                        )}>
                          {passed && <Check size={8} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className={cn(
                          'text-xs transition-colors',
                          passed ? 'text-emerald-600' : 'text-surface-400'
                        )}>
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

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
              Create account
            </Button>

            {/* Terms & Privacy checkbox */}
            <div className="space-y-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  id="terms-checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }));
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-surface-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                />
                <span className="text-xs text-surface-500 leading-relaxed">
                  I have read and agree to the{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    className="text-brand-600 font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link
                    to="/privacy"
                    target="_blank"
                    className="text-brand-600 font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </Link>.
                </span>
              </label>
              {errors.terms && (
                <p className="text-xs text-red-500 pl-7">{errors.terms}</p>
              )}
            </div>
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
