import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

export interface InvoiceData {
  date:       string | null;  // format AAAA-MM-JJ
  amount:     number | null;
  garageName: string | null;
  notes:      string | null;
}

// Demande la permission d'accès à la galerie
export async function requestMediaPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

// Demande la permission d'accès à la caméra
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

// Ouvre la galerie et retourne l'image en base64
export async function pickInvoiceFromGallery(): Promise<string | null> {
  const granted = await requestMediaPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality:    0.8,
    base64:     true,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].base64 ?? null;
}

// Ouvre la caméra et retourne l'image en base64
export async function takeInvoicePhoto(): Promise<string | null> {
  const granted = await requestCameraPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    quality:  0.8,
    base64:   true,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].base64 ?? null;
}

// Ouvre file pour pdf
export async function pickInvoiceDocument(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return base64;
}

// Envoie l'image à Claude Vision et extrait les données de la facture
export async function extractInvoiceData(base64Image: string): Promise<InvoiceData | null> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type:   'image',
                source: {
                  type:       'base64',
                  media_type: 'image/jpeg',
                  data:       base64Image,
                },
              },
              {
                type: 'text',
                text: `Analyse cette facture de garage/entretien automobile et extrais les informations suivantes.
Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après, sans backticks.

Format attendu :
{
  "date": "AAAA-MM-JJ ou null si non trouvée",
  "amount": 123.45 ou null si non trouvé,
  "garageName": "Nom du garage ou null si non trouvé",
  "notes": "Description courte de l'intervention ou null"
}

Règles :
- La date doit être au format AAAA-MM-JJ
- Le montant doit être un nombre décimal (ex: 89.90), sans symbole €
- Si plusieurs montants, prends le total TTC
- Le nom du garage est le nom de l'entreprise sur la facture
- Les notes = type d'intervention (ex: "Vidange + filtre huile")
- Si une information est absente ou illisible, mets null`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed  = JSON.parse(cleaned);

    return {
      date:       parsed.date       ?? null,
      amount:     parsed.amount     ?? null,
      garageName: parsed.garageName ?? null,
      notes:      parsed.notes      ?? null,
    };
  } catch (error) {
    console.error('OCR error:', error);
    return null;
  }
}
