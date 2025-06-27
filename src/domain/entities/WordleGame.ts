import { GuessResult } from '../services/WordleService';

export class WordleGame {
  constructor(
    public readonly userId: string,
    public readonly channelId: string,
    public readonly answer: string,
    public readonly startTime: Date,
    public guesses: GuessResult[][] = [],
    public completed: boolean = false,
    public won: boolean = false
  ) {}

  addGuess(guess: GuessResult[]): void {
    this.guesses.push(guess);
    
    // 正解チェック
    if (guess.every(r => r.status === 'correct')) {
      this.completed = true;
      this.won = true;
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