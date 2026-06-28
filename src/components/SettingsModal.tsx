import React, { useState, useRef, useCallback } from 'react';
import { StoreSettings, AppUser, AssistenciaTecnica, Tecnico } from '../types';
import { Settings as SettingsIcon, Image as ImageIcon, Upload, Crop as CropIcon } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { maskPhone, maskDocument, maskCEP } from '../utils';
import UserManagement from './UserManagement';

interface SettingsModalProps {
  currentSettings: StoreSettings;
  onSave: (settings: StoreSettings) => void;
  onClose: () => void;
  isGlobalAdmin?: boolean;

  // UserManagement Props
  usuarios: AppUser[];
  assistencias: AssistenciaTecnica[];
  tecnicos: Tecnico[];
  currentUser: AppUser;
  onAddUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onToggleUserActive: (userId: string) => void;
  onAddTecnicoAndUser?: (newTecnico: Tecnico, userLogin: string, userPass: string) => void;
  onUpdateUser?: (user: AppUser) => void;
  onRestoreBackup?: (backup: any) => Promise<void>;
  onShowBlockedAlert?: (message: string) => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

export default function SettingsModal({
  currentSettings,
  onSave,
  onClose,
  isGlobalAdmin = false,
  usuarios,
  assistencias,
  tecnicos,
  currentUser,
  onAddUser,
  onDeleteUser,
  onToggleUserActive,
  onAddTecnicoAndUser,
  onUpdateUser,
  onRestoreBackup,
  onShowBlockedAlert
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'usuarios'>('geral');
  const [name, setName] = useState(currentSettings.name);
  const [logoUrl, setLogoUrl] = useState(currentSettings.logoUrl || '');
  const [cnpj, setCnpj] = useState(currentSettings.cnpj || '');
  const [address, setAddress] = useState(currentSettings.address || '');
  const [zipCode, setZipCode] = useState(currentSettings.zipCode || '');
  const [phone, setPhone] = useState(currentSettings.phone || '');
  const [whatsapp, setWhatsapp] = useState(currentSettings.whatsapp || '');
  const [city, setCity] = useState(currentSettings.city || '');
  const [state, setState] = useState(currentSettings.state || '');
  const [email, setEmail] = useState(currentSettings.email || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  async function getCroppedImg() {
    if (!croppedAreaPixels || !imgSrc) return;

    try {
      const image = await createImage(imgSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      const base64Image = canvas.toDataURL('image/png');
      setLogoUrl(base64Image);
      setImgSrc('');
    } catch (e) {
      console.error(e);
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, logoUrl, cnpj, address, zipCode, phone, whatsapp, city, state, email });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 w-full ${
        activeTab === 'usuarios' ? 'max-w-5xl' : 'max-w-md'
      } shadow-sm dark:shadow-none flex flex-col max-h-[90vh] transition-all duration-300`}>
        <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 p-4 flex items-center justify-between border-b-4 border-black shrink-0">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-yellow-300" />
            <h2 className="font-black uppercase tracking-widest">
              {isGlobalAdmin ? "Configurações Globais" : "Configurações da Assistência"}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white dark:text-neutral-900 hover:text-yellow-300 font-bold px-2 py-1 transition-colors"
          >
            FECHAR X
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-r-2 border-neutral-200 dark:border-neutral-700 transition-colors ${
              activeTab === 'geral'
                ? 'bg-yellow-300 text-neutral-950 dark:bg-yellow-400 dark:text-neutral-950'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Dados da Assistência
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider text-center transition-colors ${
              activeTab === 'usuarios'
                ? 'bg-yellow-300 text-neutral-950 dark:bg-yellow-400 dark:text-neutral-950'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Usuários
          </button>
        </div>

        {activeTab === 'usuarios' ? (
          <div className="p-6 overflow-y-auto flex-1">
            <UserManagement
              usuarios={usuarios}
              assistencias={assistencias}
              tecnicos={tecnicos}
              currentUser={currentUser}
              onAddUser={onAddUser}
              onDeleteUser={onDeleteUser}
              onToggleUserActive={onToggleUserActive}
              onAddTecnicoAndUser={onAddTecnicoAndUser}
              onUpdateUser={onUpdateUser}
              onRestoreBackup={onRestoreBackup}
              storeSettings={currentSettings}
              onShowBlockedAlert={onShowBlockedAlert}
            />
          </div>
        ) : imgSrc ? (
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="relative w-full h-[300px] sm:h-[400px] border border-neutral-200 dark:border-neutral-700 bg-neutral-100">
              <Cropper
                image={imgSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="flex flex-col gap-2 pt-4 border-t-2 border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-xs font-black uppercase text-neutral-800 dark:text-neutral-200">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => {
                    setZoom(Number(e.target.value))
                  }}
                  className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImgSrc('')}
                  className="w-full bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-4 py-3 font-black uppercase tracking-wider text-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 transition-all placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={getCroppedImg}
                  className="w-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-3 font-black uppercase tracking-wider text-sm border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none hover:bg-neutral-800 hover:shadow-md hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center justify-center gap-2"
                >
                  <CropIcon className="w-4 h-4" /> CONFIRMAR
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto">
            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2">
                 Nome da Assistência
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-500 px-4 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all rounded-2xl"
                placeholder="Minha Assistência"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2">
                 CNPJ da Empresa
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={e => setCnpj(maskDocument(e.target.value))}
                className="w-full bg-neutral-100 dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-500 px-4 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all rounded-2xl"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2">
                 Endereço da Empresa
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-500 px-4 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all rounded-2xl"
                placeholder="Rua Exemplo, 123"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2">
                   Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-500 px-4 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all rounded-2xl"
                  placeholder="Ex: São Paulo"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2">
                   Estado
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-500 px-4 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all rounded-2xl"
                  placeholder="Ex: SP"
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2">
                 CEP da Empresa
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={e => setZipCode(maskCEP(e.target.value))}
                className="w-full bg-neutral-100 dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-500 px-4 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all rounded-2xl"
                placeholder="00000-000"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2">
                 Telefone de Contato
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(maskPhone(e.target.value))}
                className="w-full bg-neutral-100 dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-500 px-4 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all rounded-2xl"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                 WhatsApp da Empresa
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(maskPhone(e.target.value))}
                className="w-full bg-neutral-100 dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-500 px-4 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all rounded-2xl"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2">
                 E-mail da Empresa
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-500 px-4 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all rounded-2xl"
                placeholder="email@empresa.com"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Logo (Opcional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="flex-1 bg-neutral-100 dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-500 px-4 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all rounded-2xl"
                  placeholder="https://exemplo.com/logo.png"
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={onSelectFile} 
                  className="hidden placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 px-4 py-2 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-colors flex items-center justify-center gap-2"
                  title="Carregar Imagem"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
              {logoUrl && (
                <div className="mt-4 border border-neutral-200 dark:border-neutral-700 bg-neutral-100 p-2 flex justify-center relative group">
                  <img src={logoUrl} alt="Preview" className="max-h-20 object-contain" />
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="absolute top-1 right-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-red-600 text-[10px] font-black uppercase px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t-2 border-neutral-200 flex flex-col gap-3">
              <button
                type="submit"
                className="w-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-3 font-black uppercase tracking-wider text-sm border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none hover:bg-neutral-800 hover:shadow-md hover:translate-y-[2px] hover:translate-x-[2px] transition-all"
              >
                SALVAR ALTERAÇÕES
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
