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
      // Replace oklab and oklch functions with mathematically equivalent, browser-safe rgb values
      const cleanedCss = cssText
        .replace(/oklab\(([^)]+)\)/g, (match, content) => {
          try {
            const parsed = parseOklab(content);
            return parsed !== null ? parsed : match;
          } catch (e) {
            return match;
          }
        })
        .replace(/oklch\(([^)]+)\)/g, (match, content) => {
          try {
            const parsed = parseOklch(content);
            return parsed !== null ? parsed : match;
          } catch (e) {
            return match;
          }
        });

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

function parseOklch(str: string): string | null {
  const parts = str.trim().split(/[\s,/]+/);
  if (parts.length < 3) return null;

  const L_str = parts[0];
  const C_str = parts[1];
  const H_str = parts[2];
  const A_str = parts[3];

  let L = L_str.endsWith('%') ? parseFloat(L_str) / 100 : parseFloat(L_str);
  let C = parseFloat(C_str);
  
  let H = 0;
  if (H_str.endsWith('deg')) {
    H = parseFloat(H_str);
  } else if (H_str.endsWith('rad')) {
    H = parseFloat(H_str) * (180 / Math.PI);
  } else if (H_str.endsWith('turn')) {
    H = parseFloat(H_str) * 360;
  } else {
    H = parseFloat(H_str);
  }

  if (isNaN(L) || isNaN(C) || isNaN(H)) return null;

  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const rgb = oklabToRgbValues(L, a, b);

  if (A_str !== undefined) {
    let A = A_str.endsWith('%') ? parseFloat(A_str) / 100 : parseFloat(A_str);
    if (isNaN(A)) A = 1;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${A})`;
  }

  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function parseOklab(str: string): string | null {
  const parts = str.trim().split(/[\s,/]+/);
  if (parts.length < 3) return null;

  const L_str = parts[0];
  const a_str = parts[1];
  const b_str = parts[2];
  const A_str = parts[3];

  let L = L_str.endsWith('%') ? parseFloat(L_str) / 100 : parseFloat(L_str);
  let a = parseFloat(a_str);
  let b = parseFloat(b_str);

  if (isNaN(L) || isNaN(a) || isNaN(b)) return null;

  const rgb = oklabToRgbValues(L, a, b);

  if (A_str !== undefined) {
    let A = A_str.endsWith('%') ? parseFloat(A_str) / 100 : parseFloat(A_str);
    if (isNaN(A)) A = 1;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${A})`;
  }

  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function oklabToRgbValues(L: number, a: number, b: number): { r: number; g: number; b: number } {
  // LMS from Oklab
  const l = L + 0.3963377774 * a + 0.2158037573 * b;
  const m = L - 0.1055613458 * a - 0.0638541728 * b;
  const s = L - 0.0894841775 * a - 1.291485548 * b;

  // Cubic non-linearity
  const l3 = l * l * l;
  const m3 = m * m * m;
  const s3 = s * s * s;

  // Linear RGB from LMS'
  const r_lin = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g_lin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_lin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707621684 * s3;

  // Gamma correction function
  const gamma = (c: number) => {
    if (c <= 0.0031308) {
      return 12.92 * c;
    } else {
      return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }
  };

  // Convert to 0-255 range and clamp
  const rVal = Math.max(0, Math.min(255, Math.round(gamma(r_lin) * 255)));
  const gVal = Math.max(0, Math.min(255, Math.round(gamma(g_lin) * 255)));
  const bVal = Math.max(0, Math.min(255, Math.round(gamma(b_lin) * 255)));

  return { r: rVal, g: gVal, b: bVal };
}
