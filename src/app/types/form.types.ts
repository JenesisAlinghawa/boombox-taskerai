// types/form.types.ts
export interface NewClientForm {
  name: string;
  info: string;
  logo: File | null;
  logoUrl: string;
  industry: string;
  links: string;
  niche: string;
  businessAge: string;
  description: string;
  coreProducts: string;
  idealCustomer: string;
  brandEmotion: string;
  uniqueSelling: string;
  mainGoal: string;
  competitors: string;
  inspo: string;
  brandColors: string;
  brandColorsFile: File | null;
  brandColorsFileUrl: string;
  brandGuideFile: File | null;
  brandGuideFileUrl: string;
  fontUsed: string;
}

export type FileUploadField = keyof Pick<NewClientForm, 'logo' | 'brandGuideFile' | 'brandColorsFile'>;
