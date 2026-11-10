import {zColor} from '@remotion/zod-types';
import {z} from 'zod';

export const propertyVideoSchema = z.object({
  variant: z.enum(['premium', 'dynamic']),
  brand: z.string(),
  title: z.string(),
  purpose: z.string(),
  price: z.string(),
  code: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  creci: z.string(),
  whatsapp: z.string(),
  whatsappUrl: z.string(),
  propertyUrl: z.string(),
  accentColor: zColor(),
  heroPhoto: z.string(),
  collagePhotoA: z.string(),
  collagePhotoB: z.string(),
  collagePhotoC: z.string(),
  sequencePhotos: z.array(z.string()).length(6),
  sequenceLabels: z.array(z.string()).length(6),
  music: z.string(),
});

export type PropertyVideoProps = z.infer<typeof propertyVideoSchema>;
