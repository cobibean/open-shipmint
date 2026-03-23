const PINATA_JWT = process.env.PINATA_JWT!;

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

export interface PinataUploadResult {
  cid: string;
  ipfsUrl: string;
  gatewayUrl: string;
}

export async function uploadImageToPinata(
  imageBuffer: Buffer,
  fileName: string
): Promise<PinataUploadResult> {
  const formData = new FormData();
  // Convert Buffer to Uint8Array for proper Blob compatibility
  const uint8Array = new Uint8Array(imageBuffer);
  const blob = new Blob([uint8Array], { type: 'image/png' });
  formData.append('file', blob, fileName);

  const metadata = JSON.stringify({
    name: fileName,
    keyvalues: {
      app: 'shipmint',
      type: 'generation',
    },
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append('pinataOptions', options);

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }

  const data = await response.json();

  return {
    cid: data.IpfsHash,
    ipfsUrl: `ipfs://${data.IpfsHash}`,
    gatewayUrl: `${PINATA_GATEWAY}/${data.IpfsHash}`,
  };
}

export async function uploadJsonToPinata(
  json: object,
  name: string
): Promise<PinataUploadResult> {
  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: {
        name,
        keyvalues: {
          app: 'shipmint',
          type: 'metadata',
        },
      },
      pinataOptions: {
        cidVersion: 1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata JSON upload failed: ${error}`);
  }

  const data = await response.json();

  return {
    cid: data.IpfsHash,
    ipfsUrl: `ipfs://${data.IpfsHash}`,
    gatewayUrl: `${PINATA_GATEWAY}/${data.IpfsHash}`,
  };
}
