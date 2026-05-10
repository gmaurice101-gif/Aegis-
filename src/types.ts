export interface Person {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
  descriptor?: number[]; // Face descriptor vector
  lastSeen?: string;
  status: 'VIP' | 'Staff' | 'Citizen' | 'Unknown';
}

export interface RecognitionEvent {
  id: string;
  personId?: string;
  timestamp: string;
  confidence: number;
  location: string;
  imageUrl?: string;
}

export interface AppState {
  isScanning: boolean;
  activeDetections: number;
  recognitionLog: RecognitionEvent[];
  identifiedPeople: Person[];
}
