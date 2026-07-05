const CBTExportService = {
  async exportToGoogleDrive(entries, accessToken) {
    return DriveFileService.upsertJSON('voicejournal-cbt-entries.json', entries, accessToken);
  },
};
