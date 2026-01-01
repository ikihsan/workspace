// Simple IPFS upload using fetch to a public pinning service
// For production, you should use your own IPFS node or a service like Pinata, nft.storage, etc.

// Upload file to IPFS via public gateway or Pinata
export async function uploadToIPFS(
  file: globalThis.File,
  onProgress?: (progress: number) => void
): Promise<{ cid: string; url: string }> {
  const token = process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN;
  
  if (!token) {
    throw new Error('Storage API token is not configured. Please add NEXT_PUBLIC_WEB3_STORAGE_TOKEN to your environment variables.');
  }

  // Using Pinata API (recommended for production)
  // Sign up at https://pinata.cloud/ and get your JWT token
  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append('pinataOptions', options);

  if (onProgress) {
    onProgress(10);
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (onProgress) {
      onProgress(80);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const cid = result.IpfsHash;

    // Construct gateway URL
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
    
    if (onProgress) {
      onProgress(100);
    }

    return { cid, url };
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
}

// Get file URL from CID
export function getIPFSUrl(cid: string, fileName?: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

// Alternative gateways for fallback
export function getAlternativeUrls(cid: string, fileName?: string): string[] {
  return [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
  ];
}

// Check if a CID URL is accessible
export async function checkIPFSAvailability(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
