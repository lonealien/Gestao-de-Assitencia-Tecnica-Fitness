import { AssistenciaTecnica, Tecnico, OrdemServico, AppUser, Orcamento } from './types';
import { INITIAL_ASSISTENCIAS, INITIAL_TECNICOS, INITIAL_OS } from './initialData';
import { MANUAL_USERS } from './usersConfig';
import { PRECONFIG_COMPANIES, PRECONFIG_COMPANY_USERS } from './companiesConfig';

export function loadUsers(): AppUser[] {
  const data = localStorage.getItem('usuarios_fitness_v2');
  let localUsers: AppUser[] = [];
  
  if (data) {
    try {
      localUsers = JSON.parse(data);
    } catch (e) {
      console.error('Falha ao ler usuários do localStorage', e);
    }
  }

  // 1. Filter out OLD admin users that might conflict with the Master Admin
  const cleanedUsers = localUsers.filter(u => {
     if (u.role === 'ADMIN') {
        // Only keep if it's the master one or has a different username
        return u.username === 'admin' || u.id === 'usr-admin-master' || (u.id.startsWith('usr-admin-') && u.id !== 'usr-admin-master');
     }
     return true;
  });

  // 2. Ensure every user has a username
  const usersWithUsername = cleanedUsers.map(u => {
    if (!u.username) {
      // Create a username from email if missing
      const fallback = u.email ? u.email.split('@')[0] : u.id;
      return { ...u, username: fallback };
    }
    return u;
  });

  // 3. Ensure MANUAL_USERS & PRECONFIG_COMPANY_USERS are present
  const userMap = new Map<string, AppUser>();
  
  // Add cleaned existing users (if they are not ADMIN)
  usersWithUsername.forEach(u => userMap.set(u.id, u));
  
  // Override or Add PRECONFIG_COMPANY_USERS (company admins configured in file)
  PRECONFIG_COMPANY_USERS.forEach(u => userMap.set(u.id, u));

  // Override or Add MANUAL_USERS (including the master admin)
  MANUAL_USERS.forEach(u => userMap.set(u.id, u));

  // Ensure 'admin' user is definitely present and correct
  const adminUser = MANUAL_USERS.find(u => u.username === 'admin');
  if (adminUser) {
    userMap.set(adminUser.id, adminUser);
  }

  const finalUsers = Array.from(userMap.values());
  localStorage.setItem('usuarios_fitness_v2', JSON.stringify(finalUsers));
  
  return finalUsers;
}

export function saveUsers(data: AppUser[]) {
  localStorage.setItem('usuarios_fitness_v2', JSON.stringify(data));
}

export function loadAssistencias(): AssistenciaTecnica[] {
  const data = localStorage.getItem('assistencias_fitness_v2');
  let loadedList: AssistenciaTecnica[] = [];
  if (data) {
    try {
      loadedList = JSON.parse(data);
    } catch (e) {
      console.error('Falha ao ler assistencias', e);
    }
  } else {
    loadedList = INITIAL_ASSISTENCIAS;
  }

  // Merge with PRECONFIG_COMPANIES
  const companyMap = new Map<string, AssistenciaTecnica>();
  PRECONFIG_COMPANIES.forEach(c => companyMap.set(c.id, c));
  loadedList.forEach(c => companyMap.set(c.id, c));

  const finalAssistencias = Array.from(companyMap.values());
  localStorage.setItem('assistencias_fitness_v2', JSON.stringify(finalAssistencias));

  return finalAssistencias;
}

export function saveAssistencias(data: AssistenciaTecnica[]) {
  localStorage.setItem('assistencias_fitness_v2', JSON.stringify(data));
}

export function loadTecnicos(): Tecnico[] {
  const data = localStorage.getItem('tecnicos_fitness_v2');
  if (!data) {
    localStorage.setItem('tecnicos_fitness_v2', JSON.stringify(INITIAL_TECNICOS));
    return INITIAL_TECNICOS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Falha ao ler tecnicos', e);
    return INITIAL_TECNICOS;
  }
}

export function saveTecnicos(data: Tecnico[]) {
  localStorage.setItem('tecnicos_fitness_v2', JSON.stringify(data));
}

export function loadOrdens(): OrdemServico[] {
  const data = localStorage.getItem('ordens_fitness_v2');
  if (!data) {
    localStorage.setItem('ordens_fitness_v2', JSON.stringify(INITIAL_OS));
    return INITIAL_OS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Falha ao ler ordens do localStorage', e);
    return INITIAL_OS;
  }
}

export function saveOrdens(data: OrdemServico[]) {
  localStorage.setItem('ordens_fitness_v2', JSON.stringify(data));
}

export function loadOrcamentos(): Orcamento[] {
  const data = localStorage.getItem('orcamentos_fitness_v2');
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Falha ao ler orçamentos do localStorage', e);
    return [];
  }
}

export function saveOrcamentos(data: Orcamento[]) {
  localStorage.setItem('orcamentos_fitness_v2', JSON.stringify(data));
}

import { StoreSettings } from './types';

const INITIAL_SETTINGS: StoreSettings = {
  name: 'ASSISTÊNCIA',
  logoUrl: undefined,
  city: '',
  state: '',
  email: ''
};

export function loadSettings(): StoreSettings {
  const data = localStorage.getItem('store_settings');
  if (!data) return INITIAL_SETTINGS;
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_SETTINGS;
  }
}

export function saveSettings(data: StoreSettings) {
  localStorage.setItem('store_settings', JSON.stringify(data));
}

export function getStoreDomain(storeName: string | undefined): string {
  if (!storeName) return 'assistencia.com';
  const normalized = storeName
    .normalize('NFD') // Decompose diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Retain only alphanumeric
  
  if (!normalized) return 'assistencia.com';
  return `${normalized}.com`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskDocument(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

export async function cleanOklabFromStylesheets(): Promise<() => void> {
  const elementsToDisable: Array<{ element: HTMLStyleElement | HTMLLinkElement; originalDisabled: boolean }> = [];
  const tempStyleElements: HTMLStyleElement[] = [];

  // Find all active style and link elements
  const stylesAndLinks = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')) as Array<HTMLStyleElement | HTMLLinkElement>;

  for (const el of stylesAndLinks) {
    let cssText = '';

    if (el.tagName.toLowerCase() === 'style') {
      cssText = el.textContent || '';
    } else if (el.tagName.toLowerCase() === 'link') {
      const linkEl = el as HTMLLinkElement;
      try {
        const response = await fetch(linkEl.href);
        if (response.ok) {
          cssText = await response.text();
        }
      } catch (e) {
        console.warn('Could not fetch stylesheet:', linkEl.href, e);
        // Fallback to CSSOM if fetch fails (e.g. CORS)
        try {
          const sheet = Array.from(document.styleSheets).find(s => s.href === linkEl.href);
          if (sheet && sheet.cssRules) {
            cssText = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          }
        } catch (cssomError) {
          console.warn('Could not read from CSSOM either:', cssomError);
        }
      }
    }

    if (cssText) {
      // Replace oklab and oklch functions with solid rgb value
      const cleanedCss = cssText
        .replace(/oklab\([^)]+\)/g, 'rgb(0,0,0)')
        .replace(/oklch\([^)]+\)/g, 'rgb(0,0,0)');

      // Create temporary style tag with cleaned CSS
      const tempStyle = document.createElement('style');
      tempStyle.setAttribute('data-temp-clean', 'true');
      tempStyle.textContent = cleanedCss;
      document.head.appendChild(tempStyle);
      tempStyleElements.push(tempStyle);

      // Disable the original element
      elementsToDisable.push({
        element: el,
        originalDisabled: el.disabled
      });
      el.disabled = true;
    }
  }

  const restore = () => {
    // Remove temporary style elements
    tempStyleElements.forEach(el => el.remove());
    // Restore original stylesheets state
    elementsToDisable.forEach(item => {
      item.element.disabled = item.originalDisabled;
    });
  };

  return restore;
}
