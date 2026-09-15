export async function getDestinationAIConfig() { return { ai_destination_assistant_enabled: false, ai_destination_model: '', ai_destination_max_output_tokens: 0 }; }
export async function askDestinationAI() { throw new Error('Disponible únicamente en la aplicación móvil.'); }
export function initializeFirebaseAppCheck() {}
