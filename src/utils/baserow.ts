import { BASEROW_URL, BASEROW_TOKEN } from 'astro:env/server';
import type { MetadataItem, SourceItemAlt, WikidataItemAlt } from '@/types';

type RowData = {
  count: number;
  next: string | null;
  previous: string | null;
  results: MetadataItem[] | WikidataItemAlt[] | SourceItemAlt[];
};

/**
 * Fetches all rows from a Baserow table with the given ID.
 * @param tableId The ID of the Baserow table to fetch rows from.
 * @returns A promise that resolves to the row data from Baserow.
 * @throws An error if the HTTP response was not OK.
 */
export async function fetchRowsFromDatabase(
  tableId: number,
  additionalParams: string = '',
): Promise<RowData> {
  // tableId 740: Wikidata
  // tableId 741: Story Metadata
  const url = `${BASEROW_URL}/api/database/rows/table/${tableId}/?user_field_names=true${additionalParams}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
