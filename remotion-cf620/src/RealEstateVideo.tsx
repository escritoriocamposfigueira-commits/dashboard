import React from 'react';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {PropertyVideoProps} from './property-schema';
import {ClosingScene} from './components/ClosingScene';
import {FlashCuts} from './components/FlashCuts';
import {OpeningCollage} from './components/OpeningCollage';
import {PhotoScene} from './components/PhotoScene';

const Soundtrack: React.FC<{readonly src: string; readonly dynamic: boolean}> = ({src, dynamic}) => {
  const frame = useCurrentFrame();
  return <Audio name={dynamic ? 'Trilha Reels dinâmico' : 'Trilha cinematográfica'} src={staticFile(src)} volume={interpolate(frame, [0, 18, 540, 599], [0, dynamic ? 0.5 : 0.46, dynamic ? 0.5 : 0.46, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />;
};

export const RealEstateVideo: React.FC<PropertyVideoProps> = (props) => {
  const dynamic = props.variant === 'dynamic';
  const transitionFrames = dynamic ? 6 : 8;
  const openingFrames = dynamic ? 90 : 120;
  const sceneFrames = dynamic ? 70 : 60;
  // The sequence durations plus the transition overlaps must total exactly
  // 600 frames. This keeps the final CTA visible through frame 599.
  const closingFrames = dynamic ? 132 : 176;
  const cutPoints = dynamic ? [84, 148, 212, 276, 340, 404, 468] : [112, 164, 216, 268, 320, 372, 424];
  const photo = (index: number) => <PhotoScene src={props.sequencePhotos[index]} label={props.sequenceLabels[index]} index={index} accentColor={props.accentColor} dynamic={dynamic} />;
  const transitionNode = (index: number) => {
    const timing = linearTiming({durationInFrames: transitionFrames});
    if (!dynamic && index % 2 === 0) return <TransitionSeries.Transition presentation={fade()} timing={timing} />;
    if (!dynamic) return <TransitionSeries.Transition presentation={wipe({direction: index % 4 === 1 ? 'from-left' : 'from-right'})} timing={timing} />;
    if (index % 2 === 0) return <TransitionSeries.Transition presentation={slide({direction: index % 4 === 0 ? 'from-right' : 'from-left'})} timing={timing} />;
    return <TransitionSeries.Transition presentation={wipe({direction: index % 4 === 1 ? 'from-bottom' : 'from-top'})} timing={timing} />;
  };

  return (
    <div style={{position: 'absolute', inset: 0, backgroundColor: '#050505'}}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Abertura em mosaico" durationInFrames={openingFrames}><OpeningCollage {...props} dynamic={dynamic} /></TransitionSeries.Sequence>
        {transitionNode(0)}
        <TransitionSeries.Sequence name="Entrada do condomínio" durationInFrames={sceneFrames}>{photo(0)}</TransitionSeries.Sequence>
        {transitionNode(1)}
        <TransitionSeries.Sequence name="Sala" durationInFrames={sceneFrames}>{photo(1)}</TransitionSeries.Sequence>
        {transitionNode(2)}
        <TransitionSeries.Sequence name="Cozinha" durationInFrames={sceneFrames}>{photo(2)}</TransitionSeries.Sequence>
        {transitionNode(3)}
        <TransitionSeries.Sequence name="Dormitório" durationInFrames={sceneFrames}>{photo(3)}</TransitionSeries.Sequence>
        {transitionNode(4)}
        <TransitionSeries.Sequence name="Salão de festas" durationInFrames={sceneFrames}>{photo(4)}</TransitionSeries.Sequence>
        {transitionNode(5)}
        <TransitionSeries.Sequence name="Piscinas" durationInFrames={sceneFrames}>{photo(5)}</TransitionSeries.Sequence>
        {transitionNode(6)}
        <TransitionSeries.Sequence name="Conversão" durationInFrames={closingFrames}><ClosingScene {...props} dynamic={dynamic} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <FlashCuts cuts={cutPoints} color={props.accentColor} strong={dynamic} />
      <Soundtrack src={props.music} dynamic={dynamic} />
    </div>
  );
};
