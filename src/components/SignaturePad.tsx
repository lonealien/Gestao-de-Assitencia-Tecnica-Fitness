import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    if (initialValue) {
      setTempSignature(initialValue);
      setHasSigned(true);
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = initialValue;
        }
      }
    } else {
      setTempSignature(null);
      setHasSigned(false);
      clearCanvas();
    }
  }, [initialValue]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Scale to matches actual canvas coordinates (handling retina displays or styled sizes)
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
      onSave(dataUrl);
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
    if (onClear) onClear();
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 space-y-1.5 relative shadow-sm dark:shadow-none">
      <div className="flex justify-between items-center bg-zinc-100 border-b border-neutral-200 dark:border-neutral-700 -mx-3 -mt-3 px-3 py-1.5 mb-1.5">
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

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={140}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-28 bg-zinc-50 border-2 border-dashed border-zinc-300 block select-none ${
            isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-crosshair'
          }`}
          style={{ touchAction: 'none' }}
        />
        
        {!hasSigned && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center text-center p-4">
            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Assine com o dedo ou mouse aqui</span>
            {isReadOnly && (
              <span className="text-[8.5px] font-bold text-red-500 uppercase mt-1">Acesso Somente Leitura</span>
            )}
          </div>
        )}

        {tempSignature && isReadOnly && (
          <div className="absolute inset-0 pointer-events-none flex justify-center items-center">
            <img 
              src={tempSignature} 
              alt="Assinatura" 
              className="max-h-full max-w-full object-contain pointer-events-none mix-blend-multiply opacity-95" 
            />
          </div>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex justify-end gap-2 pt-1 border-t border-neutral-100">
          <button
            type="button"
            onClick={clearCanvas}
            className="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:translate-y-0.5 cursor-pointer shadow-sm dark:shadow-none hover:shadow-md placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500"
          >
            <RotateCcw className="w-3 h-3 text-red-500" />
            Limpar
          </button>
        </div>
      )}
    </div>
  );
};
