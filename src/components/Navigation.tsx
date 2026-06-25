import { 
  LayoutDashboard, ClipboardList, Users, Sun, Moon, LogOut, Settings as SettingsIcon, Plus, Dumbbell
} from 'lucide-react';
import { AppUser, StoreSettings } from '../types';

interface NavigationProps {
  loggedUser: AppUser;
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'ordens' | 'usuarios') => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  onLogout: () => void;
  onShowSettings: () => void;
  onShowAddOSForm: () => void;
  activeStoreSettings: StoreSettings;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isHeaderMinimized: boolean;
  handleMobileMenuToggle: () => void;
  isExpired?: boolean;
  onShowBlockedAlert?: (msg: string) => void;
}

export default function Navigation({
  loggedUser,
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  onLogout,
  onShowSettings,
  onShowAddOSForm,
  activeStoreSettings,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isHeaderMinimized,
  handleMobileMenuToggle,
  isExpired,
  onShowBlockedAlert
}: NavigationProps) {
  const handleAction = (tab: 'dashboard' | 'ordens' | 'usuarios', checkExpired = false) => {
    if (checkExpired && isExpired) {
      onShowBlockedAlert?.("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador.");
      return;
    }
    setActiveTab(tab);
    onShowAddOSForm();
    setIsMobileMenuOpen(false);
  };
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between ${isHeaderMinimized ? 'py-1.5' : 'py-4'} lg:py-0 lg:h-20 gap-4`}>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeStoreSettings.logoUrl ? (
                <img src={activeStoreSettings.logoUrl} alt={activeStoreSettings.name} className={`${isHeaderMinimized ? 'h-6 w-6' : 'h-10 w-10'} object-contain border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg transition-all`} />
              ) : (
                <div className={`bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 ${isHeaderMinimized ? 'p-1.5 rounded-lg' : 'p-2.5 rounded-2xl'} border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none transition-all`}>
                  <Dumbbell className={`${isHeaderMinimized ? 'w-4 h-4' : 'w-6 h-6'} rotate-45 text-yellow-300 stroke-[2.5]`} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <div>
                  <span className={`font-black text-neutral-900 dark:text-neutral-100 ${isHeaderMinimized ? 'text-sm' : 'text-xl'} uppercase tracking-tight block max-w-[150px] sm:max-w-[200px] truncate transition-all`} title={activeStoreSettings.name}>{activeStoreSettings.name}</span>
                  <span className="text-[10px] text-neutral-500 block leading-none font-black uppercase tracking-wider">{loggedUser.name}</span>
                </div>
                {(loggedUser.role === 'ADMIN' || loggedUser.role === 'ASSISTENCIA_GERENTE') && !isHeaderMinimized && (
                  <button 
                    onClick={onShowSettings}
                    className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 transition-colors"
                  >
                    <SettingsIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button onClick={handleMobileMenuToggle} className="p-2 text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-700 rounded-xl">
                {isMobileMenuOpen ? <Plus className="w-6 h-6 rotate-45" /> : <ClipboardList className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row lg:items-center gap-4 transition-all`}>
            <nav className="flex flex-col lg:flex-row gap-2">
              {loggedUser.role !== 'TECNICO' && (
                <button
                  onClick={() => handleAction('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                      : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 stroke-[2.5]" />
                  Painel
                </button>
              )}

              <button
                onClick={() => handleAction('ordens')}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer ${
                  activeTab === 'ordens'
                    ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                    : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
                  }`}
              >
                <ClipboardList className="w-4 h-4 stroke-[2.5]" />
                {loggedUser.role === 'TECNICO' ? 'Minhas OS & Agenda' : 'Ordens (OS)'}
              </button>

              {(loggedUser.role === 'ADMIN' || loggedUser.role === 'ASSISTENCIA_GERENTE') && (
                <button
                  onClick={() => handleAction('usuarios', true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer ${
                    activeTab === 'usuarios'
                      ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                      : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
                  }`}
                >
                  <Users className="w-4 h-4 stroke-[2.5]" />
                  Usuários / Acessos
                </button>
              )}
            </nav>

            <div className="flex items-center justify-between lg:justify-end gap-2 lg:border-l-2 lg:border-black lg:pl-4 mt-2 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 p-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md transition-all cursor-pointer">
                  {isDarkMode ? <Sun className="w-4 h-4 stroke-[3]" /> : <Moon className="w-4 h-4 stroke-[3]" />}
                </button>
                <div className="text-left lg:text-right ml-1">
                  <span className="text-[9px] text-neutral-500 block leading-none font-black uppercase">Conta Ativa</span>
                  <span className="text-xs font-black uppercase text-neutral-900 dark:text-neutral-100 max-w-[120px] truncate block">{loggedUser?.username}</span>
                </div>
              </div>
              <button onClick={onLogout} className="bg-rose-500 hover:bg-rose-600 text-white p-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md transition-all cursor-pointer flex items-center gap-1 text-[10px] uppercase font-black">
                <LogOut className="w-3.5 h-3.5 stroke-[3]" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
