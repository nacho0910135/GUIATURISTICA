export type DestinationAIMessage = { role: 'user' | 'assistant'; text: string };
export async function getDestinationAIConfig() { return { ai_destination_assistant_enabled: false, ai_destination_model: '', ai_destination_max_output_tokens: 350 }; }
export async function askDestinationAI() { throw new Error('Disponible únicamente en la aplicación móvil.'); }
export async function initializeFirebaseAppCheck() {}
export async function translateDescriptionToEnglish(): Promise<string> { throw new Error('La traducción está disponible únicamente en la aplicación móvil.'); }
