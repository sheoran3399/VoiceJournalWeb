class SpeechRecognizer {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) throw new Error('Speech recognition not supported. Use Chrome or Edge.');

    this.recognition = new SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = navigator.language;
    this.offlineCapable = 'processLocally' in this.recognition;

    this.transcript = '';
    this.isRecording = false;
    this.onTranscriptChange = null;
    this.onTranscriptFinalized = null;

    this._finalText = '';
    this._noSpeechCount = 0;

    this.recognition.onresult = (event) => {
      this._noSpeechCount = 0;
      this._finalText = '';
      let interim = '';
      for (const result of event.results) {
        if (result.isFinal) this._finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      this.transcript = this._finalText + interim;
      this.onTranscriptChange?.(this.transcript);
    };

    // Chrome stops after silence — restart the recognizer if the user hasn't pressed stop
    this.recognition.onend = () => {
      if (this.isRecording) {
        this.recognition.start();
        return;
      }
      if (this.transcript) {
        this.onTranscriptFinalized?.(this.transcript);
      } else {
        this.onStop?.();
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        this._noSpeechCount++;
        if (this._noSpeechCount >= 2) {
          this.onNoSpeech?.();
        }
      } else {
        this.isRecording = false;
        this.onError?.(event.error);
      }
    };
  }

  start() {
    this.transcript = '';
    this._finalText = '';
    this.isRecording = true;
    if (this.offlineCapable) {
      this.recognition.processLocally = !navigator.onLine;
    }
    this.recognition.start();
  }

  stop() {
    this.isRecording = false;
    this.recognition.stop();
  }
}
