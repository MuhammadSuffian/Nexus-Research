/**
 * ArXiv API wrapper.
 *
 * Queries the ArXiv API search endpoint (Atom XML) and returns structured paper data.
 */

export interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  url: string;
}

function htmlDecode(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripTags(raw: string): string {
  return raw.replace(/<[^>]*>/g, "");
}

function getTagContent(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s");
  const match = xml.match(regex);
  if (!match) return "";
  return htmlDecode(stripTags(match[1].trim()));
}

function getAuthors(xml: string): string[] {
  const authors: string[] = [];
  const regex = /<name>(.*?)<\/name>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    authors.push(htmlDecode(match[1].trim()));
  }
  return authors;
}

function parseArxivXML(xml: string): ArxivPaper[] {
  const entries = xml.split("<entry>");

  return entries.slice(1).map((entry) => {
    const id = getTagContent(entry, "id");
    const arxivId = id.replace("http://arxiv.org/abs/", "");

    return {
      id: arxivId,
      title: getTagContent(entry, "title").replace(/\s+/g, " "),
      summary: getTagContent(entry, "summary").replace(/\s+/g, " "),
      authors: getAuthors(entry),
      published: getTagContent(entry, "published"),
      url: id,
    };
  });
}

/**
 * Search ArXiv for papers matching the query.
 * Returns up to `maxResults` papers sorted by relevance.
 */
export async function searchArXiv(
  query: string,
  maxResults = 10,
): Promise<ArxivPaper[]> {
  const encoded = encodeURIComponent(query);
  const url =
    `http://export.arxiv.org/api/query?search_query=all:${encoded}&start=0&max_results=${maxResults}&sortBy=relevance`;

  const response = await fetch(url, {
    headers: { "Accept": "application/atom+xml" },
  });

  if (!response.ok) {
    throw new Error(`ArXiv API returned ${response.status}: ${response.statusText}`);
  }

  const xml = await response.text();
  return parseArxivXML(xml);
}
