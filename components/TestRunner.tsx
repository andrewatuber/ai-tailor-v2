import React, { useState, useRef } from 'react';
import { Upload, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AnalysisResult, GarmentModel } from '../types';
import { analyzeGarmentImage } from '../services/geminiService';
import { validateResult } from '../services/testUtils';
import { ResultCard } from './ResultCard';

interface TestItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: AnalysisResult;
  validation?: {
    passed: boolean;
    missingFields: string[];
    invalidValues: string[];
  };
  errorMsg?: string;
}

export const TestRunner: React.FC = () => {
  const [items, setItems] = useState<TestItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [model, setModel] = useState<GarmentModel>('gemini-3-pro-image-preview');

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newItems: TestItem[] = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending'
      }));
      setItems(prev => [...prev, ...newItems]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runTests = async () => {
    if (items.length === 0 || isRunning) return;
    setIsRunning(true);

    // Process sequentially to avoid rate limits
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'done') continue; // Skip already done

      // Update status to running
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'running' } : it));

      try {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(item.file);
        });

        const result = await analyzeGarmentImage(base64, model);
        const validation = validateResult(result);

        setItems(prev => prev.map(it => 
          it.id === item.id ? { ...it, status: 'done', result, validation } : it
        ));
      } catch (err: any) {
        setItems(prev => prev.map(it => 
          it.id === item.id ? { ...it, status: 'error', errorMsg: err.message } : it
        ));
      }

      // Small delay between requests
      await new Promise(r => setTimeout(r, 1000));
    }

    setIsRunning(false);
  };

  const clearAll = () => {
    setItems([]);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded">🧪</span>
              자동화 테스트 러너
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              여러 이미지를 한 번에 분석하여 측정 로직의 정합성을 검증합니다.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={model}
              onChange={(e) => setModel(e.target.value as GarmentModel)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5"
            >
              <option value="gemini-3-pro-image-preview">Pro 3.0 (정밀)</option>
              <option value="gemini-2.5-flash-image">Flash 2.5 (빠름)</option>
            </select>
            
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={handleFiles} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Upload size={16} /> 이미지 추가
            </button>
            <button 
              onClick={runTests}
              disabled={isRunning || items.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              테스트 실행
            </button>
            {items.length > 0 && (
              <button onClick={clearAll} className="text-slate-400 hover:text-red-400 text-sm underline">
                모두 지우기
              </button>
            )}
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.id} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
              {/* Header Status */}
              <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                <span className="text-xs font-mono text-slate-500 truncate max-w-[150px]">
                  {item.file.name}
                </span>
                <div className="flex items-center gap-2">
                  {item.status === 'pending' && <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">대기중</span>}
                  {item.status === 'running' && <span className="text-xs text-indigo-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> 분석중</span>}
                  {item.status === 'error' && <span className="text-xs text-red-400 bg-red-900/20 px-2 py-0.5 rounded">에러</span>}
                  {item.status === 'done' && item.validation && (
                    item.validation.passed 
                      ? <span className="text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10}/> PASS</span>
                      : <span className="text-xs text-red-400 bg-red-900/20 px-2 py-0.5 rounded flex items-center gap-1"><XCircle size={10}/> FAIL</span>
                  )}
                </div>
              </div>

              {/* Validation Details */}
              {item.validation && !item.validation.passed && (
                <div className="p-2 bg-red-500/10 border-b border-red-500/10 text-xs text-red-200">
                  {item.validation.missingFields.length > 0 && (
                    <div>누락: {item.validation.missingFields.join(', ')}</div>
                  )}
                  {item.validation.invalidValues.length > 0 && (
                    <div>오류값: {item.validation.invalidValues.join(', ')}</div>
                  )}
                </div>
              )}

              {/* Visual Result */}
              <div className="flex-1 min-h-[400px] relative bg-slate-950">
                 {item.status === 'done' && item.result ? (
                   <ResultCard result={item.result} image={item.previewUrl} />
                 ) : (
                    <img src={item.previewUrl} className="w-full h-full object-contain opacity-50" alt="preview" />
                 )}
              </div>
            </div>
          ))}
          
          {items.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
              테스트할 이미지를 업로드하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};