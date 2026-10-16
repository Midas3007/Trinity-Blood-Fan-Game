/** One line of dialogue (pure type; used by the dialogue box and cutscene data). */
export interface DialogueLine {
  speaker: string;
  text: string;
  /** A recorded reading of this line: public/assets/audio/voice/<voice>.mp3 (optional). */
  voice?: string;
}
