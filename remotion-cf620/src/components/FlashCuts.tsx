import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

export const FlashCuts: React.FC<{readonly cuts: readonly number[]; readonly color: string; readonly strong: boolean}> = ({cuts, color, strong}) => {
  const frame = useCurrentFrame();
  const opacity = Math.max(0, ...cuts.map((cut) => interpolate(frame, [cut - 3, cut, cut + 5], [0, strong ? 0.52 : 0.3, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity, background: `radial-gradient(circle at 70% 35%, white 0%, ${color} 34%, transparent 72%)`, mixBlendMode: 'screen'}} />;
};
