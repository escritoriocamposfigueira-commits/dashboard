import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {fontFamily} from '../fonts';
import {PhotoMotion} from './PhotoMotion';

type Props = {readonly src: string; readonly label: string; readonly index: number; readonly accentColor: string; readonly dynamic: boolean};

export const PhotoScene: React.FC<Props> = ({src, label, index, accentColor, dynamic}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: '#060606'}}>
      <PhotoMotion src={src} movement={index + (dynamic ? 2 : 0)} emphasis={dynamic ? 1.06 : 1} />
      {dynamic ? <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.12)', clipPath: `polygon(0 0, ${interpolate(frame, [0, 18], [12, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)})}% 0, ${interpolate(frame, [0, 18], [0, 88], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}% 100%, 0 100%)`}} /> : null}
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 48%, rgba(0,0,0,0.78) 100%)'}} />
      <div style={{position: 'absolute', top: 86, right: 72, fontFamily, color: 'rgba(255,255,255,0.82)', fontSize: 24, letterSpacing: 4, fontWeight: 700}}>CF-620</div>
      <div style={{position: 'absolute', left: 72, right: 72, bottom: 150, fontFamily, color: 'white',
        opacity: interpolate(frame, [5, 18, durationInFrames - 12, durationInFrames - 1], [0, 1, 1, 0.55], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        translate: interpolate(frame, [5, 22], ['0px 36px', '0px 0px'], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)})}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 17}}><div style={{width: 70, height: 4, backgroundColor: accentColor}} /><div style={{fontSize: 26, letterSpacing: 5, fontWeight: 700}}>0{index + 1}</div></div>
        <div style={{fontSize: dynamic ? 72 : 64, lineHeight: 1.04, fontWeight: 800, letterSpacing: -1.5}}>{label}</div>
      </div>
    </div>
  );
};
