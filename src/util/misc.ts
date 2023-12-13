export function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function checksum(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}

export function randomId(): string {
  const uint32 = crypto.getRandomValues(new Uint32Array(1))[0];
  return uint32.toString(16);
}

export function createSlidingWindowGroups(
  text: string,
  windowSize: number = 12,
  stepSize: number = 3
): string[][] {
  // Create sliding windows of 5 sentences
  const sentences = splitSentences(text);
  return createWindows(sentences, windowSize, stepSize);
}

export function splitParagraphs(text: string): string[] {
  return [...genParagraphs(text)];
}
function* genParagraphs(text: string): Iterable<string> {
  let lastIndex = 0;
  const splitRegex = /\n\s*\n\s*/g;
  let result: RegExpExecArray | null;
  while ((result = splitRegex.exec(text))) {
    const index = result.index;
    yield text.substring(lastIndex, index) + result[0];
    lastIndex = index + result[0].length;
  }
  if (lastIndex < text.length) {
    yield text.substring(lastIndex);
  }
}

export function splitSentences(text: string): string[] {
  // Split the text into sentences while keeping the separators (periods, exclamation marks, etc.)
  let remaining = text;
  const sentences: string[] = [];
  while (remaining.length > 0) {
    // take at least 8 characters, stop early for `\n`
    // then look for next punctuation. One of `.`, `!`, `?`, `\n`
    // if one of `.`, `!`, `?`, must not be immediately followed by a letter.
    //   additionally capture all trailing quotes, and similiar "container" characters, such as markdown * and _ (repeating)
    // then take all whitespace including line breaks
    let buff = remaining.slice(0, 8);
    remaining = remaining.slice(8);
    const match = remaining.match(/[.!?\n][\W]/);
    if (match) {
      buff += remaining.slice(0, match.index! + 1);
      remaining = remaining.slice(match.index! + 1);
      const isLinebreak = buff[buff.length - 1] === "\n";
      if (!isLinebreak) {
        while (true) {
          const next = remaining[0];
          if (!next || next.match(/[a-zA-Z\s]/)) {
            break;
          } else {
            buff += next;
            remaining = remaining.slice(1);
          }
        }
      }
      while (true) {
        const next = remaining[0];
        if (next?.match(/\s/)) {
          buff += next;
          remaining = remaining.slice(1);
        } else {
          break;
        }
      }
      sentences.push(buff);
    } else {
      buff += remaining;
      sentences.push(buff);
      remaining = "";
    }
  }
  return sentences;
}
// Function to create sliding windows of 5 sentences
export function createWindows<T>(
  sentences: T[],
  windowSize: number,
  windowStep: number
): T[][] {
  const windows: T[][] = [];

  for (let i = 0; i < sentences.length; i += windowStep) {
    windows.push(sentences.slice(i, i + windowSize));
    if (i + windowSize >= sentences.length) {
      break;
    }
  }

  return windows;
}

export function debounce<T extends unknown[]>(
  callback: (...args: T) => void,
  waitMillis: number
): (...args: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: T) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      callback(...args);
    }, waitMillis);
  };
}
