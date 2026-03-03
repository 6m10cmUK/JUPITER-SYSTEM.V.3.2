import { GuessResult } from '../services/WordleService';

export class WordleGame {
  private guesses: GuessResult[][] = [];
  private _completed: boolean = false;
  private _won: boolean = false;

  constructor(
    public readonly userId: string,
    public readonly channelId: string,
    public readonly answer: string,
    public readonly startTime: Date,
    initialGuesses: GuessResult[][] = [],
    completed: boolean = false,
    won: boolean = false
  ) {
    this.guesses = initialGuesses.map(guess => guess.map(item => ({ ...item })));
    this._completed = completed;
    this._won = completed ? won : false;
  }

  get isCompleted(): boolean {
    return this._completed;
  }

  get isWon(): boolean {
    return this._won;
  }

  markCompleted(won: boolean): void {
    this._completed = true;
    this._won = won;
  }

  addGuess(guess: GuessResult[]): void {
    this.guesses.push(guess);

    // 正解チェック（空配列の場合はevery()がtrueを返すため除外）
    if (guess.length > 0 && guess.every(r => r.status === 'correct')) {
      this._completed = true;
      this._won = true;
    }
  }

  getGuessCount(): number {
    return this.guesses.length;
  }

  getGuessHistory(): string {
    return this.guesses.map((guess, index) =>
      `${index + 1}. ${guess.map(r => {
        switch (r.status) {
          case 'correct': return `🟩`;
          case 'present': return `🟨`;
          case 'absent': return `⬜`;
        }
      }).join('')} ${guess.map(r => r.letter).join('')}`
    ).join('\n');
  }
}
