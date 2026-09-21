import { RECORDING_CREDITS, RECORDING_HEIGHT, RECORDING_WIDTH } from './presentation';
import type { LessonCaption, TidesPresentation } from './presentation';

function textLines(context: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number): number {
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > width) {
      context.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else line = candidate;
  }
  if (line) context.fillText(line, x, y);
  return y + lineHeight;
}

/** Called inside R3F's after-render callback, before WebGL's buffer is cleared. */
export function paintRecordingFrame(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  presentation: TidesPresentation,
  caption: LessonCaption,
  qualification: string,
): void {
  const width = RECORDING_WIDTH;
  const height = RECORDING_HEIGHT;
  context.fillStyle = '#030610';
  context.fillRect(0, 0, width, height);
  const scale = Math.min(width / source.width, height / source.height);
  const sourceWidth = source.width * scale;
  const sourceHeight = source.height * scale;
  context.drawImage(source, (width - sourceWidth) / 2, (height - sourceHeight) / 2, sourceWidth, sourceHeight);

  context.textBaseline = 'top';
  context.fillStyle = 'rgba(3, 6, 16, 0.94)';
  context.fillRect(0, 0, width, 192);
  context.fillRect(0, 880, width, 400);
  context.fillStyle = '#92cfff';
  context.font = '600 20px Arial, sans-serif';
  context.fillText('EARTH + MOON · WHY TIDES HAPPEN', 36, 28);
  context.fillStyle = '#ffffff';
  context.font = '700 38px Arial, sans-serif';
  const headingEnd = textLines(context, presentation.heading, 36, 65, width - 72, 45);
  context.fillStyle = '#d3e3ff';
  context.font = '22px Arial, sans-serif';
  textLines(context, presentation.phaseLabel, 36, headingEnd + 9, width - 72, 28);

  context.font = '24px Arial, sans-serif';
  context.fillStyle = '#ffffff';
  const explanationEnd = textLines(context, caption.explanation, 36, 900, width - 72, 30);
  context.font = '19px Arial, sans-serif';
  context.fillStyle = '#c5d0e3';
  textLines(context, caption.legend, 36, explanationEnd + 13, width - 72, 25);
  context.font = '20px Arial, sans-serif';
  context.fillStyle = '#ffe4a4';
  textLines(context, qualification, 36, 1130, width - 72, 26);
  context.font = '17px Arial, sans-serif';
  context.fillStyle = '#d3dbea';
  context.fillText(RECORDING_CREDITS, 36, 1230);
  context.font = '15px Arial, sans-serif';
  context.fillText('solarsystemscope.com/textures · creativecommons.org/licenses/by/4.0', 36, 1255);
}
