/**
 * OgPreview: Shows a preview of Open Graph / Mini App embed metadata.
 * For development use — shows what embed cards will look like.
 */
interface OgPreviewProps {
  title: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  appName?: string;
}

export default function OgPreview({ title, description, imageUrl, url, appName }: OgPreviewProps) {
  return (
    <div className="border border-terminal-border rounded overflow-hidden w-full max-w-sm">
      {imageUrl && (
        <div className="w-full h-40 bg-terminal-card flex items-center justify-center overflow-hidden">
          <img src={imageUrl} alt={title} className="object-cover w-full h-full" />
        </div>
      )}
      <div className="p-3 bg-terminal-card">
        {appName && <p className="text-xs text-terminal-dim mb-1">{appName}</p>}
        <p className="text-sm font-semibold text-terminal-green">{title}</p>
        {description && <p className="text-xs text-terminal-dim mt-1">{description}</p>}
        {url && <p className="text-xs text-terminal-dim mt-1 truncate">{url}</p>}
      </div>
    </div>
  );
}
