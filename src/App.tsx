import { useState, useEffect, useRef } from 'react';
import { 
  loadAssistencias, saveAssistencias, 
  loadTecnicos, saveTecnicos, 
  loadOrdens, saveOrdens,
  loadUsers, saveUsers,
  loadSettings, saveSettings
} from './utils';
import { AssistenciaTecnica, Tecnico, OrdemServico, AppUser, StoreSettings } from './types';
import { MANUAL_USERS } from './usersConfig';
import { PRECONFIG_COMPANIES, PRECONFIG_COMPANY_USERS } from './companiesConfig';

// Component Imports
import DashboardStats from './components/DashboardStats';
import OrdemServicoForm from './components/OrdemServicoForm';
import OrdemServicoList from './components/OrdemServicoList';
import LoginScreen from './components/LoginScreen';
import UserManagement from './components/UserManagement';
import SettingsModal from './components/SettingsModal';
import MasterDashboard from './components/MasterDashboard';
import ChatBox from './components/ChatBox';
import BlockedAccessModal from './components/BlockedAccessModal';

import { 
  Building2, ClipboardList, LayoutDashboard, Dumbbell, 
  Plus, Shield, Hammer, Users, HelpCircle, LogOut, ShieldAlert, Settings as SettingsIcon, Moon, Sun, MessageCircle
} from 'lucide-react';
import { 
  syncCollection, saveToFirestore, deleteFromFirestore, 
  syncSettings, saveSettingsToFirestore 
} from './db';
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

export default function App() {
  // Load initial persistent sets
  const [assistencias, setAssistencias] = useState<AssistenciaTecnica[]>(() => loadAssistencias());
  const [tecnicos, setTecnicos] = useState<Tecnico[]>(() => loadTecnicos());
  const [ordens, setOrdens] = useState<OrdemServico[]>(() => loadOrdens());
  const [usuarios, setUsuarios] = useState<AppUser[]>(() => loadUsers());
  const masterUser = usuarios.find(u => u.role === 'MASTER');
  const masterPhone = masterUser?.phone || '';
  const [loggedUser, setLoggedUser] = useState<AppUser | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({ name: 'ASSISTÊNCIA' });
  const [initialSelectedOSId, setInitialSelectedOSId] = useState<string | null>(null);
  const [blockedModalMessage, setBlockedModalMessage] = useState<string | null>(null);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme_dark') === 'true';
  });

  // UI state toggles
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ordens' | 'usuarios'>(() => {
    const savedUser = localStorage.getItem('logged_user_fitness');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.role !== 'TECNICO') return 'dashboard';
      } catch (e) {}
    }
    return 'ordens';
  });
  const [showAddOSForm, setShowAddOSForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const lastScrollY = useRef(0);
  const ignoreScrollUntil = useRef(0);

  // Detect mobile device layout
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Add scroll listener to minimize mobile header on scroll down
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      const scrollDiff = currentScrollY - lastScrollY.current;
      
      // Stop jitter/flicker by ignoring very small scrolls
      if (Math.abs(scrollDiff) < 10 && currentScrollY > 50) {
        return;
      }
      
      if (Date.now() > ignoreScrollUntil.current) {
        if (Math.abs(scrollDiff) > 10 || currentScrollY > 50) {
          setIsMobileMenuOpen(false);
        }
      }
      
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleMobileMenuToggle = () => {
    ignoreScrollUntil.current = Date.now() + 500; // Ignore scroll-based close for 500ms
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isHeaderMinimized = isMobile && !isMobileMenuOpen;

  // Load datasets on startup from Firestore
  useEffect(() => {
    const unsubAssistencias = syncCollection<AssistenciaTecnica>('assistencias', (data) => {
      setAssistencias(data);
      saveAssistencias(data);
    });
    const unsubTecnicos = syncCollection<Tecnico>('tecnicos', (data) => {
      setTecnicos(data);
      saveTecnicos(data);
    });
    const unsubOrdens = syncCollection<OrdemServico>('ordens', (data) => {
      setOrdens(data);
      saveOrdens(data);
    });
    const unsubUsuarios = syncCollection<AppUser>('usuarios', (data) => {
      setUsuarios(data);
      saveUsers(data);
    });
    const unsubSettings = syncSettings(setStoreSettings);

    // Initial load check for migration - collection by collection & syncing preconfigured files
    const checkMigration = async () => {
      try {
        // Seeding fallback if database is empty - collection by collection & syncing preconfigured files
        const userSnap = await getDocs(collection(db, 'usuarios'));
        if (userSnap.empty) {
          console.log('Seeding usuarios...');
          // Push preconfigured company users first
          for (const companyUser of PRECONFIG_COMPANY_USERS) {
            await saveToFirestore('usuarios', companyUser);
          }
          const localUsrs = loadUsers();
          localUsrs.forEach(u => saveToFirestore('usuarios', u));
        }

        const astSnap = await getDocs(collection(db, 'assistencias'));
        if (astSnap.empty) {
          console.log('Seeding assistencias...');
          // Push preconfigured companies first
          for (const company of PRECONFIG_COMPANIES) {
            await saveToFirestore('assistencias', company);
          }
          const localAssis = loadAssistencias();
          localAssis.forEach(a => saveToFirestore('assistencias', a));
        }

        const tecSnap = await getDocs(collection(db, 'tecnicos'));
        if (tecSnap.empty) {
          console.log('Seeding tecnicos...');
          const localTecs = loadTecnicos();
          localTecs.forEach(t => saveToFirestore('tecnicos', t));
        }

        const ordensSnap = await getDocs(collection(db, 'ordens'));
        if (ordensSnap.empty) {
          console.log('Seeding ordens...');
          const localOrdens = loadOrdens();
          localOrdens.forEach(o => saveToFirestore('ordens', o));
        }
      } catch (err) {
        console.error('Falha na migração automática e sincronização de dados:', err);
      }
      setIsLoading(false);
    };

    checkMigration();

    // Restore session if available
    const savedUser = localStorage.getItem('logged_user_fitness');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setLoggedUser(u);
        if (u.role !== 'TECNICO') {
          setActiveTab('dashboard');
        } else {
          setActiveTab('ordens');
        }
      } catch (e) {
        console.error('Falha ao restaurar usuário logado', e);
      }
    }

    return () => {
      unsubAssistencias();
      unsubTecnicos();
      unsubOrdens();
      unsubUsuarios();
      unsubSettings();
    };
  }, []);

  // Theme side-effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_dark', 'false');
    }
  }, [isDarkMode]);

  // Combine firestore users and manual users, ensuring unique entries by username/email
  const allCombinedUsers = (() => {
    const map = new Map<string, AppUser>();
    usuarios.forEach(u => {
      const key = (u.username || u.email).toLowerCase();
      map.set(key, u);
    });
    PRECONFIG_COMPANY_USERS.forEach(u => {
      const key = (u.username || u.email).toLowerCase();
      map.set(key, u);
    });
    MANUAL_USERS.forEach(u => {
      const key = (u.username || u.email).toLowerCase();
      map.set(key, u);
    });
    const list = Array.from(map.values());
    return list.map(u => {
      if (u.role === 'MASTER' && u.id !== 'usr-master-clemente') {
        return { ...u, role: 'ADMIN' as const };
      }
      return u;
    });
  })();

  const currentAssistencia = loggedUser && loggedUser.assistenciaId 
    ? assistencias.find(a => a.id === loggedUser.assistenciaId)
    : null;

  const isExpired = (() => {
    if (!loggedUser || loggedUser.role === 'MASTER') return false;
    if (!currentAssistencia) return false;
    if (currentAssistencia.active === false) return true;
    if (!currentAssistencia.expiresAt) return false;
    return new Date(currentAssistencia.expiresAt) <= new Date();
  })();

  // Filter lists based on loggedUser's tenancy (for non-master users)
  const tenantOrdens = (() => {
    if (!loggedUser) return [];
    if (loggedUser.role === 'MASTER') return ordens;
    return ordens.filter(o => o.assistenciaId === loggedUser.assistenciaId);
  })();

  const tenantTecnicos = (() => {
    if (!loggedUser) return [];
    if (loggedUser.role === 'MASTER') return tecnicos;
    return tecnicos.filter(t => t.assistenciaId === loggedUser.assistenciaId);
  })();

  const tenantUsuarios = (() => {
    if (!loggedUser) return [];
    if (loggedUser.role === 'MASTER') return usuarios;
    return usuarios.filter(u => u.assistenciaId === loggedUser.assistenciaId);
  })();

  const activeStoreSettings = currentAssistencia ? {
    name: currentAssistencia.name || storeSettings.name,
    logoUrl: currentAssistencia.logoUrl || storeSettings.logoUrl,
    cnpj: currentAssistencia.cnpj || storeSettings.cnpj,
    address: currentAssistencia.address || storeSettings.address,
    zipCode: currentAssistencia.zipCode || storeSettings.zipCode,
    phone: currentAssistencia.phone || storeSettings.phone,
    city: currentAssistencia.city || storeSettings.city,
    state: currentAssistencia.state || storeSettings.state,
    email: currentAssistencia.email || storeSettings.email,
    whatsapp: currentAssistencia.whatsapp || storeSettings.whatsapp
  } : storeSettings;

  // -- Event Handlers --
  
  // Add Technician
  const handleAddTecnico = (newTec: Tecnico) => {
    const tecWithTenant = {
      ...newTec,
      assistenciaId: loggedUser?.assistenciaId || ''
    };
    saveToFirestore('tecnicos', tecWithTenant);
  };

  // Toggle Technician activation status (Active/Inactive)
  const handleToggleTecnicoActive = (id: string) => {
    const tecnico = tecnicos.find(t => t.id === id);
    if (tecnico) {
      saveToFirestore('tecnicos', { ...tecnico, active: !tecnico.active });
    }
  };

  const handleDeleteTecnico = (id: string) => {
    deleteFromFirestore('tecnicos', id);
  };

  // Add Service Order OS
  const handleRegisterOS = (newOS: OrdemServico) => {
    const osWithTenant = {
      ...newOS,
      assistenciaId: loggedUser?.assistenciaId || ''
    };
    saveToFirestore('ordens', osWithTenant);
    setShowAddOSForm(false);
    setActiveTab('ordens');
  };

  // Update OS properties (e.g. status flow, history, diagnosis)
  const handleUpdateOS = (updatedOS: OrdemServico) => {
    saveToFirestore('ordens', updatedOS);
  };

  // Delete OS
  const handleDeleteOS = (id: string) => {
    deleteFromFirestore('ordens', id);
  };

  // Helper for entity resolution in active switch mode
  const getActiveUserEntityId = () => {
    if (loggedUser?.role === 'ASSISTENCIA_GERENTE') {
      return loggedUser.assistenciaId;
    }
    if (loggedUser?.role === 'TECNICO') {
      return loggedUser.tecnicoId;
    }
    return undefined;
  };

  const handlePurgeAllData = async () => {
    // 1. Delete all assistencias from Firestore
    for (const a of assistencias) {
      await deleteFromFirestore('assistencias', a.id);
    }
    // 2. Delete all tecnicos from Firestore
    for (const t of tecnicos) {
      await deleteFromFirestore('tecnicos', t.id);
    }
    // 3. Delete all ordens from Firestore
    for (const o of ordens) {
      await deleteFromFirestore('ordens', o.id);
    }
    // 4. Delete all usuarios from Firestore except master (usr-master-clemente or username clemente)
    for (const u of usuarios) {
      if (u.id !== 'usr-master-clemente' && u.username !== 'clemente') {
        await deleteFromFirestore('usuarios', u.id);
      }
    }
    // 5. Clean localStorage
    localStorage.removeItem('assistencias_fitness_v2');
    localStorage.removeItem('tecnicos_fitness_v2');
    localStorage.removeItem('ordens_fitness_v2');
    localStorage.removeItem('usuarios_fitness_v2');
    
    // Rewrite local master details
    if (loggedUser) {
      localStorage.setItem('logged_user_fitness', JSON.stringify(loggedUser));
      localStorage.setItem('usuarios_fitness_v2', JSON.stringify([loggedUser]));
    }
  };

  if (!loggedUser) {
    return (
      <LoginScreen
        usuarios={allCombinedUsers}
        storeSettings={activeStoreSettings}
        isLoading={isLoading}
        onLogin={(user) => {
          setLoggedUser(user);
          localStorage.setItem('logged_user_fitness', JSON.stringify(user));
          // Direct initial tab landing
          if (user.role !== 'TECNICO') {
            setActiveTab('dashboard');
          } else {
            setActiveTab('ordens');
          }
        }}
      />
    );
  }

  // Intercept and redirect Master admin accounts
  if (loggedUser.role === 'MASTER') {
    return (
      <MasterDashboard
        assistencias={assistencias}
        ordens={ordens}
        tecnicos={tecnicos}
        usuarios={usuarios}
        loggedUser={loggedUser}
        onLogout={() => {
          setLoggedUser(null);
          localStorage.removeItem('logged_user_fitness');
        }}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onAddAssistencia={(newAst) => saveToFirestore('assistencias', newAst)}
        onDeleteAssistencia={(id) => deleteFromFirestore('assistencias', id)}
        onUpdateAssistencia={(updatedAst) => saveToFirestore('assistencias', updatedAst)}
        onAddUser={(newUser) => saveToFirestore('usuarios', newUser)}
        onDeleteUser={(id) => deleteFromFirestore('usuarios', id)}
        onUpdateUser={(updatedUser) => {
          saveToFirestore('usuarios', updatedUser);
          if (loggedUser && loggedUser.id === updatedUser.id) {
            setLoggedUser(updatedUser);
            localStorage.setItem('logged_user_fitness', JSON.stringify(updatedUser));
          }
        }}
        onPurgeDatabase={handlePurgeAllData}
        onToggleUserActive={(id) => {
          const u = usuarios.find(usr => usr.id === id);
          if (u) {
            saveToFirestore('usuarios', { ...u, active: !u.active });
          }
        }}
        onRestoreBackup={async (backup) => {
          if (backup.assistencia) {
            await saveToFirestore('assistencias', backup.assistencia);
          }
          if (backup.ordens && backup.ordens.length > 0) {
            for (const o of backup.ordens) {
              await saveToFirestore('ordens', o);
            }
          }
          if (backup.tecnicos && backup.tecnicos.length > 0) {
            for (const t of backup.tecnicos) {
              await saveToFirestore('tecnicos', t);
            }
          }
          if (backup.usuarios && backup.usuarios.length > 0) {
            for (const u of backup.usuarios) {
              await saveToFirestore('usuarios', u);
            }
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 font-sans text-neutral-900 dark:text-neutral-100 antialiased flex flex-col justify-between transition-colors duration-200 placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500">
      
      {/* Main platform header navigation */}
      <header className="sticky top-0 z-40 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between ${isHeaderMinimized ? 'py-1.5' : 'py-4'} lg:py-0 lg:h-20 gap-4`}>
            
            {/* Branding Logo */}
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
                      onClick={() => setShowSettings(true)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 transition-colors"
                      title={loggedUser.role === 'ADMIN' ? "Configurações Globais" : "Configurações da Assistência"}
                    >
                      <SettingsIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile controls */}
              <div className="flex items-center gap-2 lg:hidden">
                <button 
                  onClick={handleMobileMenuToggle}
                  className="p-2 text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-700 rounded-xl"
                >
                  {isMobileMenuOpen ? <Plus className="w-6 h-6 rotate-45" /> : <ClipboardList className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {/* Navigation Link Tabs */}
            <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row lg:items-center gap-4 transition-all`}>
              <nav className="flex flex-col lg:flex-row gap-2" aria-label="Navegação Principal">
                {loggedUser.role !== 'TECNICO' && (
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                      setShowAddOSForm(false);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer ${
                      activeTab === 'dashboard' && !showAddOSForm
                        ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                        : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 stroke-[2.5]" />
                    Painel
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab('ordens');
                    setShowAddOSForm(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer ${
                    activeTab === 'ordens' && !showAddOSForm
                      ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                      : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
                    }`}
                >
                  <ClipboardList className="w-4 h-4 stroke-[2.5]" />
                  {loggedUser.role === 'TECNICO' ? 'Minhas OS & Agenda' : 'Ordens (OS)'}
                </button>

                {(loggedUser.role === 'ADMIN' || loggedUser.role === 'ASSISTENCIA_GERENTE') && (
                  <button
                    onClick={() => {
                      setActiveTab('usuarios');
                      setShowAddOSForm(false);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer ${
                      activeTab === 'usuarios' && !showAddOSForm
                        ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                        : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    <Users className="w-4 h-4 stroke-[2.5]" />
                    Usuários / Acessos
                  </button>
                )}
              </nav>

              {/* Logged user context & Logout & Theme Toggle */}
              <div className="flex items-center justify-between lg:justify-end gap-2 lg:border-l-2 lg:border-black lg:pl-4 mt-2 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 p-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md transition-all cursor-pointer flex items-center justify-center placeholder-neutral-500 dark:placeholder-neutral-400"
                    title="Alternar Tema Escuro"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4 stroke-[3]" /> : <Moon className="w-4 h-4 stroke-[3]" />}
                  </button>
                  <div className="text-left lg:text-right ml-1">
                    <span className="text-[9px] text-neutral-500 block leading-none font-black uppercase">Conta Ativa</span>
                    <span className="text-xs font-black uppercase text-neutral-900 dark:text-neutral-100 max-w-[120px] truncate block" title={loggedUser?.username}>{loggedUser?.username}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setLoggedUser(null);
                    localStorage.removeItem('logged_user_fitness');
                  }}
                  className="bg-rose-500 hover:bg-rose-600 text-white p-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md transition-all cursor-pointer flex items-center gap-1 text-[10px] uppercase font-black"
                  title="Sair do Sistema (Logout)"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {isExpired && (
          <div className="mb-6 bg-rose-50 dark:bg-rose-950/20 border-4 border-rose-500 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <p className="text-sm font-black text-rose-900 dark:text-rose-300 uppercase tracking-tight">⚠️ ACESSO DE EDIÇÃO EXPIRADO / REGISTRO BLOQUEADO</p>
                <p className="text-xs font-bold text-rose-950 dark:text-rose-400 mt-0.5 leading-relaxed">
                  O período de licença/créditos de acesso desta assistência ({currentAssistencia?.name}) expirou em {currentAssistencia?.expiresAt ? new Date(currentAssistencia.expiresAt).toLocaleDateString('pt-BR') : 'Mínimo 30 dias'}. Todas as permissões de edição/registro foram suspensas. Para regularizar o acesso, entre em contato com o Administrador Master (clementebsf@gmail.com).
                </p>
                <a 
                  href={`https://wa.me/${masterPhone ? masterPhone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(`Olá, gostaria de regularizar o acesso do sistema para a assistência: ${currentAssistencia?.name}`)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-3 bg-[#25D366] hover:bg-[#1DA851] text-white font-black text-[10px] px-3 py-1.5 rounded-lg inline-flex items-center gap-2 uppercase tracking-wide cursor-pointer transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Falar no WhatsApp
                </a>
              </div>
            </div>
            <span className="text-[10px] bg-rose-600 text-white px-3 py-1 font-mono uppercase font-black tracking-widest self-start sm:self-center rounded-md">
              Acesso Expirado
            </span>
          </div>
        )}

        {loggedUser.isReadOnly && !isExpired && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/30 border-4 border-amber-500 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm dark:shadow-none animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-50 dark:bg-amber-900/300 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100">
                <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <p className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">AVISO DO SISTEMA: CADASTRO COM ACESSO SOMENTE LEITURA</p>
                <p className="text-xs font-bold text-amber-950 mt-0.5">
                  Sua conta ({loggedUser.name}) está configurada com acesso restrito. Você tem permissão para auditar ordens de serviço, técnicos, oficinas e cronogramas, mas sem permissão para editar informações.
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1 font-mono uppercase font-black tracking-widest self-start sm:self-center">
              Modo Leitura
            </span>
          </div>
        )}

        {/* Outer view screens matching chosen tab or state forms overlays */}
        {showAddOSForm && !isExpired ? (
          <OrdemServicoForm
            assistencias={assistencias}
            usuarios={tenantUsuarios}
            onAdd={handleRegisterOS}
            onCancel={() => setShowAddOSForm(false)}
            defaultAssistenciaId={loggedUser.assistenciaId}
          />
        ) : (
          <div className="space-y-6">
            
            {activeTab === 'dashboard' && loggedUser.role !== 'TECNICO' && (
              <DashboardStats
                ordens={tenantOrdens}
                onOpenNewOSForm={() => setShowAddOSForm(true)}
                currentRole={loggedUser.role}
                isReadOnly={loggedUser.isReadOnly || isExpired}
                onEditOS={(id) => {
                  setInitialSelectedOSId(id);
                  setActiveTab('ordens');
                }}
                onShowBlockedAlert={(msg) => setBlockedModalMessage(msg)}
              />
            )}

            {activeTab === 'ordens' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    {activeStoreSettings.whatsapp ? (
                      <a
                        href={`https://wa.me/${activeStoreSettings.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 w-fit border-2 border-emerald-600 shadow-[2px_2px_0px_0px_rgba(5,150,105,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        Falar com a Empresa
                      </a>
                    ) : (
                      <div className="bg-neutral-100 dark:bg-neutral-800 text-neutral-400 text-[10px] font-bold uppercase tracking-widest px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl italic">
                        WhatsApp não configurado
                      </div>
                    )}
                  </div>
                  {(loggedUser.role === 'ADMIN' || loggedUser.role === 'ASSISTENCIA_GERENTE' || loggedUser.role === 'ATENDENTE') && (
                    <button
                      onClick={() => {
                        if (loggedUser.isReadOnly || isExpired) {
                          setBlockedModalMessage("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
                          return;
                        }
                        setShowAddOSForm(true);
                      }}
                      className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 text-xs font-black uppercase tracking-widest px-5 py-3 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer self-start"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      Abrir Nova OS
                    </button>
                  )}
                </div>

                <OrdemServicoList
                  ordens={tenantOrdens}
                  assistencias={assistencias}
                  usuarios={tenantUsuarios}
                  currentRole={loggedUser.role}
                  activeRoleEntityId={getActiveUserEntityId()}
                  activeUserName={loggedUser.name}
                  storeSettings={activeStoreSettings}
                  onUpdateOS={handleUpdateOS}
                  onDeleteOS={(loggedUser.role === 'ADMIN') ? handleDeleteOS : undefined}
                  isReadOnly={loggedUser.isReadOnly || isExpired}
                  initialSelectedOSId={initialSelectedOSId}
                  onClearInitialSelectedOSId={() => setInitialSelectedOSId(null)}
                  onShowBlockedAlert={(msg) => setBlockedModalMessage(msg)}
                />
              </div>
            )}

            {activeTab === 'usuarios' && (loggedUser.role === 'ADMIN' || loggedUser.role === 'ASSISTENCIA_GERENTE') && (
              <UserManagement
                usuarios={tenantUsuarios}
                assistencias={assistencias}
                tecnicos={tenantTecnicos}
                currentUser={{ ...loggedUser, isReadOnly: loggedUser.isReadOnly || isExpired }}
                storeSettings={activeStoreSettings}
                onShowBlockedAlert={(msg) => setBlockedModalMessage(msg)}
                onAddUser={(newUsr) => {
                  const usrWithTenant = {
                    ...newUsr,
                    assistenciaId: loggedUser.assistenciaId || newUsr.assistenciaId
                  };
                  saveToFirestore('usuarios', usrWithTenant);
                }}
                onDeleteUser={(usrId) => {
                  deleteFromFirestore('usuarios', usrId);
                }}
                onToggleUserActive={(usrId) => {
                  const user = usuarios.find(u => u.id === usrId);
                  if (user) {
                    saveToFirestore('usuarios', { ...user, active: !user.active });
                  }
                }}
                onAddTecnicoAndUser={(newTec, login, pass) => {
                  // 1. Save technical registry
                  const tecWithTenant = {
                    ...newTec,
                    assistenciaId: loggedUser.assistenciaId || ''
                  };
                  saveToFirestore('tecnicos', tecWithTenant);

                  // 2. Save user login
                  const newUserAccount: AppUser = {
                    id: 'usr-' + Date.now(),
                    name: newTec.name,
                    username: login,
                    email: newTec.email || `${login}@gestaoservico.com`,
                    password: pass,
                    role: 'TECNICO',
                    tecnicoId: newTec.id,
                    assistenciaId: loggedUser.assistenciaId
                  };
                  saveToFirestore('usuarios', newUserAccount);
                }}
                onUpdateUser={(updatedUsr) => {
                  saveToFirestore('usuarios', updatedUsr);
                  // Update loggedUser state if updating current user
                  if (loggedUser && loggedUser.id === updatedUsr.id) {
                    setLoggedUser(updatedUsr);
                    localStorage.setItem('logged_user_fitness', JSON.stringify(updatedUsr));
                  }
                }}
              />
            )}

          </div>
        )}

      </main>

      {/* Modern Soft Footer */}
      <footer className="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 py-8 mt-16 text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-wider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-neutral-900 dark:text-neutral-100 tracking-tight text-sm uppercase">{activeStoreSettings.name}</span>
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
              <span className="font-bold font-mono">SISTEMA v2.0 ( BETA )</span>
            </div>
            {loggedUser?.assistenciaId && (
              <span className="text-[9px] font-mono font-bold text-neutral-400">ID DA REDE INTERNA: {loggedUser.assistenciaId}</span>
            )}
          </div>
          <div className="flex space-x-6 font-black tracking-widest">
            <span className="font-mono tracking-tight text-[10px] bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-0.5">BY: LONE TECH</span>
          </div>
        </div>
      </footer>

      {showSettings && (
        <SettingsModal 
          currentSettings={activeStoreSettings} 
          isGlobalAdmin={loggedUser?.role === 'ADMIN'}
          onSave={(newSettings) => {
            if (loggedUser && loggedUser.assistenciaId) {
              const currentAssis = assistencias.find(a => a.id === loggedUser.assistenciaId);
              if (currentAssis) {
                const updatedAssis = {
                  ...currentAssis,
                  ...newSettings
                };
                saveToFirestore('assistencias', updatedAssis);
              }
            } else {
              saveSettingsToFirestore(newSettings);
            }
          }} 
          onClose={() => setShowSettings(false)} 
        />
      )}
      {blockedModalMessage && (
        <BlockedAccessModal 
          message={blockedModalMessage} 
          onClose={() => setBlockedModalMessage(null)} 
        />
      )}
      {loggedUser && (
        <ChatBox currentUser={loggedUser} />
      )}

    </div>
  );
}
