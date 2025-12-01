import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  onClear: () => void;
  selectedImage: string | null;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageSelected, 
  onClear, 
  selectedImage,
  isLoading
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    // CRITICAL: Reset the input value so the onChange triggers again if the user selects the same file
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageSelected(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  if (selectedImage) {
    return (
      <div className="relative w-full h-full min-h-[300px] bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg group">
        <img 
          src={selectedImage} 
          alt="Garment Preview" 
          className="w-full h-full object-contain bg-black/20" 
        />
        {!isLoading && (
          <button 
            onClick={onClear}
            className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-red-500/90 text-white rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 backdrop-blur-sm shadow-md"
            title="이미지 삭제"
          >
            <X size={20} />
          </button>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-indigo-200 font-medium animate-pulse">의류 측정 중...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full h-full min-h-[300px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
        ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-indigo-400 hover:bg-slate-800/50'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={triggerFileSelect}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        className="hidden" 
        accept="image/*"
        onChange={handleChange}
      />
      <div className="p-4 bg-slate-800/50 rounded-full mb-4 text-indigo-400">
        <Upload size={32} />
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-2">의류 이미지 업로드</h3>
      <p className="text-sm text-slate-400 text-center max-w-[250px]">
        줄자가 포함된 이미지를 드래그하거나 클릭하여 선택하세요.
      </p>
    </div>
  );
};