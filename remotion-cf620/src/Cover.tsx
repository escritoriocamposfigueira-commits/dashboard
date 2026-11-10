import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {fontFamily} from './fonts';
import type {PropertyVideoProps} from './property-schema';
import {BrandMark} from './components/BrandMark';
import {PhotoMotion} from './components/PhotoMotion';

export const Cover: React.FC<PropertyVideoProps> = (props) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: '#050505'}}>
      <PhotoMotion src={props.heroPhoto} movement={0} emphasis={1.02} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 36%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.94) 100%)'}} />
      <div style={{position: 'absolute', top: 88, left: 72}}><BrandMark width={420} /></div>
      <div style={{position: 'absolute', top: 102, right: 72, fontFamily, color: '#fff', fontSize: 27, fontWeight: 800, letterSpacing: 4}}>LOCAÇÃO • {props.code}</div>
      <div style={{position: 'absolute', left: 72, right: 72, bottom: 115, fontFamily, color: '#fff', opacity: interpolate(frame, [0, 1], [1, 1])}}>
        <div style={{width: 92, height: 5, backgroundColor: props.accentColor, marginBottom: 27}} />
        <div style={{fontSize: 84, fontWeight: 800, lineHeight: 0.98, letterSpacing: -2}}>SOBRADO EM<br />CONDOMÍNIO</div>
        <div style={{fontSize: 62, fontWeight: 800, color: props.accentColor, marginTop: 28}}>{props.price}</div>
        <div style={{fontSize: 31, fontWeight: 600, marginTop: 20}}>{props.neighborhood} • {props.city}</div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 65, fontSize: 23, color: 'rgba(255,255,255,0.78)', letterSpacing: 1.4}}>
          <span>AGENDE SUA VISITA</span><span>CRECI-PJ {props.creci}</span>
        </div>
      </div>
    </div>
  );
};
