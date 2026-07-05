const InsightsExportService = {
  async syncToGoogleDrive(entries, accessToken) {
    return DriveFileService.upsertJSON('voicejournal-insights-entries.json', entries, accessToken);
  },
};
