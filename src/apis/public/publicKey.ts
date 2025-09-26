/**
 * Kick.com Public Key API
 * https://docs.kick.com/apis/public-key
 */

export interface PublicKeyResponse {
  data: {
    public_key: string;
  };
  message: string;
}

/**
 * Retrieve the public key used for verifying signatures
 * @returns Promise resolving to public key data
 */
export const getPublicKey = async (): Promise<PublicKeyResponse> => {
  const response = await fetch('https://api.kick.com/public/v1/public-key', {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Get public key failed: ${response.status}`);
  }

  return await response.json() as PublicKeyResponse;
};