import { Timestamp } from "firebase/firestore";

export interface Division {
  id: string;
  en: string;
  si: string;
  color: string;
  text: string;
  max: number;
  border?: string;
}

export interface VisitorEntry {
  id?: string;
  fullName: string;
  identificationType: string;
  identificationNumber: string;
  address: string;
  divisionId: string;
  checkInTime: Timestamp;
  status: 'IN' | 'OUT';
  checkOutTime?: Timestamp;
  taskStatus?: 'Completed' | 'Incomplete';
  divisionEnglishName?: string;
  divisionSinhalaName?: string;
  divisionBackgroundColorHex?: string;
  divisionTextColorHex?: string;
  duration?: string;
}
