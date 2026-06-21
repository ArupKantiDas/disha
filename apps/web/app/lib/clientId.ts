export function getClientId(): string {
  if (typeof window === "undefined") return "";
  const key = "disha_client_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
