export function evaluateMathExpression(expression: string): number {
    expression = expression.replace(/\s/g, '');
    
    const tokens = tokenize(expression);
    const postfix = infixToPostfix(tokens);
    return evaluatePostfix(postfix);
}

function tokenize(expression: string): string[] {
    const tokens: string[] = [];
    let currentNumber = '';
    
    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        
        if (/\d|\./.test(char)) {
            currentNumber += char;
        } else {
            if (currentNumber) {
                tokens.push(currentNumber);
                currentNumber = '';
            }
            
            if (char === '*' && expression[i + 1] === '*') {
                tokens.push('**');
                i++;
            } else if (['+', '-', '*', '/', '(', ')'].includes(char)) {
                tokens.push(char);
            }
        }
    }
    
    if (currentNumber) {
        tokens.push(currentNumber);
    }
    
    return tokens;
}

function infixToPostfix(tokens: string[]): string[] {
    const output: string[] = [];
    const operators: string[] = [];
    
    const precedence: { [key: string]: number } = {
        '+': 1,
        '-': 1,
        '*': 2,
        '/': 2,
        '**': 3
    };
    
    const isRightAssociative = (op: string) => op === '**';
    
    for (const token of tokens) {
        if (/^\d+(\.\d+)?$/.test(token)) {
            output.push(token);
        } else if (token === '(') {
            operators.push(token);
        } else if (token === ')') {
            while (operators.length > 0 && operators[operators.length - 1] !== '(') {
                output.push(operators.pop()!);
            }
            operators.pop(); // Remove '('
        } else if (precedence[token] !== undefined) {
            while (
                operators.length > 0 &&
                operators[operators.length - 1] !== '(' &&
                precedence[operators[operators.length - 1]] !== undefined &&
                (precedence[operators[operators.length - 1]] > precedence[token] ||
                    (precedence[operators[operators.length - 1]] === precedence[token] && !isRightAssociative(token)))
            ) {
                output.push(operators.pop()!);
            }
            operators.push(token);
        }
    }
    
    while (operators.length > 0) {
        output.push(operators.pop()!);
    }
    
    return output;
}

function evaluatePostfix(tokens: string[]): number {
    const stack: number[] = [];
    
    for (const token of tokens) {
        if (/^\d+(\.\d+)?$/.test(token)) {
            stack.push(parseFloat(token));
        } else {
            const b = stack.pop()!;
            const a = stack.pop()!;
            
            switch (token) {
                case '+':
                    stack.push(a + b);
                    break;
                case '-':
                    stack.push(a - b);
                    break;
                case '*':
                    stack.push(a * b);
                    break;
                case '/':
                    if (b === 0) throw new Error('Division by zero');
                    stack.push(a / b);
                    break;
                case '**':
                    stack.push(Math.pow(a, b));
                    break;
            }
        }
    }
    
    if (stack.length !== 1) {
        throw new Error('Invalid expression');
    }
    
    return stack[0];
}