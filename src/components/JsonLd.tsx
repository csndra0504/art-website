// Emits a schema.org JSON-LD <script> into the rendered HTML. Because the site
// is prerendered, this block is present in the static output that search
// engines and AI crawlers read — the machine-readable layer that lets them
// understand and cite each page. Rendered in the body (valid for JSON-LD).
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user-controlled HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
