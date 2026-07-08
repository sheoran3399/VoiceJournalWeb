const ManifestationExportService = {
  async exportToGoogleDrive(entries, accessToken) {
    return DriveFileService.upsertJSON('voicejournal-manifestation-entries.json', entries, accessToken);
  },
};
