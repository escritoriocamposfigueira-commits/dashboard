import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily} from '../fonts';
import type {PropertyVideoProps} from '../property-schema';
import {BrandMark} from './BrandMark';
import {PhotoMotion} from './PhotoMotion';

type Props = Pick<PropertyVideoProps, 'heroPhoto' | 'price' | 'code' | 'neighborhood' | 'city' | 'creci' | 'whatsapp' | 'accentColor'> & {readonly dynamic: boolean};

export const ClosingScene: React.FC<Props> = ({heroPhoto, price, code, neighborhood, city, creci, whatsapp, accentColor, dynamic}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: '#050505'}}>
      <PhotoMotion src={heroPhoto} movement={5} emphasis={1.02} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.28) 35%, rgba(0,0,0,0.92) 78%, #050505 100%)'}} />
      <div style={{position: 'absolute', top: 85, left: 72}}><BrandMark width={390} /></div>
      <div style={{position: 'absolute', left: 72, right: 72, bottom: 120, fontFamily, color: 'white',
        opacity: interpolate(frame, [4, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        translate: interpolate(frame, [4, 22], ['0px 40px', '0px 0px'], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)})}}>
        <div style={{fontSize: 34, letterSpacing: 5, fontWeight: 700, color: accentColor}}>LOCAÇÃO • {code}</div>
        <div style={{fontSize: dynamic ? 82 : 76, fontWeight: 800, lineHeight: 1.02, marginTop: 18}}>{price}</div>
        <div style={{fontSize: 34, marginTop: 14, fontWeight: 500}}>{neighborhood} • {city}</div>
        <div style={{marginTop: 42, display: 'inline-flex', padding: '24px 38px', backgroundColor: accentColor, color: '#090909', fontSize: 41, lineHeight: 1, fontWeight: 800, letterSpacing: 1.5, borderRadius: 4}}>AGENDE SUA VISITA</div>
        <div style={{fontSize: 31, fontWeight: 600, marginTop: 28}}>WhatsApp {whatsapp}</div>
        <div style={{marginTop: 54, display: 'flex', justifyContent: 'space-between', fontSize: 24, color: 'rgba(255,255,255,0.78)', letterSpacing: 1.4}}><span>escritoriocamposfigueira.com.br</span><span>CRECI-PJ {creci}</span></div>
      </div>
    </div>
  );
};
