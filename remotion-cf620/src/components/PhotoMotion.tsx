import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

type Props = {readonly src: string; readonly movement: number; readonly emphasis?: number};

const positions: ReadonlyArray<readonly [string, string]> = [
  ['35% 50%', '62% 50%'],
  ['68% 48%', '42% 52%'],
  ['50% 38%', '50% 60%'],
  ['42% 55%', '58% 44%'],
  ['58% 48%', '38% 52%'],
  ['48% 58%', '55% 40%'],
];

export const PhotoMotion: React.FC<Props> = ({src, movement, emphasis = 1}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const finalFrame = Math.max(1, durationInFrames - 1);
  const [from, to] = positions[movement % positions.length];
  return (
    <Img
      name="Fotografia real do imóvel"
      src={staticFile(src)}
      style={{
        position: 'absolute', inset: -8, width: 'calc(100% + 16px)', height: 'calc(100% + 16px)', objectFit: 'cover',
        objectPosition: interpolate(frame, [0, finalFrame], [from, to], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.22, 1, 0.36, 1),
        }),
        scale: interpolate(frame, [0, finalFrame], [1.025, 1.085 * emphasis], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.22, 1, 0.36, 1), output: 'perceptual-scale',
        }),
        filter: 'brightness(1.035) contrast(1.075) saturate(1.075)',
      }}
    />
  );
};
