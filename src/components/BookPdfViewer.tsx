import { PDFViewer, type PluginRegistry } from '@embedpdf/react-pdf-viewer';
import { useState } from 'react';

type DocumentManagerPlugin = {
  provides?: () => {
    onDocumentError?: (
      callback: (payload: { documentId: string; error: unknown }) => void,
    ) => void;
  };
};

const BookPdfViewer = ({
  src,
  title,
}: {
  src: string;
  title: string;
}) => {
  const [hasError, setHasError] = useState(false);

  const handleReady = (registry: PluginRegistry) => {
    const plugin = (registry as unknown as { getPlugin?: (name: string) => unknown })
      .getPlugin?.('document-manager') as DocumentManagerPlugin | undefined;

    plugin?.provides?.().onDocumentError?.(() => {
      setHasError(true);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-base-300 bg-white shadow-sm">
        <PDFViewer
          config={{
            src,
            tabBar: 'never',
            disabledCategories: ['annotation', 'redaction'],
            pan: {
              defaultMode: 'mobile',
            },
            theme: {
              preference: 'light',
            },
          }}
          className="w-full"
          style={{ height: 'min(75vh, 900px)', minHeight: '420px' }}
          onReady={handleReady}
        />
      </div>

      {hasError && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-slate-700">
          <p>
            We could not load this PDF in the embedded viewer.
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex font-medium text-slate-900 underline underline-offset-4"
          >
            Open {title} in a new tab
          </a>
        </div>
      )}
    </div>
  );
};

export default BookPdfViewer;
