import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RegistrationDraft {
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  password: string;
  role: string;
  photoUri: string;
}

function storageKey(draftId: string) {
  return `bantaybayan_registration_draft_${draftId}`;
}

export async function saveRegistrationDraft(draft: RegistrationDraft) {
  const draftId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(storageKey(draftId), JSON.stringify(draft));
  return draftId;
}

export async function loadRegistrationDraft(draftId: string) {
  const storedDraft = await AsyncStorage.getItem(storageKey(draftId));
  if (!storedDraft) return null;

  const draft: unknown = JSON.parse(storedDraft);
  if (
    typeof draft !== "object" ||
    draft === null ||
    !("firstName" in draft) ||
    typeof draft.firstName !== "string" ||
    !("lastName" in draft) ||
    typeof draft.lastName !== "string" ||
    !("contactNumber" in draft) ||
    typeof draft.contactNumber !== "string" ||
    !("email" in draft) ||
    typeof draft.email !== "string" ||
    !("password" in draft) ||
    typeof draft.password !== "string" ||
    !("role" in draft) ||
    typeof draft.role !== "string" ||
    !("photoUri" in draft) ||
    typeof draft.photoUri !== "string"
  ) {
    throw new Error("Saved signup details are incomplete. Please start again.");
  }

  return draft as RegistrationDraft;
}

export async function removeRegistrationDraft(draftId: string) {
  await AsyncStorage.removeItem(storageKey(draftId));
}
