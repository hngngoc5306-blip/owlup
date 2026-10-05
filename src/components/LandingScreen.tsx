import React, { useState } from 'react';
import { Logo } from './Logo';
import { X, Mail } from 'lucide-react';
import { signInWithGooglePopup, GoogleUserData } from '../utils/googleAuth';

interface LandingScreenProps {
  onStartProfileSetup: () => void;
  onContinueAsGuest: () => void;
  onLoginWithEmail?: (email: string) => boolean;
  onLoginWithGoogle?: (user: GoogleUserData) => Promise<{ success: boolean; isRegistered: boolean; message?: string } | void> | { success: boolean; isRegistered: boolean; message?: string } | void;
  registrationNotice?: string;
  defaultEmail?: string;
  isNight?: boolean;
  hasCompletedProfile?: boolean;
  language?: 'en' | 'vi';
}

const GoogleIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    <path fill="none" d="M1 1h22v22H1z"/>
  </svg>
);

export const LandingScreen: React.FC<LandingScreenProps> = ({ 
  onStartProfileSetup,
  onContinueAsGuest,
  onLoginWithEmail,
  onLoginWithGoogle,
  registrationNotice = '',
  isNight = false,
  hasCompletedProfile = false,
  language: initialLang
}) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [localNotice, setLocalNotice] = useState('');

  // Auto-detect browser/device language if not explicitly provided
  const detectedLang: 'en' | 'vi' = initialLang || (() => {
    try {
      const browserLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
      return browserLang.startsWith('vi') ? 'vi' : 'en';
    } catch {
      return 'en';
    }
  })();

  const isEn = detectedLang === 'en';

  const activeNotice = localNotice || registrationNotice;

  const handleGoogleSignInClick = async () => {
    setIsGoogleLoading(true);
    setSignInError('');
    setLocalNotice('');
    try {
      const user = await signInWithGooglePopup();
      if (onLoginWithGoogle) {
        const res = await onLoginWithGoogle(user);
        if (res && !res.isRegistered) {
          setLocalNotice(res.message || '');
        }
      } else if (onLoginWithEmail) {
        const ok = onLoginWithEmail(user.email);
        if (!ok) {
          const msg = isEn
            ? 'This Google account is not registered with OwlUp yet. Please complete the registration process to create your account.'
            : 'Tài khoản Google này chưa được đăng ký với OwlUp. Vui lòng hoàn thành quy trình đăng ký để tạo tài khoản.';
          setLocalNotice(msg);
        }
      }
      setShowSignInModal(false);
    } catch (err: any) {
      if (err.message === 'popup_closed') {
        // User voluntarily dismissed popup
      } else {
        console.warn('Google sign in error:', err);
        setShowSignInModal(true);
        setSignInError(err.message || (isEn ? 'Google sign-in could not be completed.' : 'Không thể hoàn tất đăng nhập bằng Google. Vui lòng nhập email bên dưới.'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleOpenSignIn = () => {
    handleGoogleSignInClick();
  };

  const handleSubmitSignIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = signInEmail.trim().toLowerCase();
    if (!trimmed) {
      setSignInError(isEn ? 'Please enter your email address.' : 'Vui lòng nhập địa chỉ email.');
      return;
    }
    if (onLoginWithEmail) {
      const ok = onLoginWithEmail(trimmed);
      if (!ok) {
        setSignInError(
          isEn 
            ? 'No account found with this email. Please click "Sign Up" below to create an account.' 
            : 'Tài khoản với email này chưa tồn tại. Vui lòng bấm "Đăng ký tài khoản" bên dưới để tiếp tục.'
        );
      }
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col justify-between"
      style={{ 
        background: isNight ? 'linear-gradient(90deg, #0A1020 0%, #1A2540 35%, #1A2540 65%, #0A1020 100%)' : 'linear-gradient(90deg, #E6F8F0 0%, #FFFFFF 35%, #FFFFFF 65%, #E6F8F0 100%)',
        color: isNight ? '#F8FAFC' : '#1F2937' 
      }}
    >
      {/* Absolute Top Nav (Matches Onboarding Step 8) */}
      <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 flex items-center gap-4 pl-1 sm:pl-2">
        <Logo size="md" isNight={isNight} />
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center max-w-3xl mx-auto w-full">
        
        <h1 className="font-heading font-normal text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.15] mb-8 sm:mb-12">
          {isEn ? (
            <>
              Restore your energy <br />
              Cycle by cycle
            </>
          ) : (
            <>
              Phục hồi năng lượng <br />
              qua từng chu kỳ
            </>
          )}
        </h1>

        {activeNotice && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium flex items-start gap-3 shadow-sm text-left max-w-lg mx-auto animate-fade-in">
            <span className="text-base sm:text-lg shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="leading-relaxed">{activeNotice}</p>
              <button
                onClick={onStartProfileSetup}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#007b4d] dark:text-[#62D2FB] hover:underline cursor-pointer"
              >
                {isEn ? 'Complete registration to create account →' : 'Hoàn thành đăng ký để tạo tài khoản →'}
              </button>
            </div>
            <button
              onClick={() => setLocalNotice('')}
              className="text-amber-700 dark:text-amber-400 hover:opacity-75 p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={onStartProfileSetup}
          className="bg-[#4CB28E] hover:bg-[#007b4d] dark:bg-[#62D2FB] dark:hover:bg-[#4bbad5] text-white dark:text-[#17233E] px-8 sm:px-14 md:px-20 py-3 sm:py-3.5 w-full max-w-xs sm:w-auto rounded-full font-sans font-semibold text-base sm:text-lg shadow-[0_8px_20px_rgba(82,183,136,0.25)] hover:shadow-[0_12px_25px_rgba(82,183,136,0.35)] transition-all cursor-pointer active:scale-95"
        >
          {isEn ? 'Get Started' : 'Bắt đầu ngay'}
        </button>

        <div className="mt-8 space-y-2">
          <p className="text-[#4B5563] dark:text-[#94A3B8] text-sm">
            {isEn ? 'Already have an account?' : 'Đã có tài khoản?'}
          </p>
          <button
            onClick={handleOpenSignIn}
            className="flex items-center gap-2 mx-auto text-[#6B7280] hover:text-[#374151] dark:text-[#CBD5E1] dark:hover:text-white transition-colors underline decoration-[#D1D5DB] underline-offset-4 text-sm cursor-pointer"
          >
            {isEn ? 'Sign in with Google' : 'Đăng nhập bằng Google'}
          </button>
        </div>
      </main>

      {/* Sign In by Email Modal */}
      {showSignInModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowSignInModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <GoogleIcon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-[#1F2937] dark:text-white">
                  {isEn ? 'Sign in with Google' : 'Đăng nhập bằng Google'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isEn ? 'Enter your registered email' : 'Nhập email đã đăng ký của bạn'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitSignIn} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={signInEmail}
                    onChange={(e) => {
                      setSignInEmail(e.target.value);
                      setSignInError('');
                    }}
                    autoFocus
                    className="w-full px-4 py-3 pl-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-[#1F2937] dark:text-white outline-none focus:border-[#4CB28E] dark:border-[#62D2FB]"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                {signInError && (
                  <div className="p-3 rounded-xl bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 border border-[#FCA5A5]/60 dark:border-[#DC2626]/30 text-[#991B1B] dark:text-[#FCA5A5] text-xs font-medium mt-2.5 leading-relaxed flex items-start gap-2">
                    <span className="text-sm shrink-0">⚠️</span>
                    <span>{signInError}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white dark:text-[#17233E] font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  {isEn ? 'Sign In' : 'Đăng nhập'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSignInModal(false);
                    onStartProfileSetup();
                  }}
                  className="w-full py-2.5 rounded-full border-2 border-[#4CB28E] dark:border-[#62D2FB] text-[#4CB28E] dark:text-[#62D2FB] hover:bg-[#4CB28E]/10 dark:hover:bg-[#62D2FB]/10 font-bold text-sm transition-all cursor-pointer text-center"
                >
                  {isEn ? 'Sign Up' : 'Đăng ký tài khoản'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSignInModal(false);
                    onContinueAsGuest();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white py-1 underline cursor-pointer text-center mt-1"
                >
                  {isEn ? 'or Continue as guest' : 'hoặc Tiếp tục dưới dạng khách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default LandingScreen;
