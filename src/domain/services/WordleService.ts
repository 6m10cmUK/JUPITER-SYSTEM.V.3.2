export interface GuessResult {
  letter: string;
  status: 'correct' | 'present' | 'absent';
}

export class WordleService {
  checkGuess(guess: string, answer: string): GuessResult[] {
    const guessArray = [...guess];
    const answerArray = [...answer];
    const result: GuessResult[] = [];
    const usedIndices = new Set<number>();

    // まず正解位置をチェック
    guessArray.forEach((letter, index) => {
      if (letter === answerArray[index]) {
        result[index] = { letter, status: 'correct' };
        usedIndices.add(index);
      }
    });

    // 次に別位置の文字をチェック
    guessArray.forEach((letter, index) => {
      if (result[index]) return; // すでに正解位置

      let found = false;
      answerArray.forEach((answerLetter, answerIndex) => {
        if (!found && !usedIndices.has(answerIndex) && letter === answerLetter) {
          result[index] = { letter, status: 'present' };
          usedIndices.add(answerIndex);
          found = true;
        }
      });

      if (!found) {
        result[index] = { letter, status: 'absent' };
      }
    });

    return result;
  }

  formatGuessDisplay(results: GuessResult[]): string {
    return results.map(r => {
      switch (r.status) {
        case 'correct': return `🟩`;
        case 'present': return `🟨`;
        case 'absent': return `⬜`;
      }
    }).join('') + ' ' + results.map(r => r.letter).join('');
  }

  generateKeyboardStatus(guesses: GuessResult[][]): Map<string, 'correct' | 'present' | 'absent'> {
    const status = new Map<string, 'correct' | 'present' | 'absent'>();
    
    guesses.forEach(guess => {
      guess.forEach(result => {
        const current = status.get(result.letter);
        if (!current || 
            (current === 'absent' && result.status !== 'absent') ||
            (current === 'present' && result.status === 'correct')) {
          status.set(result.letter, result.status);
        }
      });
    });

    return status;
  }
}