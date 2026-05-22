import { Move, MousePointer2, Globe2, X } from 'lucide-react';
import { useLanguage } from '../store/LanguageContext';
import { useEffect, useState } from 'react';

export function UIOverlay() {
  const { lang, setLang, t } = useLanguage();
  const [showGuide, setShowGuide] = useState(true);
  const [routeStarted, setRouteStarted] = useState(false);
  const [routeEnded, setRouteEnded] = useState(false);
  const [routePaused, setRoutePaused] = useState(false);

  useEffect(() => {
    const onRouteEnd = () => {
      setRouteEnded(true);
      setRoutePaused(false);
    };
    const onRoutePaused = () => setRoutePaused(true);
    const onRouteResumed = () => setRoutePaused(false);
    window.addEventListener('route-end', onRouteEnd);
    window.addEventListener('route-paused', onRoutePaused);
    window.addEventListener('route-resumed', onRouteResumed);
    return () => {
      window.removeEventListener('route-end', onRouteEnd);
      window.removeEventListener('route-paused', onRoutePaused);
      window.removeEventListener('route-resumed', onRouteResumed);
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none flex flex-col justify-between z-10 text-slate-200 font-sans">
      <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-screen" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute inset-0 pointer-events-none mix-blend-screen" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(30, 58, 138, 0.15) 0%, transparent 70%)' }}></div>
      
      {/* Top right Language Switcher */}
      <div className="absolute top-6 right-6 z-20 flex bg-slate-900/50 backdrop-blur border border-white/10 p-1 rounded-lg pointer-events-auto">
         {(['zh', 'en'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
                lang === l ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
      </div>

      <header className="relative z-10 p-6 flex flex-col gap-1 border-b border-white/5 bg-slate-950/40 backdrop-blur-md animate-fade-in pointer-events-auto w-max">
        <h1 className="text-xl font-bold tracking-widest text-white uppercase">
          {t('title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">{t('subtitle')}</span>
        </h1>
        <div className="flex items-center gap-2 mt-1">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
           <span className="text-[10px] font-mono text-emerald-500/80 uppercase tracking-tighter">{t('desc')}</span>
        </div>
      </header>

      <main className="relative flex-1 flex pointer-events-none animate-fade-in-up">
        {showGuide ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none px-6">
            <div className="w-full max-w-sm p-5 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl pointer-events-auto">
              <button
                onClick={() => {
                  if (routeEnded) {
                    setRouteEnded(false);
                    setRouteStarted(true);
                    setRoutePaused(false);
                    setShowGuide(false);
                    window.dispatchEvent(new CustomEvent('reset-view'));
                    window.dispatchEvent(new CustomEvent('start-route'));
                  } else {
                    setRouteStarted(true);
                    setRoutePaused(false);
                    setShowGuide(false);
                    window.dispatchEvent(new CustomEvent('start-route'));
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500/15 border border-cyan-400/20 px-4 py-3 text-xs uppercase tracking-[0.32em] text-cyan-200 hover:bg-cyan-500/20 transition"
              >
                <Globe2 className="w-4 h-4" />
                {routeEnded ? t('restartRoute') : t('startRoute')}
              </button>
              <button
                onClick={() => setShowGuide(false)}
                className="mt-4 w-full text-xs uppercase tracking-[0.32em] text-slate-400 hover:text-white transition"
              >
                {t('dismiss')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowGuide(true)}
            className="absolute left-6 bottom-6 z-20 px-3 py-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg hover:bg-slate-900 transition-colors text-[10px] font-mono text-slate-400 hover:text-white pointer-events-auto"
          >
            Show Guide
          </button>
        )}

        {routeEnded && !showGuide && (
          <button
            onClick={() => {
              setRouteEnded(false);
              setRouteStarted(true);
              setRoutePaused(false);
              window.dispatchEvent(new CustomEvent('reset-view'));
              window.dispatchEvent(new CustomEvent('start-route'));
            }}
            className="absolute left-6 bottom-20 z-20 px-3 py-2 bg-cyan-500/20 backdrop-blur-xl border border-cyan-400/30 rounded-lg hover:bg-cyan-500/30 transition-colors text-[10px] font-mono text-cyan-200 hover:text-white pointer-events-auto"
          >
            {t('restartRoute')}
          </button>
        )}

        {routePaused && !routeEnded && !showGuide && (
          <button
            onClick={() => {
              setRoutePaused(false);
              window.dispatchEvent(new CustomEvent('route-resume'));
            }}
            className="absolute left-6 bottom-20 z-20 px-4 py-2 bg-emerald-500/20 backdrop-blur-xl border border-emerald-400/30 rounded-lg hover:bg-emerald-500/30 transition-colors text-[10px] font-mono uppercase tracking-[0.24em] text-emerald-200 hover:text-white pointer-events-auto"
          >
            继续前进
          </button>
        )}
      </main>

      <footer className="relative z-10 px-6 py-3 flex items-center justify-between bg-black/40 backdrop-blur-sm border-t border-white/5 text-[10px] font-mono text-slate-500 pointer-events-auto">
        <div className="flex gap-6 uppercase">
          <span>{t('posLabel')}: {t('tracking')}</span>
          <span>{t('fovLabel')}: 60&deg;</span>
        </div>
        <div className="flex gap-4">
          <span>{t('sysStatus')}</span>
          <span className="text-cyan-500/70 underline cursor-pointer hover:text-cyan-400 transition-colors">{t('viewLogs')}</span>
        </div>
      </footer>
    </div>
  );
}
