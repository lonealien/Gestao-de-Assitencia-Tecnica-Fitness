import React, { useState } from 'react';
import { AppUser, StoreSettings } from '../types';
import { 
  Dumbbell, Lock, Mail, ArrowRight, HelpCircle
} from 'lucide-react';
import { getStoreDomain } from '../utils';

interface LoginScreenProps {
  usuarios: AppUser[];
  onLogin: (user: AppUser) => void;
  storeSettings: StoreSettings;
  isLoading?: boolean;
}

export default function LoginScreen({
  usuarios,
  onLogin,
  storeSettings,
  isLoading
}: LoginScreenProps) {
  // Login Form State
  const [loginEmail, setLoginEmail] = useState(() => {
    return localStorage.getItem('saved_login_email') || '';
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rememberEmail, setRememberEmail] = useState(() => {
    return localStorage.getItem('remember_login_email_checkbox') === 'true';
  });

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Por favor, preencha todos os campos.');
      return;
    }

    const matchedUser = usuarios.find(
      u => (
        u.email.toLowerCase() === loginEmail.trim().toLowerCase() ||
        u.username?.toLowerCase() === loginEmail.trim().toLowerCase()
      ) && u.password === loginPassword
    );

    if (matchedUser) {
      if (rememberEmail) {
        localStorage.setItem('saved_login_email', loginEmail.trim());
        localStorage.setItem('remember_login_email_checkbox', 'true');
      } else {
        localStorage.removeItem('saved_login_email');
        localStorage.setItem('remember_login_email_checkbox', 'false');
      }
      onLogin(matchedUser);
    } else {
      setLoginError('E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-neutral-900 dark:text-neutral-100">
      
      {/* Branding Logo & Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex justify-center mb-4">
          {storeSettings.logoUrl ? (
             <img src={storeSettings.logoUrl} alt={storeSettings.name} className="h-16 w-16 object-contain border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm dark:shadow-none" />
          ) : (
            <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 p-3 border-2 border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none">
              <Dumbbell className="w-8 h-8 rotate-45 text-yellow-300 stroke-[2.5]" />
            </div>
          )}
        </div>
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100 max-w-full px-4 break-words">
          {storeSettings.name}
        </h2>
        <p className="mt-1 text-xs font-black uppercase tracking-widest text-neutral-500">
          manutenção técnica de aparelhos de ginástica
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-6 sm:p-8 shadow-sm dark:shadow-none">
          
          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 pb-4 border-b-4 border-black mb-6 flex items-center gap-2">
            🔑 LOGIN DO SISTEMA
          </h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
              <div className="w-10 h-10 border-4 border-neutral-900 dark:border-neutral-100 border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Sincronizando Banco de Dados...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {loginError && (
                <div id="login-error-msg" className="bg-rose-200 border border-neutral-200 dark:border-neutral-700 p-3 text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  ⚠️ {loginError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">
                    Nome
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" />
                    <input
                      id="login-email"
                      type="text"
                      required
                      placeholder="seu nome ou e-mail"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-10 pr-3 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" />
                    <input
                      id="login-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-10 pr-3 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
                      autoFocus={!!loginEmail}
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="remember-email"
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="h-4.5 w-4.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-900 dark:text-neutral-100 focus:ring-0 checked:bg-neutral-900 dark:bg-neutral-100 checked:border-black cursor-pointer accent-black leading-none"
                  />
                  <label htmlFor="remember-email" className="ml-2 block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 cursor-pointer selection:bg-transparent">
                    Salvar meu e-mail
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 font-black uppercase tracking-widest py-3 px-4 border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none hover:shadow-md  transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Entrar no Sistema
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </form>

            </div>
          )}

        </div>
      </div>
      
    </div>
  );
}
