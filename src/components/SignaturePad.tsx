import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Sparkles, PenTool, X } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  onSave: (base64: string) => void;
  onClear?: () => void;
  initialValue?: string;
  isReadOnly?: boolean;
  requiredRoleName?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  onSave,
  onClear,
  initialValue,
  isReadOnly = false,
  requiredRoleName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(!!initialValue);
  const [tempSignature, setTempSignature] = useState<string | null>(initialValue || null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isModalOpen && canvasRef.current) {
      const parent = canvasRef.current.parentElement;
      if (parent) {
        canvasRef.current.width = parent.clientWidth;
        canvasRef.current.height = parent.clientHeight;
      }
      if (tempSignature) {
        setHasSigned(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = tempSignature;
        }
      } else {
        clearCanvas();
      }
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (initialValue) {
      setTempSignature(initialValue);
      setHasSigned(true);
    } else {
      setTempSignature(null);
      setHasSigned(false);
    }
  }, [initialValue]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isReadOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || isReadOnly) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setTempSignature(dataUrl);
      setHasSigned(true);
      // We do not save to parent here, wait for 'Salvar' button
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setTempSignature(null);
    setHasSigned(false);
  };

  const handleSaveModal = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      onSave(dataUrl);
    } else if (tempSignature) {
       onSave(tempSignature);
    }
    setIsModalOpen(false);
  };

  const handleClearExternal = () => {
    setTempSignature(null);
    setHasSigned(false);
    if (onClear) onClear();
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 relative shadow-sm dark:shadow-none flex flex-col gap-2">
      <div className="flex justify-between items-center bg-zinc-100 border-b border-neutral-200 dark:border-neutral-700 -mx-3 -mt-3 px-3 py-1.5 mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          {label} {requiredRoleName && <span className="text-[8px] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-1 ml-1 font-bold">{requiredRoleName}</span>}
        </span>
        {tempSignature && (
          <span className="text-[8px] font-black bg-emerald-150 text-emerald-800 px-1.5 py-0.5 border border-emerald-400 font-mono uppercase">
            REGISTRADO
          </span>
        )}
      </div>

      <div className="flex flex-col items-center p-3 border-2 border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 rounded">
        {tempSignature ? (
          <img src={tempSignature} alt="Assinatura" className="max-h-16 object-contain pointer-events-none mix-blend-multiply opacity-95" />
        ) : (
          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Aguardando Assinatura</span>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex justify-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 border bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer rounded-lg shadow"
          >
            <PenTool className="w-3.5 h-3.5" />
            {tempSignature ? 'Refazer Assinatura' : 'ABRIR TELA PARA ASSINAR'}
          </button>
          {tempSignature && (
            <button
              type="button"
              onClick={handleClearExternal}
              className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer rounded-lg shadow-sm"
            >
              <X className="w-3.5 h-3.5 text-red-500" />
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Fullscreen Modal Form to ensure landscape mode sign */}
      {isModalOpen && !isReadOnly && (
        <div className="fixed inset-0 z-[9999] bg-neutral-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-6">
          <div className="w-full h-full max-w-5xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-emerald-600" />
                  Realizar {label}
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-neutral-500 mt-1 uppercase">Dica: Gire a tela (Modo Horizontal) para assinar melhor</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-full p-2 transition-colors"
                type="button"
              >
                <X className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </button>
            </div>

            <div className="flex-1 relative bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4 min-h-[300px] overflow-hidden">
              {/* Force a landscape aspect ratio box to represent the real signature dimensions */}
              <div className="w-full max-w-3xl aspect-[2/1] sm:aspect-[3/1] border-2 border-dashed border-neutral-400 dark:border-neutral-500 rounded-xl relative overflow-hidden bg-white dark:bg-neutral-900 touch-none shadow-inner flex shrink-0">
                 <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full block cursor-crosshair touch-none"
                  style={{ touchAction: 'none' }}
                />
                
                {!hasSigned && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center text-center p-4">
                    <span className="text-xs sm:text-sm font-black uppercase text-neutral-300 dark:text-neutral-600 tracking-widest select-none">Assine dentro deste retângulo</span>
                    <span className="text-[10px] sm:text-xs font-bold text-neutral-400 dark:text-neutral-500 mt-2 uppercase max-w-[80%]">Estas proporções representam exatamente como a assinatura ficará na OS</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center shadow-lg z-10 gap-4 flex-wrap">
               <button
                  type="button"
                  onClick={clearCanvas}
                  className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100 px-5 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer rounded-xl shadow-sm"
                >
                  <RotateCcw className="w-4 h-4 text-red-500" />
                  Limpar / Refazer
                </button>

                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={!hasSigned}
                  className={`px-8 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer rounded-xl shadow-md ${hasSigned ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'}`}
                >
                  <Check className="w-5 h-5" />
                  Salvar Assinatura
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

