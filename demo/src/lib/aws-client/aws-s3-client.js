// This class will handle interactions with our S3 pre-signed URL Lambdas.
export class S3Client {
    constructor(config, auth) {
        this.apiUrl = config.apiUrl;
        this.auth = auth;
    }

    /**
     * Gets a pre-signed URL for uploading a file.
     * @param {object} options - The file options.
     * @param {string} options.fileName - The name of the file.
     * @param {string} options.fileType - The MIME type of the file.
     * @returns {Promise<{uploadUrl: string, key: string, publicUrl: string}>}
     */
    async getUploadUrl({ fileName, fileType }) {
        const idToken = await this.auth.getIdToken(); // Assumes getIdToken is implemented to retrieve the token

        const response = await fetch(`${this.apiUrl}/api/v1/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ fileName, fileType }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to get upload URL');
        }

        return response.json();
    }

    /**
     * Gets a pre-signed URL for downloading a private file.
     * @param {string} key - The S3 key of the file to download.
     * @returns {Promise<{downloadUrl: string}>}
     */
    async getDownloadUrl(key) {
        const idToken = await this.auth.getIdToken();
        
        const url = new URL(`${this.apiUrl}/api/v1/download-url`);
        url.searchParams.append('key', key);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${idToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to get download URL');
        }

        return response.json();
    }
}
