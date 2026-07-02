const CBTExportService = {
  async exportToGoogleDrive(entries, accessToken) {
    if (!accessToken) {
      throw new Error('Not signed in. Please sign in first.');
    }

    const fileName = 'voicejournal-cbt-entries.json';
    const mimeType = 'application/json';
    const fileContent = JSON.stringify(entries, null, 2);

    // Check if file already exists by searching for it
    const existingFileId = await this._findFileByName(fileName, accessToken);

    if (existingFileId) {
      // Update existing file
      return this._updateFile(existingFileId, fileContent, mimeType, accessToken);
    } else {
      // Create new file
      return this._createFile(fileName, fileContent, mimeType, accessToken);
    }
  },

  async _findFileByName(fileName, accessToken) {
    try {
      const query = encodeURIComponent(`name = "${fileName}" and trashed = false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&pageSize=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        console.warn('[CBT Export] Failed to search for file:', res.status);
        return null;
      }

      const json = await res.json();
      if (json.files && json.files.length > 0) {
        return json.files[0].id;
      }
      return null;
    } catch (e) {
      console.error('[CBT Export] Error searching for file:', e);
      return null;
    }
  },

  async _createFile(fileName, fileContent, mimeType, accessToken) {
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
    };

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
