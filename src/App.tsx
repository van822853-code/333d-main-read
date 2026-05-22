import { CosmosScene } from './components/CosmosScene';
import { UIOverlay } from './components/UIOverlay';
import { AdminPage } from './components/AdminPage';

export default function App() {
  if (window.location.pathname === '/admin') {
    return <AdminPage />;
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#030712] text-slate-200 font-sans selection:bg-cyan-500/30">
      <CosmosScene />
      <UIOverlay />
    </main>
  );
}
