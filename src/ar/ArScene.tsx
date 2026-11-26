import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { XROrigin, useXR } from '@react-three/xr';
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, NormalBlending, PlaneGeometry, Vector3,
  type Group, type Mesh, type MeshBasicMaterial, type PointsMaterial, type Texture,
} from 'three';
import { planets } from '../data/planets';
import { sun } from '../data/sun';
import { getPlanetPosition } from '../utils/planetPositions';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { GraphicsQualityContext, type GraphicsQuality } from '../performance/useGraphicsQuality';
import { QUALITY_SETTINGS } from '../performance/qualityPolicy';
import { PlanetOrbit } from '../components/scene/PlanetOrbit';
import { SunMesh } from '../components/scene/Sun';
import {
  anchorInFront, blendViews, createView, focusScale, originForView,
  FOCUS_PLACEMENT, PREVIEW_FOCUS_PLACEMENT, PREVIEW_PLACEMENT, ROOM_PLACEMENT, UNITS_PER_METER,
} from './arPlacement';
import { LABEL_ASPECT, createGlowTexture, createLabelTexture } from './textSprite';
import type { ArControls, StellaState } from './useArStella';

/** Matches SUN_RADIUS in components/scene/Sun.tsx. */
const SUN_RADIUS = 2;
/** Text heights in real metres, kept the same however far the view is zoomed. */
const LABEL_METERS = 0.035;
const FOCUSED_LABEL_METERS = 0.07;
/** The row of buttons that floats below the view and follows the viewer round the room. */
const BAR = { distance: 0.9, drop: 0.6, buttonHeight: 0.055, spacing: 0.24 };
/** How far the viewer can turn, in radians, or stray, in metres, before the buttons come back in front of them. */
const BAR_SLACK = { angle: 0.7, distance: 0.45 };
/** The dot shown where a hand or controller is pointing, in real metres across. */
const CURSOR_METERS = 0.03;
/** The smallest tap area, in real metres across half its width. Mercury itself is half a centimetre. */
const TAP_RADIUS_METERS = 0.045;
/** Tracking needs a moment after a session starts before the head pose is trustworthy. */
const SETTLE_FRAMES = 20;
/** Nearest and farthest distance drawn, in metres. Far planets seen from a small one are over 150 m away. */
const CLIP_RANGE_METERS = [0.05, 500];
/** The dark sky that hides the room while visiting a body, in metres. */
const SKY_RADIUS_METERS = 400;
/** A dusk, not a blackout: the room stays clearly visible behind the stars. */
const SKY_DARKNESS = 0.55;
const FLIGHT_SECONDS = 2.8;

/** Planets are seen close up after a flight, so the headset gets the sharper textures. */
const HEADSET_QUALITY: GraphicsQuality = {
  preference: 'detailed',
  tier: 'standard',
  settings: QUALITY_SETTINGS.standard,
  setPreference: () => {},
  reportFrameWindow: () => {},
};

interface Body {
  id: string;
  name: string;
  radius: number;
}

const BODIES: Body[] = [
  { id: 'sun', name: sun.name, radius: SUN_RADIUS },
  ...planets.map((planet) => ({ id: planet.id, name: planet.name, radius: planet.visualRadius })),
];

const SUN_POSITION = new Vector3();
const bodyPosition = (id: string) => (id === 'sun' ? SUN_POSITION : getPlanetPosition(id)) ?? SUN_POSITION;
const ignoreRaycast = () => null;
const keepInPlace = () => {};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Scene units per metre right now. Written once a frame by the scene, read by every panel. */
const live = { scale: UNITS_PER_METER };

/** Where a hand or controller is pointing right now, in scene units. */
const aim = { point: new Vector3(), target: null as object | null };
const pointAt = (target: object) => ({
  onPointerMove: (e: { point: Vector3 }) => { aim.point.copy(e.point); aim.target = target; },
  onPointerOut: () => { if (aim.target === target) aim.target = null; },
});

const UNIT_PLANE = new PlaneGeometry(1, 1);
const viewerPosition = new Vector3();

/** Stars for the dark sky, scattered evenly. The same sky every time. */
const STAR_GEOMETRY = (() => {
  const count = 1400;
  const positions = new Float32Array(count * 3);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < count; i++) {
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - y * y);
    const radius = SKY_RADIUS_METERS * 0.95;
    positions.set([Math.cos(angle) * ring * radius, y * radius, Math.sin(angle) * ring * radius], i * 3);
  }
  return new BufferGeometry().setAttribute('position', new BufferAttribute(positions, 3));
})();

interface PanelProps {
  texture: Texture;
  /** Height in real metres; the width follows from `aspect`. */
  meters?: number;
  aspect?: number;
  /** Height in the units of the panel's parent instead: scene units for the glow, metres for room-fixed panels. */
  size?: number;
  /** Called every frame to move the panel; it then turns to face the viewer. */
  place: (panel: Mesh, height: number) => void;
  additive?: boolean;
  onClick?: () => void;
}

/**
 * A flat textured panel that faces the viewer and stays upright. Sprites are
 * not used: three.js sizes them in view space, so under a scaled viewer origin
 * they come out many times too large in the headset.
 */
function Panel({ texture, meters = 0, aspect = 1, size, place, additive = false, onClick }: PanelProps) {
  const ref = useRef<Mesh>(null);
  const aiming = useMemo(() => pointAt({}), []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({ camera }) => {
    const panel = ref.current;
    if (!panel) return;
    const height = size ?? meters * live.scale;
    panel.scale.set(height * aspect, height, 1);
    place(panel, height);
    panel.lookAt(camera.getWorldPosition(viewerPosition));
  });
  return (
    <mesh
      ref={ref}
      geometry={UNIT_PLANE}
      // Panels without a tap action never take input, so they cannot swallow a tap aimed at a planet.
      raycast={onClick ? undefined : ignoreRaycast}
      // Acting on the press, not the release: a hand wobbles off a small target before letting go.
      onPointerDown={onClick && ((e) => { e.stopPropagation(); onClick(); })}
      {...(onClick ? aiming : null)}
    >
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} blending={additive ? AdditiveBlending : NormalBlending} />
    </mesh>
  );
}

function BodyLabel({ body, large }: { body: Body; large: boolean }) {
  const texture = useMemo(() => createLabelTexture(body.name), [body.name]);
  return (
    <Panel
      texture={texture}
      meters={large ? FOCUSED_LABEL_METERS : LABEL_METERS}
      aspect={LABEL_ASPECT}
      place={(panel, height) => {
        const position = bodyPosition(body.id);
        panel.position.set(position.x, position.y - body.radius - height * 0.65, position.z);
      }}
    />
  );
}

const STELLA_TEXT: Record<StellaState, string> = {
  unavailable: '',
  off: 'Talk to Stella',
  connecting: 'Calling Stella…',
  on: 'Stella is listening',
  error: 'Stella can’t talk now',
};

/** One of the buttons in the row below the view. Sits under the viewer's origin, so it is sized in metres. */
function BarButton({ text, place, onClick }: { text: string; place: (panel: Mesh) => void; onClick: () => void }) {
  const texture = useMemo(() => createLabelTexture(text, { button: true }), [text]);
  return <Panel texture={texture} size={BAR.buttonHeight} aspect={LABEL_ASPECT} onClick={onClick} place={place} />;
}

/** A glowing dot where the hand or controller is pointing, so it is clear what a pinch will choose. */
function AimDot() {
  const texture = useMemo(() => createGlowTexture(), []);
  return (
    <Panel
      texture={texture}
      meters={CURSOR_METERS}
      additive
      place={(panel) => {
        panel.visible = aim.target != null;
        panel.position.copy(aim.point);
      }}
    />
  );
}

/**
 * An invisible ball around a body that takes the taps for it. The planets are
 * a centimetre or two across in the room view, far too small to point at.
 */
function TapTarget({ body, onTap, onHover }: { body: Body; onTap: () => void; onHover: (over: boolean) => void }) {
  const ref = useRef<Mesh>(null);
  const aiming = useMemo(() => pointAt({}), []);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.copy(bodyPosition(body.id));
    ref.current.scale.setScalar(Math.max(body.radius * 1.25, TAP_RADIUS_METERS * live.scale));
  });
  return (
    <mesh
      ref={ref}
      onPointerDown={(e) => { e.stopPropagation(); onTap(); }}
      onPointerOver={() => onHover(true)}
      onPointerMove={aiming.onPointerMove}
      onPointerOut={() => { aiming.onPointerOut(); onHover(false); }}
    >
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial colorWrite={false} depthWrite={false} />
    </mesh>
  );
}

function SunGlow() {
  const texture = useMemo(() => createGlowTexture(), []);
  return <Panel texture={texture} size={SUN_RADIUS * 5} additive place={keepInPlace} />;
}

const forward = new Vector3();
const barIdeal = new Vector3();
const toBar = new Vector3();

/** Everything the per-frame flight animation keeps between frames. */
const createFlight = () => ({
  placed: false,
  frames: 0,
  /** Where the Sun rests in the room view, in metres. */
  home: new Vector3(),
  /** The middle of the row of buttons, in metres, where it is heading, and which way the row runs. */
  bar: new Vector3(),
  barTarget: new Vector3(),
  barRight: new Vector3(1, 0, 0),
  from: createView(),
  to: createView(),
  now: createView(),
  targetId: 'sun',
  fromDarkness: 0,
  toDarkness: 0,
  darkness: 0,
  elapsed: FLIGHT_SECONDS,
});

/**
 * The solar system at room scale. Tapping a body flies the viewer to it: the
 * room fades into a starry sky and the body grows to fill the view, while the
 * orbits carry on. Works in a headset session and, with the same layout, as an
 * ordinary on-screen preview before a session starts.
 */
interface ArSceneProps {
  /** Filled in by the scene so the voice guide can fly the viewer around. */
  controlsRef: RefObject<ArControls | null>;
  stella: StellaState;
  onStellaTap: () => void;
  /** Called when a visit begins or ends, with the body visited or null. */
  onFocusChange: (id: string | null) => void;
  /** Ends the headset session. */
  onLeave: () => void;
}

export function ArScene({ controlsRef, stella, onStellaTap, onFocusChange, onLeave }: ArSceneProps) {
  const origin = useRef<Group>(null);
  const system = useRef<Group>(null);
  const sky = useRef<MeshBasicMaterial>(null);
  const stars = useRef<PointsMaterial>(null);
  const skyGroup = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const session = useXR((xr) => xr.session);
  const reducedMotion = useReducedMotion();

  // A visit belongs to the session it began in; starting or ending a session returns to the room.
  const [visit, setVisit] = useState<{ id: string; session: typeof session } | null>(null);
  const focusId = visit && visit.session === session ? visit.id : null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // The viewer moves with the origin, so scaling the origin scales the viewer.
  useEffect(() => {
    const group = origin.current;
    if (!group) return;
    group.add(camera);
    return () => void group.remove(camera);
  }, [camera]);

  const flightRef = useRef(createFlight());

  // Re-place the system in front of the viewer whenever a session starts or ends.
  useEffect(() => {
    const flight = flightRef.current;
    flight.placed = false;
    flight.frames = 0;
    if (system.current) system.current.visible = false;
  }, [session]);

  const heading = () => forward.set(0, 0, -1).applyQuaternion(camera.quaternion);

  /** Fly to a body, or back to the room view when no body is given. */
  const flyTo = (body: Body | null) => {
    const flight = flightRef.current;
    if (!flight.placed) return false;
    flight.from.scale = flight.now.scale;
    flight.from.focus.copy(flight.now.focus);
    flight.from.anchor.copy(flight.now.anchor);
    flight.fromDarkness = flight.darkness;
    flight.elapsed = 0;
    if (body) {
      flight.targetId = body.id;
      flight.to.scale = focusScale(body.radius);
      anchorInFront(camera.position, heading(), session ? FOCUS_PLACEMENT : PREVIEW_FOCUS_PLACEMENT, flight.to.anchor);
      flight.toDarkness = SKY_DARKNESS;
    } else {
      flight.targetId = 'sun';
      flight.to.scale = UNITS_PER_METER;
      flight.to.anchor.copy(flight.home);
      flight.toDarkness = 0;
    }
    setVisit(body && { id: body.id, session });
    onFocusChange(body?.id ?? null);
    return true;
  };

  // Runs after the planets have moved this frame and before the panels are laid out.
  useFrame(({ gl, camera: viewer }, delta) => {
    const flight = flightRef.current;
    if (!origin.current || !system.current) return;
    if (!flight.placed) {
      if (session && (!gl.xr.isPresenting || ++flight.frames < SETTLE_FRAMES)) return;
      anchorInFront(viewer.position, heading(), session ? ROOM_PLACEMENT : PREVIEW_PLACEMENT, flight.home);
      flight.bar.copy(anchorInFront(viewer.position, heading(), BAR, flight.barTarget));
      flight.targetId = 'sun';
      flight.to.scale = UNITS_PER_METER;
      flight.to.anchor.copy(flight.home);
      flight.toDarkness = 0;
      flight.elapsed = FLIGHT_SECONDS;
      flight.placed = true;
      system.current.visible = true;
    }

    flight.elapsed = reducedMotion ? FLIGHT_SECONDS : Math.min(flight.elapsed + delta, FLIGHT_SECONDS);
    const progress = easeInOut(flight.elapsed / FLIGHT_SECONDS);
    // The destination keeps orbiting during and after the flight, and the view follows it.
    flight.to.focus.copy(bodyPosition(flight.targetId));
    const view = blendViews(flight.from, flight.to, progress, flight.now);
    originForView(view, origin.current.position);
    origin.current.scale.setScalar(view.scale);
    live.scale = view.scale;

    // The buttons stay put while the viewer looks around, and drift back in
    // front once the viewer has turned or walked away from them.
    const ideal = anchorInFront(viewer.position, heading(), BAR, barIdeal);
    // Looking steeply down, at the buttons themselves, gives no reliable heading; leave them be.
    const level = forward.setY(0).lengthSq() > 0.1;
    const turned = toBar.copy(flight.barTarget).sub(viewer.position).setY(0).angleTo(forward) > BAR_SLACK.angle;
    if (level && (turned || ideal.distanceTo(flight.barTarget) > BAR.distance + BAR_SLACK.distance || Math.abs(ideal.y - flight.barTarget.y) > BAR_SLACK.distance / 2)) {
      flight.barTarget.copy(ideal);
    }
    flight.bar.lerp(flight.barTarget, reducedMotion ? 1 : 1 - Math.exp(-delta * 5));
    // To the viewer's right: for a level heading (x, 0, z) that is (-z, 0, x).
    toBar.copy(flight.bar).sub(viewer.position).setY(0).normalize();
    flight.barRight.set(-toBar.z, 0, toBar.x);

    flight.darkness = flight.fromDarkness + (flight.toDarkness - flight.fromDarkness) * progress;
    if (sky.current) sky.current.opacity = flight.darkness;
    if (stars.current) stars.current.opacity = flight.darkness / SKY_DARKNESS;
    if (skyGroup.current) skyGroup.current.visible = flight.darkness > 0.002;

    // A headset measures the clip range in metres. On a flat screen three.js
    // ignores the origin's scale for the view, so the range is in scene units.
    const unit = session ? 1 : view.scale;
    const near = CLIP_RANGE_METERS[0] * unit;
    const far = CLIP_RANGE_METERS[1] * unit;
    if ('near' in viewer && (viewer.near !== near || viewer.far !== far)) {
      viewer.near = near;
      viewer.far = far;
      viewer.updateProjectionMatrix();
    }
  }, -2);

  const focused = focusId ? BODIES.find((b) => b.id === focusId) : undefined;
  // Tapping the body being visited flies home; tapping any other flies there.
  const tap = (id: string) => flyTo(id === focusId ? null : BODIES.find((b) => b.id === id) ?? null);

  // Always within reach, wherever the viewer has flown or turned. Stella and leaving only make sense in a headset.
  const buttons: Array<'home' | 'stella' | 'leave'> = [];
  if (focused) buttons.push('home');
  if (session && stella !== 'unavailable') buttons.push('stella');
  if (session) buttons.push('leave');
  const pressButton = { home: () => void flyTo(null), stella: onStellaTap, leave: onLeave };
  const buttonText = { home: 'Fly home', stella: STELLA_TEXT[stella], leave: 'Leave' };

  // The voice guide flies the viewer with the same moves as a tap.
  useEffect(() => {
    controlsRef.current = {
      flyTo: (id) => flyTo(id ? BODIES.find((b) => b.id === id) ?? null : null),
      focusId: () => focusId,
    };
    return () => { controlsRef.current = null; };
  });

  return (
    <GraphicsQualityContext.Provider value={HEADSET_QUALITY}>
      <XROrigin ref={origin} scale={UNITS_PER_METER}>
        {/* Fixed to the room, so the stars hold still while the planets fly past. */}
        <group ref={skyGroup} visible={false}>
          <mesh renderOrder={-10} raycast={ignoreRaycast}>
            <sphereGeometry args={[SKY_RADIUS_METERS, 24, 16]} />
            <meshBasicMaterial ref={sky} color="#02030a" side={BackSide} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </mesh>
          <points renderOrder={-9} geometry={STAR_GEOMETRY} raycast={ignoreRaycast}>
            <pointsMaterial ref={stars} color="#dfe6ff" size={2} sizeAttenuation={false} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </points>
        </group>
        {buttons.map((button, index) => (
          <BarButton
            key={button}
            text={buttonText[button]}
            onClick={pressButton[button]}
            place={(panel) => {
              const flight = flightRef.current;
              panel.visible = flight.placed;
              panel.position.copy(flight.bar).addScaledVector(flight.barRight, (index - (buttons.length - 1) / 2) * BAR.spacing);
            }}
          />
        ))}
      </XROrigin>
      <group ref={system} visible={false}>
        {/* Brighter than the flat-screen app: in a lit room an unlit night side reads as a black hole. */}
        <ambientLight intensity={0.7} />
        <pointLight position={[0, 0, 0]} intensity={1.0} color="#fff8ee" decay={0} />
        <SunGlow />
        <SunMesh showLabel={false} paused={reducedMotion} />
        {planets.map((planet) => (
          <PlanetOrbit key={planet.id} planet={planet} paused={reducedMotion} showLabel={false} />
        ))}
        {BODIES.map((body) => (
          <TapTarget key={body.id} body={body} onTap={() => tap(body.id)} onHover={(over) => setHoveredId((current) => (over ? body.id : current === body.id ? null : current))} />
        ))}
        {/* The name grows when pointed at, so it is clear what a tap will choose. */}
        {BODIES.map((body) => <BodyLabel key={body.id} body={body} large={body.id === focusId || body.id === hoveredId} />)}
        <AimDot />
      </group>
    </GraphicsQualityContext.Provider>
  );
}
