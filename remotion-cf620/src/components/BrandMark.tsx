import React from 'react';
import {Img, staticFile} from 'remotion';

export const BrandMark: React.FC<{readonly width?: number}> = ({width = 420}) => (
  <Img name="Marca Escritório Campos Figueira" src={staticFile('brand/campos-figueira-gold-alpha.png')} style={{width, height: 'auto', objectFit: 'contain'}} />
);
