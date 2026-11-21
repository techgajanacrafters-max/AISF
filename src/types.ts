import type { Timestamp } from "firebase/firestore";

export type StudentStatus = "pending" | "approved" | "rejected";

export interface StudentProfile {
  uid: string;
  name: string;
  email: string;
  mobile: string;
  aadhaarLast4: string;
  address: string;
  role: "student";
  status: StudentStatus;
  createdAt: Timestamp | null;
}

export interface UploadedMedia {
  id: string;
  uid: string;
  studentName: string;
  fileName: string;
  fileType: string;
  downloadUrl: string;
  storagePath: string;
  uploadedAt: Timestamp | null;
}
