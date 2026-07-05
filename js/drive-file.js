// Shared helper for upserting a single named JSON file on Google Drive —
// used by both the CBT and Insights tabs to back up their local entries.
const DriveFileService = {
  async upsertJSON(fileName, data, accessToken) {
    if (!accessToken) {
      throw new Error('Not signed in. Please sign in first.');
    }
    const fileContent = JSON.stringify(data, null, 2);
    const existingFileId = await this._findFileByName(fileName, accessToken);
    if (existingFileId) {
      return this._updateFile(existingFileId, fileContent, 'application/json', accessToken);
    }
    return this._createFile(fileName, fileContent, 'application/json', accessToken);
  },

  async _findFileByName(fileName, accessToken) {
    try {
      const query = encodeURIComponent(`name = "${fileName}" and trashed = false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&pageSize=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        console.warn('[Drive] Failed to search for file:', res.status);
        return null;
      }
      const json = await res.json();
      if (json.files && json.files.length > 0) {
        return json.files[0].id;
      }
      return null;
    } catch (e) {
      console.error('[Drive] Error searching for file:', e);
      return null;
    }
  },

  async _createFile(fileName, fileContent, mimeType, accessToken) {
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = { name: fileName, mimeType: 'application/json' };
    const multipartBody = `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: ${mimeType}\r\n\r\n${fileContent}${closeDelimiter}`;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: multipartBody,
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(`Failed to create file on Google Drive (${res.status}). ${errorBody?.error?.message ?? ''}`);
    }
    const json = await res.json();
    return json.id;
  },

  async _updateFile(fileId, fileContent, mimeType, accessToken) {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType,
      },
      body: fileContent,
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(`Failed to update file on Google Drive (${res.status}). ${errorBody?.error?.message ?? ''}`);
    }
    const json = await res.json();
    return json.id;
  },
};
