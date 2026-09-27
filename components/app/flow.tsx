/*
 * Flowing text: words ease in from a soft blur as a reply arrives (the flow-word class in
 * globals.css), so a reply reads as one continuous stream instead of words popping in.
 */

/**
 * Words that fade in from a soft blur as they arrive, keyed by position so only new words animate.
 * With `upTo` (a character count), the whole text is laid out from the start and words past that
 * point wait invisibly in place, so centered lines never shift as the sentence fills in.
 */
export function FlowWords({ text, flowing, upTo }: { text: string; flowing: boolean; upTo?: number }) {
  const tokens = text.split(/(\s+)/);
  const ends: number[] = [];
  for (const token of tokens) ends.push((ends.at(-1) ?? 0) + token.length);
  return (
    <>
      {tokens.map((token, i) => {
        if (token === "") return null;
        if (/^\s+$/.test(token)) return token;
        const waiting = upTo !== undefined && ends[i] > upTo;
        return (
          <span key={i} className={waiting ? "inline-block whitespace-pre opacity-0" : flowing ? "flow-word" : undefined}>
            {token}
          </span>
        );
      })}
    </>
  );
}
