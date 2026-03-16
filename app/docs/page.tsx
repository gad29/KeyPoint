import fs from 'node:fs';
import path from 'node:path';

function readDoc(name: string) {
  const filePath = path.join(process.cwd(), 'docs', name);
  return fs.readFileSync(filePath, 'utf8');
}

export default function DocsPage() {
  const airtable = readDoc('airtable-schema.md');
  const workflows = readDoc('n8n-workflows.md');

  return (
    <div className="grid cols-2">
      <section className="card">
        <p className="eyebrow">Airtable schema draft</p>
        <pre>{airtable}</pre>
      </section>
      <section className="card">
        <p className="eyebrow">n8n workflow map</p>
        <pre>{workflows}</pre>
      </section>
    </div>
  );
}
