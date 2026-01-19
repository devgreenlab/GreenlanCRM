import { getAuth } from "firebase/auth";
import { initializeFirebase } from ".";

export function getClientAuth() {
  return getAuth(initializeFirebase().firebaseApp);
}
