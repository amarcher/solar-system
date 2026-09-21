import { useGraphicsQuality } from '../../performance/useGraphicsQuality';
import { readQualityPreference } from '../../performance/qualityPolicy';
import './GraphicsSettings.css';

export function GraphicsSettings() {
  const { preference, setPreference } = useGraphicsQuality();
  return (
    <label className="graphics-settings">
      <span>Graphics</span>
      <select aria-label="Graphics quality" value={preference} onChange={(event) => setPreference(readQualityPreference(event.target.value))}>
        <option value="auto">Automatic</option>
        <option value="smooth">Smoother</option>
        <option value="detailed">More detail</option>
      </select>
    </label>
  );
}
