import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultCard } from './components/ResultCard';
import { analyzeGarmentImage } from './services/geminiService';
import { AppState, AnalysisResult, GarmentModel } from './types';
import { Scissors, AlertCircle, Settings2, KeyRound } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Default model set to Nano Banana Pro (Pro 3.0)
  const [model, setModel] = useState<GarmentModel>('gemini-3-pro-image-preview');

  const handleImageSelected = (base64: string) => {
    setSelectedImage(base64);
    setAppState(AppState.IDLE);
    setResult(null);
    setError(null);
  };

  const handleClear = () => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
    setAppState(AppState.IDLE);
  };

  const openKeySelector = async () => {
    try {
      if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        setError(null);
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const checkApiKey = async (): Promise<boolean> => {
    // Robust check for API key presence in the environment
    try {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
          return true;
        }
      }
      return true;
    } catch (e) {
      console.error("API Key selection failed", e);
      return false;
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setError(null);
    
    // Always ensure an API key is selected before proceeding
    const keyReady = await checkApiKey();
    if (!keyReady) {
      setError("API 키 확인에 실패했습니다. 키를 다시 선택해주세요.");
      return;
    }

    setAppState(AppState.ANALYZING);

    try {
      const analysisResult = await analyzeGarmentImage(selectedImage, model);
      setResult(analysisResult);
      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      
      const errorMessage = err.message || JSON.stringify(err);
      
      // Handle various permission/key missing errors by prompting for key
      const isKeyError = 
        errorMessage.includes("403") || 
        errorMessage.includes("PERMISSION_DENIED") || 
        errorMessage.includes("Referrer") ||
        errorMessage.includes("Requested entity was not found") ||
        errorMessage.includes("API Key is missing");

      if (isKeyError) {
         try {
            await window.aistudio.openSelectKey();
            // Optional: You could auto-retry here, but letting the user click again is safer
            setError("API 키 설정이 필요합니다. 키를 선택한 후 다시 시도해주세요.");
         } catch {
            setError("API 키 권한 문제로 분석에 실패했습니다.");
         }
      } else {
        setError("이미지 분석 실패. " + (err.message ? err.message : "이미지 포맷을 확인해주세요."));
      }
      setAppState(AppState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Scissors className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">나노 테일러 AI</h1>
              <p className="text-slate-400 text-sm">AI 의류 사이즈 자동 측정</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={openKeySelector}
              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="API 키 변경"
            >
              <KeyRound size={20} />
            </button>
            <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
               <Settings2 size={16} className="text-indigo-400 ml-2" />
               <select 
                 value={model}
                 onChange={(e) => setModel(e.target.value as GarmentModel)}
                 className="bg-transparent text-sm font-medium text-slate-200 focus:outline-none cursor-pointer pr-2"
               >
                 <option value="gemini-3-pro-image-preview" className="bg-slate-800">나노 바나나 프로 (Pro 3.0)</option>
                 <option value="gemini-2.5-flash-image" className="bg-slate-800">나노 바나나 (Flash 2.5)</option>
               </select>
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Input */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 shadow-xl backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-medium text-white">1. 의류 이미지 업로드</h2>
                 {selectedImage && (
                   <button onClick={handleClear} className="text-xs text-slate-400 hover:text-white underline">
                     초기화
                   </button>
                 )}
              </div>
              
              <div className="h-[500px]">
                <ImageUploader 
                  onImageSelected={handleImageSelected} 
                  onClear={handleClear} 
                  selectedImage={selectedImage}
                  isLoading={appState === AppState.ANALYZING}
                />
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={!selectedImage || appState === AppState.ANALYZING}
                  className={`
                    px-6 py-3 rounded-lg font-medium text-white shadow-lg transition-all duration-200 flex items-center gap-2
                    ${!selectedImage || appState === AppState.ANALYZING 
                      ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                      : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-600/25 active:scale-95'}
                  `}
                >
                  {appState === AppState.ANALYZING ? '분석 중...' : '사이즈 측정 시작'}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/30">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">사용 방법</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  빠른 측정은 <strong>나노 바나나</strong>, 정밀한 측정은 <strong>나노 바나나 프로</strong>를 선택하세요.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  AI가 이미지 내의 <strong>줄자(50cm 기준)</strong>를 인식하여 실제 사이즈를 계산합니다.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  측정 결과는 이미지 위에 직관적으로 표시됩니다.
                </li>
              </ul>
              {/* Note: All models require API key in this environment, but emphasizing for Pro is still good practice */}
              <div className="mt-4 p-3 bg-indigo-500/10 rounded border border-indigo-500/20 text-xs text-indigo-200">
                <strong>참고:</strong> 이 앱은 Gemini API를 사용하며, 결제가 연결된 프로젝트의 API 키가 필요할 수 있습니다.
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline ml-1">자세히 보기</a>.
              </div>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="space-y-6 h-full">
             <h2 className="text-lg font-medium text-white px-2">2. 시각적 분석 결과</h2>
             
             {appState === AppState.ERROR && (
               <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-start gap-4 text-red-200">
                 <AlertCircle className="shrink-0 text-red-500" />
                 <div>
                   <h3 className="font-semibold text-red-400 mb-1">분석 오류</h3>
                   <p className="text-sm opacity-90">{error}</p>
                   {(error?.includes("Key") || error?.includes("Permission") || error?.includes("권한") || error?.includes("설정")) && (
                      <button 
                        onClick={openKeySelector}
                        className="mt-3 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-xs font-medium text-red-100 transition-colors"
                      >
                        API 키 변경
                      </button>
                   )}
                 </div>
               </div>
             )}

             {appState === AppState.SUCCESS && result && (
               <ResultCard result={result} image={selectedImage} />
             )}

             {appState === AppState.IDLE && !result && (
               <div className="h-[500px] border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600 bg-slate-800/20">
                 <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                   <Scissors size={32} className="opacity-40" />
                 </div>
                 <p className="font-medium">측정 준비 완료</p>
                 <p className="text-sm opacity-60 mt-1">줄자가 포함된 의류 이미지를 업로드하세요</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;