'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface Props {
  className?: string;
  iconSize?: string;
}

export default function PWAInstallButton({ className, iconSize = 'w-5 h-5' }: Props) {
  const [prompt, setPrompt]       = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already running as installed PWA — hide the button
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Hide when: already installed as PWA, or browser hasn't fired the prompt yet
  if (installed || !prompt) return null;

  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  }

  return (
    <button onClick={handleInstall} className={className}>
      <Download className={iconSize} />
      <span>دابەزاندنی بەرنامە</span>
    </button>
  );
}
