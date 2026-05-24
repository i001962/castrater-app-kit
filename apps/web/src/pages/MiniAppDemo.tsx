import { useEffect, useState } from 'react';
import TerminalCard from '../components/TerminalCard.tsx';
import OgPreview from '../components/OgPreview.tsx';
import { getMiniAppContext, buildMiniAppEmbedTags } from '../lib/miniapp.ts';
import type { MiniAppContext } from '@castrater/miniapp';

export default function MiniAppDemo() {
  const [ctx, setCtx] = useState<MiniAppContext | null>(null);

  useEffect(() => {
    getMiniAppContext().then(setCtx).catch(console.warn);
  }, []);

  const embedTags = buildMiniAppEmbedTags({
    name: 'castrater-app-kit',
    iconUrl: 'https://your-domain.com/og/icon.png',
    homeUrl: 'https://your-domain.com',
    splashBackgroundColor: '#0a0a0a',
  });

  return (
    <div className="space-y-4">
      <h1>Mini App Demo</h1>
      <p className="text-terminal-dim text-sm">
        Farcaster Mini App integration. Includes SDK init, manifest, embed metadata, and OG tags.
      </p>

      <TerminalCard title="Mini App Context" badge={{ label: ctx?.isInMiniApp ? 'in-miniapp' : 'browser', variant: ctx?.isInMiniApp ? 'green' : 'amber' }}>
        <pre className="text-xs text-terminal-green overflow-auto">{JSON.stringify(ctx, null, 2)}</pre>
      </TerminalCard>

      <TerminalCard title="Embed Tags (for <head>)">
        <p className="text-xs text-terminal-dim mb-2">
          Add these meta tags to your HTML. See:{' '}
          <a href="https://miniapps.farcaster.xyz/docs/specification" target="_blank" rel="noreferrer">
            Farcaster Mini Apps Spec
          </a>
        </p>
        <pre className="text-xs text-terminal-green overflow-auto">
          {Object.entries(embedTags)
            .map(([k, v]) => `<meta name="${k}" content="${v}" />`)
            .join('\n')}
        </pre>
      </TerminalCard>

      <TerminalCard title="OG Preview">
        <OgPreview
          title="castrater-app-kit"
          description="Self-hosted sovereign app kit"
          imageUrl="/og/default.png"
          url="https://your-domain.com"
          appName="castrater"
        />
      </TerminalCard>

      <TerminalCard title="Manifest Location">
        <p className="text-xs text-terminal-dim">
          Deploy your Mini App manifest at:
        </p>
        <code className="text-xs text-terminal-green block mt-1">
          https://your-domain.com/.well-known/farcaster.json
        </code>
        <p className="text-xs text-terminal-dim mt-2">
          See <code>apps/web/public/.well-known/farcaster.json.example</code> for the example.
        </p>
      </TerminalCard>
    </div>
  );
}
