import {
  ref,
  uploadBytesResumable,
  type UploadTask,
} from "firebase/storage";
import { firebaseStorageEnabled, storage } from "./firebase";

export class StorageUnavailableError extends Error {
  constructor() {
    super("Firebase Storage is not available.");
    this.name = "StorageUnavailableError";
  }
}

export function uploadStudentMedia(path: string, file: File): UploadTask {
  if (!firebaseStorageEnabled || !storage) {
    throw new StorageUnavailableError();
  }

  return uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
}
