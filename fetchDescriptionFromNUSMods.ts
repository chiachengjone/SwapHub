/* ------------- NEW helper: fetchDescriptionFromNUSMods.ts ------------- */
export async function fetchDescriptionFromNUSMods(modCode: string) {
    /* Clean the code (e.g. “bt2102 ” -> “BT2102”) */
    const trimmed = modCode.trim().toUpperCase();
    if (!trimmed) throw new Error('Module code is empty');
  
    const url = `https://api.nusmods.com/v2/2024-2025/modules/${trimmed}.json`;
  
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Module ${trimmed} not found`);
    }
  
    const data = await res.json();
    /* The API returns “description” (string | null). */
    return data.description ?? 'No description provided by NUSMods.';
  }
  