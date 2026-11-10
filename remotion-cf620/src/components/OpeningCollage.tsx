import React from 'react';
import {Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {fontFamily} from '../fonts';
import type {PropertyVideoProps} from '../property-schema';
import {BrandMark} from './BrandMark';
import {PhotoMotion} from './PhotoMotion';

type Props = Pick<PropertyVideoProps, 'heroPhoto' | 'collagePhotoA' | 'collagePhotoB' | 'collagePhotoC' | 'price' | 'neighborhood' | 'city' | 'accentColor'> & {readonly dynamic: boolean};

const Card: React.FC<{readonly src: string; readonly from: number; readonly style: React.CSSProperties; readonly label: string}> = ({src, from, style, label}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{position: 'absolute', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.92)', boxShadow: '0 24px 60px rgba(0,0,0,0.42)', borderRadius: 5,
      opacity: interpolate(frame, [from, from + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      scale: spring({frame: frame - from, fps, config: {damping: 20, stiffness: 120}}), ...style}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <div style={{position: 'absolute', left: 18, bottom: 15, fontFamily, fontWeight: 700, color: 'white', fontSize: 24, textShadow: '0 2px 12px rgba(0,0,0,0.9)', letterSpacing: 1.2}}>{label}</div>
    </div>
  );
};

export const OpeningCollage: React.FC<Props> = ({heroPhoto, collagePhotoA, collagePhotoB, collagePhotoC, price, neighborhood, city, accentColor, dynamic}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: '#090909'}}>
      <PhotoMotion src={heroPhoto} movement={0} emphasis={dynamic ? 1.08 : 1} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(4,4,4,0.82) 0%, rgba(4,4,4,0.17) 42%, rgba(4,4,4,0.12) 63%, rgba(4,4,4,0.86) 100%)'}} />
      <div style={{position: 'absolute', left: 72, right: 72, top: 80, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <BrandMark width={370} />
        <div style={{fontFamily, fontSize: 28, color: '#fff', letterSpacing: 4, fontWeight: 700, paddingTop: 18}}>LOCAÇÃO</div>
      </div>
      <div style={{position: 'absolute', left: 72, right: 72, top: 310, fontFamily, color: 'white',
        opacity: interpolate(frame, [5, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        translate: interpolate(frame, [5, 24], ['0px 34px', '0px 0px'], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)})}}>
        <div style={{fontSize: 42, letterSpacing: 6, fontWeight: 600, marginBottom: 16}}>SOBRADO EM CONDOMÍNIO</div>
        <div style={{fontSize: 86, lineHeight: 0.98, fontWeight: 800, letterSpacing: -3}}>POR {price}?</div>
        <div style={{marginTop: 22, display: 'flex', alignItems: 'center', gap: 16, fontSize: 35, fontWeight: 500}}>
          <span style={{width: 52, height: 3, backgroundColor: accentColor, display: 'inline-block'}} />{neighborhood} • {city}
        </div>
      </div>
      <Card src={collagePhotoA} from={18} label="GARAGEM" style={{left: 620, top: 760, width: 370, height: 410}} />
      <Card src={collagePhotoB} from={28} label="SALA" style={{left: 72, top: 1210, width: 450, height: 300}} />
      <Card src={collagePhotoC} from={38} label="ÁREA GOURMET" style={{left: 560, top: 1250, width: 430, height: 300}} />
      <div style={{position: 'absolute', left: 72, bottom: 92, height: 4, width: interpolate(frame, [42, 80], [0, 300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), backgroundColor: accentColor}} />
    </div>
  );
};
