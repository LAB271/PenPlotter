import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { Placement, Point, Polyline } from '../plot/types';

interface CanvasArt {
  id: string;
  polylines: Polyline[];
  placement: Placement;
  /** Local artwork size (mm) — used for an invisible drag hit-area. */
  w: number;
  h: number;
}

interface Props {
  width: number;
  height: number;
  bedW: number;
  bedH: number;
  paperW: number;
  paperH: number;
  artworks: CanvasArt[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPlacement: (id: string, p: Placement) => void;
  penPos: Point | null;
  /** When true (e.g. a plot is running), artwork can't be dragged/transformed. */
  locked?: boolean;
}

export function PlotCanvas(props: Props) {
  const {
    width,
    height,
    bedW,
    bedH,
    paperW,
    paperH,
    artworks,
    selectedId,
    penPos,
    onSelect,
    onPlacement,
    locked = false,
  } = props;
  const margin = 64; // px clearance around the bed so transform handles stay reachable
  const pxPerMm = Math.max(
    0.01,
    Math.min((width - 2 * margin) / bedW, (height - 2 * margin) / bedH),
  );
  const markerR = 7 / pxPerMm;

  const nodeRefs = useRef(new Map<string, Konva.Group>());
  const trRef = useRef<Konva.Transformer>(null);

  const registerNode = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedId ? nodeRefs.current.get(selectedId) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, artworks, locked]);

  // Memoize the artwork nodes so the high-frequency pen-position / connection
  // re-renders produce the SAME element references — react-konva then leaves the
  // (potentially thousands of) line nodes in place instead of reconciling them.
  // Rendered directly in the tree (not behind a memoized component boundary,
  // which could drop the nodes on a Stage re-render — that's the bug where the
  // artwork vanished on Disconnect).
  const artNodes = useMemo(
    () =>
      artworks.map((a) => (
        <Group
          key={a.id}
          ref={(node) => registerNode(a.id, node)}
          x={a.placement.x}
          y={a.placement.y}
          scaleX={a.placement.scale}
          scaleY={a.placement.scale}
          rotation={a.placement.rotation}
          draggable={!locked}
          onClick={() => onSelect(a.id)}
          onTap={() => onSelect(a.id)}
          onDragEnd={(e) => onPlacement(a.id, { ...a.placement, x: e.target.x(), y: e.target.y() })}
          onTransformEnd={(e) => {
            const n = e.target as Konva.Group;
            onPlacement(a.id, { x: n.x(), y: n.y(), scale: n.scaleX(), rotation: n.rotation() });
          }}
        >
          {/* Invisible hit-area so the whole bounding box is draggable. */}
          <Rect x={0} y={0} width={a.w} height={a.h} fill="transparent" />
          {a.polylines.map((pl, i) => (
            <Line
              key={i}
              points={pl.flatMap((p) => [p.x, p.y])}
              stroke={a.id === selectedId ? '#1d4ed8' : '#475569'}
              strokeWidth={1.4}
              strokeScaleEnabled={false}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Group>
      )),
    [artworks, selectedId, onSelect, onPlacement, registerNode, locked],
  );

  return (
    <Stage
      width={width}
      height={height}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage()) onSelect(null);
      }}
    >
      {/* Static layer: bed, paper, artwork, transform handles. */}
      <Layer>
        <Group x={margin} y={margin} scaleX={pxPerMm} scaleY={pxPerMm}>
          <Rect
            x={0}
            y={0}
            width={bedW}
            height={bedH}
            fill="#f1f5f9"
            stroke="#cbd5e1"
            strokeWidth={1}
            strokeScaleEnabled={false}
          />
          <Rect
            x={0}
            y={0}
            width={paperW}
            height={paperH}
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth={1}
            strokeScaleEnabled={false}
            shadowColor="#000"
            shadowOpacity={0.12}
            shadowBlur={6}
          />
          {/* Subtle paper-size label, centered on the paper (behind the artwork). */}
          <Text
            x={0}
            y={paperH / 2 - Math.min(paperW, paperH) * 0.03}
            width={paperW}
            align="center"
            text={`${Math.round(paperW)} × ${Math.round(paperH)} mm`}
            fontSize={Math.min(paperW, paperH) * 0.06}
            fill="#cbd5e1"
            listening={false}
          />
          {artNodes}
        </Group>
        {selectedId && !locked && (
          <Transformer ref={trRef} rotateEnabled keepRatio flipEnabled={false} />
        )}
      </Layer>

      {/* Marker layer: only this redraws as the pen moves (live). */}
      <Layer listening={false}>
        <Group x={margin} y={margin} scaleX={pxPerMm} scaleY={pxPerMm}>
          {penPos && (
            <Circle
              x={penPos.x}
              y={penPos.y}
              radius={markerR}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={1}
              strokeScaleEnabled={false}
            />
          )}
        </Group>
      </Layer>
    </Stage>
  );
}
