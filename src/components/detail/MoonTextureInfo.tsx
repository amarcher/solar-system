import type { Moon } from '../../types/celestialBody';
import { getBodyTextureAsset } from '../../data/textureManifest';
import './MoonTextureInfo.css';

interface MoonTextureInfoProps {
  moon: Pick<Moon, 'id' | 'name'>;
  compact?: boolean;
}

export function MoonTextureInfo({ moon, compact = false }: MoonTextureInfoProps) {
  const asset = getBodyTextureAsset(moon.id);
  const verified = asset?.provenance.status === 'verified';

  return (
    <section
      className={`moon-texture-info${compact ? ' moon-texture-info--compact' : ''}`}
      aria-label={`Surface image for ${moon.name}`}
    >
      {asset?.coverage && <p className="moon-texture-info__coverage">{asset.coverage}</p>}
      <details
        key={moon.id}
        className="moon-texture-info__disclosure"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && event.currentTarget.open) {
            event.stopPropagation();
            event.currentTarget.open = false;
            event.currentTarget.querySelector('summary')?.focus();
          }
        }}
      >
        <summary className="moon-texture-info__summary">About this image</summary>
        <div className="moon-texture-info__content">
          {!asset ? (
            <p>Illustration: this app does not have a photographic surface map for {moon.name}.</p>
          ) : !verified ? (
            <p>We’re checking the source and credit for this older surface image.</p>
          ) : (
            <>
              <p>{asset.provenance.credit}</p>
              {asset.coverage && <p>Resized for display. Areas without imagery are plain gray; no terrain was invented.</p>}
              <div className="moon-texture-info__links">
                {asset.provenance.sourceUrl && (
                  <a href={asset.provenance.sourceUrl} target="_blank" rel="noopener noreferrer">Image source<span className="moon-texture-info__sr-only"> (opens in a new tab)</span></a>
                )}
                {asset.provenance.licenseUrl && (
                  <a href={asset.provenance.licenseUrl} target="_blank" rel="noopener noreferrer">Usage terms<span className="moon-texture-info__sr-only"> (opens in a new tab)</span></a>
                )}
              </div>
            </>
          )}
        </div>
      </details>
    </section>
  );
}
