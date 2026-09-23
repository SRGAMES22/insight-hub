const STOPWORDS = new Set([
  "a","o","as","os","de","da","do","das","dos","e","que","em","um","uma","para","com","por","no","na",
  "nos","nas","se","ao","aos","mas","mais","muito","muita","foi","ser","ta","tá","esse","essa","isso",
  "eu","ele","ela","nao","não","ja","já","sem","pelo","pela","como","meu","minha","tem","tudo","ate",
  "até","sobre","mesmo","depois","quando","onde","ficou","poderia","podia","bem","bom","boa",
]);

export type WordWeight = { word: string; count: number };

export function countWords(texts: (string | null | undefined)[], limit = 16): WordWeight[] {
  const tally = new Map<string, number>();
  for (const text of texts) {
    if (!text) continue;
    for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (raw.length < 4 || STOPWORDS.has(raw)) continue;
      tally.set(raw, (tally.get(raw) ?? 0) + 1);
    }
  }
  return [...tally.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function WordCloud({ words }: { words: WordWeight[] }) {
  if (words.length === 0) {
    return <p className="mt-4 text-xs text-muted-foreground">Sem texto suficiente no período filtrado.</p>;
  }

  const max = words[0]?.count ?? 1;
  const min = words[words.length - 1]?.count ?? 1;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      {words.map(({ word, count }) => {
        const ratio = max === min ? 1 : (count - min) / (max - min);
        const size = 12 + ratio * 14;
        const strong = ratio > 0.66;
        return (
          <span
            key={word}
            title={`${word} · ${count}`}
            className={strong ? "num font-semibold text-brand" : "font-medium text-foreground/70"}
            style={{ fontSize: `${size}px` }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
