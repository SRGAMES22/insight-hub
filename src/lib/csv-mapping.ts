/**
 * Leitura tolerante de arquivos CSV: nomes de coluna são comparados sem
 * maiúsculas/minúsculas, sem acentos e sem símbolos ou espaços, e cada campo
 * aceita sinônimos (ex.: "E-mail do Cliente", "Nota (1 a 10)", "Data envio").
 */

export type CsvTarget =
  | "cliente_email"
  | "categoria"
  | "nota"
  | "feedback_texto"
  | "tags"
  | "data_envio";

/** Rótulos exibidos para a pessoa saber o que foi aproveitado do arquivo. */
export const CSV_TARGET_LABEL: Record<CsvTarget, string> = {
  cliente_email: "E-mail do cliente",
  categoria: "Categoria",
  nota: "Nota",
  feedback_texto: "Texto do feedback",
  tags: "Tags",
  data_envio: "Data de envio",
};

const ORDER: CsvTarget[] = ["cliente_email", "nota", "data_envio", "tags", "categoria", "feedback_texto"];

/** Nomes exatos (já normalizados) que cada campo reconhece. */
const ALIASES: Record<CsvTarget, string[]> = {
  cliente_email: [
    "clienteemail",
    "emailcliente",
    "emaildocliente",
    "email",
    "emailcliente",
    "cliente",
    "contato",
    "clientemail",
    "customeremail",
  ],
  nota: [
    "nota",
    "nota1a10",
    "nota0a10",
    "nota110",
    "notafinal",
    "notageral",
    "avaliacao",
    "avaliacaogeral",
    "pontuacao",
    "score",
    "rating",
    "note",
    "notaoverall",
  ],
  data_envio: [
    "dataenvio",
    "datasenvio",
    "datadeenvio",
    "data",
    "datacadastro",
    "dataregistro",
    "datadofeedback",
    "datarecebimento",
    "datadareposta",
    "quando",
    "date",
    "sentat",
    "createdat",
    "timestamp",
  ],
  tags: ["tags", "tag", "palavraschave", "palavrachave", "keywords", "termos", "topicos", "etiquetas"],
  categoria: ["categoria", "categorias", "tipo", "area", "tema", "assunto", "segmento", "category"],
  feedback_texto: [
    "feedbacktexto",
    "feedback",
    "texto",
    "texto feedback".replace(" ", ""),
    "comentario",
    "comentarios",
    "comment",
    "commento",
    "observacao",
    "observacoes",
    "mensagem",
    "resposta",
    "opiniao",
    "sugestao",
  ],
};

/** Complementos: quando o nome da coluna começa com / contém uma destas raízes. */
const PATTERNS: Record<CsvTarget, RegExp[]> = {
  cliente_email: [/email/, /contato/],
  nota: [/^nota/, /^avaliac/, /^pontuac/, /^score/, /^rating/, /^note/],
  data_envio: [/^data/, /^quando/, /^date/, /timestamp/, /enviadoin?/, /criado?em/],
  tags: [/^tag/, /palavrachave/, /keyword/, /^termo/, /^topico/, /etiqueta/],
  categoria: [/^categoria/, /^tipo/, /^area/, /^tema/, /^assunto/, /^segmento/, /^category/],
  feedback_texto: [/^feedback/, /^texto/, /^comentar/, /^comment/, /^observac/, /^mensagem/, /^resposta/, /^opiniao/],
};

/** "E-mail do Cliente" → "emaildocliente" · "Nota (1 a 10)" → "nota1a10" */
export function normalizeKey(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Descobre qual coluna do arquivo pertence a qual campo.
 * A ordem importa: campos mais específicos são atendidos primeiro.
 */
export function buildColumnMap(headers: string[]): Partial<Record<CsvTarget, string>> {
  const keys = headers
    .map((raw) => ({ raw, norm: normalizeKey(raw) }))
    .filter((entry) => entry.norm.length > 0);

  const used = new Set<string>();
  const map: Partial<Record<CsvTarget, string>> = {};

  for (const target of ORDER) {
    const available = keys.filter((entry) => !used.has(entry.raw));
    const hit =
      available.find((entry) => ALIASES[target].includes(entry.norm)) ??
      available.find((entry) => PATTERNS[target].some((pattern) => pattern.test(entry.norm)));

    if (hit) {
      map[target] = hit.raw;
      used.add(hit.raw);
    }
  }

  return map;
}

/** Lê o valor de um campo a partir da coluna descoberta (ou de um nome direto). */
export function readCell(
  row: Record<string, string>,
  map: Partial<Record<CsvTarget, string>>,
  target: CsvTarget,
): string {
  const column = map[target];
  if (column && row[column] != null) return String(row[column]).trim();
  return "";
}

/** Aceita "9", "9,0", "9.5", "Nota 9", "9 / 10" e devolve o número (ou null). */
export function parseNota(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const parte = text.includes("/") ? text.slice(0, text.indexOf("/")) : text;
  const match = parte.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** Aceita "15/03/2026", "15-03-26", "15/03/2026 14:30" e formatos ISO (ou null). */
export function parseData(raw: string): Date | null {
  const text = raw.trim();
  if (!text) return null;

  const br = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?$/i.exec(text);
  if (br) {
    const [, dia, mes, anoRaw, hora, minuto] = br;
    const ano = anoRaw.length === 2 ? 2000 + Number(anoRaw) : Number(anoRaw);
    const date = new Date(
      Date.UTC(ano, Number(mes) - 1, Number(dia), Number(hora ?? 0), Number(minuto ?? 0)),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}
