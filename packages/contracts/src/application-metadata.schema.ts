import { z } from 'zod';

declare const __NESTRA_APPLICATION_VERSION__: string;

export const APPLICATION_NAME = 'Nestra' as const;
export const applicationVersion: string = __NESTRA_APPLICATION_VERSION__;

export const applicationMetadataSchema = z.strictObject({
  name: z.literal(APPLICATION_NAME),
  version: z.string().min(1),
});

export type ApplicationMetadata = z.infer<typeof applicationMetadataSchema>;

export const applicationMetadata: ApplicationMetadata = applicationMetadataSchema.parse({
  name: APPLICATION_NAME,
  version: applicationVersion,
});
