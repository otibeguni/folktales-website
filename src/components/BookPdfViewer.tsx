import { createPluginRegistration } from '@embedpdf/core';
import { EmbedPDF } from '@embedpdf/core/react';
import { usePdfiumEngine } from '@embedpdf/engines/react';
import {
  DocumentContent,
  DocumentManagerPluginPackage,
  useActiveDocument,
} from '@embedpdf/plugin-document-manager/react';
import { useExport, ExportPluginPackage } from '@embedpdf/plugin-export/react';
import {
  GlobalPointerProvider,
  InteractionManagerPluginPackage,
} from '@embedpdf/plugin-interaction-manager/react';
import { PanPluginPackage } from '@embedpdf/plugin-pan/react';
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react';
import { Scroller, ScrollPluginPackage } from '@embedpdf/plugin-scroll/react';
import { Viewport, ViewportPluginPackage } from '@embedpdf/plugin-viewport/react';
import { ZoomGestureWrapper, ZoomMode, ZoomPluginPackage } from '@embedpdf/plugin-zoom/react';
import { useMemo } from 'react';

type BookPdfViewerProps = {
  src: string;
  title: string;
};

const buildDownloadName = (title: string) => {
  const trimmed = title.trim();
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
};

const ViewerToolbar = ({ documentId }: { documentId: string }) => {
  const { provides: exportApi } = useExport(documentId);

  return (
    <div className="flex items-center justify-end border-b border-base-300 bg-base-100 px-4 py-3">
      <button
        type="button"
        className="btn btn-sm btn-outline"
        onClick={() => exportApi?.download()}
        disabled={!exportApi}
      >
        Download
      </button>
    </div>
  );
};

const PdfCanvas = ({ documentId }: { documentId: string }) => (
  <GlobalPointerProvider documentId={documentId} className="h-full">
    <Viewport
      documentId={documentId}
      className="h-full w-full overflow-auto bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(241,245,249,0.96)_55%,_rgba(226,232,240,0.96))]"
    >
      <ZoomGestureWrapper documentId={documentId} className="min-h-full w-full py-6">
        <Scroller
          documentId={documentId}
          renderPage={({ pageIndex }) => (
            <RenderLayer
              documentId={documentId}
              pageIndex={pageIndex}
              className="block rounded-sm shadow-[0_10px_30px_rgba(15,23,42,0.14)]"
              style={{ width: '100%', height: '100%', backgroundColor: '#fff' }}
            />
          )}
        />
      </ZoomGestureWrapper>
    </Viewport>
  </GlobalPointerProvider>
);

const LoadedViewer = ({ documentId }: { documentId: string }) => (
  <div className="overflow-hidden rounded-2xl border border-base-300 bg-white shadow-sm">
    <ViewerToolbar documentId={documentId} />

    <div className="h-[min(75vh,900px)] min-h-[420px] bg-slate-100">
      <PdfCanvas documentId={documentId} />
    </div>
  </div>
);

const DocumentViewerContent = ({ src, title }: BookPdfViewerProps) => {
  const { activeDocumentId } = useActiveDocument();

  if (!activeDocumentId) {
    return (
      <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-12 text-center text-sm text-slate-600 shadow-sm">
        Preparing {title}...
      </div>
    );
  }

  return (
    <DocumentContent documentId={activeDocumentId}>
      {({ documentState, isLoading, isError, isLoaded }) => {
        if (isLoading) {
          return (
            <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-12 text-center text-sm text-slate-600 shadow-sm">
              Loading {title}...
            </div>
          );
        }

        if (isError || documentState.status === 'error') {
          return (
            <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-slate-700">
              <p>We could not load this PDF in the embedded viewer.</p>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex font-medium text-slate-900 underline underline-offset-4"
              >
                Open {title} in a new tab
              </a>
            </div>
          );
        }

        if (!isLoaded) {
          return null;
        }

        return (
          <LoadedViewer documentId={activeDocumentId} />
        );
      }}
    </DocumentContent>
  );
};

const SingleDocumentViewer = ({ src, title }: BookPdfViewerProps) => {
  const { engine, isLoading: isEngineLoading, error: engineError } = usePdfiumEngine();

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: src, name: title }],
        maxDocuments: 1,
      }),
      createPluginRegistration(ViewportPluginPackage, {
        viewportGap: 24,
      }),
      createPluginRegistration(ScrollPluginPackage, {
        defaultPageGap: 16,
      }),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(PanPluginPackage, {
        defaultMode: 'always',
      }),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.Automatic,
      }),
      createPluginRegistration(ExportPluginPackage, {
        defaultFileName: buildDownloadName(title),
      }),
    ],
    [src, title],
  );

  if (engineError) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-slate-700">
        <p>We could not load this PDF in the embedded viewer.</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex font-medium text-slate-900 underline underline-offset-4"
        >
          Open {title} in a new tab
        </a>
      </div>
    );
  }

  if (isEngineLoading || !engine) {
    return (
      <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-12 text-center text-sm text-slate-600 shadow-sm">
        Loading PDF engine...
      </div>
    );
  }

  return (
    <EmbedPDF engine={engine} plugins={plugins}>
      <DocumentViewerContent src={src} title={title} />
    </EmbedPDF>
  );
};

const BookPdfViewer = ({ src, title }: BookPdfViewerProps) => (
  <div className="flex flex-col gap-4">
    <SingleDocumentViewer src={src} title={title} />
  </div>
);

export default BookPdfViewer;
