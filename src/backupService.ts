import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { AssistenciaTecnica, OrdemServico, Tecnico, AppUser } from './types';

export interface BackupData {
  type: 'assistencia_backup';
  version: '1.0';
  timestamp: string;
  assistencia: AssistenciaTecnica;
  ordens: OrdemServico[];
  tecnicos: Tecnico[];
  usuarios: AppUser[];
}

export async function fetchBackupData(assistenciaId: string): Promise<BackupData | null> {
  try {
    // 1. Get Assistance
    const astSnap = await getDocs(query(collection(db, 'assistencias'), where('id', '==', assistenciaId)));
    if (astSnap.empty) return null;
    const assistencia = astSnap.docs[0].data() as AssistenciaTecnica;

    // 2. Get Orders
    const ordensSnap = await getDocs(query(collection(db, 'ordens'), where('assistenciaId', '==', assistenciaId)));
    const ordens = ordensSnap.docs.map(doc => doc.data() as OrdemServico);

    // 3. Get Technicians
    const tecnicosSnap = await getDocs(query(collection(db, 'tecnicos'), where('assistenciaId', '==', assistenciaId)));
    const tecnicos = tecnicosSnap.docs.map(doc => doc.data() as Tecnico);

    // 4. Get Users
    const usuariosSnap = await getDocs(query(collection(db, 'usuarios'), where('assistenciaId', '==', assistenciaId)));
    const usuarios = usuariosSnap.docs.map(doc => doc.data() as AppUser);

    return {
      type: 'assistencia_backup',
      version: '1.0',
      timestamp: new Date().toISOString(),
      assistencia,
      ordens,
      tecnicos,
      usuarios
    };
  } catch (error) {
    console.error('Error fetching backup data:', error);
    return null;
  }
}

export function downloadBackup(data: BackupData) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  const safeName = data.assistencia.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  link.href = url;
  link.download = `backup_${safeName}_${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function shouldBackupToday(assistenciaId: string): boolean {
  const lastBackup = localStorage.getItem(`last_backup_${assistenciaId}`);
  if (!lastBackup) return true;
  
  const lastDate = new Date(lastBackup).toDateString();
  const today = new Date().toDateString();
  
  return lastDate !== today;
}

export function markBackupDone(assistenciaId: string) {
  localStorage.setItem(`last_backup_${assistenciaId}`, new Date().toISOString());
}
