import { tool } from "ai";
import { z } from "zod";

const evalMathFunction = (ident: string, arg: number): number => {
  switch (ident) {
    case "sqrt": {
      return Math.sqrt(arg);
    }
    case "abs": {
      return Math.abs(arg);
    }
    case "sin": {
      return Math.sin(arg);
    }
    case "cos": {
      return Math.cos(arg);
    }
    case "tan": {
      return Math.tan(arg);
    }
    case "log":
    case "ln": {
      return Math.log(arg);
    }
    case "log10": {
      return Math.log10(arg);
    }
    case "round": {
      return Math.round(arg);
    }
    case "ceil": {
      return Math.ceil(arg);
    }
    case "floor": {
      return Math.floor(arg);
    }
    default: {
      throw new Error(`Unknown mathematical function: '${ident}'`);
    }
  }
};

class SafeMathParser {
  private pos = 0;
  private expr = "";

  constructor(expression: string) {
    this.expr = expression.replaceAll(/\s+/gu, "");
  }

  parse(): number {
    this.pos = 0;
    const res = this.parseExpression();
    if (this.pos < this.expr.length) {
      throw new Error(
        `Unexpected character: '${this.expr[this.pos]}' at position ${this.pos}`
      );
    }
    return res;
  }

  private peek(): string {
    return this.expr[this.pos] || "";
  }

  private consume(char?: string): string {
    if (char && this.peek() !== char) {
      throw new Error(`Expected '${char}' but found '${this.peek()}'`);
    }
    const current = this.expr[this.pos] || "";
    this.pos += 1;
    return current;
  }

  private parseExpression(): number {
    let val = this.parseTerm();
    while (this.peek() === "+" || this.peek() === "-") {
      const op = this.consume();
      const next = this.parseTerm();
      if (op === "+") {
        val += next;
      } else {
        val -= next;
      }
    }
    return val;
  }

  private parseTerm(): number {
    let val = this.parsePower();
    while (this.peek() === "*" || this.peek() === "/" || this.peek() === "%") {
      const op = this.consume();
      const next = this.parsePower();
      if (op === "*") {
        val *= next;
      } else if (op === "/") {
        if (next === 0) {
          throw new Error("Division by zero");
        }
        val /= next;
      } else {
        val %= next;
      }
    }
    return val;
  }

  private parsePower(): number {
    let val = this.parseFactor();
    if (this.peek() === "^") {
      this.consume("^");
      const next = this.parsePower();
      val **= next;
    }
    return val;
  }

  private parseFactor(): number {
    if (this.peek() === "-") {
      this.consume("-");
      return -this.parseFactor();
    }
    if (this.peek() === "+") {
      this.consume("+");
      return this.parseFactor();
    }

    if (this.peek() === "(") {
      this.consume("(");
      const val = this.parseExpression();
      this.consume(")");
      return val;
    }

    if (/[0-9.]/u.test(this.peek())) {
      let numStr = "";
      while (/[0-9.]/u.test(this.peek())) {
        numStr += this.consume();
      }
      const num = Number(numStr);
      if (Number.isNaN(num)) {
        throw new TypeError(`Invalid number '${numStr}'`);
      }
      return num;
    }

    if (/[a-zA-Z_]/u.test(this.peek())) {
      let ident = "";
      while (/[a-zA-Z0-9_]/u.test(this.peek())) {
        ident += this.consume();
      }
      ident = ident.toLowerCase();

      if (ident === "pi") {
        return Math.PI;
      }
      if (ident === "e") {
        return Math.E;
      }

      if (this.peek() === "(") {
        this.consume("(");
        const arg = this.parseExpression();
        this.consume(")");
        return evalMathFunction(ident, arg);
      }
      throw new Error(`Unknown identifier '${ident}'`);
    }

    throw new Error(`Unexpected token '${this.peek()}'`);
  }
}

export const calculatorTool = tool({
  description:
    "Evaluate a mathematical expression safely without code execution (supports +, -, *, /, %, ^, sqrt, sin, cos, tan, log, abs, round, pi, e).",
  execute: async ({ expression }) => {
    await Promise.resolve();
    try {
      const parser = new SafeMathParser(expression);
      const result = parser.parse();
      return JSON.stringify({ expression, result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ error: msg, expression });
    }
  },
  inputSchema: z.object({
    expression: z
      .string()
      .describe(
        "The mathematical expression to evaluate, e.g. '(15 * 4) + sqrt(144) - 2^3'"
      ),
  }),
});
