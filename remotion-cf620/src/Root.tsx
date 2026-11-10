import React from 'react';
import {Composition, Still} from 'remotion';
import {Cover} from './Cover';
import {propertyVideoSchema, type PropertyVideoProps} from './property-schema';
import {RealEstateVideo} from './RealEstateVideo';

const baseProps: PropertyVideoProps = {
  variant: 'premium',
  brand: 'Escritório Campos Figueira',
  title: 'Sobrado em condomínio',
  purpose: 'Locação',
  price: 'R$ 2.600/mês',
  code: 'CF-620',
  neighborhood: 'Mogi Moderno',
  city: 'Mogi das Cruzes/SP',
  creci: '043649-J',
  whatsapp: '(11) 2378-5643',
  whatsappUrl: 'https://wa.me/551123785643?text=Tenho%20interesse%20no%20im%C3%B3vel%20CF-620',
  propertyUrl: 'https://www.escritoriocamposfigueira.com.br/imovel/CF%20-%20620',
  accentColor: '#D9AA4A',
  heroPhoto: 'properties/CF-620/29.jpg',
  collagePhotoA: 'properties/CF-620/01.jpg',
  collagePhotoB: 'properties/CF-620/05.jpg',
  collagePhotoC: 'properties/CF-620/13.jpg',
  sequencePhotos: [
    'properties/CF-620/31.jpg',
    'properties/CF-620/06.jpg',
    'properties/CF-620/10.jpg',
    'properties/CF-620/07.jpg',
    'properties/CF-620/28.jpg',
    'properties/CF-620/30.jpg',
  ],
  sequenceLabels: [
    'CONDOMÍNIO FECHADO',
    'SALA INTEGRADA',
    'COZINHA PRÁTICA',
    '03 DORMITÓRIOS • 01 SUÍTE',
    'SALÃO DE FESTAS',
    'PISCINAS ADULTO E INFANTIL',
  ],
  music: 'audio/premium.mp3',
};

const dynamicProps: PropertyVideoProps = {
  ...baseProps,
  variant: 'dynamic',
  music: 'audio/dynamic.mp3',
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="CF620-Premium-A"
      component={RealEstateVideo}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
      schema={propertyVideoSchema}
      defaultProps={baseProps}
    />
    <Composition
      id="CF620-Dynamic-B"
      component={RealEstateVideo}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
      schema={propertyVideoSchema}
      defaultProps={dynamicProps}
    />
    <Still
      id="CF620-Cover"
      component={Cover}
      width={1080}
      height={1920}
      schema={propertyVideoSchema}
      defaultProps={baseProps}
    />
  </>
);
